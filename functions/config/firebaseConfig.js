const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'your-project-id.appspot.com'
  });
}

const db = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();

// Firestore settings for better performance
db.settings({
  ignoreUndefinedProperties: true
});

module.exports = {
  admin,
  db,
  storage,
  messaging
};