import { collection, getDocs, getFirestore, limit, orderBy, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, isFirebaseConfigured } from '../firebase/client';

// Initialize Firebase Functions (default region)
const functionsInstance = isFirebaseConfigured ? getFunctions(getFirebaseApp()) : null;

// For development, you might want to use the emulator
// functionsInstance.useEmulator('localhost', 5001);

/**
 * Process timetable image with OCR and AI parsing
 * @param {Object} data - { imageData, fcmToken, userPreferences }
 * @returns {Promise<Object>} Processing result
 */
export const processTimetable = async (data) => {
  try {
    if (!functionsInstance) return { success: false, message: 'Firebase not configured' };
    const callable = httpsCallable(functionsInstance, 'processTimetable');
    const result = await callable(data);
    return result.data;
  } catch (error) {
    console.error('Process timetable error:', error);
    throw new Error(error.message || 'Failed to process timetable');
  }
};

/**
 * Get user's current timetable
 * @returns {Promise<Object>} Timetable data
 */
export const getTimetable = async () => {
  try {
    if (!functionsInstance) return { success: false, timetable: null };
    const callable = httpsCallable(functionsInstance, 'getTimetable');
    const result = await callable();
    return result.data;
  } catch (error) {
    console.error('Get timetable error:', error);
    
    // If no timetable found, return empty result
    if (error.code === 'functions/not-found') {
      return { success: false, timetable: null };
    }
    
    throw new Error(error.message || 'Failed to get timetable');
  }
};

/**
 * Send test notification
 * @param {Object} data - { fcmToken, title, body }
 * @returns {Promise<Object>} Result
 */
export const sendTestNotification = async (data) => {
  try {
    if (!functionsInstance) return { success: false };
    const callable = httpsCallable(functionsInstance, 'sendTestNotification');
    const result = await callable(data);
    return result.data;
  } catch (error) {
    console.error('Send test notification error:', error);
    throw new Error(error.message || 'Failed to send test notification');
  }
};

/**
 * Update FCM token
 * @param {string} fcmToken - FCM token
 * @returns {Promise<Object>} Result
 */
export const updateFCMToken = async (fcmToken) => {
  try {
    if (!functionsInstance) return { success: false };
    const callable = httpsCallable(functionsInstance, 'updateFCMToken');
    const result = await callable({ fcmToken });
    return result.data;
  } catch (error) {
    console.error('Update FCM token error:', error);
    throw new Error(error.message || 'Failed to update FCM token');
  }
};

/**
 * Get reminder statistics
 * @returns {Promise<Object>} Stats
 */
export const getReminderStats = async () => {
  try {
    if (!functionsInstance) return { success: false };
    const callable = httpsCallable(functionsInstance, 'getReminderStats');
    const result = await callable();
    return result.data;
  } catch (error) {
    console.error('Get reminder stats error:', error);
    throw new Error(error.message || 'Failed to get reminder stats');
  }
};

/**
 * Get user's timetables from Firestore (direct access)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of timetables
 */
export const getUserTimetables = async (userId) => {
  try {
    if (!isFirebaseConfigured) return [];
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, 'timetables'),
      where('userId', '==', userId),
      orderBy('metadata.createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get user timetables error:', error);
    throw new Error('Failed to get user timetables');
  }
};

/**
 * Get user's reminders from Firestore (direct access)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of reminders
 */
export const getUserReminders = async (userId) => {
  try {
    if (!isFirebaseConfigured) return [];
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    const first = snapshot.docs[0].data();
    return first.reminders || [];
  } catch (error) {
    console.error('Get user reminders error:', error);
    return [];
  }
};

/**
 * Health check for Firebase Functions
 * @returns {Promise<Object>} Health status
 */
export const healthCheck = async () => {
  try {
    if (!isFirebaseConfigured) return { ok: false };
    const projectId = getFirebaseApp().options && getFirebaseApp().options.projectId;
    const url = `https://us-central1-${projectId}.cloudfunctions.net/healthCheck`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw new Error('Health check failed');
  }
};