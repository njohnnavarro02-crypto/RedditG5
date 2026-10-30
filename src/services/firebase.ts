import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '@env';

// Firebase configuration loaded from .env
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Singleton Firebase App initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure Google Sign-In with webClientId from .env
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

/**
 * Sign in using Google and link the credential to Firebase Authentication.
 */
export async function signInWithGoogle(): Promise<User> {
  if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.includes('your_google_web_client_id')) {
    throw new Error(
      'Google Web Client ID is not configured. Please set GOOGLE_WEB_CLIENT_ID in your .env file.',
    );
  }

  // Ensure Google Play Services are available
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Trigger Google Sign-In sheet
  const signInResult = await GoogleSignin.signIn();

  // Support both @react-native-google-signin v13+ (data.idToken) and legacy response formats
  const idToken =
    (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;

  if (!idToken) {
    throw new Error('Google Sign-In failed: No ID token received from Google.');
  }

  // Authenticate with Firebase using the Google ID token
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);

  return userCredential.user;
}

/**
 * Sign out from both Firebase and Google.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    // Ignore error if user wasn't signed into Google
  }
  await firebaseSignOut(auth);
}

export {statusCodes, onAuthStateChanged};
export type {User};
