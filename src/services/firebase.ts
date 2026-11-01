import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  initializeAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  User,
} from 'firebase/auth';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firestore user profile upsert — keeps users/{uid} in sync on every sign-in
import {upsertUserProfile, getUserProfile} from './firestoreService';
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

// Custom React Native persistence adapter that works cleanly with Firebase v13 Modular SDK
function createReactNativePersistence(storage: any): any {
  class RNPersistence {
    static type = 'LOCAL';
    type = 'LOCAL';
    async _isAvailable() {
      try {
        if (!storage) return false;
        await storage.setItem('__sak', '1');
        await storage.removeItem('__sak');
        return true;
      } catch {
        return false;
      }
    }
    _set(key: string, value: any) {
      return storage.setItem(key, JSON.stringify(value));
    }
    async _get(key: string) {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }
    _remove(key: string) {
      return storage.removeItem(key);
    }
    _addListener(_key: string, _listener: any) {
      return;
    }
    _removeListener(_key: string, _listener: any) {
      return;
    }
  }
  return RNPersistence;
}

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

// Initialize Firebase Auth with AsyncStorage persistence so users stay signed in after app restart
export const auth = initializeAuth(app, {
  persistence: createReactNativePersistence(AsyncStorage) as any,
});

// Configure Google Sign-In with webClientId from .env
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

/**
 * Sign in using Google and link the credential to Firebase Authentication.
 */
export async function signInWithGoogle(retryCount = 0): Promise<User> {
  if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.includes('your_google_web_client_id')) {
    throw new Error(
      'Google Web Client ID is not configured. Please set GOOGLE_WEB_CLIENT_ID in your .env file.',
    );
  }

  // Ensure Google Play Services are available
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Clear previous Google session so user is ALWAYS presented the account chooser
  try {
    await GoogleSignin.signOut();
  } catch {}

  let signInResult;
  try {
    // Trigger Google Sign-In sheet
    signInResult = await GoogleSignin.signIn();
  } catch (err: any) {
    // Auto-retry on NETWORK_ERROR up to 2 times (common transient emulator issue)
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw err; // User cancelled, don't retry
    }
    if (retryCount < 2 && (err?.message?.includes('NETWORK_ERROR') || err?.code === '7')) {
      console.log(`[AUTH] Network error on sign-in attempt ${retryCount + 1}, retrying...`);
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      return signInWithGoogle(retryCount + 1);
    }
    throw err;
  }

  // Support both @react-native-google-signin v13+ (data.idToken) and legacy response formats
  const idToken =
    (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;

  if (!idToken) {
    throw new Error('Google Sign-In failed: No ID token received from Google.');
  }

  // Authenticate with Firebase using the Google ID token
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);

  // Sync user profile to Firestore users/{uid} (creates on first sign-in, preserves custom username on subsequent)
  const {user} = userCredential;
  const existing = await getUserProfile(user.uid).catch(() => null);
  if (!existing) {
    await upsertUserProfile(user.uid, {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
    });
  }

  return userCredential.user;
}

/**
 * Sign out from both Firebase and Google.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
  } catch (err) {
    // Ignore error if user wasn't signed into Google
  }
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    // Ignore error if user wasn't signed into Google
  }
  await firebaseSignOut(auth);
}

export {statusCodes, onAuthStateChanged, firebaseUpdateProfile};
export type {User};
