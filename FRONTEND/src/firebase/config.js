// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, getDoc, query, where, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfr1aBVBG5lo-FIDe0REpvVM6klElFOHY",
  authDomain: "educonnect-f2f4c.firebaseapp.com",
  projectId: "educonnect-f2f4c",
  storageBucket: "educonnect-f2f4c.firebasestorage.app",
  messagingSenderId: "373605661940",
  appId: "1:373605661940:web:a42850f9ab740bb4ec32a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc 
};