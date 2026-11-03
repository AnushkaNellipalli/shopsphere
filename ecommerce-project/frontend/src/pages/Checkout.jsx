import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { createOrder, formatPrice } from "../services/api";

function validate(f) {
  const e = {};
  if (f.full_name.trim().length < 3) e.full_name = "Enter your full name.";
  if (!/^[0-9+\-\s]{10,15}$/.test(f.phone)) e.phone = "Enter a valid phone number.";
  if (f.address_line.trim().length < 5) e.address_line = "Enter your street address.";
  if (!f.city.trim()) e.city = "Enter your city.";
  if (!f.state.trim()) e.state = "Enter your state.";
  if (!/^[0-9]{6}$/.test(f.pincode)) e.pincode = "Pincode must be 6 digits.";
  return e;
}

export default function Checkout() {
  const { cart, refreshCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", address_line: "", city: "", state: "", pincode: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (cart.items.length === 0) {
    return (
      <div className="empty">
        <h1>Nothing to check out</h1>
        <p>Add some products to your cart first.</p>
        <Link to="/products" className="btn btn-primary">Browse products</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setError("");
    if (Object.keys(found).length > 0) return;

    setPlacing(true);
    try {
      // We send ONLY the address. Django builds the order from the saved cart
      // and calculates the total itself, so prices can't be faked from the browser.
      const order = await createOrder(form);
      await refreshCart();
      showToast("Order placed successfully!");
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      const backend = {};
      Object.entries(err.fieldErrors || {}).forEach(([k, v]) => {
        if (k !== "detail") backend[k] = Array.isArray(v) ? v.join(" ") : String(v);
      });
      setErrors(backend);
      setError(Object.keys(backend).length ? "" : err.message);
      refreshCart();
    } finally {
      setPlacing(false);
    }
  }

  const field = (name, label, autoComplete) => (
    <label>{label}
      <input name={name} value={form[name]} onChange={handleChange} autoComplete={autoComplete} />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <>
      <h1 className="page-title">Checkout</h1>
      <div className="cart-layout">
        <form className="form card pad" onSubmit={handleSubmit} noValidate>
          <h3>Delivery address</h3>
          <ErrorMessage message={error} />
          {field("full_name", "Full name", "name")}
          {field("phone", "Phone number", "tel")}
          {field("address_line", "Address", "street-address")}
          <div className="form-row">
            {field("city", "City", "address-level2")}
            {field("state", "State", "address-level1")}
          </div>
          {field("pincode", "Pincode", "postal-code")}
          <div className="alert alert-info">
            Demo payment: no card details are needed. Your order is confirmed instantly.
          </div>
          <button className="btn btn-primary btn-block" disabled={placing}>
            {placing ? "Placing order..." : `Place order · ${formatPrice(cart.total)}`}
          </button>
        </form>

        <aside className="summary card">
          <h3>Your items</h3>
          {cart.items.map((item) => (
            <div className="summary-row" key={item.id}>
              <span>{item.product.name} × {item.quantity}</span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="summary-row"><span>Delivery</span><span>Free</span></div>
          <div className="summary-row total"><span>Final amount</span><span>{formatPrice(cart.total)}</span></div>
        </aside>
      </div>
    </>
  );
}
