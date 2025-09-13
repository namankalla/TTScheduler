import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: any) => {
    // Add haptic feedback
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: any) => {
    // Scale back animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    props.onPressOut?.(ev);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <PlatformPressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.tabButton,
          pressed && styles.pressed,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 12,
    marginHorizontal: 2,
    minHeight: 50,
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
});
