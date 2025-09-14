import { useRouter } from 'expo-router';
import React from 'react';
import ProfileScreen from '../../src/screens/ProfileScreen';

export default function Profile() {
  const router = useRouter();
  return <ProfileScreen navigation={{ 
    navigate: (name: string) => {
      if (name === 'MyTimetables') router.push('/(tabs)/mytimetables');
      if (name === 'Upload') router.push('/(tabs)/upload');
    },
    // Add navigation methods that might be needed
    goBack: () => router.back(),
    replace: (route: string) => router.replace(route),
    push: (route: string) => router.push(route)
  }} />;
}


