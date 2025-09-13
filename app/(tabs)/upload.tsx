import { useRouter } from 'expo-router';
import React from 'react';
import UploadScreen from '../../src/screens/UploadScreen';

export default function Upload() {
  const router = useRouter();
  return <UploadScreen navigation={{ navigate: (name: string) => {
    if (name === 'MyTimetables') router.push('/(tabs)/mytimetables');
    else if (name === 'Profile') router.push('/(tabs)/profile');
    else if (name === 'Home') router.push('/(tabs)/home');
  } }} />;
}
