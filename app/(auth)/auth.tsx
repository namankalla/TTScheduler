import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import AuthScreen from '../../src/screens/AuthScreen';

export default function Auth() {
  const params = useLocalSearchParams();
  // Pass mode to the legacy screen via a prop-compatible route object
  const route = { params } as any;
  return <AuthScreen navigation={{ goBack: () => {} }} route={route} />;
}


