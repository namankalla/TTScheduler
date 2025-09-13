/**
 * Notification Scheduler Service
 * Handles scheduling local notifications for timetable classes
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('class-reminders', {
        name: 'Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3498db',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
};

export const scheduleClassReminders = async (timetableData) => {
  try {
    console.log('Scheduling class reminders...');

    // Cancel all existing notifications first
    await cancelAllNotifications();

    const courses = timetableData.courses || [];
    const scheduledNotifications = [];

    for (const course of courses) {
      if (!course.schedule || !Array.isArray(course.schedule)) {
        continue;
      }

      for (const session of course.schedule) {
        if (!session.day || !session.startTime) {
          continue;
        }

        // Schedule reminders for this session
        const reminders = await scheduleSessionReminders(course, session);
        scheduledNotifications.push(...reminders);
      }
    }

    console.log(`Scheduled ${scheduledNotifications.length} notifications`);
    return scheduledNotifications;

  } catch (error) {
    console.error('Failed to schedule class reminders:', error);
    throw new Error(`Reminder scheduling failed: ${error.message}`);
  }
};

const scheduleSessionReminders = async (course, session) => {
  const reminders = [];
  const reminderMinutes = [10, 30]; // 10 minutes and 30 minutes before class

  try {
    const dayOfWeek = getDayOfWeek(session.day);
    const [hours, minutes] = session.startTime.split(':').map(Number);

    for (const minutesBefore of reminderMinutes) {
      const reminderTime = calculateReminderTime(dayOfWeek, hours, minutes, minutesBefore);
      
      if (reminderTime && reminderTime > new Date()) {
        const notificationId = await scheduleNotification(
          course,
          session,
          reminderTime,
          minutesBefore
        );

        if (notificationId) {
          reminders.push({
            id: notificationId,
            courseCode: course.courseCode,
            courseName: course.courseName,
            day: session.day,
            startTime: session.startTime,
            location: session.location,
            reminderTime: reminderTime.toISOString(),
            reminderMinutes: minutesBefore
          });
        }
      }
    }

    return reminders;
  } catch (error) {
    console.error('Failed to schedule session reminders:', error);
    return [];
  }
};

const scheduleNotification = async (course, session, reminderTime, minutesBefore) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Class Reminder - ${course.courseCode}`,
        body: `${course.courseName} starts in ${minutesBefore} minutes at ${session.location || 'TBD'}`,
        data: {
          type: 'class_reminder',
          courseCode: course.courseCode,
          courseName: course.courseName,
          startTime: session.startTime,
          location: session.location || 'TBD',
          minutesBefore: minutesBefore
        },
        sound: 'default',
      },
      trigger: {
        date: reminderTime,
      },
    });

    console.log(`Scheduled notification: ${notificationId} for ${reminderTime.toISOString()}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule individual notification:', error);
    return null;
  }
};

const calculateReminderTime = (dayOfWeek, hours, minutes, minutesBefore) => {
  try {
    const now = new Date();
    const reminderTime = new Date();
    
    // Set to the next occurrence of this day
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    reminderTime.setDate(now.getDate() + daysUntilTarget);
    reminderTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed this week, move to next week
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 7);
    }

    // Subtract reminder minutes
    reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);

    return reminderTime;
  } catch (error) {
    console.error('Failed to calculate reminder time:', error);
    return null;
  }
};

const getDayOfWeek = (dayName) => {
  const dayMap = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 0
  };
  return dayMap[dayName] ?? 1;
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
};

export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Failed to get scheduled notifications:', error);
    return [];
  }
};

export const sendTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from your timetable app',
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    });
    console.log('Test notification scheduled');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};
