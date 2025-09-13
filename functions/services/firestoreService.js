const { db } = require('../config/firebaseConfig');
const { v4: uuidv4 } = require('uuid');

class FirestoreService {
  constructor() {
    this.usersCollection = 'users';
    this.timetablesCollection = 'timetables';
    this.remindersCollection = 'reminders';
  }

  /**
   * Save parsed timetable data to Firestore
   * @param {string} userId - User ID
   * @param {Object} timetableData - Parsed timetable data
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Document ID
   */
  async saveTimetable(userId, timetableData, metadata = {}) {
    try {
      console.log(`Saving timetable for user: ${userId}`);

      const docId = uuidv4();
      const timetableDoc = {
        id: docId,
        userId,
        ...timetableData,
        metadata: {
          ...timetableData.metadata,
          ...metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      };

      await db.collection(this.timetablesCollection).doc(docId).set(timetableDoc);
      
      // Update user's active timetable reference
      await this.updateUserActiveTimetable(userId, docId);
      
      console.log(`Timetable saved successfully: ${docId}`);
      return docId;

    } catch (error) {
      console.error('Failed to save timetable:', error);
      throw new Error(`Database save failed: ${error.message}`);
    }
  }

  /**
   * Update user's active timetable reference
   * @param {string} userId - User ID
   * @param {string} timetableId - Timetable document ID
   */
  async updateUserActiveTimetable(userId, timetableId) {
    try {
      const userRef = db.collection(this.usersCollection).doc(userId);
      
      await userRef.set({
        activeTimetableId: timetableId,
        lastTimetableUpdate: new Date(),
        updatedAt: new Date()
      }, { merge: true });

    } catch (error) {
      console.warn('Failed to update user active timetable:', error.message);
    }
  }

  /**
   * Get user's active timetable
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Timetable data or null
   */
  async getUserTimetable(userId) {
    try {
      // Get user's active timetable ID
      const userDoc = await db.collection(this.usersCollection).doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      const activeTimetableId = userData.activeTimetableId;

      if (!activeTimetableId) {
        return null;
      }

      // Get the timetable document
      const timetableDoc = await db.collection(this.timetablesCollection)
        .doc(activeTimetableId).get();

      if (!timetableDoc.exists) {
        return null;
      }

      return timetableDoc.data();

    } catch (error) {
      console.error('Failed to get user timetable:', error);
      throw new Error(`Failed to retrieve timetable: ${error.message}`);
    }
  }

  /**
   * Save reminder schedule for a user
   * @param {string} userId - User ID
   * @param {string} timetableId - Timetable document ID
   * @param {Array} reminders - Array of reminder objects
   * @returns {Promise<string>} Reminders document ID
   */
  async saveReminders(userId, timetableId, reminders) {
    try {
      console.log(`Saving ${reminders.length} reminders for user: ${userId}`);

      const docId = uuidv4();
      const remindersDoc = {
        id: docId,
        userId,
        timetableId,
        reminders,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      await db.collection(this.remindersCollection).doc(docId).set(remindersDoc);
      
      console.log(`Reminders saved successfully: ${docId}`);
      return docId;

    } catch (error) {
      console.error('Failed to save reminders:', error);
      throw new Error(`Failed to save reminders: ${error.message}`);
    }
  }

  /**
   * Get user's active reminders
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of reminder objects
   */
  async getUserReminders(userId) {
    try {
      const snapshot = await db.collection(this.remindersCollection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return [];
      }

      const doc = snapshot.docs[0];
      return doc.data().reminders || [];

    } catch (error) {
      console.error('Failed to get user reminders:', error);
      return [];
    }
  }

  /**
   * Deactivate old reminders for a user
   * @param {string} userId - User ID
   * @param {string} exceptDocId - Document ID to exclude from deactivation
   */
  async deactivateOldReminders(userId, exceptDocId = null) {
    try {
      let query = db.collection(this.remindersCollection)
        .where('userId', '==', userId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        if (doc.id !== exceptDocId) {
          batch.update(doc.ref, { 
            isActive: false, 
            deactivatedAt: new Date() 
          });
        }
      });

      if (!snapshot.empty) {
        await batch.commit();
        console.log(`Deactivated ${snapshot.size} old reminder documents`);
      }

    } catch (error) {
      console.warn('Failed to deactivate old reminders:', error.message);
    }
  }

  /**
   * Update user profile and FCM token
   * @param {string} userId - User ID
   * @param {Object} profileData - User profile data
   * @returns {Promise<void>}
   */
  async updateUserProfile(userId, profileData) {
    try {
      const userRef = db.collection(this.usersCollection).doc(userId);
      
      await userRef.set({
        ...profileData,
        updatedAt: new Date()
      }, { merge: true });

      console.log(`User profile updated: ${userId}`);

    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  /**
   * Get user's FCM token
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} FCM token or null
   */
  async getUserFCMToken(userId) {
    try {
      const userDoc = await db.collection(this.usersCollection).doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return userData.fcmToken || null;

    } catch (error) {
      console.error('Failed to get user FCM token:', error);
      return null;
    }
  }
}

module.exports = new FirestoreService();