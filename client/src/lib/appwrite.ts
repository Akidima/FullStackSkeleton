import { Client, Account, ID, type Models } from 'appwrite';

// Debug logging for environment variables
const appwriteConfig = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: import.meta.env.VITE_APPWRITE_API_KEY
};

console.log('Appwrite Config (masked):', {
  endpoint: appwriteConfig.endpoint ? '[SET]' : '[NOT SET]',
  projectId: appwriteConfig.projectId ? '[SET]' : '[NOT SET]',
  apiKey: appwriteConfig.apiKey ? '[SET]' : '[NOT SET]'
});

if (!appwriteConfig.endpoint || !appwriteConfig.projectId) {
  console.error('Missing required Appwrite configuration. Available env vars:', {
    'import.meta.env.VITE_APPWRITE_ENDPOINT': Boolean(import.meta.env.VITE_APPWRITE_ENDPOINT),
    'import.meta.env.VITE_APPWRITE_PROJECT_ID': Boolean(import.meta.env.VITE_APPWRITE_PROJECT_ID)
  });
  throw new Error('Missing required Appwrite configuration. Check the console for more details.');
}

const client = new Client();
client.setEndpoint(appwriteConfig.endpoint);
client.setProject(appwriteConfig.projectId);

export const account = new Account(client);

export const loginWithGoogle = async () => {
  try {
    await account.createOAuth2Session(
      'google',
      `${window.location.origin}/`,
      `${window.location.origin}/login?error=google-auth-failed`,
      ['https://www.googleapis.com/auth/calendar.readonly']
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
  try {
    return await account.get();
  } catch (error) {
    if ((error as any)?.code !== 401) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
};

export const logout = async (): Promise<boolean> => {
  try {
    await account.deleteSession('current');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

export default client;