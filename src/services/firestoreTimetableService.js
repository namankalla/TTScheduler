/**
 * Firestore Timetable Service
 * Handles saving and retrieving timetable data
 */

import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { firebaseDb } from '../firebase/client';

export const saveTimetable = async (userId, timetableData, metadata = {}) => {
  try {
    console.log(`Saving timetable for user: ${userId}`);

    // Try to save to Firestore first
    try {
      const timetableRef = doc(collection(firebaseDb(), 'users'), userId, 'timetable', 'current');
      
      const timetableDoc = {
        ...timetableData,
        metadata: {
          ...timetableData.metadata,
          ...metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      };

      await setDoc(timetableRef, timetableDoc, { merge: true });
      
      console.log('Timetable saved to Firestore successfully');
      return { success: true, id: timetableRef.id, method: 'firestore' };

    } catch (firestoreError) {
      console.warn('Firestore save failed, trying AsyncStorage fallback:', firestoreError.message);
      
      // Fallback to AsyncStorage if Firestore fails
      return await saveTimetableToAsyncStorage(userId, timetableData, metadata);
    }

  } catch (error) {
    console.error('Failed to save timetable:', error);
    throw new Error(`Database save failed: ${error.message}`);
  }
};

/**
 * Fallback: Save timetable to AsyncStorage
 */
const saveTimetableToAsyncStorage = async (userId, timetableData, metadata = {}) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const timetableDoc = {
      ...timetableData,
      metadata: {
        ...timetableData.metadata,
        ...metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        storageMethod: 'asyncStorage'
      }
    };

    const key = `timetable_${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(timetableDoc));
    
    console.log('Timetable saved to AsyncStorage successfully');
    return { success: true, id: key, method: 'asyncStorage' };

  } catch (error) {
    console.error('AsyncStorage save also failed:', error);
    throw new Error(`All save methods failed: ${error.message}`);
  }
};

export const getTimetable = async (userId) => {
  try {
    console.log(`Getting timetable for user: ${userId}`);

    // Try Firestore first
    try {
      const timetableRef = doc(collection(firebaseDb(), 'users'), userId, 'timetable', 'current');
      const timetableDoc = await getDoc(timetableRef);

      if (timetableDoc.exists()) {
        console.log('Timetable retrieved from Firestore');
        return timetableDoc.data();
      }
    } catch (firestoreError) {
      console.warn('Firestore get failed, trying AsyncStorage fallback:', firestoreError.message);
    }

    // Fallback to AsyncStorage
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const key = `timetable_${userId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        console.log('Timetable retrieved from AsyncStorage');
        return JSON.parse(storedData);
      }
    } catch (asyncStorageError) {
      console.warn('AsyncStorage get also failed:', asyncStorageError.message);
    }

    return null;

  } catch (error) {
    console.error('Failed to get timetable:', error);
    return null; // Return null instead of throwing to prevent app crashes
  }
};

export const getAllTimetables = async (userId) => {
  try {
    console.log(`Getting all timetables for user: ${userId}`);

    const timetablesRef = collection(firebaseDb(), 'users', userId, 'timetable');
    const q = query(timetablesRef, orderBy('metadata.createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const timetables = [];
    querySnapshot.forEach((doc) => {
      timetables.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return timetables;

  } catch (error) {
    console.error('Failed to get all timetables:', error);
    return [];
  }
};

export const deleteTimetable = async (userId, timetableId) => {
  try {
    console.log(`Deleting timetable: ${timetableId} for user: ${userId}`);

    const timetableRef = doc(collection(firebaseDb(), 'users'), userId, 'timetable', timetableId);
    await setDoc(timetableRef, { deleted: true, deletedAt: new Date() }, { merge: true });
    
    console.log('Timetable deleted successfully');
    return { success: true };

  } catch (error) {
    console.error('Failed to delete timetable:', error);
    throw new Error(`Failed to delete timetable: ${error.message}`);
  }
};
