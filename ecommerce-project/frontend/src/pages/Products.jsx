import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid.jsx";
import Loader from "../components/Loader.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getCategories, getProducts } from "../services/api";

export default function Products() {
  // The filters live in the URL (?search=...&category=...) so links can be shared and Back works.
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const ordering = params.get("ordering") || "";
  const page = Number(params.get("page") || 1);

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  function loadProducts() {
    setLoading(true);
    setError("");
    getProducts({ search, category, ordering, page })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Re-fetch whenever a filter changes.
  useEffect(loadProducts, [search, category, ordering, page]);

  // Change one filter, keep the others (spread operator), and go back to page 1.
  function updateParam(key, value) {
    const next = { search, category, ordering, [key]: value };
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setParams(cleaned);
  }

  const totalPages = Math.ceil(data.count / 12) || 1;

  return (
    <>
      <h1 className="page-title">{search ? `Results for "${search}"` : "All products"}</h1>

      <div className="filters">
        <div className="category-row">
          <button className={`category-chip ${!category ? "active" : ""}`} onClick={() => updateParam("category", "")}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={`category-chip ${category === c.slug ? "active" : ""}`} onClick={() => updateParam("category", c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
        <label className="sort">
          Sort by
          <select value={ordering} onChange={(e) => updateParam("ordering", e.target.value)}>
            <option value="">Newest</option>
            <option value="price">Price: low to high</option>
            <option value="-price">Price: high to low</option>
          </select>
        </label>
      </div>

      {loading && <Loader />}
      <ErrorMessage message={error} onRetry={loadProducts} />

      {!loading && !error && data.results.length === 0 && (
        <div className="empty">
          <h3>No products found</h3>
          <p>Try a different search or category.</p>
        </div>
      )}

      {!loading && !error && data.results.length > 0 && (
        <>
          <p className="muted">{data.count} product{data.count !== 1 && "s"}</p>
          <ProductGrid products={data.results} />
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-small" disabled={!data.previous}
                onClick={() => setParams({ ...Object.fromEntries(params), page: page - 1 })}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-small" disabled={!data.next}
                onClick={() => setParams({ ...Object.fromEntries(params), page: page + 1 })}>Next</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
