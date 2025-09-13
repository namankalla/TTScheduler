import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

export default function CustomTabBarBackground() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="systemChromeMaterial"
        intensity={95}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.tabBarBackground }]}>
      <LinearGradient
        colors={[
          colors.tabBarBackground,
          colors.tabBarBackground,
          colors.tabBarBackground + 'F0',
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View 
        style={[
          styles.border, 
          { 
            borderTopColor: colors.tabBarBorder,
            shadowColor: colors.tabBarShadow,
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});

export function useBottomTabOverflow() {
  return 0;
}
