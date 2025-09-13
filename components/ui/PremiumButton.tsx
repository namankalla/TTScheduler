import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function PremiumButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  gradientColors,
  icon,
  fullWidth = false,
}: PremiumButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
          fontSize: 14,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 16,
          fontSize: 18,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          fontSize: 16,
        };
    }
  };

  const getVariantStyles = () => {
    const sizeStyles = getSizeStyles();
    
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderWidth: 0,
          textColor: colors.textInverse,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
          textColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          textColor: colors.primary,
        };
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          textColor: colors.textInverse,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          textColor: colors.textInverse,
        };
    }
  };

  const getShadowStyle = () => {
    if (variant === 'ghost' || variant === 'outline') return {};
    
    if (Platform.OS === 'ios') {
      return {
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      };
    } else {
      return {
        elevation: 4,
      };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const buttonStyle = {
    ...sizeStyles,
    ...variantStyles,
    ...getShadowStyle(),
    opacity: disabled ? 0.6 : 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: fullWidth ? '100%' : 'auto',
  };

  const textColor = variantStyles.textColor;

  const ButtonContent = () => (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />
      ) : icon ? (
        <>{icon}</>
      ) : null}
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: sizeStyles.fontSize,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </>
  );

  if (variant === 'gradient' && gradientColors) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.button, buttonStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <ButtonContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, styles.button, buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <ButtonContent />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 'auto',
  },
  button: {
    minHeight: 44,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
