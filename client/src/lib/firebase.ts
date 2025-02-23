import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCop2XcZMcFgbM3o-Nz7F6jB_J0VhRmbZ8",
  authDomain: "meetmate-ai.firebaseapp.com",
  projectId: "meetmate-ai",
  storageBucket: "meetmate-ai.appspot.com",
  appId: "1:751859924211:web:d5040037c044b47e418b86",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export { auth };