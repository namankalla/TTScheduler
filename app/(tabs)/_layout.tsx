import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 70,
            paddingBottom: 15,
            paddingTop: 8,
          },
          default: {
            backgroundColor: Colors[colorScheme ?? 'light'].tabBarBackground,
            borderTopWidth: 1,
            borderTopColor: Colors[colorScheme ?? 'light'].tabBarBorder,
            elevation: 12,
            shadowColor: Colors[colorScheme ?? 'light'].tabBarShadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            paddingHorizontal: 4,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
          alignSelf: 'center',
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: '',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 26} 
              name="house.fill" 
              color={color}
              style={{ alignSelf: 'center' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mytimetables"
        options={{
          title: '',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 26} 
              name="calendar" 
              color={color}
              style={{ alignSelf: 'center' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: '',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 26} 
              name="plus.circle.fill" 
              color={color}
              style={{ alignSelf: 'center' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 26} 
              name="person.fill" 
              color={color}
              style={{ alignSelf: 'center' }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
