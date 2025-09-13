import { Platform } from 'react-native';

/**
 * Creates platform-appropriate shadow styles
 * @param {Object} options - Shadow configuration
 * @param {string} options.color - Shadow color (default: '#000')
 * @param {number} options.offsetX - Horizontal offset (default: 0)
 * @param {number} options.offsetY - Vertical offset (default: 2)
 * @param {number} options.opacity - Shadow opacity (default: 0.1)
 * @param {number} options.radius - Shadow radius (default: 8)
 * @param {number} options.elevation - Android elevation (default: 3)
 * @returns {Object} Platform-appropriate shadow styles
 */
export const createShadow = ({
  color = '#000',
  offsetX = 0,
  offsetY = 2,
  opacity = 0.1,
  radius = 8,
  elevation = 3,
} = {}) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: {
        width: offsetX,
        height: offsetY,
      },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  } else if (Platform.OS === 'android') {
    return {
      elevation: elevation,
    };
  } else {
    // Web platform - use boxShadow
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
};

// Premium shadow presets with modern styling
export const shadows = {
  none: createShadow({ offsetY: 0, opacity: 0, radius: 0, elevation: 0 }),
  small: createShadow({ offsetY: 1, opacity: 0.04, radius: 4, elevation: 2 }),
  medium: createShadow({ offsetY: 2, opacity: 0.08, radius: 8, elevation: 4 }),
  large: createShadow({ offsetY: 4, opacity: 0.12, radius: 12, elevation: 6 }),
  xlarge: createShadow({ offsetY: 8, opacity: 0.16, radius: 16, elevation: 8 }),
  card: createShadow({ offsetY: 2, opacity: 0.08, radius: 8, elevation: 4 }),
  button: createShadow({ offsetY: 2, opacity: 0.12, radius: 8, elevation: 4 }),
  modal: createShadow({ offsetY: 8, opacity: 0.2, radius: 20, elevation: 10 }),
  floating: createShadow({ offsetY: 6, opacity: 0.15, radius: 16, elevation: 8 }),
};
