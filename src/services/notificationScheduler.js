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

        // Skip scheduling reminders for Library/Self Study sessions
        if (course.courseCode === 'LIBRARY / SELF STUDY' || course.courseName === 'Library / Self Study') {
          console.log(`LOG  Skipping reminders for Library/Self Study session`);
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
  const reminderMinutes = [5]; // 5 minutes before class

  try {
    console.log(`LOG  Scheduling reminders for ${course.courseCode} - ${session.day} at ${session.startTime}`);
    
    const dayOfWeek = getDayOfWeek(session.day);
    const [hours, minutes] = session.startTime.split(':').map(Number);
    
    console.log(`LOG  Parsed time: ${hours}:${minutes}, day of week: ${dayOfWeek}`);
    console.log(`LOG  Session data:`, JSON.stringify(session, null, 2));
    
    // Validate time format
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error(`LOG  Invalid time format: ${session.startTime}`);
      return [];
    }

    for (const minutesBefore of reminderMinutes) {
      console.log(`LOG  Scheduling ${minutesBefore} minute reminder`);
      const reminderTime = calculateReminderTime(dayOfWeek, hours, minutes, minutesBefore);
      
      if (reminderTime && reminderTime > new Date()) {
        console.log(`LOG  Reminder time is valid, scheduling notification`);
        const notificationId = await scheduleNotification(
          course,
          session,
          reminderTime,
          minutesBefore
        );

        if (notificationId) {
          console.log(`LOG  Successfully scheduled notification: ${notificationId}`);
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
        } else {
          console.log(`LOG  Failed to schedule notification`);
        }
      } else {
        console.log(`LOG  Reminder time is invalid or in the past, skipping`);
      }
    }

    console.log(`LOG  Scheduled ${reminders.length} reminders for this session`);
    return reminders;
  } catch (error) {
    console.error('Failed to schedule session reminders:', error);
    return [];
  }
};

const scheduleNotification = async (course, session, reminderTime, minutesBefore) => {
  try {
    // Calculate seconds from now until the reminder time
    const now = new Date();
    const secondsFromNow = Math.max(0, Math.floor((reminderTime.getTime() - now.getTime()) / 1000));
    
    console.log(`LOG  Scheduling notification for ${course.courseCode} in ${secondsFromNow} seconds (${Math.round(secondsFromNow / 60)} minutes)`);
    
    // If the time is in the past or very soon (less than 1 minute), skip it
    if (secondsFromNow < 60) {
      console.log(`LOG  Skipping notification - too soon or in the past (${secondsFromNow} seconds)`);
      return null;
    }

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
        seconds: secondsFromNow,
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
    
    console.log(`LOG  Calculating reminder time for day ${dayOfWeek}, time ${hours}:${minutes}, ${minutesBefore} minutes before`);
    console.log(`LOG  Current time: ${now.toISOString()}`);
    console.log(`LOG  Current local time: ${now.toLocaleString()}`);
    
    // Set to the next occurrence of this day
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
    console.log(`LOG  Current day: ${currentDay} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]})`);
    console.log(`LOG  Target day: ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`);
    console.log(`LOG  Days until target: ${daysUntilTarget}`);
    
    // Set the target date
    reminderTime.setDate(now.getDate() + daysUntilTarget);
    
    // Set the time in LOCAL timezone (not UTC)
    reminderTime.setHours(hours, minutes, 0, 0);
    console.log(`LOG  Target time this week (local): ${reminderTime.toLocaleString()}`);
    console.log(`LOG  Target time this week (UTC): ${reminderTime.toISOString()}`);

    // If the time has already passed this week, move to next week
    if (reminderTime <= now) {
      console.log(`LOG  Time has passed this week, moving to next week`);
      reminderTime.setDate(reminderTime.getDate() + 7);
      console.log(`LOG  Target time next week (local): ${reminderTime.toLocaleString()}`);
      console.log(`LOG  Target time next week (UTC): ${reminderTime.toISOString()}`);
    }

    // Subtract reminder minutes
    reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);
    console.log(`LOG  Final reminder time (local): ${reminderTime.toLocaleString()}`);
    console.log(`LOG  Final reminder time (UTC): ${reminderTime.toISOString()}`);
    console.log(`LOG  Time difference from now: ${Math.round((reminderTime - now) / (1000 * 60))} minutes`);

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

// Test function to debug notification scheduling
export const testNotificationScheduling = async (timetableData) => {
  console.log('LOG  === TESTING NOTIFICATION SCHEDULING ===');
  console.log('LOG  Current time:', new Date().toISOString());
  
  const courses = timetableData.courses || [];
  console.log(`LOG  Found ${courses.length} courses`);
  
  for (const course of courses) {
    console.log(`LOG  Course: ${course.courseCode} - ${course.courseName}`);
    if (course.schedule && Array.isArray(course.schedule)) {
      console.log(`LOG  Schedule entries: ${course.schedule.length}`);
      for (const session of course.schedule) {
        console.log(`LOG  Session: ${session.day} at ${session.startTime}`);
        const dayOfWeek = getDayOfWeek(session.day);
        const [hours, minutes] = session.startTime.split(':').map(Number);
        console.log(`LOG  Parsed: day ${dayOfWeek}, time ${hours}:${minutes}`);
        
        // Test time calculation
        const testTime = calculateReminderTime(dayOfWeek, hours, minutes, 10);
        console.log(`LOG  Test reminder time (10 min before): ${testTime ? testTime.toISOString() : 'INVALID'}`);
      }
    }
  }
  
  console.log('LOG  === END TEST ===');
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
    console.log('Test notification scheduled for 2 seconds from now');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};

export const sendTestNotificationIn2Minutes = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification - 2 Minutes',
        body: 'This is a test notification scheduled for 2 minutes from now',
        data: { type: 'test_2min' },
      },
      trigger: { seconds: 120 }, // 2 minutes
    });
    console.log('Test notification scheduled for 2 minutes from now');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};
