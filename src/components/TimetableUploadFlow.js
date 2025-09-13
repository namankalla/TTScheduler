/**
 * Complete Timetable Upload Flow Component
 * Shows the entire process: Image → OCR → AI → Firestore → Notifications
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { extractTextFromImage } from '../services/ocrSpaceService';
import { parseTimetableText, getConfidenceScore } from '../services/qwenAIService';
import { saveTimetable } from '../services/firestoreTimetableService';
import { scheduleClassReminders, requestNotificationPermissions } from '../services/notificationScheduler';

const TimetableUploadFlow = ({ onSuccess }) => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setExtractedText('');
        setParsedData(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const processTimetable = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Request notification permissions
      setCurrentStep('Requesting permissions...');
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notifications to receive class reminders');
        return;
      }

      // Step 2: Extract text using OCR.space
      setCurrentStep('Extracting text from image...');
      const text = await extractTextFromImage(selectedImage.uri);
      setExtractedText(text);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image. Please try a clearer photo.');
      }

      // Step 3: Parse text using Qwen AI
      setCurrentStep('Parsing timetable with AI...');
      const data = await parseTimetableText(text);
      setParsedData(data);

      if (!data.courses || data.courses.length === 0) {
        throw new Error('No valid course data could be extracted. Please try a different image.');
      }

      // Step 4: Save to Firestore
      setCurrentStep('Saving to database...');
      await saveTimetable(user.uid, data, {
        extractedText: text,
        confidenceScore: getConfidenceScore(data),
        imageProcessedAt: new Date(),
        originalImageUri: selectedImage.uri
      });

      // Step 5: Schedule notifications
      setCurrentStep('Scheduling notifications...');
      const scheduledNotifications = await scheduleClassReminders(data);

      setCurrentStep('Complete!');
      
      Alert.alert(
        'Success!',
        `Timetable processed successfully!\n\n` +
        `• ${data.courses.length} courses found\n` +
        `• ${scheduledNotifications.length} reminders scheduled\n` +
        `• Confidence: ${Math.round(getConfidenceScore(data) * 100)}%`,
        [{ text: 'OK', onPress: () => onSuccess && onSuccess(data) }]
      );

    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Processing Failed', error.message || 'Failed to process timetable. Please try again.');
    } finally {
      setProcessing(false);
      setCurrentStep('');
    }
  };

  const resetFlow = () => {
    setSelectedImage(null);
    setExtractedText('');
    setParsedData(null);
    setCurrentStep('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Timetable Upload Flow</Text>
      
      {/* Image Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Image</Text>
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.image} />
            <TouchableOpacity style={styles.button} onPress={selectImage}>
              <Text style={styles.buttonText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={selectImage}>
            <Text style={styles.buttonText}>Select Timetable Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Extracted Text */}
      {extractedText && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Extracted Text</Text>
          <View style={styles.textContainer}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </View>
        </View>
      )}

      {/* Parsed Data */}
      {parsedData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Parsed Timetable</Text>
          <View style={styles.textContainer}>
            <Text style={styles.parsedText}>
              {JSON.stringify(parsedData, null, 2)}
            </Text>
          </View>
        </View>
      )}

      {/* Processing Status */}
      {processing && (
        <View style={styles.section}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.processingText}>{currentStep}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        {selectedImage && !processing && (
          <TouchableOpacity style={styles.processButton} onPress={processTimetable}>
            <Text style={styles.processButtonText}>Process Timetable</Text>
          </TouchableOpacity>
        )}
        
        {(selectedImage || extractedText || parsedData) && !processing && (
          <TouchableOpacity style={styles.resetButton} onPress={resetFlow}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#34495e',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  textContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    maxHeight: 200,
  },
  extractedText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  parsedText: {
    fontSize: 12,
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  processingText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#3498db',
  },
  processButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TimetableUploadFlow;
