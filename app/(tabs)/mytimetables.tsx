import { useRouter } from 'expo-router';
import React from 'react';
import MyTimetablesScreen from '../../src/screens/MyTimetablesScreen';

export default function MyTimetables() {
  const router = useRouter();
  return <MyTimetablesScreen navigation={{ navigate: (name: string) => {
    if (name === 'TimetableDetail') router.push('/timetable-detail');
    else if (name === 'Upload') router.push('/(tabs)/upload');
    else if (name === 'Profile') router.push('/(tabs)/profile');
  } }} />;
}
