import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDOl8MoVa_TMrXWheLIJ6up1e5N7xMh4QI",
  authDomain: "my-shop-project-72984.firebaseapp.com",
  projectId: "my-shop-project-72984",
  storageBucket: "my-shop-project-72984.firebasestorage.app",
  messagingSenderId: "944344265646",
  appId: "1:944344265646:web:3c81d5d8166d3c845a8e3f",
  measurementId: "G-660DXLH1MR"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
