import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { shadows } from '../../src/utils/shadowUtils';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  gradientColors?: string[];
  padding?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'small' | 'medium' | 'large' | 'xl';
  shadow?: 'none' | 'small' | 'medium' | 'large' | 'xlarge' | 'card' | 'button' | 'modal' | 'floating';
}

export function PremiumCard({
  children,
  style,
  onPress,
  variant = 'default',
  gradientColors,
  padding = 'medium',
  borderRadius = 'medium',
  shadow = 'medium',
}: PremiumCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return 12;
      case 'medium': return 16;
      case 'large': return 24;
      default: return 16;
    }
  };

  const getBorderRadius = () => {
    switch (borderRadius) {
      case 'small': return 8;
      case 'medium': return 16;
      case 'large': return 20;
      case 'xl': return 24;
      default: return 16;
    }
  };

  const getShadowStyle = () => {
    if (shadow === 'none') return {};
    
    // Use the shadow presets from shadowUtils
    return shadows[shadow] || shadows.medium;
  };

  const getCardStyle = () => {
    const baseStyle = {
      borderRadius: getBorderRadius(),
      padding: getPadding(),
      ...getShadowStyle(),
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: colors.cardBackground,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'gradient':
        return {
          ...baseStyle,
          borderWidth: 0,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.cardBackground,
          borderWidth: 0,
        };
    }
  };

  const CardContent = () => {
    if (variant === 'gradient' && gradientColors) {
      return (
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradientContainer, { borderRadius: getBorderRadius() }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ padding: getPadding() }}>
            {children}
          </View>
        </LinearGradient>
      );
    }

    return <View style={getCardStyle()}>{children}</View>;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CardContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  gradientContainer: {
    width: '100%',
  },
});
