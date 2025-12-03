// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDG10gwR2TB85e8HWL13hCH2R4GZwHcjdY",
  authDomain: "dutcharticlesapp.firebaseapp.com",
  projectId: "dutcharticlesapp",
  storageBucket: "dutcharticlesapp.firebasestorage.app",
  messagingSenderId: "294220643612",
  appId: "1:294220643612:web:2f4c554ce912e6fc528ed9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);