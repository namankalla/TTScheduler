import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const router = useRouter();
  return (
    <LinearGradient
      colors={['#3498db', '#2980b9', '#1f4e79']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Icon name="schedule" size={80} color="#3498db" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>TimeTable Pro</Text>
        <Text style={styles.subtitle}>
          Smart timetable management with AI-powered scheduling
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Icon name="camera-alt" size={24} color="#ffffff" />
            <Text style={styles.featureText}>Scan timetables with your camera</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="notifications" size={24} color="#ffffff" />
            <Text style={styles.featureText}>Get smart class reminders</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="cloud-sync" size={24} color="#ffffff" />
            <Text style={styles.featureText}>Sync across all your devices</Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/auth?mode=signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/auth?mode=signin')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 12, borderColor: '#27ae60' }]}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={[styles.secondaryButtonText, { color: '#27ae60' }]}>Bypass (Preview)</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Join thousands of students managing their schedules smarter
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 50,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 15,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#3498db',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WelcomeScreen;