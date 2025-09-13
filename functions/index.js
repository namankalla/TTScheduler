const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Import services
const ocrService = require('./services/ocrService');
const aiService = require('./services/aiService');
const firestoreService = require('./services/firestoreService');
const notificationService = require('./services/notificationService');

/**
 * Main Cloud Function to process timetable upload
 * Handles image upload, OCR, AI parsing, database storage, and notification scheduling
 */
exports.processTimetable = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { imageData, fcmToken, userPreferences = {} } = data;

    if (!imageData) {
      throw new functions.https.HttpsError('invalid-argument', 'Image data is required');
    }

    if (!fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
    }

    console.log(`Processing timetable for user: ${userId}`);

    // Step 1: Convert base64 image to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Validate image
    ocrService.validateImage(imageBuffer, 'image/jpeg');

    // Step 2: Perform OCR
    console.log('Starting OCR processing...');
    const extractedText = await ocrService.extractTextFromImage(imageBuffer, `timetable-${userId}-${Date.now()}.jpg`);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No text could be extracted from the image');
    }

    // Step 3: AI parsing
    console.log('Starting AI parsing...');
    const parsedData = await aiService.parseTimetable(extractedText, userId);
    
    if (!parsedData.courses || parsedData.courses.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No valid course data could be extracted');
    }

    // Step 4: Calculate confidence score
    const confidenceScore = aiService.getConfidenceScore(parsedData);
    
    // Step 5: Save to Firestore
    console.log('Saving to database...');
    const timetableId = await firestoreService.saveTimetable(userId, parsedData, {
      extractedText,
      confidenceScore,
      imageProcessedAt: new Date(),
      userPreferences
    });

    // Step 6: Schedule notifications
    console.log('Scheduling notifications...');
    const reminders = await notificationService.scheduleClassReminders(userId, fcmToken, parsedData);

    // Step 7: Save reminders to database
    const remindersId = await firestoreService.saveReminders(userId, timetableId, reminders);

    // Step 8: Update user profile with latest FCM token
    await firestoreService.updateUserProfile(userId, { 
      fcmToken,
      lastProcessedAt: new Date(),
      timetableCount: (userPreferences.timetableCount || 0) + 1
    });

    // Step 9: Deactivate old reminders
    await firestoreService.deactivateOldReminders(userId, remindersId);

    console.log(`Timetable processing completed successfully for user: ${userId}`);

    // Return success response
    return {
      success: true,
      timetableId,
      remindersId,
      coursesCount: parsedData.courses.length,
      remindersCount: reminders.length,
      confidenceScore: Math.round(confidenceScore * 100),
      extractedText: extractedText.substring(0, 200) + '...', // Preview only
      metadata: parsedData.metadata
    };

  } catch (error) {
    console.error('Timetable processing failed:', error);

    // Handle different error types
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Log detailed error for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: context.auth?.uid
    });

    throw new functions.https.HttpsError('internal', `Processing failed: ${error.message}`);
  }
});


/**
 * Get user's current timetable
 */
exports.getTimetable = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const timetable = await firestoreService.getUserTimetable(userId);

    if (!timetable) {
      throw new functions.https.HttpsError('not-found', 'No timetable found for user');
    }

    return {
      success: true,
      timetable
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to get timetable: ${error.message}`);
  }
});

/**
 * Send test notification
 */
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { fcmToken, title, body } = data;

    if (!fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
    }

    const messageId = await notificationService.sendTestNotification(fcmToken, title, body);

    return {
      success: true,
      messageId
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Test notification failed: ${error.message}`);
  }
});

/**
 * Update user FCM token
 */
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { fcmToken } = data;

    if (!fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
    }

    await firestoreService.updateUserProfile(userId, { fcmToken });

    return { success: true };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `FCM token update failed: ${error.message}`);
  }
});

/**
 * Get user reminders statistics
 */
exports.getReminderStats = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const stats = notificationService.getScheduleStats(userId);
    const dbReminders = await firestoreService.getUserReminders(userId);

    return {
      success: true,
      stats: {
        ...stats,
        dbRemindersCount: dbReminders.length
      }
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to get stats: ${error.message}`);
  }
});

// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        ocr: 'operational',
        ai: process.env.OPENROUTER_API_KEY ? 'operational' : 'api_key_missing',
        database: 'operational',
        notifications: 'operational'
      }
    });
  });
});