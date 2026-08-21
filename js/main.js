import { loadProducts, getProducts, getFeaturedProducts } from "./products.js";
import {
  addToCart,
  getCart,
  getCartTotal,
  getCartItemCount,
  updateCartCount,
  removeFromCart,
  updateQuantity,
  clearCart,
} from "./cart.js";
import { loginUser, signupUser, logoutUser, watchAuthState } from "./auth.js";
import { auth } from "./firebase-config.js";

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Resolves with the Firebase user (or null) once the SDK confirms auth state. */
const waitForAuthState = () =>
  new Promise((resolve) => {
    const unsub = watchAuthState((user) => {
      unsub();
      resolve(user);
    });
  });

const setMessage = (elId, text, isError = false) => {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", isError);
  el.classList.toggle("success", !isError && !!text);
};

// ─── Product rendering ────────────────────────────────────────────────────────

const renderProductCard = (product) => {
  const media = product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />`
    : `<div class="product-placeholder" aria-hidden="true">${product.icon}</div>`;

  return `
    <article class="product-card">
      ${media}
      <div class="product-info">
        <div class="product-meta">
          <span class="product-category">${product.category}</span>
          <strong class="product-price">$${Number(product.price).toFixed(2)}</strong>
        </div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <button class="btn btn-primary add-to-cart" data-id="${product.id}">
          Add to cart
        </button>
      </div>
    </article>`;
};

const buildProducts = (items, targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!items.length) {
    target.innerHTML = '<p class="empty-state">No products found.</p>';
    return;
  }

  target.innerHTML = items.map(renderProductCard).join("");

  target.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const product = getProducts().find((p) => p.id === btn.dataset.id);
      if (!product) return;

      btn.disabled = true;
      btn.textContent = "Adding…";

      const result = await addToCart(product);

      if (result?.needsLogin) {
        // Non-blocking — show a notice near the button instead of hard redirect
        btn.textContent = "Add to cart";
        btn.disabled = false;
        showLoginNotice();
        return;
      }

      btn.textContent = "Added ✓";
      setTimeout(() => {
        btn.textContent = "Add to cart";
        btn.disabled = false;
      }, 1200);
    });
  });
};

/** Shows a floating banner asking the user to log in. */
const showLoginNotice = () => {
  let banner = document.getElementById("login-notice");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "login-notice";
    banner.className = "login-notice";
    banner.innerHTML = `
      <span>You need to <a href="login.html">log in</a> to add items to your cart.</span>
      <button class="notice-close" aria-label="Dismiss">✕</button>`;
    document.body.appendChild(banner);
    banner.querySelector(".notice-close").addEventListener("click", () => banner.remove());
    setTimeout(() => banner?.remove(), 5000);
  }
};

const showProductsLoading = (targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>`;
};

// ─── Cart page ────────────────────────────────────────────────────────────────

const renderCartPage = async () => {
  const cartContainer = document.getElementById("cart-items");
  const totalLabel = document.getElementById("cart-total");
  const countLabel = document.getElementById("cart-item-count");

  if (!cartContainer || !totalLabel) return;

  if (!auth.currentUser) {
    cartContainer.innerHTML =
      '<p class="empty-state">Please <a href="login.html">log in</a> to view your cart.</p>';
    totalLabel.textContent = "$0.00";
    if (countLabel) countLabel.textContent = "0 items";
    return;
  }

  cartContainer.innerHTML = '<p class="empty-state loading-text">Loading cart…</p>';

  try {
    const cart = await getCart();

    if (!cart.length) {
      cartContainer.innerHTML =
        '<p class="empty-state">Your cart is empty. <a href="shop.html">Start shopping</a>.</p>';
      totalLabel.textContent = "$0.00";
      if (countLabel) countLabel.textContent = "0 items";
      return;
    }

    const total = getCartTotal(cart);
    const count = getCartItemCount(cart);

    if (countLabel) countLabel.textContent = `${count} item${count !== 1 ? "s" : ""}`;

    cartContainer.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-info">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img" />` : ""}
            <div>
              <h3>${item.name}</h3>
              <p class="cart-item-price">$${Number(item.price).toFixed(2)} each</p>
              <p class="cart-item-subtotal">Subtotal: $${(Number(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          </div>
          <div class="cart-controls">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
            <button class="remove-btn" data-id="${item.id}" aria-label="Remove ${item.name}">Remove</button>
          </div>
        </div>`,
      )
      .join("");

    cartContainer.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const delta = btn.dataset.action === "increase" ? 1 : -1;
        await updateQuantity(btn.dataset.id, delta);
        await renderCartPage();
      });
    });

    cartContainer.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeFromCart(btn.dataset.id);
        await renderCartPage();
      });
    });

    totalLabel.textContent = `$${total.toFixed(2)}`;
  } catch (err) {
    console.error("Cart load error:", err);
    cartContainer.innerHTML =
      '<p class="empty-state">Unable to load your cart. Please try again.</p>';
  }
};

// ─── Auth forms ───────────────────────────────────────────────────────────────

const initLoginForm = () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const btn = form.querySelector("button[type=submit]");

    setMessage("auth-message", "Signing in…");
    btn.disabled = true;

    const result = await loginUser(email, password);

    if (result.success) {
      setMessage("auth-message", `Welcome back! Redirecting…`);
      form.reset();
      setTimeout(() => (window.location.href = "shop.html"), 900);
    } else {
      setMessage("auth-message", result.message, true);
      btn.disabled = false;
    }
  });
};

const initSignupForm = () => {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;
    const btn = form.querySelector("button[type=submit]");

    if (password !== confirm) {
      setMessage("signup-message", "Passwords do not match.", true);
      return;
    }

    setMessage("signup-message", "Creating account…");
    btn.disabled = true;

    const result = await signupUser(email, password);

    if (result.success) {
      setMessage("signup-message", "Account created! Redirecting…");
      form.reset();
      setTimeout(() => (window.location.href = "shop.html"), 900);
    } else {
      setMessage("signup-message", result.message, true);
      btn.disabled = false;
    }
  });
};

// ─── Navbar ───────────────────────────────────────────────────────────────────

const updateNavbar = (user) => {
  const loginLink = document.querySelector('.nav a[href="login.html"]');
  if (!loginLink) return;

  if (user) {
    loginLink.textContent = user.displayName || user.email.split("@")[0];
    loginLink.title = `Logged in as ${user.email} — click to sign out`;
    loginLink.href = "#";
    loginLink.onclick = async (e) => {
      e.preventDefault();
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

// ─── Cart protection ──────────────────────────────────────────────────────────

const protectCartPage = async () => {
  if (!document.getElementById("cart-items")) return;

  const user = await waitForAuthState();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await renderCartPage();
};

// ─── Checkout ─────────────────────────────────────────────────────────────────

const initCheckout = () => {
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearBtn = document.getElementById("clear-cart-btn");

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      if (!auth.currentUser) {
        window.location.href = "login.html";
        return;
      }

      const cart = await getCart();
      if (!cart.length) {
        alert("Your cart is empty.");
        return;
      }

      alert(`Order placed! Total: $${getCartTotal(cart).toFixed(2)}. Thank you for shopping with Urban Threads.`);
      await clearCart();
      await renderCartPage();
      await updateCartCount();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      if (!confirm("Clear your entire cart?")) return;
      await clearCart();
      await renderCartPage();
    });
  }
};

// ─── Login-page redirect if already signed in ─────────────────────────────────

const redirectIfLoggedIn = async () => {
  // Only run on the login page
  if (!document.getElementById("login-form")) return;

  const user = await waitForAuthState();
  if (user) {
    setMessage("auth-message", `You're already signed in as ${user.email}. Redirecting…`);
    setTimeout(() => (window.location.href = "shop.html"), 1200);
  }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

const initializeApp = async () => {
  initLoginForm();
  initSignupForm();
  initCheckout();

  await redirectIfLoggedIn();
  await protectCartPage();

  watchAuthState(async (user) => {
    updateNavbar(user);

    if (user) {
      await updateCartCount();
      await renderCartPage();
    } else {
      document.querySelectorAll("#cart-count, .cart-count").forEach((n) => {
        n.textContent = "0";
      });
    }
  });

  // Show skeleton loaders before data arrives
  showProductsLoading("featured-products");
  showProductsLoading("shop-products");

  try {
    const products = await loadProducts();
    buildProducts(getFeaturedProducts(), "featured-products");
    buildProducts(products, "shop-products");
  } catch (err) {
    console.error("Product load error:", err);
    ["featured-products", "shop-products"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML =
          '<p class="empty-state">Unable to load products. Check your Firestore connection and security rules.</p>';
      }
    });
  }
};

document.addEventListener("DOMContentLoaded", initializeApp);
