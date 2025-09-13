const { messaging } = require('../config/firebaseConfig');
const cron = require('node-cron');
const moment = require('moment');

class NotificationService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  /**
   * Schedule reminders for a user's timetable
   * @param {string} userId - User ID
   * @param {string} fcmToken - User's FCM token
   * @param {Object} timetableData - Parsed timetable data
   * @returns {Promise<Array>} Array of scheduled reminder objects
   */
  async scheduleClassReminders(userId, fcmToken, timetableData) {
    try {
      console.log(`Scheduling reminders for user: ${userId}`);

      if (!fcmToken) {
        throw new Error('FCM token is required for scheduling notifications');
      }

      const reminders = [];
      const courses = timetableData.courses || [];

      // Clear existing scheduled jobs for this user
      this.clearUserJobs(userId);

      courses.forEach(course => {
        if (!course.schedule || !Array.isArray(course.schedule)) {
          return;
        }

        course.schedule.forEach(session => {
          const reminderTimes = this.calculateReminderTimes(session);
          
          reminderTimes.forEach(reminderTime => {
            const reminderId = this.scheduleReminder(
              userId,
              fcmToken,
              course,
              session,
              reminderTime
            );

            reminders.push({
              id: reminderId,
              courseCode: course.courseCode,
              courseName: course.courseName,
              day: session.day,
              startTime: session.startTime,
              location: session.location,
              reminderTime: reminderTime.toISOString(),
              reminderMinutes: reminderTime.reminderMinutes,
              isActive: true
            });
          });
        });
      });

      console.log(`Scheduled ${reminders.length} reminders for user: ${userId}`);
      return reminders;

    } catch (error) {
      console.error('Failed to schedule reminders:', error);
      throw new Error(`Reminder scheduling failed: ${error.message}`);
    }
  }

  /**
   * Calculate reminder times for a class session
   * @param {Object} session - Class session object
   * @returns {Array} Array of reminder time objects
   */
  calculateReminderTimes(session) {
    const reminderTimes = [];
    const reminderIntervals = [15, 60]; // 15 minutes and 1 hour before

    if (!session.day || !session.startTime) {
      return reminderTimes;
    }

    try {
      const dayMap = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
      };

      const dayOfWeek = dayMap[session.day];
      if (dayOfWeek === undefined) {
        console.warn(`Invalid day: ${session.day}`);
        return reminderTimes;
      }

      // Parse start time
      const [hours, minutes] = session.startTime.split(':').map(Number);
      
      reminderIntervals.forEach(minutesBefore => {
        // Create a moment object for the next occurrence of this class
        const nextClassTime = moment()
          .day(dayOfWeek)
          .hour(hours)
          .minute(minutes)
          .second(0);

        // If the time has already passed this week, move to next week
        if (nextClassTime.isBefore(moment())) {
          nextClassTime.add(1, 'week');
        }

        // Calculate reminder time
        const reminderTime = nextClassTime.clone().subtract(minutesBefore, 'minutes');

        // Only schedule if reminder time is in the future
        if (reminderTime.isAfter(moment())) {
          reminderTimes.push({
            ...reminderTime.toDate(),
            reminderMinutes: minutesBefore,
            nextClassTime: nextClassTime.toDate()
          });
        }
      });

    } catch (error) {
      console.error('Error calculating reminder times:', error);
    }

    return reminderTimes;
  }

  /**
   * Schedule a single reminder using cron
   * @param {string} userId - User ID
   * @param {string} fcmToken - FCM token
   * @param {Object} course - Course object
   * @param {Object} session - Session object
   * @param {Object} reminderTime - Reminder time object
   * @returns {string} Reminder ID
   */
  scheduleReminder(userId, fcmToken, course, session, reminderTime) {
    const reminderId = `${userId}-${course.courseCode}-${session.day}-${reminderTime.reminderMinutes}`;
    
    try {
      // Create cron expression for the reminder time
      const cronExpression = this.createCronExpression(reminderTime);
      
      const job = cron.schedule(cronExpression, async () => {
        await this.sendClassReminder(fcmToken, course, session, reminderTime.reminderMinutes);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Store job reference for cleanup
      if (!this.scheduledJobs.has(userId)) {
        this.scheduledJobs.set(userId, []);
      }
      
      this.scheduledJobs.get(userId).push({
        id: reminderId,
        job,
        course: course.courseCode,
        session: session.day
      });

      console.log(`Scheduled reminder: ${reminderId} for ${reminderTime.toISOString()}`);
      return reminderId;

    } catch (error) {
      console.error('Failed to schedule individual reminder:', error);
      return null;
    }
  }

  /**
   * Send class reminder notification
   * @param {string} fcmToken - FCM token
   * @param {Object} course - Course object
   * @param {Object} session - Session object
   * @param {number} minutesBefore - Minutes before class
   */
  async sendClassReminder(fcmToken, course, session, minutesBefore) {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title: `Class Reminder - ${course.courseCode}`,
          body: `${course.courseName} starts in ${minutesBefore} minutes at ${session.location || 'TBD'}`
        },
        data: {
          type: 'class_reminder',
          courseCode: course.courseCode,
          courseName: course.courseName,
          startTime: session.startTime,
          location: session.location || 'TBD',
          minutesBefore: minutesBefore.toString()
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#3498db',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await messaging.send(message);
      console.log(`Class reminder sent successfully: ${response}`);

    } catch (error) {
      console.error('Failed to send class reminder:', error);
      
      // If token is invalid, we should handle token cleanup
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log('FCM token is invalid, should clean up from database');
      }
    }
  }

  /**
   * Create cron expression from Date object
   * @param {Date} date - Target date
   * @returns {string} Cron expression
   */
  createCronExpression(date) {
    const moment_date = moment(date);
    return `${moment_date.minute()} ${moment_date.hour()} * * ${moment_date.day()}`;
  }

  /**
   * Clear all scheduled jobs for a user
   * @param {string} userId - User ID
   */
  clearUserJobs(userId) {
    if (this.scheduledJobs.has(userId)) {
      const userJobs = this.scheduledJobs.get(userId);
      
      userJobs.forEach(({ job, id }) => {
        job.destroy();
        console.log(`Cleared job: ${id}`);
      });

      this.scheduledJobs.delete(userId);
      console.log(`Cleared all jobs for user: ${userId}`);
    }
  }

  /**
   * Send immediate notification for testing
   * @param {string} fcmToken - FCM token
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @returns {Promise<string>} Message ID
   */
  async sendTestNotification(fcmToken, title = 'Test Notification', body = 'This is a test notification from your timetable app') {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title,
          body
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };

      const response = await messaging.send(message);
      console.log('Test notification sent successfully:', response);
      return response;

    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Get statistics about scheduled reminders
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  getScheduleStats(userId) {
    const userJobs = this.scheduledJobs.get(userId) || [];
    
    const stats = {
      totalReminders: userJobs.length,
      courseCount: new Set(userJobs.map(job => job.course)).size,
      upcomingReminders: userJobs.filter(job => job.job.running).length
    };

    return stats;
  }
}

module.exports = new NotificationService();