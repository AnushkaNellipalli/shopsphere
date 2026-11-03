import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loader from "../components/Loader.jsx";
import OrderItems from "../components/OrderItems.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getOrder } from "../services/api";

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrder(id)
      // Django returns 404 if the order belongs to someone else
      .then(setOrder)
      .catch((err) => setError(err.status === 404 ? "Order not found." : err.message));
  }, [id]);

  if (error) return <><ErrorMessage message={error} /><Link to="/orders">Back to my orders</Link></>;
  if (!order) return <Loader />;

  return (
    <>
      <Link to="/orders" className="muted">← All orders</Link>
      <h1 className="page-title">Order #{order.id} <StatusBadge status={order.status} /></h1>
      <div className="cart-layout">
        <div className="card pad"><OrderItems order={order} /></div>
        <aside className="summary card">
          <h3>Delivery address</h3>
          <p>{order.full_name}<br />{order.address_line}<br />{order.city}, {order.state} {order.pincode}<br />{order.phone}</p>
          <p className="muted">Placed on {new Date(order.created_at).toLocaleString("en-IN")}</p>
        </aside>
      </div>
    </>
  );
}
