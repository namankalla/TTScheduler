import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [fcmToken, setFcmToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeNotifications();
    }
  }, [user]);

  const initializeNotifications = async () => {
    try {
      // Check if we're running in Expo Go (which doesn't support push notifications in SDK 53+)
      const isExpoGo = __DEV__ && !global.EXPO_PROJECT_ID;
      
      if (isExpoGo) {
        console.log('Running in Expo Go - push notifications not available in SDK 53+');
        console.log('To test notifications, use a development build instead of Expo Go');
        return;
      }

      // Request permissions and get Expo push token
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Get push token with project ID
      let tokenResponse;
      try {
        // Try to get token with project ID from environment or config
        const projectId = process.env.EXPO_PROJECT_ID || global.EXPO_PROJECT_ID;
        if (projectId) {
          tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        } else {
          tokenResponse = await Notifications.getExpoPushTokenAsync();
        }
      } catch (error) {
        console.warn('Failed to get push token:', error.message);
        // If push token fails, we can still use local notifications
        console.log('Continuing with local notifications only');
        return;
      }

      const token = tokenResponse.data;
      setFcmToken(token);
      
      // Store token locally
      await AsyncStorage.setItem('fcmToken', token);

      // Handle foreground notifications
      const subscription = Notifications.addNotificationReceivedListener((n) => {
        const notification = {
          id: Date.now().toString(),
          title: n.request.content.title || 'Notification',
          body: n.request.content.body || '',
          data: n.request.content.data || {},
          timestamp: new Date(),
          read: false,
        };
        setNotifications(prev => [notification, ...prev]);
      });

      // Handle notification responses (when tapped)
      const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationPress({ data: response.notification.request.content.data });
      });

      return () => {
        subscription.remove();
        responseSub.remove();
      };
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      // Don't throw the error, just log it and continue without notifications
    }
  };

  const handleNotificationPress = (remoteMessage) => {
    // Handle notification press based on type
    if (remoteMessage?.data?.type === 'class_reminder') {
      // Navigate to specific timetable or class
      console.log('Navigate to class:', remoteMessage.data);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const value = {
    fcmToken,
    notifications,
    markAsRead,
    clearNotifications,
    getUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};