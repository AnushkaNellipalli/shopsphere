"""
Fill the database with demo data so the website looks alive.
Run:  python manage.py seed_data
Creates: categories, 24 products (with generated images), an admin and a demo customer.
"""
import io
import random
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw, ImageFont

from products.models import Category, Product

CATALOG = {
    "Electronics": ("electronics", "#2563eb", [
        ("Wireless Earbuds Pro", "Noise-cancelling earbuds with 24-hour battery life and a pocket charging case.", 2499),
        ("Smart Fitness Band", "Tracks steps, heart rate and sleep. Water resistant with a bright AMOLED display.", 1999),
        ("Portable Bluetooth Speaker", "Loud, clear sound with deep bass. Lasts 12 hours on a single charge.", 1799),
        ("Fast Charge Power Bank 20000mAh", "Charges two devices at once. Supports 22.5W fast charging.", 1599),
        ("Mechanical Gaming Keyboard", "RGB backlight, blue switches and a sturdy aluminium frame.", 3299),
        ("HD Webcam 1080p", "Crisp video calls with auto light correction and a built-in microphone.", 1499),
    ]),
    "Fashion": ("fashion", "#db2777", [
        ("Classic Denim Jacket", "Soft, durable denim with a relaxed fit. Goes with everything.", 1899),
        ("Cotton Crew-Neck T-Shirt", "100% breathable cotton. Pre-shrunk and comfortable all day.", 499),
        ("Running Sneakers", "Lightweight mesh upper with a cushioned sole for daily runs.", 2799),
        ("Canvas Backpack", "Spacious 25L bag with a laptop sleeve and water-resistant lining.", 1299),
        ("Aviator Sunglasses", "UV400 protection with a lightweight metal frame.", 899),
        ("Leather Wallet", "Slim bifold wallet with 6 card slots and a coin pocket.", 749),
    ]),
    "Home & Kitchen": ("home-kitchen", "#059669", [
        ("Stainless Steel Water Bottle", "Keeps drinks cold for 24 hours or hot for 12. Leak-proof lid.", 699),
        ("Non-Stick Cookware Set", "3-piece set with induction-friendly base and cool-touch handles.", 2299),
        ("Ceramic Coffee Mug Set", "Set of four hand-glazed mugs. Microwave and dishwasher safe.", 799),
        ("LED Desk Lamp", "Adjustable arm with three colour modes and USB charging port.", 1099),
        ("Memory Foam Pillow", "Supports your neck and keeps its shape. Removable cover.", 999),
        ("Bamboo Cutting Board", "Large, knife-friendly board with a juice groove.", 599),
    ]),
    "Books & Stationery": ("books-stationery", "#d97706", [
        ("Hardcover Notebook (A5)", "200 dotted pages of thick, ink-friendly paper with a ribbon marker.", 349),
        ("Gel Pen Pack of 10", "Smooth writing in 10 colours. Quick-dry ink.", 249),
        ("Python Programming Handbook", "Beginner-friendly guide with practice exercises and mini projects.", 649),
        ("Desk Organizer", "Wooden organizer with compartments for pens, phone and sticky notes.", 549),
        ("Sticky Notes Combo", "Six pads in assorted colours and sizes.", 199),
        ("Weekly Planner", "Undated weekly layout with goal tracking and habit pages.", 399),
    ]),
}


def make_image(title, color):
    """Draw a simple coloured card with the product name, so every product has a picture."""
    img = Image.new("RGB", (600, 600), color)
    draw = ImageDraw.Draw(img)
    for i in range(0, 600, 40):  # light diagonal stripes
        draw.line([(i, 0), (0, i)], fill=(255, 255, 255), width=1)
    draw.ellipse((150, 120, 450, 420), fill=(255, 255, 255))
    try:
        font = ImageFont.load_default(size=44)
    except TypeError:
        font = ImageFont.load_default()
    words, lines, line = title.split(), [], ""
    for w in words:
        if len(line + " " + w) > 16 and line:
            lines.append(line)
            line = w
        else:
            line = (line + " " + w).strip()
    lines.append(line)
    y = 270 - 25 * len(lines)
    for ln in lines:
        w = draw.textlength(ln, font=font)
        draw.text(((600 - w) / 2, y), ln, fill=color, font=font)
        y += 55
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Create demo categories, products and users"

    def handle(self, *args, **options):
        random.seed(7)
        for cat_name, (slug, color, items) in CATALOG.items():
            category, _ = Category.objects.get_or_create(slug=slug, defaults={"name": cat_name})
            for idx, (name, desc, price) in enumerate(items):
                product, created = Product.objects.get_or_create(
                    name=name,
                    defaults={"category": category, "description": desc, "price": Decimal(price),
                              "stock": random.randint(8, 60), "is_featured": idx < 2})
                if created or not product.image:
                    product.image.save(f"{slug}-{idx}.jpg", make_image(name, color), save=True)

        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@shopsphere.local", "Admin@12345")
        if not User.objects.filter(username="customer").exists():
            User.objects.create_user("customer", "customer@shopsphere.local", "Customer@12345",
                                     first_name="Demo", last_name="Customer")
        self.stdout.write(self.style.SUCCESS(
            f"Done. {Category.objects.count()} categories, {Product.objects.count()} products.\n"
            "Admin login:    admin / Admin@12345\nCustomer login: customer / Customer@12345"))
