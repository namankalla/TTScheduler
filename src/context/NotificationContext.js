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
      // Request permissions and get Expo push token
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync();
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