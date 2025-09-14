import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
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
import { getTimetable } from '../services/firestoreTimetableService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { notifications, getUnreadCount } = useNotification();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (user?.uid) {
      loadTimetable();
      loadTodayClasses();
    } else {
      // Clear data when user is null (e.g., after sign out)
      setTimetable(null);
      setTodayClasses([]);
    }
  }, [user]);

  const loadTimetable = async () => {
    if (!user?.uid) {
      console.log('No user available, skipping timetable load');
      return;
    }
    
    setLoading(true);
    try {
      const timetable = await getTimetable(user.uid);
      if (timetable) {
        setTimetable(timetable);
      }
    } catch (error) {
      console.error('Failed to load timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayClasses = () => {
    if (!timetable?.courses) return;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const classes = [];

    timetable.courses.forEach(course => {
      if (course.schedule) {
        course.schedule.forEach(session => {
          if (session.day === today) {
            // Filter out break slots
            const courseCode = course.courseCode?.toLowerCase() || '';
            const courseName = course.courseName?.toLowerCase() || '';
            const sessionType = session.type?.toLowerCase() || '';
            
            // Skip lunch break, recess, and other break types
            if (courseCode.includes('lunch') || 
                courseCode.includes('recess') || 
                courseCode.includes('break') ||
                courseName.includes('lunch') || 
                courseName.includes('recess') || 
                courseName.includes('break') ||
                sessionType.includes('lunch') || 
                sessionType.includes('recess') || 
                sessionType.includes('break')) {
              return; // Skip this session
            }

            // Skip lunch break time slot (11:20-12:20) regardless of name
            if (session.startTime === '11:20' && session.endTime === '12:20') {
              console.log(`Skipping lunch break slot: ${course.courseCode} (${session.startTime}-${session.endTime})`);
              return; // Skip this session
            }

            classes.push({
              ...session,
              courseCode: course.courseCode,
              courseName: course.courseName,
              instructor: course.instructor,
            });
          }
        });
      }
    });

    // Sort by start time
    classes.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    setTodayClasses(classes);
  };

  useEffect(() => {
    loadTodayClasses();
  }, [timetable]);

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const onRefresh = () => {
    loadTimetable();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
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
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <ThemedText type="body" variant="inverse" style={styles.greeting}>
                {getGreeting()}
              </ThemedText>
              <ThemedText type="h1" variant="inverse" weight="bold" style={styles.userName}>
                {user?.displayName || 'Student'}
              </ThemedText>
            </View>
            
            <TouchableOpacity style={styles.notificationButton}>
              <Icon name="notifications" size={24} color={colors.textInverse} />
              {getUnreadCount() > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
                  <ThemedText type="caption" variant="inverse" weight="bold">
                    {getUnreadCount()}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </AnimatedView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Premium Stats Cards */}
        <AnimatedView animationType="fadeIn" delay={200}>
          <View style={styles.statsContainer}>
            <PremiumCard
              variant="elevated"
              style={styles.statCard}
              shadow="medium"
            >
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                  <Icon name="schedule" size={28} color={colors.primary} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {timetable?.courses?.length || 0}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Courses
                </ThemedText>
              </View>
            </PremiumCard>
            
            <PremiumCard
              variant="elevated"
              style={styles.statCard}
              shadow="medium"
            >
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.warningLight + '20' }]}>
                  <Icon name="today" size={28} color={colors.warning} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {todayClasses.length}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Today's Classes
                </ThemedText>
              </View>
            </PremiumCard>
            
            <PremiumCard
              variant="elevated"
              style={styles.statCard}
              shadow="medium"
            >
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: colors.infoLight + '20' }]}>
                  <Icon name="notifications-active" size={28} color={colors.info} />
                </View>
                <ThemedText type="h2" weight="bold" style={styles.statNumber}>
                  {getUnreadCount()}
                </ThemedText>
                <ThemedText type="caption" variant="secondary">
                  Notifications
                </ThemedText>
              </View>
            </PremiumCard>
          </View>
        </AnimatedView>

        {/* Today's Schedule */}
        <AnimatedView animationType="slideUp" delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h3" weight="bold">
                Today's Schedule
              </ThemedText>
              <ThemedText type="caption" variant="secondary">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </ThemedText>
            </View>

            {todayClasses.length > 0 ? (
              todayClasses.map((classItem, index) => (
                <AnimatedView
                  key={index}
                  animationType="slideUp"
                  delay={400 + (index * 100)}
                >
                  <PremiumCard
                    variant="elevated"
                    style={styles.classCard}
                    shadow="medium"
                  >
                    <View style={styles.classContent}>
                      <View style={styles.classTime}>
                        <ThemedText type="body" weight="bold" style={styles.classTimeText}>
                          {formatTime(classItem.startTime)}
                        </ThemedText>
                        <ThemedText type="caption" variant="secondary">
                          {formatTime(classItem.endTime)}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.classInfo}>
                        <ThemedText type="body" weight="bold">
                          {classItem.courseCode}
                        </ThemedText>
                        <ThemedText type="caption" variant="secondary" style={styles.className}>
                          {classItem.courseName}
                        </ThemedText>
                        <View style={styles.classDetails}>
                          <Icon name="location-on" size={14} color={colors.textTertiary} />
                          <ThemedText type="caption" variant="tertiary" style={styles.classLocation}>
                            {classItem.location || 'TBD'}
                          </ThemedText>
                        </View>
                      </View>
                      
                      <View style={[styles.classType, { backgroundColor: colors.primaryLight + '20' }]}>
                        <ThemedText type="caption" weight="medium" style={[styles.classTypeText, { color: colors.primary }]}>
                          {classItem.type || 'Class'}
                        </ThemedText>
                      </View>
                    </View>
                  </PremiumCard>
                </AnimatedView>
              ))
            ) : (
              <AnimatedView animationType="fadeIn" delay={400}>
                <PremiumCard variant="elevated" style={styles.emptyState}>
                  <View style={styles.emptyStateContent}>
                    <Icon name="free-breakfast" size={48} color={colors.textMuted} />
                    <ThemedText type="h3" weight="bold" style={styles.emptyStateText}>
                      No classes today!
                    </ThemedText>
                    <ThemedText type="body" variant="secondary" style={styles.emptyStateSubtext}>
                      Enjoy your free day or catch up on assignments
                    </ThemedText>
                  </View>
                </PremiumCard>
              </AnimatedView>
            )}
          </View>
        </AnimatedView>

        {/* Premium Quick Actions */}
        <AnimatedView animationType="slideUp" delay={500}>
          <View style={styles.section}>
            <ThemedText type="h3" weight="bold" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            
            <View style={styles.actionGrid}>
              <PremiumButton
                title="Upload Timetable"
                onPress={() => navigation.navigate('Upload')}
                variant="gradient"
                gradientColors={[colors.gradientStart, colors.gradientEnd]}
                icon={<Icon name="add-a-photo" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />}
                style={styles.actionButton}
                fullWidth
              />
              
              <PremiumButton
                title="View Timetables"
                onPress={() => navigation.navigate('MyTimetables')}
                variant="outline"
                icon={<Icon name="view-list" size={20} color={colors.primary} style={{ marginRight: 8 }} />}
                style={styles.actionButton}
                fullWidth
              />
            </View>
          </View>
        </AnimatedView>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <AnimatedView animationType="slideUp" delay={600}>
            <View style={styles.section}>
              <ThemedText type="h3" weight="bold" style={styles.sectionTitle}>
                Recent Notifications
              </ThemedText>
              
              {notifications.slice(0, 3).map((notification, index) => (
                <AnimatedView
                  key={notification.id}
                  animationType="slideUp"
                  delay={700 + (index * 100)}
                >
                  <PremiumCard
                    variant="elevated"
                    style={styles.notificationCard}
                    shadow="small"
                  >
                    <View style={styles.notificationContent}>
                      <View style={[styles.notificationIcon, { backgroundColor: colors.infoLight + '20' }]}>
                        <Icon 
                          name={notification.data?.type === 'class_reminder' ? 'schedule' : 'info'} 
                          size={20} 
                          color={colors.info} 
                        />
                      </View>
                      <View style={styles.notificationText}>
                        <ThemedText type="body" weight="medium">
                          {notification.title}
                        </ThemedText>
                        <ThemedText type="caption" variant="secondary">
                          {notification.body}
                        </ThemedText>
                        <ThemedText type="caption" variant="tertiary">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </ThemedText>
                      </View>
                      {!notification.read && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />
                      )}
                    </View>
                  </PremiumCard>
                </AnimatedView>
              ))}
            </View>
          </AnimatedView>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    marginBottom: 4,
    opacity: 0.9,
  },
  userName: {
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 120,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  classCard: {
    marginBottom: 16,
  },
  classContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classTime: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 60,
  },
  classTimeText: {
    marginBottom: 2,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    marginTop: 4,
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classLocation: {
    marginLeft: 4,
  },
  classType: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  classTypeText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateContent: {
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  actionGrid: {
    gap: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  notificationCard: {
    marginBottom: 12,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationText: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
});

export default HomeScreen;