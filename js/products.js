import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allProducts = [];

const normaliseProduct = (doc) => {
  const data = doc.data();

  return {
    id: doc.id,
    name: data.name || "Unnamed product",
    price: Number(data.price) || 0,
    category: data.category || "Uncategorised",
    description: data.description || "",
    image: data.imageURL || data.image || "",
    icon: data.icon || "👕",
  };
};

export const loadProducts = async () => {
  const snapshot = await getDocs(collection(db, "products"));
  allProducts = snapshot.docs.map(normaliseProduct);
  return allProducts;
};

export const getProducts = () => allProducts;

export const getFeaturedProducts = () => allProducts.slice(0, 3);
