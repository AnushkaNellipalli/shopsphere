import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loader from "../components/Loader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatPrice, getOrders } from "../services/api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrders().then(setOrders).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  if (orders.length === 0) {
    return (
      <div className="empty">
        <h1>No orders yet</h1>
        <p>When you place an order, it will show up here.</p>
        <Link to="/products" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">My orders</h1>
      <div className="order-list">
        {orders.map((order) => (
          <Link to={`/orders/${order.id}`} key={order.id} className="card order-card">
            <div>
              <strong>Order #{order.id}</strong>
              <span className="muted">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <span className="muted">{order.items.map((i) => i.product_name).join(", ")}</span>
            <div className="order-card-end">
              <StatusBadge status={order.status} />
              <strong>{formatPrice(order.total_amount)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
