import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const getCartRef = () => {
  const user = auth.currentUser;
  return user ? doc(db, "users", user.uid, "cart", "items") : null;
};

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
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in before adding items to your cart.");
    window.location.href = "login.html";
    return;
  }

  const cart = await getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  await saveCart(cart);
  updateCartCount();
};

export const removeFromCart = async (productId) => {
  const cart = await getCart();
  await saveCart(cart.filter((item) => item.id !== productId));
  updateCartCount();
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
  updateCartCount();
};

export const clearCart = async () => {
  const ref = getCartRef();
  if (ref) await deleteDoc(ref);
  updateCartCount();
};

export const getCartTotal = (cart) =>
  cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

export const updateCartCount = async () => {
  const cart = await getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);

  document.querySelectorAll("#cart-count, .cart-count").forEach((node) => {
    node.textContent = count;
  });
};
