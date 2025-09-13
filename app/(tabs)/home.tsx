import { useRouter } from 'expo-router';
import React from 'react';
import HomeScreen from '../../src/screens/HomeScreen';

export default function Home() {
  const router = useRouter();
  return <HomeScreen navigation={{ navigate: (name: string) => {
    if (name === 'Upload') router.push('/(tabs)/upload');
    else if (name === 'MyTimetables') router.push('/(tabs)/mytimetables');
    else if (name === 'Profile') router.push('/(tabs)/profile');
  } }} />;
}


