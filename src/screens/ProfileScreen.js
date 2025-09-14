import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { AnimatedView } from '../../components/ui/AnimatedView';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getScheduledNotifications, sendTestNotification } from '../services/notificationScheduler';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const { fcmToken, notifications, clearNotifications, getUnreadCount } = useNotification();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderStats, setReminderStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadReminderStats();
  }, []);

  const loadReminderStats = async () => {
    try {
      const scheduledNotifications = await getScheduledNotifications();
      setReminderStats({
        totalReminders: scheduledNotifications.length,
        upcomingReminders: scheduledNotifications.filter(n => new Date(n.trigger.value) > new Date()).length
      });
    } catch (error) {
      console.error('Failed to load reminder stats:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await signOut();
              if (!result.success) {
                Alert.alert('Error', result.error);
              } else {
                console.log('Sign out successful - navigating to welcome page');
                // Add a small delay to ensure the auth state change is processed
                setTimeout(() => {
                  console.log('Auth state should have changed, navigation will happen automatically');
                }, 100);
              }
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification();
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const handleClearNotifications = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearNotifications,
        },
      ]
    );
  };

  const ProfileSection = ({ title, children }) => (
    <AnimatedView animationType="slideUp" delay={300}>
      <View style={styles.section}>
        <ThemedText type="h3" weight="bold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {children}
      </View>
    </AnimatedView>
  );

  const ProfileItem = ({ icon, title, subtitle, onPress, rightComponent, iconColor }) => (
    <PremiumCard
      variant="elevated"
      style={styles.profileItem}
      shadow="small"
      onPress={onPress}
    >
      <View style={styles.profileItemContent}>
        <View style={styles.profileItemLeft}>
          <View style={[styles.profileItemIcon, { backgroundColor: (iconColor || colors.primary) + '20' }]}>
            <Icon name={icon} size={20} color={iconColor || colors.primary} />
          </View>
          <View style={styles.profileItemText}>
            <ThemedText type="body" weight="medium">
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText type="caption" variant="secondary" style={styles.profileItemSubtitle}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </View>
        {rightComponent || <Icon name="chevron-right" size={20} color={colors.textMuted} />}
      </View>
    </PremiumCard>
  );

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
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText type="h1" variant="inverse" weight="bold" style={styles.avatarText}>
                  {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </ThemedText>
              </LinearGradient>
            </View>
            <ThemedText type="h2" variant="inverse" weight="bold" style={styles.userName}>
              {user?.displayName || 'User'}
            </ThemedText>
            <ThemedText type="body" variant="inverse" style={styles.userEmail}>
              {user?.email}
            </ThemedText>
          </View>
        </AnimatedView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Premium Stats */}
        <AnimatedView animationType="fadeIn" delay={200}>
          <View style={styles.statsContainer}>
            <PremiumCard variant="elevated" style={styles.statCard} shadow="medium">
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.successLight + '20' }]}>
                  <Icon name="schedule" size={24} color={colors.success} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {reminderStats?.totalReminders || 0}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Active Reminders
                </ThemedText>
              </View>
            </PremiumCard>
            
            <PremiumCard variant="elevated" style={styles.statCard} shadow="medium">
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.infoLight + '20' }]}>
                  <Icon name="notifications" size={24} color={colors.info} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {notifications.length}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Notifications
                </ThemedText>
              </View>
            </PremiumCard>
            
            <PremiumCard variant="elevated" style={styles.statCard} shadow="medium">
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.warningLight + '20' }]}>
                  <Icon name="book" size={24} color={colors.warning} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {reminderStats?.courseCount || 0}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Courses
                </ThemedText>
              </View>
            </PremiumCard>
          </View>
        </AnimatedView>

        {/* Notifications */}
        <ProfileSection title="Notifications">
          <ProfileItem
            icon="notifications"
            title="Push Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            iconColor={colors.info}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationsEnabled ? colors.textInverse : colors.textMuted}
              />
            }
          />
          
          <ProfileItem
            icon="notification-important"
            title="Test Notification"
            subtitle="Send a test notification"
            iconColor={colors.warning}
            onPress={handleTestNotification}
          />
          
          <ProfileItem
            icon="clear-all"
            title="Clear Notifications"
            subtitle={`${notifications.length} notifications`}
            iconColor={colors.danger}
            onPress={handleClearNotifications}
          />
        </ProfileSection>

        {/* Timetable */}
        <ProfileSection title="Timetable">
          <ProfileItem
            icon="schedule"
            title="My Timetables"
            subtitle="View and manage your timetables"
            iconColor={colors.primary}
            onPress={() => navigation.navigate('MyTimetables')}
          />
          
          <ProfileItem
            icon="upload"
            title="Upload New Timetable"
            subtitle="Add a new timetable"
            iconColor={colors.secondary}
            onPress={() => navigation.navigate('Upload')}
          />
        </ProfileSection>

        {/* App Info */}
        <ProfileSection title="App Information">
          <ProfileItem
            icon="info"
            title="About"
            subtitle="Version 1.0.0"
            iconColor={colors.info}
            onPress={() => {
              Alert.alert(
                'About TimeTable Pro',
                'Smart timetable management with AI-powered scheduling.\n\nVersion 1.0.0\nBuilt with React Native & Firebase'
              );
            }}
          />
          
          <ProfileItem
            icon="help"
            title="Help & Support"
            subtitle="Get help with the app"
            iconColor={colors.warning}
            onPress={() => {
              Alert.alert(
                'Help & Support',
                'For support, please contact:\nsupport@timetablepro.com'
              );
            }}
          />
          
          <ProfileItem
            icon="privacy-tip"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            iconColor={colors.success}
            onPress={() => {
              Alert.alert(
                'Privacy Policy',
                'Your privacy is important to us. We only collect data necessary to provide our services.'
              );
            }}
          />
        </ProfileSection>

        {/* Account */}
        <ProfileSection title="Account">
          <ProfileItem
            icon="logout"
            title="Sign Out"
            subtitle="Sign out of your account"
            iconColor={colors.danger}
            onPress={handleSignOut}
          />
        </ProfileSection>

        {/* Debug Info (Development only) */}
        {__DEV__ && (
          <ProfileSection title="Debug Info">
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>FCM Token:</Text>
              <Text style={styles.debugText}>
                {fcmToken ? `${fcmToken.substring(0, 20)}...` : 'Not available'}
              </Text>
              
              <Text style={styles.debugTitle}>User ID:</Text>
              <Text style={styles.debugText}>{user?.uid}</Text>
              
              <Text style={styles.debugTitle}>Unread Notifications:</Text>
              <Text style={styles.debugText}>{getUnreadCount()}</Text>
            </View>
          </ProfileSection>
        )}
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
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    marginBottom: 0,
  },
  userName: {
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    marginBottom: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  profileItem: {
    marginBottom: 12,
  },
  profileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemSubtitle: {
    marginTop: 2,
  },
  debugInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
});

export default ProfileScreen;