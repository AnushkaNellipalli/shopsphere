// All communication with the Django backend happens in this one file.
// Components call small functions like getProducts() instead of writing fetch() everywhere.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function getToken() {
  return localStorage.getItem("token");
}
export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

// Turn Django's error JSON into one readable message.
// Django sends things like {"detail": "..."} or {"email": ["Already used"]}
function extractMessage(data) {
  if (!data || typeof data !== "object") return "Something went wrong. Please try again.";
  if (data.detail) return data.detail;
  const messages = Object.entries(data).map(([field, errs]) => {
    const text = Array.isArray(errs) ? errs.join(" ") : String(errs);
    return field === "non_field_errors" ? text : `${field}: ${text}`;
  });
  return messages.join(" | ");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the Django backend running?");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(extractMessage(data));
    error.status = response.status;
    error.fieldErrors = data; // forms use this to show errors under each field
    throw error;
  }
  return data;
}

// ---- Auth ----
export const registerUser = (form) => request("/auth/register/", { method: "POST", body: form });
export const loginUser = (form) => request("/auth/login/", { method: "POST", body: form });
export const logoutUser = () => request("/auth/logout/", { method: "POST" });
export const getMe = () => request("/auth/me/");

// ---- Products ----
// params example: { search: "shoe", category: "fashion", ordering: "price", page: 2 }
export function getProducts(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  return request(`/products/?${new URLSearchParams(clean)}`);
}
export const getProduct = (id) => request(`/products/${id}/`);
export const getCategories = () => request("/categories/");

// ---- Cart ----
export const getCart = () => request("/cart/");
export const addToCartApi = (product_id, quantity = 1) =>
  request("/cart/items/", { method: "POST", body: { product_id, quantity } });
export const updateCartItemApi = (itemId, quantity) =>
  request(`/cart/items/${itemId}/`, { method: "PATCH", body: { quantity } });
export const removeCartItemApi = (itemId) => request(`/cart/items/${itemId}/`, { method: "DELETE" });

// ---- Orders ----
export const createOrder = (address) => request("/orders/", { method: "POST", body: address });
export const getOrders = () => request("/orders/");
export const getOrder = (id) => request(`/orders/${id}/`);

// ---- Helpers ----
export const formatPrice = (value) =>
  "₹" + Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
