import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

// Frontend validation gives instant feedback. Django validates again, because the frontend can be bypassed.
function validate(form) {
  const errors = {};
  if (form.username.trim().length < 3) errors.username = "Username must be at least 3 characters.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (form.password !== form.password2) errors.password2 = "Passwords do not match.";
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", first_name: "", last_name: "", password: "", password2: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register(form);
      showToast("Account created. Welcome to ShopSphere!");
      navigate("/");
    } catch (err) {
      // Show the backend's per-field errors under the right inputs
      const backend = {};
      Object.entries(err.fieldErrors || {}).forEach(([field, msgs]) => {
        backend[field] = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      });
      setErrors(backend);
      setFormError(Object.keys(backend).length === 0 ? err.message : "");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name, label, type = "text", autoComplete) => (
    <label>{label}
      <input name={name} type={type} value={form[name]} onChange={handleChange} autoComplete={autoComplete} />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <div className="auth-box">
      <h1>Create account</h1>
      <form onSubmit={handleSubmit} className="form" noValidate>
        <ErrorMessage message={formError || errors.non_field_errors} />
        <div className="form-row">
          {field("first_name", "First name", "text", "given-name")}
          {field("last_name", "Last name", "text", "family-name")}
        </div>
        {field("username", "Username", "text", "username")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("password2", "Confirm password", "password", "new-password")}
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
