import { useState } from "react";

export default function ProductGallery({ images = [], name }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return <div className="gallery-empty">No image available</div>;
  }

  const current = images[active] || images[0];

  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={current.src} alt={current.alt || name} />
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              type="button"
              key={i}
              className={"gallery-thumb" + (i === active ? " active" : "")}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={img.src} alt={img.alt || name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}