import ProductCard from "./ProductCard.jsx";

// Reusable list of product cards. Uses map() to turn an array of data into components.
export default function ProductGrid({ products }) {
  return (
    <div className="grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
