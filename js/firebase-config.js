import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZOx09osUVJVmjHT3EkQmSmokRIeUbcF4",
  authDomain: "urban-threads-bcd6a.firebaseapp.com",
  projectId: "urban-threads-bcd6a",
  storageBucket: "urban-threads-bcd6a.firebasestorage.app",
  messagingSenderId: "531939464154",
  appId: "1:531939464154:web:8ae775929f9bedb9a0a6e3",
  measurementId: "G-ZSDX5DCV78",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
