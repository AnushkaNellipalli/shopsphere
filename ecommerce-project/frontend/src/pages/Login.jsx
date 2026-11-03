import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // One handler for every input: the input's name tells us which field to update.
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError("Please enter your username and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(form);
      showToast("Welcome back!");
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-box">
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} className="form" noValidate>
        <ErrorMessage message={error} />
        <label>Username
          <input name="username" value={form.username} onChange={handleChange} autoComplete="username" />
        </label>
        <label>Password
          <input name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? "Logging in..." : "Log in"}</button>
      </form>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
