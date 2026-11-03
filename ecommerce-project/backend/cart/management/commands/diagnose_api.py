"""
Read-only health check for the ShopSphere API.   Run:  python manage.py diagnose_api
It changes NOTHING in your database. It prints:
  1. which database Django is really using
  2. which migrations Django believes are applied
  3. whether every model column really exists in the database
  4. the REAL error (traceback) behind each failing API URL
"""
import traceback

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
from django.test import Client


class Command(BaseCommand):
    help = "Find out why /api/products/ or /api/categories/ returns HTTP 500"

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        self.stdout.write("\n=== 1. DATABASE IN USE ===")
        self.stdout.write(f"engine: {db['ENGINE']}")
        self.stdout.write(f"name:   {db['NAME']}")
        self.stdout.write(f"DEBUG:  {settings.DEBUG}")

        self.stdout.write("\n=== 2. MIGRATIONS DJANGO BELIEVES ARE APPLIED ===")
        try:
            applied = MigrationRecorder(connection).applied_migrations()
            for app in ("products", "cart", "orders"):
                names = sorted(n for a, n in applied if a == app)
                self.stdout.write(f"{app}: {names or 'NONE'}")
        except Exception as e:
            self.stdout.write(f"could not read migrations table: {e!r}")

        self.stdout.write("\n=== 3. MODEL COLUMNS vs REAL DATABASE COLUMNS ===")
        problems = 0
        try:
            tables = set(connection.introspection.table_names())
            for model in list(apps.get_app_config("products").get_models()) + list(apps.get_app_config("cart").get_models()) + list(apps.get_app_config("orders").get_models()):
                table = model._meta.db_table
                if table not in tables:
                    self.stdout.write(self.style.ERROR(f"MISSING TABLE: {table}"))
                    problems += 1
                    continue
                with connection.cursor() as cur:
                    real = {c.name for c in connection.introspection.get_table_description(cur, table)}
                wanted = {f.column for f in model._meta.concrete_fields}
                missing = wanted - real
                if missing:
                    self.stdout.write(self.style.ERROR(f"{table}: MISSING COLUMNS {sorted(missing)}"))
                    problems += 1
                else:
                    self.stdout.write(f"{table}: OK")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"could not inspect database: {e!r}"))
            problems += 1

        self.stdout.write("\n=== 4. REAL ERROR BEHIND EACH API URL ===")
        client = Client(raise_request_exception=True, HTTP_HOST="127.0.0.1")
        shown_full = False
        for url in ("/api/categories/", "/api/products/", "/api/products/?featured=true",
                    "/api/products/?ordering=-created_at"):
            try:
                r = client.get(url)
                self.stdout.write(f"{r.status_code}  {url}")
            except Exception as exc:
                problems += 1
                root = exc
                while root.__cause__ or root.__context__:
                    root = root.__cause__ or root.__context__
                # the last stack frame that belongs to YOUR project (not Django's own code)
                frames = [f for f in traceback.extract_tb(exc.__traceback__) if str(settings.BASE_DIR) in f.filename and not f.filename.endswith("diagnose_api.py")]
                where = f"{frames[-1].filename}:{frames[-1].lineno}" if frames else "unknown"
                self.stdout.write(self.style.ERROR(f"500  {url}"))
                self.stdout.write(f"     cause: {type(root).__name__}: {root}")
                self.stdout.write(f"     your code: {where}")
                if not shown_full:
                    shown_full = True
                    self.stdout.write("\n--- full traceback of the first failure ---")
                    self.stdout.write(traceback.format_exc())
                    self.stdout.write("--- end of traceback ---\n")

        self.stdout.write("\nRESULT: " + ("no problems found." if not problems else f"{problems} problem(s) found. Copy ALL of this output and send it to me."))
