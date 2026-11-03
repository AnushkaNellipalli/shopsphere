from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from cart.models import Cart
from orders.models import Order
from products.models import Category, Product

ADDRESS = {"full_name": "Asha Rao", "phone": "9876543210", "address_line": "12 MG Road",
           "city": "Hyderabad", "state": "Telangana", "pincode": "500001"}


class ShopFlowTests(APITestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Gadgets", slug="gadgets")
        self.p1 = Product.objects.create(category=self.cat, name="Earbuds", description="Nice",
                                         price=Decimal("1000.00"), stock=5, is_featured=True)
        self.p2 = Product.objects.create(category=self.cat, name="Speaker", description="Loud",
                                         price=Decimal("500.50"), stock=2)
        self.alice = User.objects.create_user("alice", "a@x.com", "Str0ng!Pass1")
        self.bob = User.objects.create_user("bob", "b@x.com", "Str0ng!Pass1")
        self.admin = User.objects.create_superuser("boss", "boss@x.com", "Str0ng!Pass1")

    def login(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    # ---------- auth ----------
    def test_register_login_logout(self):
        r = self.client.post("/api/auth/register/", {"username": "newbie", "email": "n@x.com",
                             "password": "Str0ng!Pass1", "password2": "Str0ng!Pass1"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["user"]["role"], "customer")
        user = User.objects.get(username="newbie")
        self.assertNotEqual(user.password, "Str0ng!Pass1")  # hashed, not plain text
        r = self.client.post("/api/auth/login/", {"username": "newbie", "password": "Str0ng!Pass1"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_register_validation(self):
        r = self.client.post("/api/auth/register/", {"username": "x", "email": "a@x.com",
                             "password": "12345678", "password2": "12345678"})
        self.assertEqual(r.status_code, 400)  # duplicate email + weak password
        r = self.client.post("/api/auth/login/", {"username": "alice", "password": "wrong"})
        self.assertEqual(r.status_code, 400)

    # ---------- products ----------
    def test_product_list_search_filter_sort(self):
        r = self.client.get("/api/products/")
        self.assertEqual(r.data["count"], 2)
        self.assertEqual(self.client.get("/api/products/?search=speak").data["count"], 1)
        self.assertEqual(self.client.get("/api/products/?category=gadgets").data["count"], 2)
        self.assertEqual(self.client.get("/api/products/?category=nope").data["count"], 0)
        prices = [p["price"] for p in self.client.get("/api/products/?ordering=price").data["results"]]
        self.assertEqual(prices, ["500.50", "1000.00"])
        self.assertEqual(self.client.get("/api/products/?featured=true").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/products/{self.p1.id}/").status_code, 200)

    def test_only_admin_can_manage_products(self):
        data = {"name": "New", "description": "d", "price": "10.00", "stock": 3, "category": self.cat.id}
        self.assertEqual(self.client.post("/api/products/", data).status_code, 401)
        self.login(self.alice)
        self.assertEqual(self.client.post("/api/products/", data).status_code, 403)
        self.login(self.admin)
        self.assertEqual(self.client.post("/api/products/", data).status_code, 201)
        bad = {**data, "price": "-5"}
        self.assertEqual(self.client.post("/api/products/", bad).status_code, 400)

    # ---------- cart ----------
    def test_cart_flow(self):
        self.assertEqual(self.client.get("/api/cart/").status_code, 401)
        self.login(self.alice)
        r = self.client.post("/api/cart/items/", {"product_id": self.p1.id, "quantity": 2})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["total"], "2000.00")
        self.client.post("/api/cart/items/", {"product_id": self.p2.id, "quantity": 1})
        item_id = self.client.get("/api/cart/").data["items"][0]["id"]
        r = self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 3})
        self.assertEqual(r.data["item_count"], 4)
        self.assertEqual(self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 99}).status_code, 400)
        r = self.client.delete(f"/api/cart/items/{item_id}/")
        self.assertEqual(len(r.data["items"]), 1)
        # stock limit
        r = self.client.post("/api/cart/items/", {"product_id": self.p2.id, "quantity": 5})
        self.assertEqual(r.status_code, 400)

    def test_cannot_touch_other_users_cart_item(self):
        self.login(self.alice)
        self.client.post("/api/cart/items/", {"product_id": self.p1.id, "quantity": 1})
        item_id = Cart.objects.get(user=self.alice).items.first().id
        self.login(self.bob)
        self.assertEqual(self.client.delete(f"/api/cart/items/{item_id}/").status_code, 404)

    # ---------- orders ----------
    def place_order(self, user):
        self.login(user)
        self.client.post("/api/cart/items/", {"product_id": self.p1.id, "quantity": 2})
        self.client.post("/api/cart/items/", {"product_id": self.p2.id, "quantity": 1})
        return self.client.post("/api/orders/", ADDRESS)

    def test_order_total_is_calculated_on_server(self):
        self.login(self.alice)
        self.client.post("/api/cart/items/", {"product_id": self.p1.id, "quantity": 2})
        # A cheating client sends its own total/price. The server must ignore it.
        r = self.client.post("/api/orders/", {**ADDRESS, "total_amount": "1.00", "price": "1"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["total_amount"], "2000.00")
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, 3)                       # stock reduced
        self.assertEqual(Cart.objects.get(user=self.alice).items.count(), 0)  # cart emptied

    def test_order_price_snapshot(self):
        r = self.place_order(self.alice)
        self.assertEqual(r.data["total_amount"], "2500.50")
        self.p1.price = Decimal("9999.00")
        self.p1.save()
        order = Order.objects.get(pk=r.data["id"])
        self.assertEqual(order.total_amount, Decimal("2500.50"))
        self.assertEqual(order.items.get(product_name="Earbuds").price, Decimal("1000.00"))

    def test_checkout_validation(self):
        self.login(self.alice)
        self.assertEqual(self.client.post("/api/orders/", ADDRESS).status_code, 400)  # empty cart
        self.client.post("/api/cart/items/", {"product_id": self.p1.id, "quantity": 1})
        self.assertEqual(self.client.post("/api/orders/", {**ADDRESS, "pincode": "12"}).status_code, 400)
        self.assertEqual(self.client.post("/api/orders/", {**ADDRESS, "phone": "abc"}).status_code, 400)

    def test_stock_checked_at_checkout(self):
        self.login(self.alice)
        self.client.post("/api/cart/items/", {"product_id": self.p2.id, "quantity": 2})
        self.p2.stock = 1
        self.p2.save()
        r = self.client.post("/api/orders/", ADDRESS)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_customers_cannot_see_other_customers_orders(self):
        order_id = self.place_order(self.alice).data["id"]
        self.login(self.bob)
        self.assertEqual(self.client.get(f"/api/orders/{order_id}/").status_code, 404)
        self.assertEqual(len(self.client.get("/api/orders/").data), 0)
        self.login(self.alice)
        self.assertEqual(self.client.get(f"/api/orders/{order_id}/").status_code, 200)
        self.assertEqual(len(self.client.get("/api/orders/").data), 1)

    def test_status_update_admin_only(self):
        order_id = self.place_order(self.alice).data["id"]
        r = self.client.patch(f"/api/orders/{order_id}/", {"status": "shipped"})
        self.assertEqual(r.status_code, 403)
        self.login(self.admin)
        r = self.client.patch(f"/api/orders/{order_id}/", {"status": "shipped"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(self.client.get("/api/orders/").data), 1)  # admin sees all
