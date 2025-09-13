const moment = require('moment');

class TimeUtils {
  /**
   * Convert 12-hour time format to 24-hour format
   * @param {string} time12h - Time in 12-hour format (e.g., "2:30 PM")
   * @returns {string} Time in 24-hour format (e.g., "14:30")
   */
  static convertTo24Hour(time12h) {
    try {
      const time = moment(time12h, ['h:mm A', 'h:mmA', 'h A', 'hA']);
      if (time.isValid()) {
        return time.format('HH:mm');
      }
      
      // If moment parsing fails, try manual parsing
      const regex = /^(\d{1,2}):?(\d{0,2})\s*(AM|PM|am|pm)$/i;
      const match = time12h.trim().match(regex);
      
      if (match) {
        let hours = parseInt(match[1]);
        let minutes = parseInt(match[2] || '0');
        const meridian = match[3].toUpperCase();
        
        if (meridian === 'PM' && hours !== 12) {
          hours += 12;
        } else if (meridian === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      return time12h; // Return original if conversion fails
    } catch (error) {
      console.warn(`Failed to convert time ${time12h}:`, error.message);
      return time12h;
    }
  }

  /**
   * Validate time format (HH:MM)
   * @param {string} time - Time string to validate
   * @returns {boolean} True if valid
   */
  static isValidTime(time) {
    if (!time || typeof time !== 'string') {
      return false;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate day name
   * @param {string} day - Day name to validate
   * @returns {boolean} True if valid
   */
  static isValidDay(day) {
    const validDays = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
      'Friday', 'Saturday', 'Sunday'
    ];
    return validDays.includes(day);
  }

  /**
   * Standardize day name (handle variations)
   * @param {string} day - Day name to standardize
   * @returns {string} Standardized day name
   */
  static standardizeDay(day) {
    if (!day || typeof day !== 'string') {
      return 'Unknown';
    }

    const dayMappings = {
      'mon': 'Monday', 'monday': 'Monday', 'M': 'Monday',
      'tue': 'Tuesday', 'tuesday': 'Tuesday', 'T': 'Tuesday', 'tues': 'Tuesday',
      'wed': 'Wednesday', 'wednesday': 'Wednesday', 'W': 'Wednesday',
      'thu': 'Thursday', 'thursday': 'Thursday', 'TH': 'Thursday', 'thurs': 'Thursday',
      'fri': 'Friday', 'friday': 'Friday', 'F': 'Friday',
      'sat': 'Saturday', 'saturday': 'Saturday', 'S': 'Saturday',
      'sun': 'Sunday', 'sunday': 'Sunday', 'SU': 'Sunday'
    };

    const normalized = day.trim().toLowerCase();
    return dayMappings[normalized] || day;
  }

  /**
   * Calculate duration between two times
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @returns {number} Duration in minutes
   */
  static calculateDuration(startTime, endTime) {
    try {
      const start = moment(startTime, 'HH:mm');
      const end = moment(endTime, 'HH:mm');
      
      if (!start.isValid() || !end.isValid()) {
        return 0;
      }

      let duration = end.diff(start, 'minutes');
      
      // Handle overnight classes (end time is next day)
      if (duration < 0) {
        duration += 24 * 60; // Add 24 hours
      }

      return duration;
    } catch (error) {
      console.warn('Failed to calculate duration:', error.message);
      return 0;
    }
  }

  /**
   * Get next occurrence of a weekly class
   * @param {string} day - Day of week
   * @param {string} time - Time (HH:MM)
   * @returns {Date} Next occurrence date
   */
  static getNextClassOccurrence(day, time) {
    try {
      const dayMap = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
      };

      const dayOfWeek = dayMap[day];
      if (dayOfWeek === undefined) {
        throw new Error(`Invalid day: ${day}`);
      }

      const [hours, minutes] = time.split(':').map(Number);
      
      const nextClass = moment()
        .day(dayOfWeek)
        .hour(hours)
        .minute(minutes)
        .second(0);

      // If the time has already passed this week, move to next week
      if (nextClass.isBefore(moment())) {
        nextClass.add(1, 'week');
      }

      return nextClass.toDate();
    } catch (error) {
      console.error('Failed to calculate next class occurrence:', error);
      return new Date();
    }
  }

  /**
   * Check if a time is within business hours
   * @param {string} time - Time to check (HH:MM)
   * @returns {boolean} True if within business hours (6 AM - 11 PM)
   */
  static isWithinBusinessHours(time) {
    try {
      const [hours] = time.split(':').map(Number);
      return hours >= 6 && hours <= 23;
    } catch (error) {
      return true; // Default to true if parsing fails
    }
  }

  /**
   * Format time for display
   * @param {string} time24h - Time in 24-hour format
   * @param {boolean} use12Hour - Whether to use 12-hour format
   * @returns {string} Formatted time string
   */
  static formatTimeForDisplay(time24h, use12Hour = true) {
    try {
      const time = moment(time24h, 'HH:mm');
      if (!time.isValid()) {
        return time24h;
      }

      return use12Hour ? time.format('h:mm A') : time.format('HH:mm');
    } catch (error) {
      return time24h;
    }
  }

  /**
   * Get current academic year
   * @returns {string} Academic year (e.g., "2024-2025")
   */
  static getCurrentAcademicYear() {
    const now = moment();
    const currentYear = now.year();
    
    // Academic year typically starts in August/September
    if (now.month() >= 7) { // August (0-indexed) or later
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  /**
   * Get current semester
   * @returns {string} Current semester
   */
  static getCurrentSemester() {
    const now = moment();
    const month = now.month(); // 0-indexed
    
    if (month >= 7 && month <= 11) { // August - December
      return 'Fall';
    } else if (month >= 0 && month <= 4) { // January - May  
      return 'Spring';
    } else { // May - August
      return 'Summer';
    }
  }

  /**
   * Convert timezone if needed
   * @param {Date} date - Date to convert
   * @param {string} timezone - Target timezone
   * @returns {Date} Converted date
   */
  static convertTimezone(date, timezone = 'UTC') {
    try {
      return moment(date).tz(timezone).toDate();
    } catch (error) {
      console.warn('Timezone conversion failed:', error.message);
      return date;
    }
  }
}

module.exports = TimeUtils;