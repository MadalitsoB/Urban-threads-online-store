import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const loginUser = async (email, password) => {
  const safeEmail = email.trim();

  if (!safeEmail || !password) {
    return { success: false, message: "Please enter both email and password." };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, safeEmail, password);
    return {
      success: true,
      message: `Welcome back, ${credential.user.email}!`,
      user: credential.user,
    };
  } catch (error) {
    return { success: false, message: getAuthErrorMessage(error) };
  }
};

export const signupUser = async (email, password) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return {
      success: true,
      message: `Account created for ${credential.user.email}!`,
      user: credential.user,
    };
  } catch (error) {
    return { success: false, message: getAuthErrorMessage(error) };
  }
};

export const logoutUser = () => signOut(auth);

export const getCurrentUser = () => auth.currentUser;

export const watchAuthState = (callback) => onAuthStateChanged(auth, callback);

const getAuthErrorMessage = (error) => {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
};
