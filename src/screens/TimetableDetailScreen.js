import { MaterialIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { saveTimetable } from '../services/firestoreTimetableService';
import { scheduleClassReminders } from '../services/notificationScheduler';

const TimetableDetailScreen = ({ route, navigation }) => {
  const { timetable, selectedClass } = (route && route.params) ? route.params : { timetable: { courses: [], metadata: {} }, selectedClass: null };
  const { user } = useAuth();

  const [data, setData] = useState(timetable || { courses: [], metadata: {} });
  const [modalVisible, setModalVisible] = useState(false);
  const [editCourseIndex, setEditCourseIndex] = useState(null);
  const [editSessionIndex, setEditSessionIndex] = useState(null);
  const [form, setForm] = useState({
    day: '',
    startTime: '',
    endTime: '',
    location: '',
    type: '',
    subject: '',
    instructor: ''
  });

  const openEditModal = (courseIndex, sessionIndex) => {
    setEditCourseIndex(courseIndex);
    setEditSessionIndex(sessionIndex);
    const session = (data.courses?.[courseIndex]?.schedule?.[sessionIndex]) || {};
    const course = data.courses?.[courseIndex] || {};
    setForm({
      day: session.day || '',
      startTime: session.startTime || '',
      endTime: session.endTime || '',
      location: session.location || '',
      type: session.type || 'Lecture',
      subject: course.courseCode || course.courseName || '',
      instructor: course.instructor || ''
    });
    setModalVisible(true);
  };

  const saveEdit = async () => {
    try {
      if (editCourseIndex == null || editSessionIndex == null) return;
      const updated = JSON.parse(JSON.stringify(data));
      const course = updated.courses[editCourseIndex];
      const session = course.schedule[editSessionIndex];

      course.courseCode = form.subject || course.courseCode;
      course.courseName = form.subject || course.courseName;
      course.instructor = form.instructor || course.instructor;

      session.day = form.day || session.day;
      session.startTime = form.startTime || session.startTime;
      session.endTime = form.endTime || session.endTime;
      session.location = form.location || session.location;
      session.type = form.type || session.type;

      setData(updated);
      setModalVisible(false);

      if (user?.uid) {
        await saveTimetable(user.uid, updated, { editedAt: new Date() });
        await scheduleClassReminders(updated);
      }
    } catch (e) {
      console.warn('Failed to save edit:', e);
    }
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

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (selectedClass) {
    // Show individual class details
    return (
      <ScrollView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[getTypeColor(selectedClass.type), '#2c3e50']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.courseCode}>{selectedClass.courseCode}</Text>
            <Text style={styles.courseName}>{selectedClass.courseName}</Text>
            <View style={styles.classTypeBadge}>
              <Text style={styles.classTypeBadgeText}>
                {selectedClass.type || 'Class'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Time Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            
            <View style={styles.timeCard}>
              <View style={styles.timeInfo}>
                <Icon name="schedule" size={24} color="#3498db" />
                <View style={styles.timeDetails}>
                  <Text style={styles.timeText}>
                    {formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}
                  </Text>
                  <Text style={styles.timeSubtext}>
                    {selectedClass.day} • {calculateDuration(selectedClass.startTime, selectedClass.endTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.infoCard}>
              <Icon name="location-on" size={24} color="#e74c3c" />
              <Text style={styles.infoText}>
                {selectedClass.location || 'Location TBD'}
              </Text>
            </View>
          </View>

          {/* Instructor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructor</Text>
            
            <View style={styles.infoCard}>
              <Icon name="person" size={24} color="#f39c12" />
              <Text style={styles.infoText}>
                {selectedClass.instructor || 'Instructor TBD'}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#3498db', '#2980b9']}
                style={styles.actionGradient}
              >
                <Icon name="notifications" size={24} color="#ffffff" />
                <Text style={styles.actionText}>Set Custom Reminder</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#27ae60', '#229954']}
                style={styles.actionGradient}
              >
                <Icon name="event" size={24} color="#ffffff" />
                <Text style={styles.actionText}>Add to Calendar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Show full timetable overview
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.timetableTitle}>Timetable Overview</Text>
          <Text style={styles.timetableSubtitle}>
            {data.metadata?.semester} {data.metadata?.academicYear}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{data.courses?.length || 0}</Text>
            <Text style={styles.statLabel}>Total Courses</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {data.courses?.reduce((total, course) => 
                total + (course.schedule?.length || 0), 0) || 0}
            </Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
        </View>

        {/* Courses List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Courses</Text>
          
          {data.courses?.map((course, index) => (
            <View key={index} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseName}>{course.courseName}</Text>
              </View>
              
              <Text style={styles.courseInstructor}>
                {course.instructor || 'Instructor TBD'}
              </Text>
              
              <View style={styles.courseSchedule}>
                {course.schedule?.map((session, sessionIndex) => (
                  <TouchableOpacity
                    key={sessionIndex}
                    style={styles.sessionItem}
                    onPress={() => openEditModal(index, sessionIndex)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sessionDay}>{session.day}</Text>
                    <Text style={styles.sessionTime}>
                      {formatTime(session.startTime)} - {formatTime(session.endTime)}
                    </Text>
                    <Text style={styles.sessionLocation}>
                      {session.location || 'TBD'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timetable Information</Text>
          
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Semester:</Text>
              <Text style={styles.metadataValue}>
                {data.metadata?.semester || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Academic Year:</Text>
              <Text style={styles.metadataValue}>
                {data.metadata?.academicYear || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Last Updated:</Text>
              <Text style={styles.metadataValue}>
                {data.metadata?.updatedAt 
                  ? new Date(data.metadata.updatedAt.seconds * 1000).toLocaleDateString()
                  : 'Unknown'
                }
              </Text>
            </View>
            
            {data.metadata?.confidenceScore && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Confidence Score:</Text>
                <Text style={styles.metadataValue}>
                  {Math.round(data.metadata.confidenceScore * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Class</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(t) => setForm({ ...form, subject: t })}
                placeholder="e.g., STQA"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Instructor</Text>
              <TextInput
                style={styles.input}
                value={form.instructor}
                onChangeText={(t) => setForm({ ...form, instructor: t })}
                placeholder="e.g., ASD"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Day</Text>
              <TextInput
                style={styles.input}
                value={form.day}
                onChangeText={(t) => setForm({ ...form, day: t })}
                placeholder="Monday"
              />
            </View>

            <View style={styles.formRowInline}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.formLabel}>Start</Text>
                <TextInput
                  style={styles.input}
                  value={form.startTime}
                  onChangeText={(t) => setForm({ ...form, startTime: t })}
                  placeholder="13:15"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formLabel}>End</Text>
                <TextInput
                  style={styles.input}
                  value={form.endTime}
                  onChangeText={(t) => setForm({ ...form, endTime: t })}
                  placeholder="14:10"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={form.location}
                onChangeText={(t) => setForm({ ...form, location: t })}
                placeholder="203-A"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type</Text>
              <TextInput
                style={styles.input}
                value={form.type}
                onChangeText={(t) => setForm({ ...form, type: t })}
                placeholder="Lecture / Lab / Project / Library"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveEdit}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const openEditModal = function (courseIndex, sessionIndex) {
  this.setEditCourseIndex(courseIndex);
  this.setEditSessionIndex(sessionIndex);
  const session = this.data.courses[courseIndex].schedule[sessionIndex];
  const course = this.data.courses[courseIndex];
  this.setForm({
    day: session.day || '',
    startTime: session.startTime || '',
    endTime: session.endTime || '',
    location: session.location || '',
    type: session.type || 'Lecture',
    subject: course.courseCode || course.courseName || '',
    instructor: course.instructor || ''
  });
  this.setModalVisible(true);
};

const saveEdit = async function () {
  try {
    const ci = this.editCourseIndex;
    const si = this.editSessionIndex;
    if (ci == null || si == null) return;

    const updated = JSON.parse(JSON.stringify(this.data));
    const course = updated.courses[ci];
    const session = course.schedule[si];

    course.courseCode = this.form.subject || course.courseCode;
    course.courseName = this.form.subject || course.courseName;
    course.instructor = this.form.instructor || course.instructor;

    session.day = this.form.day || session.day;
    session.startTime = this.form.startTime || session.startTime;
    session.endTime = this.form.endTime || session.endTime;
    session.location = this.form.location || session.location;
    session.type = this.form.type || session.type;

    this.setData(updated);
    this.setModalVisible(false);

    if (this.user?.uid) {
      await saveTimetable(this.user.uid, updated, { editedAt: new Date() });
      await scheduleClassReminders(updated);
    }
  } catch (e) {
    console.warn('Failed to save edit:', e);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  courseCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  courseName: {
    fontSize: 16,
    color: '#ecf0f1',
    marginTop: 8,
    textAlign: 'center',
  },
  classTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  classTypeBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timetableTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timetableSubtitle: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  timeCard: {
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
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDetails: {
    marginLeft: 15,
    flex: 1,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  timeSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 15,
    flex: 1,
  },
  actionButton: {
    borderRadius: 15,
    overflow: 'hidden',
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
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  courseHeader: {
    marginBottom: 10,
  },
  courseInstructor: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  courseSchedule: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 15,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  sessionDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  sessionTime: {
    fontSize: 14,
    color: '#3498db',
    flex: 2,
    textAlign: 'center',
  },
  sessionLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    textAlign: 'right',
  },
  metadataCard: {
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
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
});

export default TimetableDetailScreen;