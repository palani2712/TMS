// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIFWZH0nBe8qZS75RLdYUbL-OQFU7YOks",
  authDomain: "todowebapp-b8e27.firebaseapp.com",
  projectId: "todowebapp-b8e27",
  storageBucket: "todowebapp-b8e27.firebasestorage.app",
  messagingSenderId: "222442104223",
  appId: "1:222442104223:web:154893f039dc94a58d09aa",
  measurementId: "G-003G7X9214"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics };
