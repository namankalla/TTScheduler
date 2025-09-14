import { Redirect, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log('Index: Auth state - user:', user ? user.email : 'null', 'loading:', loading);

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('Index: User authenticated, navigating to home');
        router.replace('/(tabs)/home');
      } else {
        console.log('Index: No user, navigating to welcome');
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    console.log('Index: Still loading, showing nothing');
    return null; // or a loading spinner
  }

  // Fallback redirects (shouldn't be needed with useEffect above)
  if (user) {
    console.log('Index: Fallback redirect to home');
    return <Redirect href="/(tabs)/home" />;
  }

  console.log('Index: Fallback redirect to welcome');
  return <Redirect href="/(auth)/welcome" />;
}


