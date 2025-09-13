/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Premium Modern Color Palette
const tintColorLight = '#6366F1'; // Indigo
const tintColorDark = '#818CF8'; // Light Indigo

export const Colors = {
  light: {
    // Core colors
    text: '#0F172A',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    
    // Premium brand colors
    primary: '#6366F1',
    primaryLight: '#A5B4FC',
    primaryDark: '#4338CA',
    secondary: '#EC4899',
    secondaryLight: '#F9A8D4',
    secondaryDark: '#BE185D',
    
    // Status colors
    success: '#10B981',
    successLight: '#6EE7B7',
    successDark: '#047857',
    warning: '#F59E0B',
    warningLight: '#FCD34D',
    warningDark: '#D97706',
    danger: '#EF4444',
    dangerLight: '#FCA5A5',
    dangerDark: '#DC2626',
    info: '#3B82F6',
    infoLight: '#93C5FD',
    infoDark: '#2563EB',
    
    // Extended palette
    purple: '#8B5CF6',
    pink: '#EC4899',
    yellow: '#F59E0B',
    orange: '#F97316',
    teal: '#14B8A6',
    cyan: '#06B6D4',
    emerald: '#10B981',
    lime: '#84CC16',
    amber: '#F59E0B',
    rose: '#F43F5E',
    
    // Surface colors
    cardBackground: '#FFFFFF',
    cardBackgroundSecondary: '#F1F5F9',
    searchBackground: '#F1F5F9',
    modalBackground: '#FFFFFF',
    overlayBackground: 'rgba(15, 23, 42, 0.5)',
    
    // Border and divider colors
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',
    divider: '#E2E8F0',
    
    // Text colors
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    textInverse: '#FFFFFF',
    textMuted: '#94A3B8',
    
    // Tab bar specific colors
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarShadow: 'rgba(15, 23, 42, 0.08)',
    
    // Gradient colors
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    gradientSecondary: '#EC4899',
    gradientSuccess: '#10B981',
    gradientWarning: '#F59E0B',
    
    // Shadow colors
    shadowLight: 'rgba(15, 23, 42, 0.04)',
    shadowMedium: 'rgba(15, 23, 42, 0.08)',
    shadowDark: 'rgba(15, 23, 42, 0.12)',
  },
  dark: {
    // Core colors
    text: '#F8FAFC',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
    
    // Premium brand colors
    primary: '#818CF8',
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    secondary: '#F472B6',
    secondaryLight: '#F9A8D4',
    secondaryDark: '#EC4899',
    
    // Status colors
    success: '#34D399',
    successLight: '#6EE7B7',
    successDark: '#10B981',
    warning: '#FBBF24',
    warningLight: '#FCD34D',
    warningDark: '#F59E0B',
    danger: '#F87171',
    dangerLight: '#FCA5A5',
    dangerDark: '#EF4444',
    info: '#60A5FA',
    infoLight: '#93C5FD',
    infoDark: '#3B82F6',
    
    // Extended palette
    purple: '#A78BFA',
    pink: '#F472B6',
    yellow: '#FBBF24',
    orange: '#FB923C',
    teal: '#5EEAD4',
    cyan: '#22D3EE',
    emerald: '#34D399',
    lime: '#A3E635',
    amber: '#FBBF24',
    rose: '#FB7185',
    
    // Surface colors
    cardBackground: '#1E293B',
    cardBackgroundSecondary: '#334155',
    searchBackground: '#334155',
    modalBackground: '#1E293B',
    overlayBackground: 'rgba(0, 0, 0, 0.7)',
    
    // Border and divider colors
    border: '#334155',
    borderLight: '#475569',
    borderDark: '#1E293B',
    divider: '#334155',
    
    // Text colors
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',
    textMuted: '#64748B',
    
    // Tab bar specific colors
    tabBarBackground: '#1E293B',
    tabBarBorder: '#334155',
    tabBarShadow: 'rgba(0, 0, 0, 0.3)',
    
    // Gradient colors
    gradientStart: '#818CF8',
    gradientEnd: '#A78BFA',
    gradientSecondary: '#F472B6',
    gradientSuccess: '#34D399',
    gradientWarning: '#FBBF24',
    
    // Shadow colors
    shadowLight: 'rgba(0, 0, 0, 0.1)',
    shadowMedium: 'rgba(0, 0, 0, 0.2)',
    shadowDark: 'rgba(0, 0, 0, 0.3)',
  },
};
