import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Type guard for Firebase errors
    if (
      typeof error === 'object' && 
      error !== null && 
      'code' in error && 
      error.code === 'auth/too-many-requests' && 
      retries > 0
    ) {
      console.log(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const loginWithGoogle = async () => {
  try {
    const result = await retryOperation(() => signInWithPopup(auth, googleProvider));
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    // Type guard for error object
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errorCode = error.code as string;
      switch (errorCode) {
        case 'auth/popup-blocked':
          throw new Error('Please enable popups for this site to sign in with Google');
        case 'auth/cancelled-popup-request':
          throw new Error('Sign-in cancelled. Please try again.');
        case 'auth/too-many-requests':
          throw new Error('Too many sign-in attempts. Please try again later.');
        case 'auth/unauthorized-domain':
          throw new Error('This domain is not authorized for Google Sign-In. Please contact the administrator.');
        default:
          throw new Error('Failed to sign in with Google. Please try again.');
      }
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

export const logout = async () => {
  try {
    await retryOperation(() => signOut(auth));
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export { auth };