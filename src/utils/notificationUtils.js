import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Permission granted
 */
export const requestNotificationPermission = async () => {
  try {
    const settings = await Notifications.requestPermissionsAsync();
    if (settings.status === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive class reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open settings */} }
        ]
      );
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Check notification permission status
 * @returns {Promise<boolean>} Permission status
 */
export const checkNotificationPermission = async () => {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.status === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token
 * @returns {Promise<string|null>} FCM token
 */
export const getFCMToken = async () => {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    console.log('Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Handle background notification
 * @param {Object} remoteMessage - Notification message
 */
export const handleBackgroundNotification = (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
  
  // Handle different notification types
  if (remoteMessage.data?.type === 'class_reminder') {
    // Handle class reminder
    console.log('Class reminder received:', remoteMessage.data);
  }
};

/**
 * Handle foreground notification
 * @param {Object} remoteMessage - Notification message
 */
export const handleForegroundNotification = (remoteMessage) => {
  console.log('Foreground notification:', remoteMessage);
  
  // Show alert for important notifications
  if (remoteMessage.data?.type === 'class_reminder') {
    Alert.alert(
      remoteMessage.notification?.title || 'Class Reminder',
      remoteMessage.notification?.body || 'You have a class starting soon',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View', onPress: () => {/* Navigate to timetable */} }
      ]
    );
  }
};

/**
 * Handle notification opened app
 * @param {Object} remoteMessage - Notification message
 * @param {Object} navigation - Navigation object
 */
export const handleNotificationOpenedApp = (remoteMessage, navigation) => {
  console.log('Notification opened app:', remoteMessage);
  
  // Navigate based on notification type
  if (remoteMessage.data?.type === 'class_reminder') {
    navigation.navigate('MyTimetables');
  }
};

/**
 * Schedule local notification (for testing)
 * @param {Object} notification - Notification data
 */
export const scheduleLocalNotification = async (notification) => {
  try {
    // This would typically use a library like @react-native-async-storage/async-storage
    // or react-native-push-notification for local notifications
    console.log('Local notification scheduled:', notification);
  } catch (error) {
    console.error('Error scheduling local notification:', error);
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }
    console.log('All notifications cleared');
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

/**
 * Set badge count (iOS)
 * @param {number} count - Badge count
 */
export const setBadgeCount = async (count) => {
  try {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};