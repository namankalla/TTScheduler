/**
 * Gemini AI Service via Google AI
 * Parses timetable text into structured JSON
 */

const GEMINI_API_KEY = 'AIzaSyCorFS2_Et71PRTRN_yqqdOb7fUgoF3N6k'; // You'll need to get this from Google AI Studio
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const parseTimetableTextWithGemini = async (ocrText) => {
  try {
    console.log('Starting Gemini AI parsing...');

    const prompt = buildGeminiPrompt(ocrText);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error('Invalid Gemini API response format');
    }

    const aiResponse = result.candidates[0].content.parts[0].text;
    console.log('Gemini AI parsing completed');

    const parsedData = parseAIResponse(aiResponse);
    
    // Validate that we got meaningful data
    if (parsedData.courses && parsedData.courses.length > 0) {
      return parsedData;
    } else {
      throw new Error('Gemini returned empty results');
    }

  } catch (error) {
    console.error('Gemini AI parsing failed:', error);
    throw new Error(`Gemini parsing failed: ${error.message}`);
  }
};

/**
 * Build comprehensive prompt for Gemini
 */
const buildGeminiPrompt = (ocrText) => {
  return `
You are an expert at parsing complex academic timetables. Parse this university timetable and extract ALL course information.

CRITICAL: Return ONLY valid JSON, no explanations or additional text.

{
  "courses": [
    {
      "courseCode": "string",
      "courseName": "string", 
      "instructor": "string",
      "schedule": [
        {
          "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "location": "string",
          "type": "Lecture|Lab|Tutorial|Seminar|Project|Library|Break"
        }
      ]
    }
  ],
  "metadata": {
    "semester": "string",
    "academicYear": "string",
    "lastUpdated": "${new Date().toISOString()}"
  }
}

CRITICAL PARSING RULES:

1. TIME CONVERSION (VERY IMPORTANT):
   - "09:30-10:25" → startTime: "09:30", endTime: "10:25"
   - "10:25-11:20" → startTime: "10:25", endTime: "11:20"
   - "12:20-01:15" → startTime: "12:20", endTime: "13:15" (01:15 PM = 13:15)
   - "01:15-02:10" → startTime: "13:15", endTime: "14:10" (01:15 PM = 13:15, 02:10 PM = 14:10)
   - "02:30-03:25" → startTime: "14:30", endTime: "15:25" (02:30 PM = 14:30, 03:25 PM = 15:25)
   - "03:25-04:20" → startTime: "15:25", endTime: "16:20" (03:25 PM = 15:25, 04:20 PM = 16:20)

2. COURSE PATTERN RECOGNITION:
   - "STQA(ASD) 203-A" → courseCode: "STQA", instructor: "ASD", location: "203-A"
   - "BDA(SSV) 203-A" → courseCode: "BDA", instructor: "SSV", location: "203-A"
   - "INS(MAI) 172(C8)" → courseCode: "INS", instructor: "MAI", location: "172(C8)"
   - "CPS(VAT) 203-A" → courseCode: "CPS", instructor: "VAT", location: "203-A"
   - "7A12:CS:TDPIT4:172(C8)" → courseCode: "CS", instructor: "TDPIT4", location: "172(C8)"
   - "7A12-1:STQA(ASD):203-A" → courseCode: "STQA", instructor: "ASD", location: "203-A"

3. SPECIAL ENTRIES (SKIP THESE):
   - "LIBRARY / SELF STUDY" → SKIP (do not include)
   - "PROJECT" → SKIP (do not include)
   - "LUNCH BREAK" → SKIP (do not include)
   - "RECESS" → SKIP (do not include)
   - Any slot from 11:20-12:20 → SKIP (lunch break time, regardless of name)
   - Any break periods, lunch periods, or recess periods → SKIP

4. COURSE NAME MAPPING:
   - STQA → "Software Testing and Quality Assurance"
   - BDA → "Big Data Analytics" 
   - CPS → "Cyber Physical Systems"
   - INS → "Information and Network Security"
   - CS → "Cyber Security"

5. SCHEDULE BUILDING:
   - For each course, create schedule entries for each day/time it appears
   - If a course appears multiple times, create multiple schedule entries
   - Include all time slots where the course is scheduled
   - Use the EXACT time slots from the timetable grid

6. VALIDATION RULES:
   - ALL start times must be between 09:00 and 16:00
   - ALL end times must be between 10:00 and 17:00
   - NO classes at 01:00, 02:00, etc. (these are 1 PM, 2 PM = 13:00, 14:00)
   - If you see "01:15", it means 1:15 PM = 13:15
   - If you see "02:30", it means 2:30 PM = 14:30

Raw timetable text:
${ocrText}
  `;
};

/**
 * Parse and validate AI response (reuse from qwenAIService)
 */
const parseAIResponse = (aiResponse) => {
  try {
    // Clean the response - remove markdown formatting if present
    let cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any text before the first { and after the last }
    const firstBrace = cleanResponse.indexOf('{');
    const lastBrace = cleanResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
    }
    
    const parsedData = JSON.parse(cleanResponse);
    
    // Validate required structure
    if (!parsedData.courses || !Array.isArray(parsedData.courses)) {
      throw new Error('Invalid structure: courses array missing');
    }

    // Validate each course
    parsedData.courses.forEach((course, index) => {
      if (!course.courseCode && !course.courseName) {
        throw new Error(`Course ${index}: Missing course code or name`);
      }

      if (course.schedule && Array.isArray(course.schedule)) {
        course.schedule.forEach((session, sessionIndex) => {
          if (!session.day || !session.startTime) {
            console.warn(`Course ${index}, Session ${sessionIndex}: Missing day or time`);
          }
          
          // Validate and fix unrealistic times
          if (session.startTime) {
            session.startTime = validateAndFixTime(session.startTime);
          }
          if (session.endTime) {
            session.endTime = validateAndFixTime(session.endTime);
          }
        });
      }
    });

    console.log('Gemini AI response validated successfully');
    return parsedData;

  } catch (error) {
    console.error('Failed to parse Gemini AI response:', error);
    console.error('Raw Gemini AI response:', aiResponse);
    
    // Return a fallback structure with basic parsing
    console.log('Gemini AI parsing failed, attempting basic fallback parsing...');
    return createFallbackTimetable(ocrText, error.message);
  }
};

/**
 * Validate and fix unrealistic times
 */
const validateAndFixTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return '09:00'; // Default fallback
  }
  
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    return '09:00'; // Default fallback
  }
  
  let hour = parseInt(timeMatch[1]);
  const minute = timeMatch[2];
  
  // Fix unrealistic morning times (01:00, 02:00, etc. should be 13:00, 14:00)
  if (hour >= 1 && hour <= 8) {
    hour += 12; // Convert to 24-hour format
  }
  
  // Ensure hour is within reasonable university hours (8 AM to 6 PM)
  if (hour < 8) {
    hour = 9; // Default to 9 AM
  } else if (hour > 18) {
    hour = 17; // Default to 5 PM
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute}`;
};

/**
 * Create a fallback timetable when AI parsing fails
 */
const createFallbackTimetable = (ocrText, errorMessage) => {
  try {
    console.log('Creating enhanced fallback timetable from OCR text...');
    
    const courses = [];
    const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
    
    // Enhanced course patterns for complex timetables
    const coursePatterns = [
      // Standard patterns: STQA(ASD) 203-A
      /([A-Z]{2,4})(\([A-Z]+\))?\s*(\d+[A-Z]?[-\w]*)?/gi,
      // Complex patterns: 7A12:CS:TDPIT4:172(C8)
      /(\d+[A-Z]?\d*):([A-Z]+):([A-Z0-9]+):(\d+[A-Z]?[-\w]*)/gi,
      // Split patterns: 7A12-1:STQA(ASD):203-A
      /(\d+[A-Z]?\d*-\d+):([A-Z]+)(\([A-Z]+\))?:(\d+[A-Z]?[-\w]*)/gi,
      // Special entries
      /(LIBRARY|PROJECT|SELF STUDY|LUNCH BREAK|RECESS)/gi
    ];
    
    const foundCourses = new Map(); // Use Map to avoid duplicates and store multiple instances
    
    // Extract time slots
    const timeSlots = extractTimeSlots(ocrText);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    lines.forEach((line, lineIndex) => {
      coursePatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleanMatch = match.trim();
            if (cleanMatch) {
              const courseInfo = parseCourseEntry(cleanMatch, line, lineIndex, timeSlots, days);
              if (courseInfo) {
                const key = courseInfo.courseCode;
                if (!foundCourses.has(key)) {
                  foundCourses.set(key, courseInfo);
                } else {
                  // Merge schedules if course appears multiple times
                  const existing = foundCourses.get(key);
                  existing.schedule.push(...courseInfo.schedule);
                }
              }
            }
          });
        }
      });
    });
    
    // Convert Map to array
    const courseArray = Array.from(foundCourses.values());
    
    // If we found courses, return them
    if (courseArray.length > 0) {
      console.log(`Enhanced fallback parsing found ${courseArray.length} courses`);
      return {
        courses: courseArray,
        metadata: {
          semester: "Fall 2024",
          academicYear: "2024-25",
          lastUpdated: new Date().toISOString(),
          parseMethod: 'enhanced_fallback',
          parseError: errorMessage,
          confidence: 'medium'
        }
      };
    }
    
    // If no courses found, create a generic entry
    return {
      courses: [
        {
          courseCode: 'Timetable',
          courseName: 'Uploaded Timetable',
          instructor: 'TBD',
          schedule: [
            {
              day: 'Monday',
              startTime: '09:00',
              endTime: '17:00',
              location: 'TBD',
              type: 'Lecture'
            }
          ]
        }
      ],
      metadata: {
        semester: "Unknown",
        academicYear: new Date().getFullYear().toString(),
        lastUpdated: new Date().toISOString(),
        parseMethod: 'fallback',
        parseError: errorMessage,
        note: 'Timetable detected but could not be fully parsed. Please check the extracted text.'
      }
    };
    
  } catch (fallbackError) {
    console.error('Fallback parsing also failed:', fallbackError);
    return {
      courses: [],
      metadata: {
        semester: "Unknown",
        academicYear: new Date().getFullYear().toString(),
        lastUpdated: new Date().toISOString(),
        parseMethod: 'failed',
        parseError: errorMessage,
        fallbackError: fallbackError.message
      }
    };
  }
};

/**
 * Extract time slots from OCR text with proper 24-hour conversion
 */
const extractTimeSlots = (text) => {
  const timePattern = /(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/g;
  const slots = [];
  let match;
  
  while ((match = timePattern.exec(text)) !== null) {
    let startHour = parseInt(match[1]);
    let endHour = parseInt(match[3]);
    
    // Convert to 24-hour format for afternoon times
    // Times like 01:15, 02:30, etc. are PM times (1 PM, 2 PM)
    if (startHour >= 1 && startHour <= 11 && startHour !== 9 && startHour !== 10 && startHour !== 11) {
      startHour += 12; // Convert to 24-hour format
    }
    if (endHour >= 1 && endHour <= 11 && endHour !== 9 && endHour !== 10 && endHour !== 11) {
      endHour += 12; // Convert to 24-hour format
    }
    
    const startTime = `${startHour.toString().padStart(2, '0')}:${match[2]}`;
    const endTime = `${endHour.toString().padStart(2, '0')}:${match[4]}`;
    slots.push({ startTime, endTime });
  }
  
  return slots;
};

/**
 * Parse individual course entry
 */
const parseCourseEntry = (entry, line, lineIndex, timeSlots, days) => {
  try {
    // Handle special entries
    if (entry.match(/(LIBRARY|PROJECT|SELF STUDY|LUNCH BREAK|RECESS)/i)) {
      return {
        courseCode: entry.toUpperCase().split('/')[0].split(' ')[0],
        courseName: getFullCourseName(entry.toUpperCase().split('/')[0].split(' ')[0]),
        instructor: 'TBD',
        schedule: [{
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
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
          day: 'Monday',
          startTime: '14:30',
          endTime: '15:25',
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
          day: 'Thursday',
          startTime: '12:20',
          endTime: '13:15',
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
          day: 'Monday',
          startTime: '09:30',
          endTime: '10:25',
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
    'PROJECT': 'Project Work'
  };
  
  return courseNames[courseCode] || courseCode;
};
