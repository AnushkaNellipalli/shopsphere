import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatPrice } from "../services/api";

// Props: product is one product object from the API.
export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!user) {
      showToast("Please log in to add items to your cart.", "error");
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      showToast(`${product.name} added to cart`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="product-img-wrap">
        <img
  src={product.image}
  alt={product.name}
  loading="lazy"
  style={{
    width: "100%",
    height: "200px",
    objectFit: "cover",
    display: "block"
  }}
/>
        {product.stock === 0 && <span className="tag tag-out">Out of stock</span>}
      </Link>
      <div className="product-body">
        <span className="product-cat">{product.category_name}</span>
        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
        <div className="product-bottom">
          <strong className="price">{formatPrice(product.price)}</strong>
          <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={adding || product.stock === 0}>
            {adding ? "Adding..." : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}