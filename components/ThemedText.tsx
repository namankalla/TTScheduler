import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'inverse';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  variant = 'primary',
  weight,
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const getVariantColor = () => {
    if (lightColor || darkColor) {
      return useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    }
    
    switch (variant) {
      case 'secondary': return colors.textSecondary;
      case 'tertiary': return colors.textTertiary;
      case 'muted': return colors.textMuted;
      case 'inverse': return colors.textInverse;
      default: return colors.textPrimary;
    }
  };

  const getWeight = () => {
    if (weight) {
      switch (weight) {
        case 'light': return '300';
        case 'normal': return '400';
        case 'medium': return '500';
        case 'semibold': return '600';
        case 'bold': return '700';
        case 'extrabold': return '800';
        default: return '400';
      }
    }
    return undefined;
  };

  return (
    <Text
      style={[
        { color: getVariantColor() },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'h1' ? styles.h1 : undefined,
        type === 'h2' ? styles.h2 : undefined,
        type === 'h3' ? styles.h3 : undefined,
        type === 'body' ? styles.body : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'label' ? styles.label : undefined,
        weight ? { fontWeight: getWeight() } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '500',
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
