import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import ProductGallery from "../components/ProductGallery.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatPrice, getProduct } from "../services/api";

export default function ProductDetail() {
  const { id } = useParams(); // the :id from the URL
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(setProduct)
      .catch((err) => setError(err.status === 404 ? "This product does not exist." : err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAdd() {
    if (!user) {
      showToast("Please log in to add items to your cart.", "error");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    try {
      await addToCart(product.id, quantity);
      showToast(`${quantity} x ${product.name} added to cart`);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  // Gallery images come from the API. Products with no gallery rows fall back to the old single image.
  const galleryImages = product.images?.length
    ? product.images.map((img) => ({ src: img.image, alt: img.alt_text || product.name }))
    : product.image
    ? [{ src: product.image, alt: product.name }]
    : [];

  return (
    <div className="detail">
      <div className="detail-img">
        <ProductGallery key={product.id} images={galleryImages} name={product.name} />
      </div>
      <div className="detail-info">
        <Link to={`/products?category=${product.category_slug}`} className="product-cat">{product.category_name}</Link>
        <h1>{product.name}</h1>
        <p className="detail-price">{formatPrice(product.price)}</p>
        <p className="detail-desc">{product.description}</p>
        <p className={product.stock > 0 ? "stock-ok" : "stock-out"}>
          {product.stock === 0 ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}
        </p>

        {product.stock > 0 && (
          <div className="detail-actions">
            <div className="qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} aria-label="Increase">+</button>
            </div>
            <button className="btn btn-primary" onClick={handleAdd}>Add to cart</button>
          </div>
        )}
      </div>
    </div>
  );
}