import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { AnimatedView } from '../../components/ui/AnimatedView';
import { PremiumButton } from '../../components/ui/PremiumButton';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { saveTimetable } from '../services/firestoreTimetableService';
import { parseTimetableImageWithGemini } from '../services/geminiImageService';
import { requestNotificationPermissions, scheduleClassReminders } from '../services/notificationScheduler';
import { getConfidenceScore } from '../services/qwenAIService';

const { width } = Dimensions.get('window');

const UploadScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { fcmToken } = useNotification();
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const selectImage = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select your timetable image',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => openGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to select images');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadTimetable = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please sign in to upload timetables');
      return;
    }
    
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    setUploadProgress('Requesting permissions...');

    try {
      // Check if we're running in Expo Go (which doesn't support notifications in SDK 53+)
      const isExpoGo = __DEV__ && !global.EXPO_PROJECT_ID;
      
      if (!isExpoGo) {
        // Request notification permissions only if not in Expo Go
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert('Permission Required', 'Please enable notifications to receive class reminders');
          return;
        }
      } else {
        console.log('Running in Expo Go - skipping notification permission request');
      }

      setUploadProgress('Parsing timetable with Gemini...');
      
      // New flow: send image directly to Gemini (no OCR)
      const parsedData = await parseTimetableImageWithGemini(selectedImage);
      
      if (!parsedData.courses || parsedData.courses.length === 0) {
        throw new Error('No valid course data could be extracted. Please try a different image.');
      }

      setUploadProgress('Saving to database...');
      
      // Step 3: Save to Firestore
      const saveResult = await saveTimetable(user.uid, parsedData, {
        source: 'gemini_image',
        confidenceScore: getConfidenceScore(parsedData),
        imageProcessedAt: new Date(),
        originalImageUri: selectedImage.uri
      });

      setUploadProgress('Scheduling notifications...');
      
      // Schedule notifications only if not in Expo Go
      if (!isExpoGo) {
        const scheduledNotifications = await scheduleClassReminders(parsedData);
        console.log(`Scheduled ${scheduledNotifications.length} notifications`);
      } else {
        console.log('Running in Expo Go - skipping notification scheduling');
      }

      setUploadProgress('Success!');
      
      Alert.alert(
        'Success!',
        `Timetable processed successfully!\n\n` +
        `• ${parsedData.courses.length} courses found\n` +
        `• ${isExpoGo ? 'Notifications skipped (Expo Go)' : 'Reminders scheduled'}\n` +
        `• Confidence: ${Math.round(getConfidenceScore(parsedData) * 100)}%`,
        [
          {
            text: 'View Timetable',
            onPress: () => {
              navigation.navigate('MyTimetables');
            }
          },
          {
            text: 'Upload Another',
            onPress: () => {
              setSelectedImage(null);
              setUploadProgress('');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to process timetable. Please try again.',
        [
          { text: 'Try Again', onPress: () => setUploadProgress('') },
          { text: 'Cancel', onPress: () => setSelectedImage(null) }
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  const convertToBase64 = async (uri) => {
    return selectedImage.base64;
  };

  const removeImage = () => {
    setSelectedImage(null);
    setUploadProgress('');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Premium Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AnimatedView animationType="slideUp" delay={100}>
          <ThemedText type="h1" variant="inverse" weight="bold" style={styles.headerTitle}>
            Upload Timetable
          </ThemedText>
          <ThemedText type="body" variant="inverse" style={styles.headerSubtitle}>
            Take a photo or select an image of your timetable
          </ThemedText>
        </AnimatedView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Premium Upload Area */}
        {!selectedImage ? (
          <AnimatedView animationType="fadeIn" delay={200}>
            <PremiumCard
              variant="elevated"
              style={styles.uploadArea}
              shadow="medium"
              onPress={selectImage}
            >
              <View style={styles.uploadContent}>
                <View style={[styles.uploadIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                  <Icon name="cloud-upload" size={48} color={colors.primary} />
                </View>
                <ThemedText type="h3" weight="bold" style={styles.uploadTitle}>
                  Select Timetable Image
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.uploadSubtitle}>
                  Tap to choose from camera or gallery
                </ThemedText>
                
                <View style={styles.uploadHints}>
                  <View style={styles.hint}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <ThemedText type="caption" variant="secondary" style={styles.hintText}>
                      Clear, well-lit images work best
                    </ThemedText>
                  </View>
                  <View style={styles.hint}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <ThemedText type="caption" variant="secondary" style={styles.hintText}>
                      Include all course information
                    </ThemedText>
                  </View>
                  <View style={styles.hint}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <ThemedText type="caption" variant="secondary" style={styles.hintText}>
                      Avoid shadows and glare
                    </ThemedText>
                  </View>
                </View>
              </View>
            </PremiumCard>
          </AnimatedView>
        ) : (
          <AnimatedView animationType="scale" delay={200}>
            <PremiumCard variant="elevated" style={styles.imagePreview} shadow="medium">
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              
              <View style={styles.imageActions}>
                <PremiumButton
                  title="Remove"
                  onPress={removeImage}
                  variant="outline"
                  size="small"
                  icon={<Icon name="close" size={16} color={colors.danger} style={{ marginRight: 4 }} />}
                  style={[styles.actionButton, { borderColor: colors.danger }]}
                />
                
                <PremiumButton
                  title="Change"
                  onPress={selectImage}
                  variant="outline"
                  size="small"
                  icon={<Icon name="edit" size={16} color={colors.primary} style={{ marginRight: 4 }} />}
                  style={[styles.actionButton, { borderColor: colors.primary }]}
                />
              </View>
            </PremiumCard>
          </AnimatedView>
        )}

        {/* Premium Processing Status */}
        {uploading && (
          <AnimatedView animationType="fadeIn" delay={300}>
            <PremiumCard variant="elevated" style={styles.processingContainer} shadow="medium">
              <View style={styles.processingContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText type="h3" weight="bold" style={styles.processingText}>
                  {uploadProgress}
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.processingSubtext}>
                  This may take a few moments...
                </ThemedText>
              </View>
            </PremiumCard>
          </AnimatedView>
        )}

        {/* Premium Upload Button */}
        {selectedImage && !uploading && (
          <AnimatedView animationType="slideUp" delay={300}>
            <PremiumButton
              title="Process Timetable"
              onPress={uploadTimetable}
              variant="gradient"
              gradientColors={[colors.gradientStart, colors.gradientEnd]}
              icon={<Icon name="upload" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />}
              style={styles.uploadButton}
              size="large"
              fullWidth
            />
          </AnimatedView>
        )}

        {/* Premium How it Works */}
        <AnimatedView animationType="slideUp" delay={400}>
          <PremiumCard variant="elevated" style={styles.howItWorks} shadow="medium">
            <ThemedText type="h3" weight="bold" style={styles.howItWorksTitle}>
              How it works
            </ThemedText>
            
            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <ThemedText type="body" variant="inverse" weight="bold">
                  1
                </ThemedText>
              </View>
              <View style={styles.stepContent}>
                <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                  Upload Image
                </ThemedText>
                <ThemedText type="caption" variant="secondary" style={styles.stepDescription}>
                  Take a photo or select an image of your timetable
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: colors.secondary }]}>
                <ThemedText type="body" variant="inverse" weight="bold">
                  2
                </ThemedText>
              </View>
              <View style={styles.stepContent}>
                <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                  Smart Processing
                </ThemedText>
                <ThemedText type="caption" variant="secondary" style={styles.stepDescription}>
                  Gemini parses your timetable image into structured classes
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: colors.success }]}>
                <ThemedText type="body" variant="inverse" weight="bold">
                  3
                </ThemedText>
              </View>
              <View style={styles.stepContent}>
                <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                  Smart Reminders
                </ThemedText>
                <ThemedText type="caption" variant="secondary" style={styles.stepDescription}>
                  Get automatic notifications before each class
                </ThemedText>
              </View>
            </View>
          </PremiumCard>
        </AnimatedView>

        {/* Premium Tips */}
        <AnimatedView animationType="slideUp" delay={500}>
          <PremiumCard variant="elevated" style={styles.tips} shadow="medium">
            <ThemedText type="h3" weight="bold" style={styles.tipsTitle}>
              Tips for best results
            </ThemedText>
            
            <View style={styles.tip}>
              <View style={[styles.tipIcon, { backgroundColor: colors.warningLight + '20' }]}>
                <Icon name="lightbulb-outline" size={20} color={colors.warning} />
              </View>
              <ThemedText type="caption" variant="secondary" style={styles.tipText}>
                Use clear, well-lit images for the best Gemini parsing accuracy
              </ThemedText>
            </View>
            
            <View style={styles.tip}>
              <View style={[styles.tipIcon, { backgroundColor: colors.warningLight + '20' }]}>
                <Icon name="lightbulb-outline" size={20} color={colors.warning} />
              </View>
              <ThemedText type="caption" variant="secondary" style={styles.tipText}>
                Ensure good lighting and avoid shadows for best results
              </ThemedText>
            </View>
            
            <View style={styles.tip}>
              <View style={[styles.tipIcon, { backgroundColor: colors.warningLight + '20' }]}>
                <Icon name="lightbulb-outline" size={20} color={colors.warning} />
              </View>
              <ThemedText type="caption" variant="secondary" style={styles.tipText}>
                Keep the camera steady and include all course details
              </ThemedText>
            </View>
          </PremiumCard>
        </AnimatedView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    marginBottom: 8,
  },
  headerSubtitle: {
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  uploadArea: {
    marginBottom: 24,
    minHeight: 300,
  },
  uploadContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadTitle: {
    marginBottom: 8,
  },
  uploadSubtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  uploadHints: {
    alignSelf: 'stretch',
    gap: 12,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: {
    marginLeft: 12,
  },
  imagePreview: {
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
  processingContainer: {
    marginBottom: 24,
  },
  processingContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  processingText: {
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtext: {
    textAlign: 'center',
  },
  uploadButton: {
    marginBottom: 24,
  },
  howItWorks: {
    marginBottom: 24,
  },
  howItWorksTitle: {
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    marginBottom: 4,
  },
  stepDescription: {
    marginTop: 4,
  },
  tips: {
    marginBottom: 32,
  },
  tipsTitle: {
    marginBottom: 20,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    flex: 1,
  },
});

export default UploadScreen;