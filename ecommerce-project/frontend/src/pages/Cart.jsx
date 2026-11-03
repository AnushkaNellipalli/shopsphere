import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatPrice } from "../services/api";

export default function Cart() {
  const { cart, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null); // which row is being updated

  // callback: runs any cart action, shows errors as toasts
  async function run(itemId, action) {
    setBusyId(itemId);
    try { await action(); } catch (err) { showToast(err.message, "error"); }
    finally { setBusyId(null); }
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty">
        <h1>Your cart is empty</h1>
        <p>Looks like you have not added anything yet.</p>
        <Link to="/products" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Shopping cart</h1>
      <div className="cart-layout">
        <div className="cart-list">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-row">
              <Link to={`/products/${item.product.id}`}>
                <img src={item.product.image} alt={item.product.name} />
              </Link>
              <div className="cart-info">
                <Link to={`/products/${item.product.id}`} className="product-name">{item.product.name}</Link>
                <span className="muted">{formatPrice(item.product.price)} each</span>
                <button className="link-btn" disabled={busyId === item.id}
                  onClick={() => run(item.id, () => removeItem(item.id))}>Remove</button>
              </div>
              <div className="qty">
                <button disabled={busyId === item.id || item.quantity <= 1} aria-label="Decrease"
                  onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity - 1))}>−</button>
                <span>{item.quantity}</span>
                <button disabled={busyId === item.id} aria-label="Increase"
                  onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity + 1))}>+</button>
              </div>
              <strong className="cart-sub">{formatPrice(item.subtotal)}</strong>
            </div>
          ))}
        </div>

        <aside className="summary card">
          <h3>Order summary</h3>
          <div className="summary-row"><span>Items ({cart.item_count})</span><span>{formatPrice(cart.total)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>Free</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatPrice(cart.total)}</span></div>
          <button className="btn btn-primary btn-block" onClick={() => navigate("/checkout")}>Proceed to checkout</button>
        </aside>
      </div>
    </>
  );
}
