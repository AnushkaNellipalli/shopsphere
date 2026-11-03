# ShopSphere: Python Full Stack E-commerce Website

A complete e-commerce site: **React** frontend, **Django REST Framework** backend, **MySQL** database.
Customers can browse, search, filter, sort, add to cart, check out (simulated payment) and track orders.
Admins manage products and orders in the Django admin panel.

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, React (Vite), React Router |
| Backend | Python, Django, Django REST Framework |
| Database | MySQL (Django ORM) |
| Auth | Django users + DRF token authentication, admin / customer roles |

---

## 1. Run it (first time setup)

You need: **Python 3.10+**, **Node.js 18+**, **MySQL Server**.

### A. Create the database
Open MySQL Workbench (or run `mysql -u root -p`) and execute:
```sql
CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4;
```

### B. Backend (Terminal 1)
```bash
cd backend
python -m venv venv

# activate the virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac / Linux

pip install -r 

# create your private settings file
copy .env.example .env         # Windows
cp .env.example .env           # Mac / Linux
```
Open `backend/.env` and set `DB_PASSWORD` to your MySQL root password. Then:
```bash
python manage.py migrate        # creates all tables in MySQL
python manage.py seed_data      # demo products, images, admin + customer users
python manage.py runserver      # API at http://127.0.0.1:8000
```

### C. Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev                     # website at http://localhost:5173
```

### D. Demo logins
| Role | Username | Password |
|---|---|---|
| Customer | `customer` | `Customer@12345` |
| Admin | `admin` | `Admin@12345` |

Admin panel: http://localhost:8000/admin/ (change the demo admin password before any real deployment).

---

## 2. Architecture

```
 Browser (React)  <--- JSON over HTTP --->  Django + DRF  <--- SQL --->  MySQL
  pages, forms         REST API              rules, auth                 data
```

Example: clicking **Add to cart**
1. React calls `POST /api/cart/items/` with `{product_id, quantity}` and the header `Authorization: Token ...`.
2. DRF checks the token, then the view checks the product exists and stock is enough.
3. Django saves a `CartItem` row in MySQL.
4. Django returns the updated cart as JSON and React re-renders the cart badge.

**Golden rule: never trust the browser.** React only sends the address at checkout. Django reads prices from the database and calculates the total itself.

---

## 3. Folder structure

```
ecommerce-project/
├── backend/
│   ├── manage.py              command tool (runserver, migrate, test)
│   ├── requirements.txt       Python packages
│   ├── .env.example           template for secrets (copy to .env)
│   ├── config/                settings.py (MySQL, DRF, CORS), main urls.py
│   ├── accounts/              register / login / logout / me  (serializers, views, urls)
│   ├── products/              Category + Product models, API, permissions, admin, seed_data command
│   ├── cart/                  Cart + CartItem models and cart API
│   └── orders/                Order + OrderItem models, checkout API, admin, tests.py
└── frontend/
    ├── index.html, vite.config.js, package.json, .env.example
    └── src/
        ├── main.jsx           starts React and wraps the app in providers
        ├── App.jsx            all routes (URL -> page)
        ├── index.css          all styling (responsive)
        ├── services/api.js    ALL calls to the Django API live here
        ├── context/           AuthContext (user), CartContext (cart), ToastContext (notifications)
        ├── components/        Navbar, Footer, ProductCard, ProductGrid, Loader, ErrorMessage,
        │                      ProtectedRoute, OrderItems, StatusBadge
        └── pages/             Home, Products, ProductDetail, Login, Register, Cart,
                               Checkout, OrderConfirmation, Orders, OrderDetail, NotFound
```

---

## 4. Database design

| Model | Important fields |
|---|---|
| **User** (Django built-in) | username, email, password (hashed), `is_staff` (= admin role) |
| **Category** | name, slug |
| **Product** | category, name, description, price, image, stock, is_featured |
| **Cart** | user |
| **CartItem** | cart, product, quantity |
| **Order** | user, status, address fields, total_amount, created_at |
| **OrderItem** | order, product, product_name, price, quantity |

Relationships:
- User **1 : 1** Cart. Each user has one cart.
- Cart **1 : many** CartItem. A product appears once per cart (`unique_together`), so adding it again raises the quantity.
- Category **1 : many** Product.
- User **1 : many** Order, and Order **1 : many** OrderItem.
- OrderItem stores `product_name` and `price` as a **snapshot**. If you change a price later, old orders stay correct.

### How Django talks to MySQL
`settings.py` -> `DATABASES` uses `django.db.backends.mysql` and the `mysqlclient` package. Models are Python classes; `makemigrations` writes migration files and `migrate` turns them into `CREATE TABLE` statements. The ORM then turns `Product.objects.filter(...)` into SQL.

### Look at the data with plain SQL
Run in MySQL Workbench with `USE ecommerce_db;`
```sql
SHOW TABLES;
SELECT id, name, price, stock FROM products_product ORDER BY price;
SELECT p.name, c.name AS category FROM products_product p JOIN products_category c ON p.category_id = c.id;
SELECT * FROM products_product WHERE name LIKE '%speaker%';          -- same as the search feature
SELECT o.id, u.username, o.total_amount, o.status
  FROM orders_order o JOIN auth_user u ON o.user_id = u.id;
SELECT order_id, SUM(price * quantity) AS recalculated_total FROM orders_orderitem GROUP BY order_id;
SELECT c.name, COUNT(*) AS products FROM products_product p JOIN products_category c ON p.category_id = c.id GROUP BY c.name;
```
Passwords in `auth_user` look like `pbkdf2_sha256$...`. That is a hash, not the real password.

---

## 5. REST API

Base URL: `http://localhost:8000/api`

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register/` | anyone | create account, returns token |
| POST | `/auth/login/` | anyone | log in, returns token |
| POST | `/auth/logout/` | logged in | delete token |
| GET | `/auth/me/` | logged in | current user and role |
| GET | `/categories/` | anyone | list categories |
| GET | `/products/` | anyone | list (supports `?search=`, `?category=slug`, `?ordering=price` or `-price`, `?featured=true`, `?page=2`) |
| GET | `/products/<id>/` | anyone | product details |
| POST / PUT / PATCH / DELETE | `/products/...` | **admin only** | manage products |
| GET | `/cart/` | logged in | my cart |
| POST | `/cart/items/` | logged in | add product `{product_id, quantity}` |
| PATCH | `/cart/items/<id>/` | logged in | change quantity `{quantity}` |
| DELETE | `/cart/items/<id>/` | logged in | remove item |
| DELETE | `/cart/` | logged in | empty cart |
| POST | `/orders/` | logged in | checkout (address only) |
| GET | `/orders/` | logged in | my order history (admin sees all) |
| GET | `/orders/<id>/` | logged in | order details (404 if not yours) |
| PATCH | `/orders/<id>/` | **admin only** | update status `{status}` |

### HTTP methods with examples from this project
- **GET** reads data and changes nothing: `GET /api/products/?search=shoe`.
- **POST** creates something: `POST /api/orders/` creates an order.
- **PUT** replaces a whole record: `PUT /api/products/5/` (admin) sends every product field.
- **PATCH** changes part of a record: `PATCH /api/cart/items/3/ {"quantity": 4}` or `PATCH /api/orders/2/ {"status": "shipped"}`.
- **DELETE** removes: `DELETE /api/cart/items/3/`.

---

## 6. Authentication and authorization

- Registration uses `User.objects.create_user()`, which **hashes** the password. Django's password validators reject weak or common passwords.
- Login returns a **token**. React stores it in `localStorage` and sends `Authorization: Token <key>` on each request (`services/api.js`). Logout deletes the token on the server.
- **Roles:** customer is a normal user; admin is a user with `is_staff=True` (create one with `python manage.py createsuperuser`).
- **Backend enforces permissions.** `products/permissions.py` (`IsAdminOrReadOnly`), and every order query goes through `orders_for(user)`, so a customer can only ever load their own orders.
- **Protected pages in React:** `ProtectedRoute` redirects to Login. This is only for user experience; the real protection is on the server.

## 7. Security checklist (where each item is in the code)

| Requirement | Where |
|---|---|
| Server-side validation | `accounts/serializers.py`, `orders/serializers.py`, `cart/serializers.py` |
| Frontend validation | `Register.jsx`, `Checkout.jsx` |
| Totals calculated on server | `orders/views.py` -> `OrderListCreateView.post` |
| Quantity and stock validated | `cart/views.py` and `orders/views.py` (row locking with `select_for_update`) |
| Customers cannot see others' orders | `orders_for()` in `orders/views.py`, tested in `orders/tests.py` |
| Secrets out of GitHub | `.env` is in `.gitignore`; `.env.example` has fake values |
| Atomic checkout | `@transaction.atomic` so a failed order never half-saves |
| No card data | Checkout is simulated: only an address is collected |

## 8. Tests

```bash
cd backend
python manage.py test
```
12 tests cover registration, login/logout, product search/filter/sort, admin-only product management, cart rules, stock checks, server-side totals, price snapshots, and order privacy. (Django creates a temporary `test_ecommerce_db`, so your MySQL user needs permission to create databases. The root user has it.)

Manual test: log in as `customer`, add 2 products, change quantities, check out, then open **My Orders**. Log in as `admin` at `/admin/`, open **Orders**, change a status, and refresh the customer's order.

## 9. Upload to GitHub

```bash
cd ecommerce-project
git init
git add .
git status                    # make sure .env is NOT listed
git commit -m "ShopSphere e-commerce project"
git branch -M main
git remote add origin https://github.com/<your-username>/shopsphere.git
git push -u origin main
```
Create the empty repository on github.com first. Take 3 screenshots (home, cart, admin panel) for the README and your resume.

## 10. Deployment overview

1. **Database:** a managed MySQL service (Railway, Aiven, PlanetScale-compatible hosts, or MySQL on a VPS).
2. **Backend:** deploy `backend/` to Render, Railway or PythonAnywhere. Set environment variables (`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `DB_*`, `CORS_ALLOWED_ORIGINS`) on the host. Add `gunicorn` and `whitenoise`, run `migrate`, and store product images on a media service (Cloudinary or S3) because most hosts delete local files.
3. **Frontend:** `npm run build`, then host `frontend/dist` on Netlify or Vercel. Set `VITE_API_URL` to your deployed API URL (ending in `/api`).
4. Add your frontend URL to `CORS_ALLOWED_ORIGINS` on the backend.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `pip install mysqlclient` fails (Mac) | `brew install mysql pkg-config`, then install again |
| `pip install mysqlclient` fails (Linux) | `sudo apt install libmysqlclient-dev pkg-config build-essential python3-dev` |
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `backend/.env` |
| `Unknown database 'ecommerce_db'` | Run the `CREATE DATABASE` statement from step 1A |
| Website says "Cannot reach the server" | Backend is not running, or `VITE_API_URL` is wrong |
| Browser console shows a CORS error | Add your frontend address to `CORS_ALLOWED_ORIGINS` in `.env` and restart Django |
| PowerShell blocks `activate` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Images missing | Run `python manage.py seed_data` and keep the backend running (it serves `/media/`) |

## 12. Interview talking points

- Why a token is sent with each request and what `Authorization: Token ...` does.
- Why totals are recalculated on the server (a browser can be edited by the user).
- Why `OrderItem` copies the product name and price.
- What `@transaction.atomic` and `select_for_update` protect against (half-saved orders, two buyers taking the last item).
- How `ProtectedRoute` differs from real backend permissions.
- How React state, props and context share data (`CartContext`, `ProductCard` props).
- The difference between GET, POST, PATCH and DELETE, and which endpoint in this project uses each.
