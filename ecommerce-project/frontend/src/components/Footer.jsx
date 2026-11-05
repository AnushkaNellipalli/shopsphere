import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo logo-light"><span className="logo-dot" />ShopSphere</div>
          <p>Everyday essentials, delivered to your door.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?category=electronics">Electronics</Link>
          <Link to="/products?category=fashion">Fashion</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/orders">My orders</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/login">Login</Link>
        </div>
        <div>
          <h4>Contact</h4>
          <p>support@shopsphere.example</p>
          <p>+91 7780444101</p>
          <p>Hyderabad, Telangana, India</p>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} ShopSphere. A demo project. No real payments are taken.</div>
    </footer>
  );
}
