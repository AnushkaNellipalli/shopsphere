export default function Loader({ text = "Loading..." }) {
  return (
    <div className="loader" role="status">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}
