import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import TimetableDetailScreen from '../src/screens/TimetableDetailScreen';

export default function TimetableDetail() {
  const params = useLocalSearchParams();
  // Pass params to the legacy screen via a prop-compatible route object
  const route = { params } as any;
  return <TimetableDetailScreen route={route} navigation={{ goBack: () => {} }} />;
}


