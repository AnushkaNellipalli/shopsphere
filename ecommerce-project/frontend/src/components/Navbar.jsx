import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    setMenuOpen(false);
  }

  async function handleLogout() {
    await logout();
    showToast("You have been logged out.");
    setMenuOpen(false);
    navigate("/");
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo" onClick={closeMenu}><span className="logo-dot" />ShopSphere</Link>

        <form className="search" onSubmit={handleSearch} role="search">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" className="btn btn-primary btn-small">Search</button>
        </form>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          <NavLink to="/products" onClick={closeMenu}>Products</NavLink>
          {user && <NavLink to="/orders" onClick={closeMenu}>My Orders</NavLink>}
          <NavLink to="/cart" onClick={closeMenu} className="cart-link">
            Cart {cart.item_count > 0 && <span className="badge">{cart.item_count}</span>}
          </NavLink>
          {user?.role === "admin" && (
            <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer">Admin Panel</a>
          )}
          {user ? (
            <>
              <span className="nav-user">Hi, {user.first_name || user.username}</span>
              <button className="btn btn-outline btn-small" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>Login</NavLink>
              <Link to="/register" className="btn btn-primary btn-small" onClick={closeMenu}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
