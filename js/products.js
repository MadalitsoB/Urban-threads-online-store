import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allProducts = [];

// ─── Seed data (used only when Firestore products collection is empty) ────────

const SEED_PRODUCTS = [
  {
    id: "faith-over-fear-tee",
    name: "Faith Over Fear Tee",
    price: 79.99,
    category: "T-Shirts",
    description: "Premium heavyweight cotton tee with an embossed chest graphic.",
    imageURL: "https://i.pinimg.com/736x/9a/96/cd/9a96cd4036b2272b110de80fd39a0ccd.jpg",
  },
  {
    id: "urban-hoodie-black",
    name: "Urban Hoodie — Black",
    price: 119.99,
    category: "Hoodies",
    description: "Oversized fleece hoodie with a kangaroo pocket and ribbed cuffs.",
    imageURL: "https://i.pinimg.com/736x/5b/3a/97/5b3a97c1e3e2e5f1b2a3d4e5f6a7b8c9.jpg",
  },
  {
    id: "bold-cargo-pants",
    name: "Bold Cargo Pants",
    price: 99.99,
    category: "Bottoms",
    description: "Wide-leg cargo pants with six utility pockets and tapered ankles.",
    imageURL: "https://i.pinimg.com/736x/a1/b2/c3/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.jpg",
  },
  {
    id: "statement-cap",
    name: "Statement Cap",
    price: 44.99,
    category: "Accessories",
    description: "Six-panel structured cap with an embroidered logo and adjustable strap.",
    imageURL: "https://i.pinimg.com/736x/11/22/33/112233445566778899aabbccddeeff00.jpg",
  },
  {
    id: "layered-logo-tee",
    name: "Layered Logo Tee",
    price: 69.99,
    category: "T-Shirts",
    description: "Relaxed-fit tee with a tonal layered-text print across the back.",
    imageURL: "https://i.pinimg.com/736x/fe/dc/ba/fedcba9876543210fedcba9876543210.jpg",
  },
  {
    id: "motion-jogger",
    name: "Motion Jogger",
    price: 89.99,
    category: "Bottoms",
    description: "Lightweight tech-fleece jogger with zip pockets and elastic waistband.",
    imageURL: "https://i.pinimg.com/736x/ab/cd/ef/abcdef0123456789abcdef0123456789.jpg",
  },
];

const seedProducts = async () => {
  console.info("[products] Seeding Firestore with default products…");
  for (const product of SEED_PRODUCTS) {
    const { id, ...data } = product;
    await setDoc(doc(db, "products", id), data);
  }
  return SEED_PRODUCTS.map((p) => ({ ...p, icon: "👕" }));
};

// ─── Normalise a Firestore doc into a product object ─────────────────────────

const normaliseProduct = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || "Unnamed product",
    price: Number(data.price) || 0,
    category: data.category || "Uncategorised",
    description: data.description || "",
    image: data.imageURL || data.image || "",
    icon: data.icon || "👕",
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const loadProducts = async () => {
  const snapshot = await getDocs(collection(db, "products"));

  if (snapshot.empty) {
    // Collection doesn't exist or has no documents — seed it
    allProducts = await seedProducts();
  } else {
    allProducts = snapshot.docs.map(normaliseProduct);
  }

  return allProducts;
};

export const getProducts = () => allProducts;

export const getFeaturedProducts = () => allProducts.slice(0, 3);
