import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { addToCartApi, getCart, removeCartItemApi, updateCartItemApi } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext();
const EMPTY_CART = { items: [], total: "0.00", item_count: 0 };

// The cart lives in the database. This context keeps a copy for React to display.
export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);

  const refreshCart = useCallback(async () => {
    try { setCart(await getCart()); } catch { setCart(EMPTY_CART); }
  }, []);

  // Load the cart when a user logs in, and clear it when they log out.
  useEffect(() => {
    if (user) refreshCart();
    else setCart(EMPTY_CART);
  }, [user, refreshCart]);

  // Each function below calls the API, and Django replies with the updated cart.
  const addToCart = async (productId, quantity = 1) => setCart(await addToCartApi(productId, quantity));
  const updateQuantity = async (itemId, quantity) => setCart(await updateCartItemApi(itemId, quantity));
  const removeItem = async (itemId) => setCart(await removeCartItemApi(itemId));

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
