import { Client, Account } from 'appwrite';

// Ensure environment variables are defined
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  throw new Error('Missing Appwrite configuration. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID environment variables.');
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);

export const loginWithGoogle = () => {
  return account.createOAuth2Session(
    'google',
    `${window.location.origin}/`, // Success URL
    `${window.location.origin}/login?error=google-auth-failed` // Failure URL
  );
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  try {
    await account.deleteSession('current');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

export default client;