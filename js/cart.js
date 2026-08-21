import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCartRef = () => {
  const user = auth.currentUser;
  return user ? doc(db, "users", user.uid, "cart", "items") : null;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getCart = async () => {
  const ref = getCartRef();
  if (!ref) return [];
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data().items || [] : [];
};

export const saveCart = async (cart) => {
  const ref = getCartRef();
  if (!ref) return;
  await setDoc(ref, { items: cart }, { merge: true });
};

export const addToCart = async (product) => {
  if (!auth.currentUser) {
    // Show a non-blocking notice instead of an abrupt redirect
    return { needsLogin: true };
  }

  const cart = await getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  await saveCart(cart);
  await updateCartCount();
  return { needsLogin: false };
};

export const removeFromCart = async (productId) => {
  const cart = await getCart();
  await saveCart(cart.filter((item) => item.id !== productId));
  await updateCartCount();
};

export const updateQuantity = async (productId, delta) => {
  const cart = await getCart();
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  await saveCart(cart);
  await updateCartCount();
};

export const clearCart = async () => {
  const ref = getCartRef();
  if (ref) await deleteDoc(ref);
  await updateCartCount();
};

export const getCartTotal = (cart) =>
  cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

export const getCartItemCount = (cart) =>
  cart.reduce((sum, item) => sum + item.quantity, 0);

export const updateCartCount = async () => {
  const cart = await getCart();
  const count = getCartItemCount(cart);
  document.querySelectorAll("#cart-count, .cart-count").forEach((node) => {
    node.textContent = count;
  });
};
