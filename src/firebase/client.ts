import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwPSnGtqiEaLGtfQEtNNiLPazCOwJIbYQ",
  authDomain: "ttse-40832.firebaseapp.com",
  projectId: "ttse-40832",
  storageBucket: "ttse-40832.firebasestorage.app",
  messagingSenderId: "71245579299",
  appId: "1:71245579299:web:01f69262c3b2a1af7c5d96"
};

// Check if config is present to avoid runtime errors while previewing screens
// Disable Firebase on web by default to allow viewing screens without valid keys.
// Set EXPO_PUBLIC_ENABLE_FIREBASE='true' to force-enable.
const enableViaEnv = process.env.EXPO_PUBLIC_ENABLE_FIREBASE === 'true';

// Enable Firebase for all platforms including web
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const getFirebaseApp = () => {
  if (!isFirebaseConfigured) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  
  // Initialize app if it doesn't exist
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    
    // Initialize auth with AsyncStorage persistence immediately
    try {
      initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (error) {
      // Auth might already be initialized, that's okay
      console.log('Auth already initialized or error:', error instanceof Error ? error.message : String(error));
    }
    
    return app;
  }
  
  return getApp();
  
};

export const firebaseAuth = () => {
  if (!isFirebaseConfigured) return null;
  return getAuth(getFirebaseApp());
};
export const firebaseDb = () => (isFirebaseConfigured ? getFirestore(getFirebaseApp()) : null);


