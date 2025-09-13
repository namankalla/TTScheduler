import React, { useRef, useEffect } from 'react';
import { View, Animated, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface AnimatedViewProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animationType?: 'fadeIn' | 'slideUp' | 'scale' | 'bounce';
  delay?: number;
  duration?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export function AnimatedView({
  children,
  style,
  animationType = 'fadeIn',
  delay = 0,
  duration = 300,
  onPress,
  disabled = false,
  ...props
}: AnimatedViewProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [animatedValue, delay, duration]);

  const getAnimatedStyle = () => {
    switch (animationType) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };
      case 'slideUp':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'bounce':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1.1, 1],
              }),
            },
          ],
        };
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        {...props}
      >
        <Animated.View style={[getAnimatedStyle(), style]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[getAnimatedStyle(), style]}>
      {children}
    </Animated.View>
  );
}
