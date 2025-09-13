/**
 * Manual Timetable Parser
 * Specifically designed for Parul University timetable format
 * No API calls needed - pure JavaScript parsing
 */

export const parseTimetableManually = (ocrText) => {
  try {
    console.log('Starting manual timetable parsing...');
    
    const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
    
    // Extract time slots from the text
    const timeSlots = extractTimeSlots(lines);
    console.log('Found time slots:', timeSlots);
    
    // Extract course information
    const courses = extractCourses(lines, timeSlots);
    console.log('Found courses:', courses.length);
    
    // Extract metadata
    const metadata = extractMetadata(lines);
    
    return {
      courses,
      metadata: {
        ...metadata,
        lastUpdated: new Date().toISOString(),
        parseMethod: 'manual_parser',
        confidence: 'high'
      }
    };
    
  } catch (error) {
    console.error('Manual parsing failed:', error);
    throw new Error(`Manual parsing failed: ${error.message}`);
  }
};

/**
 * Extract time slots from the timetable
 */
const extractTimeSlots = (lines) => {
  const timeSlots = [];
  
  for (const line of lines) {
    // Look for time patterns like "09:30-10:25", "12:20-01:15", etc.
    const timeMatch = line.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let startHour = parseInt(timeMatch[1]);
      let endHour = parseInt(timeMatch[3]);
      
      // Convert to 24-hour format for afternoon times
      if (startHour >= 1 && startHour <= 8) {
        startHour += 12;
      }
      if (endHour >= 1 && endHour <= 8) {
        endHour += 12;
      }
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${timeMatch[2]}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${timeMatch[4]}`;
      
      timeSlots.push({
        startTime,
        endTime,
        original: `${timeMatch[1]}:${timeMatch[2]}-${timeMatch[3]}:${timeMatch[4]}`
      });
    }
  }
  
  return timeSlots;
};

/**
 * Extract courses from the timetable
 */
const extractCourses = (lines, timeSlots) => {
  const courses = new Map();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Find the timetable grid section
  let inGridSection = false;
  let currentTimeSlot = null;
  let dayIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're entering the grid section
    if (line.includes('MONDAY') || line.includes('TUESDAY')) {
      inGridSection = true;
      continue;
    }
    
    // Check if we're leaving the grid section
    if (inGridSection && (line.includes('CLASSROOM') || line.includes('SUBJECT CODE'))) {
      inGridSection = false;
      break;
    }
    
    if (inGridSection) {
      // Check if this line contains a time slot
      const timeMatch = line.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        currentTimeSlot = timeMatch[0];
        dayIndex = 0;
        continue;
      }
      
      // Parse course entries for this time slot
      if (currentTimeSlot && line.length > 0) {
        const courseEntries = parseCourseLine(line, currentTimeSlot, days[dayIndex]);
        courseEntries.forEach(entry => {
          if (entry) {
            const key = entry.courseCode;
            if (!courses.has(key)) {
              courses.set(key, entry);
            } else {
              // Merge schedules
              const existing = courses.get(key);
              existing.schedule.push(...entry.schedule);
            }
          }
        });
        dayIndex++;
      }
    }
  }
  
  return Array.from(courses.values());
};

/**
 * Parse a single line of course entries
 */
const parseCourseLine = (line, timeSlot, day) => {
  const entries = [];
  
  // Split by common separators and clean up
  const parts = line.split(/\s+/).filter(part => part.trim().length > 0);
  
  for (const part of parts) {
    const entry = parseCourseEntry(part, timeSlot, day);
    if (entry) {
      entries.push(entry);
    }
  }
  
  return entries;
};

/**
 * Parse individual course entry
 */
const parseCourseEntry = (entry, timeSlot, day) => {
  try {
    // Handle special entries
    if (entry.match(/(LIBRARY|PROJECT|SELF STUDY|LUNCH BREAK|RECESS)/i)) {
      return {
        courseCode: entry.toUpperCase().split('/')[0].split(' ')[0],
        courseName: getFullCourseName(entry.toUpperCase().split('/')[0].split(' ')[0]),
        instructor: 'TBD',
        schedule: [{
          day,
          startTime: convertTimeSlot(timeSlot).startTime,
          endTime: convertTimeSlot(timeSlot).endTime,
          location: 'TBD',
          type: entry.includes('LIBRARY') ? 'Library' : 
                entry.includes('PROJECT') ? 'Project' : 'Break'
        }]
      };
    }
    
    // Handle complex patterns: 7A12:CS:TDPIT4:172(C8)
    const complexMatch = entry.match(/(\d+[A-Z]?\d*):([A-Z]+):([A-Z0-9]+):(\d+[A-Z]?[-\w]*)/);
    if (complexMatch) {
      return {
        courseCode: complexMatch[2],
        courseName: getFullCourseName(complexMatch[2]),
        instructor: complexMatch[3],
        schedule: [{
          day,
          startTime: convertTimeSlot(timeSlot).startTime,
          endTime: convertTimeSlot(timeSlot).endTime,
          location: complexMatch[4],
          type: 'Lecture'
        }]
      };
    }
    
    // Handle split patterns: 7A12-1:STQA(ASD):203-A
    const splitMatch = entry.match(/(\d+[A-Z]?\d*-\d+):([A-Z]+)(\(([A-Z]+)\))?:(\d+[A-Z]?[-\w]*)/);
    if (splitMatch) {
      return {
        courseCode: splitMatch[2],
        courseName: getFullCourseName(splitMatch[2]),
        instructor: splitMatch[4] || 'TBD',
        schedule: [{
          day,
          startTime: convertTimeSlot(timeSlot).startTime,
          endTime: convertTimeSlot(timeSlot).endTime,
          location: splitMatch[5],
          type: 'Lecture'
        }]
      };
    }
    
    // Handle standard patterns: STQA(ASD) 203-A
    const standardMatch = entry.match(/([A-Z]{2,4})(\(([A-Z]+)\))?\s*(\d+[A-Z]?[-\w]*)?/);
    if (standardMatch) {
      return {
        courseCode: standardMatch[1],
        courseName: getFullCourseName(standardMatch[1]),
        instructor: standardMatch[3] || 'TBD',
        schedule: [{
          day,
          startTime: convertTimeSlot(timeSlot).startTime,
          endTime: convertTimeSlot(timeSlot).endTime,
          location: standardMatch[4] || 'TBD',
          type: 'Lecture'
        }]
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse course entry:', entry, error);
    return null;
  }
};

/**
 * Convert time slot to 24-hour format
 */
const convertTimeSlot = (timeSlot) => {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (!match) {
    return { startTime: '09:00', endTime: '10:00' };
  }
  
  let startHour = parseInt(match[1]);
  let endHour = parseInt(match[3]);
  
  // Convert to 24-hour format for afternoon times
  if (startHour >= 1 && startHour <= 8) {
    startHour += 12;
  }
  if (endHour >= 1 && endHour <= 8) {
    endHour += 12;
  }
  
  return {
    startTime: `${startHour.toString().padStart(2, '0')}:${match[2]}`,
    endTime: `${endHour.toString().padStart(2, '0')}:${match[4]}`
  };
};

/**
 * Extract metadata from the timetable
 */
const extractMetadata = (lines) => {
  const metadata = {
    semester: 'Unknown',
    academicYear: 'Unknown',
    university: 'Parul University',
    program: 'B.Tech Computer Science Engineering'
  };
  
  for (const line of lines) {
    // Extract semester
    const semesterMatch = line.match(/(\d+TH|\d+ST|\d+ND|\d+RD)\s+SEMESTER/i);
    if (semesterMatch) {
      metadata.semester = semesterMatch[1].toUpperCase();
    }
    
    // Extract academic year
    const yearMatch = line.match(/(\d{4}-\d{2,4})/);
    if (yearMatch) {
      metadata.academicYear = yearMatch[1];
    }
    
    // Extract program
    if (line.includes('COMPUTER SCIENCE')) {
      metadata.program = 'B.Tech Computer Science Engineering';
    }
  }
  
  return metadata;
};

/**
 * Get full course name from course code
 */
const getFullCourseName = (courseCode) => {
  const courseNames = {
    'STQA': 'Software Testing and Quality Assurance',
    'BDA': 'Big Data Analytics',
    'CPS': 'Cyber Physical Systems',
    'INS': 'Information and Network Security',
    'CS': 'Cyber Security',
    'LIBRARY': 'Library/Self Study',
    'PROJECT': 'Project Work',
    'LUNCH': 'Lunch Break',
    'RECESS': 'Recess'
  };
  
  return courseNames[courseCode] || courseCode;
};
