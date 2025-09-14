import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
import { getTimetable, saveTimetable } from '../services/firestoreTimetableService';

const { width } = Dimensions.get('window');

const MyTimetablesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());
  const [slotFormVisible, setSlotFormVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    day: '',
    startTime: '',
    endTime: '',
    location: '',
    type: '',
    subject: '',
    instructor: ''
  });
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function getCurrentDay() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  useEffect(() => {
    if (user?.uid) {
      loadTimetable();
    } else {
      // Clear timetable when user is null (e.g., after sign out)
      setTimetable(null);
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
      } else {
        console.log('No timetable found');
      }
    } catch (error) {
      console.error('Failed to load timetable:', error);
      Alert.alert('Error', 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const getClassesForDay = (day) => {
    if (!timetable?.courses) return [];

    const classes = [];
    timetable.courses.forEach(course => {
      if (course.schedule) {
        course.schedule.forEach(session => {
          if (session.day === day) {
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

    return classes;
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'lecture': return '#3498db';
      case 'lab': return '#e74c3c';
      case 'tutorial': return '#f39c12';
      case 'seminar': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const onRefresh = () => {
    loadTimetable();
  };

  const handleSlotClick = (classItem) => {
    setSelectedSlot(classItem);
    setSlotForm({
      day: classItem.day || '',
      startTime: classItem.startTime || '',
      endTime: classItem.endTime || '',
      location: classItem.location || '',
      type: classItem.type || '',
      subject: classItem.courseCode || '',
      instructor: classItem.instructor || ''
    });
    setSlotFormVisible(true);
  };

  const handleAddSlot = () => {
    setSelectedSlot(null);
    setSlotForm({
      day: selectedDay,
      startTime: '',
      endTime: '',
      location: '',
      type: 'Lecture',
      subject: '',
      instructor: ''
    });
    setSlotFormVisible(true);
  };

  const handleSaveSlot = async () => {
    try {
      if (!timetable) return;

      const updatedTimetable = JSON.parse(JSON.stringify(timetable));
      
      if (selectedSlot) {
        // Edit existing slot
        updatedTimetable.courses.forEach(course => {
          if (course.schedule) {
            course.schedule.forEach(session => {
              if (session.day === selectedSlot.day && 
                  session.startTime === selectedSlot.startTime &&
                  session.endTime === selectedSlot.endTime) {
                session.day = slotForm.day;
                session.startTime = slotForm.startTime;
                session.endTime = slotForm.endTime;
                session.location = slotForm.location;
                session.type = slotForm.type;
                course.courseCode = slotForm.subject;
                course.courseName = slotForm.subject;
                course.instructor = slotForm.instructor;
              }
            });
          }
        });
      } else {
        // Add new slot
        const newCourse = {
          courseCode: slotForm.subject,
          courseName: slotForm.subject,
          instructor: slotForm.instructor,
          schedule: [{
            day: slotForm.day,
            startTime: slotForm.startTime,
            endTime: slotForm.endTime,
            location: slotForm.location,
            type: slotForm.type
          }]
        };
        updatedTimetable.courses.push(newCourse);
      }

      setTimetable(updatedTimetable);
      setSlotFormVisible(false);
      
      if (user?.uid) {
        await saveTimetable(user.uid, updatedTimetable, { editedAt: new Date() });
      }
    } catch (error) {
      console.error('Failed to save slot:', error);
      Alert.alert('Error', 'Failed to save slot');
    }
  };

  const handleDeleteSlot = async () => {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to delete this slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!timetable || !selectedSlot) return;

              const updatedTimetable = JSON.parse(JSON.stringify(timetable));
              
              // Remove the slot
              updatedTimetable.courses = updatedTimetable.courses.map(course => {
                if (course.schedule) {
                  course.schedule = course.schedule.filter(session => 
                    !(session.day === selectedSlot.day && 
                      session.startTime === selectedSlot.startTime &&
                      session.endTime === selectedSlot.endTime)
                  );
                }
                return course;
              }).filter(course => course.schedule && course.schedule.length > 0);

              setTimetable(updatedTimetable);
              setSlotFormVisible(false);
              
              if (user?.uid) {
                await saveTimetable(user.uid, updatedTimetable, { editedAt: new Date() });
              }
            } catch (error) {
              console.error('Failed to delete slot:', error);
              Alert.alert('Error', 'Failed to delete slot');
            }
          }
        }
      ]
    );
  };

  if (!timetable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <AnimatedView animationType="slideUp" delay={100}>
            <ThemedText type="h1" variant="inverse" weight="bold" style={styles.headerTitle}>
              My Timetables
            </ThemedText>
          </AnimatedView>
        </LinearGradient>
        
        <AnimatedView animationType="fadeIn" delay={200} style={styles.emptyContainer}>
          <PremiumCard variant="elevated" style={styles.emptyCard} shadow="medium">
            <View style={styles.emptyContent}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                <Icon name="schedule" size={48} color={colors.primary} />
              </View>
              <ThemedText type="h2" weight="bold" style={styles.emptyTitle}>
                No Timetable Found
              </ThemedText>
              <ThemedText type="body" variant="secondary" style={styles.emptySubtitle}>
                Upload your first timetable to get started with your academic schedule
              </ThemedText>
              <PremiumButton
                title="Upload Timetable"
                onPress={() => navigation.navigate('Upload')}
                variant="gradient"
                gradientColors={[colors.gradientStart, colors.gradientEnd]}
                icon={<Icon name="add-a-photo" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />}
                style={styles.uploadButton}
                size="large"
              />
            </View>
          </PremiumCard>
        </AnimatedView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AnimatedView animationType="slideUp" delay={100}>
          <ThemedText type="h1" variant="inverse" weight="bold" style={styles.headerTitle}>
            My Timetables
          </ThemedText>
          <ThemedText type="body" variant="inverse" style={styles.headerSubtitle}>
            {timetable.metadata?.semester} {timetable.metadata?.academicYear}
          </ThemedText>
        </AnimatedView>
      </LinearGradient>

      {/* Premium Day Selector */}
      <AnimatedView animationType="slideUp" delay={200}>
        <View style={styles.daySelectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelectorContent}
          >
            {days.map((day, index) => (
              <AnimatedView
                key={day}
                animationType="scale"
                delay={300 + (index * 50)}
              >
                <TouchableOpacity
                  style={[
                    styles.dayButton,
                    selectedDay === day && {
                      backgroundColor: colors.primary,
                      ...styles.dayButtonActive
                    }
                  ]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    type="caption"
                    weight="bold"
                    variant={selectedDay === day ? "inverse" : "primary"}
                    style={styles.dayButtonText}
                  >
                    {day.substring(0, 3)}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    variant={selectedDay === day ? "inverse" : "secondary"}
                    style={styles.dayButtonSubtext}
                  >
                    {getClassesForDay(day).length}
                  </ThemedText>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </ScrollView>
        </View>
      </AnimatedView>

      {/* Premium Classes List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <AnimatedView animationType="slideUp" delay={400}>
          <View style={styles.dayHeader}>
            <View style={styles.dayHeaderTop}>
              <View>
                <ThemedText type="h2" weight="bold" style={styles.dayTitle}>
                  {selectedDay}
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.daySubtitle}>
                  {getClassesForDay(selectedDay).length} classes
                </ThemedText>
              </View>
              <PremiumButton
                title="Add Slot"
                onPress={handleAddSlot}
                variant="gradient"
                gradientColors={[colors.primary, colors.primaryDark]}
                icon={<Icon name="add" size={16} color={colors.textInverse} style={{ marginRight: 4 }} />}
                style={styles.addSlotButton}
                size="small"
              />
            </View>
          </View>
        </AnimatedView>

        {getClassesForDay(selectedDay).length > 0 ? (
          getClassesForDay(selectedDay).map((classItem, index) => (
            <AnimatedView
              key={index}
              animationType="slideUp"
              delay={500 + (index * 100)}
            >
              <PremiumCard
                variant="elevated"
                style={styles.classCard}
                shadow="medium"
                onPress={() => handleSlotClick(classItem)}
              >
                <View style={styles.classCardContent}>
                  <View style={styles.classTimeContainer}>
                    <ThemedText type="body" weight="bold" style={styles.classStartTime}>
                      {formatTime(classItem.startTime)}
                    </ThemedText>
                    <ThemedText type="caption" variant="secondary" style={styles.classEndTime}>
                      {formatTime(classItem.endTime)}
                    </ThemedText>
                    <View style={[styles.timeLine, { backgroundColor: colors.primary }]} />
                  </View>

                  <View style={styles.classContent}>
                    <View style={styles.classHeader}>
                      <ThemedText type="body" weight="bold">
                        {classItem.courseCode}
                      </ThemedText>
                      <View style={[
                        styles.classTypeBadge,
                        { backgroundColor: getTypeColor(classItem.type) }
                      ]}>
                        <ThemedText type="caption" variant="inverse" weight="medium">
                          {classItem.type || 'Class'}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText type="body" variant="secondary" style={styles.className}>
                      {classItem.courseName}
                    </ThemedText>

                    <View style={styles.classDetails}>
                      <View style={styles.classDetail}>
                        <Icon name="person" size={16} color={colors.textTertiary} />
                        <ThemedText type="caption" variant="tertiary" style={styles.classDetailText}>
                          {classItem.instructor || 'TBD'}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.classDetail}>
                        <Icon name="location-on" size={16} color={colors.textTertiary} />
                        <ThemedText type="caption" variant="tertiary" style={styles.classDetailText}>
                          {classItem.location || 'TBD'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <Icon name="chevron-right" size={24} color={colors.textMuted} />
                </View>
              </PremiumCard>
            </AnimatedView>
          ))
        ) : (
          <AnimatedView animationType="fadeIn" delay={500}>
            <PremiumCard variant="elevated" style={styles.emptyDay} shadow="medium">
              <View style={styles.emptyDayContent}>
                <Icon name="free-breakfast" size={48} color={colors.textMuted} />
                <ThemedText type="h3" weight="bold" style={styles.emptyDayText}>
                  No classes on {selectedDay}
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.emptyDaySubtext}>
                  Enjoy your free day!
                </ThemedText>
              </View>
            </PremiumCard>
          </AnimatedView>
        )}

        {/* Premium Timetable Info */}
        <AnimatedView animationType="slideUp" delay={600}>
          <PremiumCard variant="elevated" style={styles.infoCard} shadow="medium">
            <ThemedText type="h3" weight="bold" style={styles.infoTitle}>
              Timetable Information
            </ThemedText>
            
            <View style={styles.infoRow}>
              <ThemedText type="body" variant="secondary">Total Courses:</ThemedText>
              <ThemedText type="body" weight="bold">{timetable.courses?.length || 0}</ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText type="body" variant="secondary">Semester:</ThemedText>
              <ThemedText type="body" weight="bold">
                {timetable.metadata?.semester || 'Unknown'}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText type="body" variant="secondary">Academic Year:</ThemedText>
              <ThemedText type="body" weight="bold">
                {timetable.metadata?.academicYear || 'Unknown'}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText type="body" variant="secondary">Last Updated:</ThemedText>
              <ThemedText type="body" weight="bold">
                {timetable.metadata?.updatedAt 
                  ? new Date(timetable.metadata.updatedAt.seconds * 1000).toLocaleDateString()
                  : 'Unknown'
                }
              </ThemedText>
            </View>
          </PremiumCard>
        </AnimatedView>
      </ScrollView>

      {/* Slot Form Modal */}
      <Modal
        visible={slotFormVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSlotFormVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedSlot ? 'Edit Slot' : 'Add New Slot'}
            </Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={slotForm.subject}
                onChangeText={(text) => setSlotForm({ ...slotForm, subject: text })}
                placeholder="e.g., STQA"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Instructor</Text>
              <TextInput
                style={styles.input}
                value={slotForm.instructor}
                onChangeText={(text) => setSlotForm({ ...slotForm, instructor: text })}
                placeholder="e.g., ASD"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Day</Text>
              <TextInput
                style={styles.input}
                value={slotForm.day}
                onChangeText={(text) => setSlotForm({ ...slotForm, day: text })}
                placeholder="Monday"
              />
            </View>

            <View style={styles.formRowInline}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.formLabel}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={slotForm.startTime}
                  onChangeText={(text) => setSlotForm({ ...slotForm, startTime: text })}
                  placeholder="13:15"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formLabel}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={slotForm.endTime}
                  onChangeText={(text) => setSlotForm({ ...slotForm, endTime: text })}
                  placeholder="14:10"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={slotForm.location}
                onChangeText={(text) => setSlotForm({ ...slotForm, location: text })}
                placeholder="203-A"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type</Text>
              <TextInput
                style={styles.input}
                value={slotForm.type}
                onChangeText={(text) => setSlotForm({ ...slotForm, type: text })}
                placeholder="Lecture / Lab / Project / Library"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setSlotFormVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              {selectedSlot && (
                <TouchableOpacity 
                  style={styles.modalDelete} 
                  onPress={handleDeleteSlot}
                >
                  <Text style={styles.modalDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.modalSave} 
                onPress={handleSaveSlot}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 12,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  uploadButton: {
    marginTop: 16,
  },
  daySelectorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  daySelectorContent: {
    paddingHorizontal: 4,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    minWidth: 60,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    borderColor: 'transparent',
  },
  dayButtonText: {
    marginBottom: 2,
  },
  dayButtonSubtext: {
    fontSize: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dayHeader: {
    marginBottom: 20,
  },
  dayHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayTitle: {
    marginBottom: 4,
  },
  daySubtitle: {
    marginBottom: 8,
  },
  addSlotButton: {
    marginTop: 4,
  },
  classCard: {
    marginBottom: 16,
  },
  classCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classTimeContainer: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 60,
  },
  classStartTime: {
    marginBottom: 2,
  },
  classEndTime: {
    marginBottom: 8,
  },
  timeLine: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  classContent: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  className: {
    marginBottom: 12,
  },
  classDetails: {
    gap: 8,
  },
  classDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classDetailText: {
    marginLeft: 6,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyDayContent: {
    alignItems: 'center',
  },
  emptyDayText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDaySubtext: {
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 24,
    marginBottom: 32,
  },
  infoTitle: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  formRow: {
    marginBottom: 16,
  },
  formRowInline: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  modalDelete: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default MyTimetablesScreen;