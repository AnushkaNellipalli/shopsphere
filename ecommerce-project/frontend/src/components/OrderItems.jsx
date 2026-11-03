import { formatPrice } from "../services/api";

// Table of the products inside one order. Used on the confirmation and detail pages.
export default function OrderItems({ order }) {
  return (
    <div className="order-items">
      {order.items.map((item) => (
        <div className="order-item" key={item.id}>
          {item.product_image && <img src={item.product_image} alt={item.product_name} />}
          <div>
            <strong>{item.product_name}</strong>
            <span className="muted">{formatPrice(item.price)} × {item.quantity}</span>
          </div>
          <strong>{formatPrice(item.subtotal)}</strong>
        </div>
      ))}
      <div className="summary-row total"><span>Total paid (demo)</span><span>{formatPrice(order.total_amount)}</span></div>
    </div>
  );
}
