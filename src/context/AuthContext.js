import { createUserWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseAuth, firebaseDb, getFirebaseApp, isFirebaseConfigured } from '../firebase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Firebase configured?', isFirebaseConfigured);
    
    if (!isFirebaseConfigured) {
      console.log('AuthContext: Firebase not configured, setting loading to false');
      setLoading(false);
      return;
    }
    
    console.log('AuthContext: Initializing Firebase...');
    getFirebaseApp();
    const auth = firebaseAuth();
    const db = firebaseDb();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext: Auth state changed, user:', user ? user.email : 'null');
      
      if (user) {
        // Update user profile in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('AuthContext: User profile updated in Firestore');
        } catch (error) {
          console.warn('Failed to update user profile:', error);
        }
      } else {
        console.log('AuthContext: User signed out, clearing user state');
      }
      
      setUser(user);
      setLoading(false);
      console.log('AuthContext: User state set, loading set to false');
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, displayName) => {
    try {
      console.log('SignUp: Starting signup process for:', email);
      
      if (!isFirebaseConfigured) {
        console.log('SignUp: Firebase not configured');
        return { success: false, error: 'Firebase is not configured. Please check your configuration.' };
      }
      
      const auth = firebaseAuth();
      const db = firebaseDb();
      
      if (!auth) {
        console.log('SignUp: Firebase Auth not initialized');
        throw new Error('Firebase Auth not initialized');
      }
      
      console.log('SignUp: Attempting to create user with email:', email);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log('SignUp: User created successfully:', user.uid);
      
      // Update profile
      await updateProfile(user, { displayName });
      console.log('SignUp: Profile updated');
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('SignUp: User document created in Firestore');

      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      console.error('SignUp: Signup error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please try signing in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/api-key-not-valid') {
        errorMessage = 'Firebase configuration error. Please check your API key.';
      }
      
      return { success: false, error: errorMessage, code: error.code };
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('SignIn: Starting signin process for:', email);
      const auth = firebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      console.log('SignIn: Signin successful');
      return { success: true };
    } catch (error) {
      console.error('SignIn: Signin error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const auth = firebaseAuth();
      await fbSignOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const auth = firebaseAuth();
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};