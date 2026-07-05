// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_HsMA0aSzewXF3zAkNAMzEnreOtmtfaM",
  authDomain: "mercadouteista.firebaseapp.com",
  projectId: "mercadouteista",
  storageBucket: "mercadouteista.firebasestorage.app",
  messagingSenderId: "269428919093",
  appId: "1:269428919093:web:e04f87a52985ea36cd1a7c",
  measurementId: "G-NXCL1DF56H",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (solo funciona en navegador)
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;