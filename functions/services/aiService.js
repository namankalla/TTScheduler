const axios = require('axios');

class AIService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    
    if (!this.openRouterApiKey) {
      console.warn('OPENROUTER_API_KEY not set. AI parsing will fail.');
    }
  }

  /**
   * Parse timetable text using OpenRouter Qwen-2.3 model
   * @param {string} ocrText - Raw text extracted from OCR
   * @param {string} userId - User ID for context
   * @returns {Promise<Object>} Parsed timetable data
   */
  async parseTimetable(ocrText, userId) {
    try {
      console.log(`Starting AI parsing for user: ${userId}`);

      if (!this.openRouterApiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const prompt = this.buildTimetablePrompt(ocrText);
      
      const response = await axios.post(this.baseURL, {
        model: 'qwen/qwen-2.5-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing academic timetables and schedules. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://your-app.com',
          'X-Title': 'Timetable Parser App'
        },
        timeout: 30000
      });

      const aiResponse = response.data.choices[0].message.content;
      console.log('AI parsing completed');

      return this.parseAIResponse(aiResponse);

    } catch (error) {
      console.error('AI parsing failed:', error);
      
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
      
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for timetable parsing
   * @param {string} ocrText - Raw OCR text
   * @returns {string} Formatted prompt
   */
  buildTimetablePrompt(ocrText) {
    return `
Parse the following timetable/schedule text and extract structured information. 
Return ONLY a valid JSON object with the following structure:

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
          "type": "Lecture|Lab|Tutorial|Seminar"
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

Guidelines:
- Extract all courses, times, days, locations, and instructors
- Convert all times to 24-hour format (HH:MM)
- Standardize day names (full names like "Monday")
- If information is unclear, use "TBD" or null
- Ensure all JSON is properly formatted and valid

Raw text to parse:
${ocrText}
    `;
  }

  /**
   * Parse and validate AI response
   * @param {string} aiResponse - Raw AI response
   * @returns {Object} Validated timetable data
   */
  parseAIResponse(aiResponse) {
    try {
      // Clean the response - remove markdown formatting if present
      let cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      
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
          });
        }
      });

      console.log('AI response validated successfully');
      return parsedData;

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw AI response:', aiResponse);
      
      // Return a fallback structure
      return {
        courses: [],
        metadata: {
          semester: "Unknown",
          academicYear: new Date().getFullYear().toString(),
          lastUpdated: new Date().toISOString(),
          parseError: error.message
        }
      };
    }
  }

  /**
   * Get parsing confidence score based on extracted data quality
   * @param {Object} parsedData - Parsed timetable data
   * @returns {number} Confidence score (0-1)
   */
  getConfidenceScore(parsedData) {
    if (!parsedData.courses || parsedData.courses.length === 0) {
      return 0;
    }

    let totalFields = 0;
    let filledFields = 0;

    parsedData.courses.forEach(course => {
      totalFields += 3; // courseCode, courseName, instructor
      if (course.courseCode && course.courseCode !== 'TBD') filledFields++;
      if (course.courseName && course.courseName !== 'TBD') filledFields++;
      if (course.instructor && course.instructor !== 'TBD') filledFields++;

      if (course.schedule) {
        course.schedule.forEach(session => {
          totalFields += 4; // day, startTime, endTime, location
          if (session.day && session.day !== 'TBD') filledFields++;
          if (session.startTime && session.startTime !== 'TBD') filledFields++;
          if (session.endTime && session.endTime !== 'TBD') filledFields++;
          if (session.location && session.location !== 'TBD') filledFields++;
        });
      }
    });

    return totalFields > 0 ? filledFields / totalFields : 0;
  }
}

module.exports = new AIService();