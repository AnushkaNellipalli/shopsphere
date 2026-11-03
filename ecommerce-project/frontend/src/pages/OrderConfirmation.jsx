import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loader from "../components/Loader.jsx";
import OrderItems from "../components/OrderItems.jsx";
import { getOrder } from "../services/api";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrder(id).then(setOrder).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <ErrorMessage message={error} />;
  if (!order) return <Loader />;

  return (
    <div className="confirm">
      <div className="confirm-mark">✓</div>
      <h1>Thank you, your order is confirmed</h1>
      <p className="muted">Order #{order.id} · We will deliver to {order.address_line}, {order.city}, {order.state} {order.pincode}</p>
      <div className="card pad"><OrderItems order={order} /></div>
      <div className="hero-actions">
        <Link to={`/orders/${order.id}`} className="btn btn-outline">View order</Link>
        <Link to="/products" className="btn btn-primary">Continue shopping</Link>
      </div>
    </div>
  );
}
