import {
  loadProducts,
  getProducts,
  getFeaturedProducts,
} from "./products.js";
import {
  addToCart,
  getCart,
  getCartTotal,
  updateCartCount,
  removeFromCart,
  updateQuantity,
  clearCart,
} from "./cart.js";
import {
  loginUser,
  logoutUser,
  watchAuthState,
} from "./auth.js";
import { auth } from "./firebase-config.js";

const renderProductCard = (product) => {
  const image = product.image
    ? `<img src="${product.image}" alt="${product.name}" />`
    : `<div class="product-image" aria-label="${product.name}">${product.icon}</div>`;

  return `
    <article class="product-card">
      ${image}
      <div class="product-info">
        <div class="product-meta">
          <span>${product.category}</span>
          <strong>$${Number(product.price).toFixed(2)}</strong>
        </div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <button class="btn btn-primary add-to-cart" data-id="${product.id}">
          Add to cart
        </button>
      </div>
    </article>
  `;
};

const buildProducts = (items, targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!items.length) {
    target.innerHTML = '<p class="empty-state">No products found.</p>';
    return;
  }

  target.innerHTML = items.map(renderProductCard).join("");

  target.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", async () => {
      const selected = getProducts().find(
        (product) => product.id === button.dataset.id,
      );

      if (selected) {
        await addToCart(selected);
        await updateCartCount();
      }
    });
  });
};

const renderCartPage = async () => {
  const cartItems = document.getElementById("cart-items");
  const totalLabel = document.getElementById("cart-total");

  if (!cartItems || !totalLabel) return;

  if (!auth.currentUser) {
    cartItems.innerHTML =
      '<p class="empty-state">Please log in to view your cart.</p>';
    totalLabel.textContent = "$0.00";
    return;
  }

  try {
    const cart = await getCart();

    if (!cart.length) {
      cartItems.innerHTML =
        '<p class="empty-state">Your cart is empty. Start shopping to fill it up.</p>';
      totalLabel.textContent = "$0.00";
      return;
    }

    cartItems.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item">
          <div>
            <h3>${item.name}</h3>
            <p>$${Number(item.price).toFixed(2)} each</p>
          </div>
          <div class="cart-controls">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
            <button class="remove-btn" data-id="${item.id}">Remove</button>
          </div>
        </div>
      `,
      )
      .join("");

    cartItems.querySelectorAll(".qty-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const delta = button.dataset.action === "increase" ? 1 : -1;
        await updateQuantity(id, delta);
        await renderCartPage();
      });
    });

    cartItems.querySelectorAll(".remove-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await removeFromCart(button.dataset.id);
        await renderCartPage();
      });
    });

    totalLabel.textContent = `$${getCartTotal(cart).toFixed(2)}`;
  } catch (error) {
    console.error("Error loading cart:", error);
    cartItems.innerHTML =
      '<p class="empty-state">Unable to load your cart. Please try again.</p>';
  }
};

const initLoginForm = () => {
  const form = document.getElementById("login-form");
  const message = document.getElementById("auth-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    message.textContent = "Signing in...";
    message.classList.remove("error");

    const result = await loginUser(email, password);

    message.textContent = result.message;
    message.classList.toggle("error", !result.success);

    if (result.success) {
      form.reset();
      setTimeout(() => {
        window.location.href = "shop.html";
      }, 700);
    }
  });
};

const updateNavbar = (user) => {
  const loginLink = document.querySelector('.nav a[href="login.html"]');
  if (!loginLink) return;

  if (user) {
    loginLink.textContent = user.displayName || user.email;
    loginLink.title = user.email;
    loginLink.href = "#";
    loginLink.onclick = async (event) => {
      event.preventDefault();
      await logoutUser();
      window.location.reload();
    };
  } else {
    loginLink.textContent = "Login";
    loginLink.href = "login.html";
    loginLink.onclick = null;
    loginLink.title = "";
  }
};

const protectCartPage = async () => {
  if (!document.getElementById("cart-items")) return;

  if (!auth.currentUser) {
    window.location.href = "login.html";
    return;
  }

  await renderCartPage();
};

const initCheckout = () => {
  const button = document.getElementById("checkout-btn");
  if (!button) return;

  button.addEventListener("click", async () => {
    if (!auth.currentUser) {
      window.location.href = "login.html";
      return;
    }

    const cart = await getCart();

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    alert("Checkout complete! Your order is being prepared.");
    await clearCart();
    await renderCartPage();
    await updateCartCount();
  });
};

const initializeApp = async () => {
  initLoginForm();
  initCheckout();

  watchAuthState(async (user) => {
    updateNavbar(user);

    if (user) {
      await updateCartCount();
      await renderCartPage();
    } else {
      document.querySelectorAll("#cart-count, .cart-count").forEach((node) => {
        node.textContent = "0";
      });
    }
  });

  try {
    const products = await loadProducts();

    buildProducts(getFeaturedProducts(), "featured-products");
    buildProducts(products, "shop-products");
  } catch (error) {
    console.error("Error loading products from Firestore:", error);

    const targets = ["featured-products", "shop-products"];
    targets.forEach((id) => {
      const target = document.getElementById(id);
      if (target) {
        target.innerHTML =
          '<p class="empty-state">Unable to load products. Check your Firebase Firestore connection and rules.</p>';
      }
    });
  }

  await protectCartPage();
};

document.addEventListener("DOMContentLoaded", initializeApp);
