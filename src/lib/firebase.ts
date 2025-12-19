import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDV6gc3t5e-9Alg_pl0CXNxzVdO5rLN30Q",
  authDomain: "document-gen-ai.firebaseapp.com",
  databaseURL: "https://document-gen-ai-default-rtdb.firebaseio.com",
  projectId: "document-gen-ai",
  storageBucket: "document-gen-ai.firebasestorage.app",
  messagingSenderId: "818204957612",
  appId: "1:818204957612:web:e2e4dabd276db98147b809",
  measurementId: "G-ZCJS5Z3CJP"
};

let app: ReturnType<typeof initializeApp>;
let authInstance: ReturnType<typeof getAuth>;
let dbInstance: ReturnType<typeof getFirestore>;
let storageInstance: ReturnType<typeof getStorage>;

const getApp = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const auth = (() => {
  if (!authInstance) {
    authInstance = getAuth(getApp());
  }
  return authInstance;
})();

export const db = (() => {
  if (!dbInstance) {
    dbInstance = getFirestore(getApp());
  }
  return dbInstance;
})();

export const storage = (() => {
  if (!storageInstance) {
    storageInstance = getStorage(getApp());
  }
  return storageInstance;
})();

// Lazy load analytics to prevent initialization issues
export const getAnalyticsInstance = () => {
  if (typeof window !== 'undefined') {
    return getAnalytics(getApp());
  }
  return null;
};

// Configure Google provider with Drive/Docs scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/presentations');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

export const githubProvider = new GithubAuthProvider();
