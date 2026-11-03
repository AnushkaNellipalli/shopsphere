import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid.jsx";
import Loader from "../components/Loader.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getCategories, getProducts } from "../services/api";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadData() {
    setLoading(true);
    setError("");
    // Promise.all runs the three requests at the same time (faster than one after another)
    Promise.all([
      getCategories(),
      getProducts({ featured: "true" }),
      getProducts({ ordering: "-created_at" }),
    ])
      .then(([cats, feat, lat]) => {
        setCategories(cats);
        setFeatured(feat.results.slice(0, 8));
        setLatest(lat.results.slice(0, 8));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadData, []);

  if (loading) return <Loader text="Loading the store..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const heroImages = featured.slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>Good things for every corner of your day.</h1>
          <p>Electronics, fashion, kitchen picks and stationery in one place. Pick what you need and we will pack it.</p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">Browse all products</Link>
            <Link to="/products?ordering=price" className="btn btn-outline">Lowest prices first</Link>
          </div>
        </div>
        <div className="hero-collage">
          {heroImages.map((p) => (
            <Link to={`/products/${p.id}`} key={p.id}><img src={p.image} alt={p.name} /></Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Shop by category</h2>
        <div className="category-row">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="category-chip">{c.name}</Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Featured products</h2>
          <Link to="/products">See all</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section>
        <h2 className="section-title">Latest arrivals</h2>
        <ProductGrid products={latest} />
      </section>
    </>
  );
}
