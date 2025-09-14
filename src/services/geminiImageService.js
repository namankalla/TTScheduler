/**
 * Gemini Multimodal Image Parsing Service
 * Sends timetable image directly to Gemini and returns normalized timetable JSON
 */

// Prefer env; fallback to provided key for now (can be moved to .env later)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyCorFS2_Et71PRTRN_yqqdOb7fUgoF3N6k';
const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

/**
 * Parse a timetable image via Gemini
 * @param {{ uri: string, base64?: string, mimeType?: string }} imageAsset - Expo ImagePicker asset
 * @returns {Promise<any>} normalized timetable object compatible with existing scheduler
 */
export const parseTimetableImageWithGemini = async (imageAsset) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  try {
    const { uri, base64 } = imageAsset;
    console.log(`LOG  Processing image: ${uri}`);
    console.log(`LOG  Image has base64: ${!!base64}`);

    const imageBase64 = base64 || (await fetch(uri).then(r => r.blob()).then(blob => blobToBase64(blob)));
    console.log(`LOG  Image base64 length: ${imageBase64.length}`);

    const prompt = simplePrompt();
    console.log(`LOG  Using prompt: ${prompt}`);

    // Retry + model fallback for transient errors (503/429)
    let text = '';
    let lastError;
    console.log(`LOG  Starting Gemini parsing with ${GEMINI_MODELS.length} models: ${GEMINI_MODELS.join(', ')}`);
    
    for (let m = 0; m < GEMINI_MODELS.length; m++) {
      const model = GEMINI_MODELS[m];
      console.log(`LOG  Attempting with model ${m + 1}/${GEMINI_MODELS.length}: ${model}`);
      
      try {
        const json = await callGeminiLatest(model, prompt, guessMimeType(uri), imageBase64);
        text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) throw new Error('Gemini returned empty response.');
        console.log(`LOG  Successfully parsed with model: ${model}`);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const shouldRetry = isTransientGeminiError(err);
        console.log(`LOG  Model ${model} failed: ${err.message} (retry: ${shouldRetry})`);
        if (!shouldRetry) break;
        console.log('LOG  Waiting 600ms before retry...');
        await sleep(600);
      }
    }

    if (!text) {
      throw lastError || new Error('Gemini parsing failed');
    }

    // Log the raw Gemini text response (truncated for readability)
    const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text;
    console.log('Gemini text response (truncated): ```json');
    console.log(truncatedText);
    console.log('```');

    // Try direct JSON parse; otherwise extract first JSON block
    let structured;
    try {
      structured = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        structured = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid JSON returned by Gemini');
      }
    }

    // Log the structured JSON from Gemini
    console.log('LOG  Gemini structured JSON:', JSON.stringify(structured, null, 2));

    const normalized = normalizeToCoursesSchema(structured);
    
    // Log the final normalized schema
    console.log('LOG  Gemini normalized schema:', JSON.stringify(normalized, null, 2));
    
    return normalized;
  } catch (error) {
    console.error('Gemini image parsing failed:', error);
    throw new Error(error.message || 'Gemini image parsing failed');
  }
};

const callGeminiLatest = async (model, prompt, mimeType, imageBase64) => {
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            }
          }
        ]
      }
    ]
  };

  const url = `${GEMINI_API_URL_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  console.log(`LOG  Calling Gemini API with model: ${model}`);
  console.log(`LOG  Request URL: ${url}`);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  console.log(`LOG  Gemini API response status: ${res.status}`);

  if (!res.ok) {
    const txt = await res.text();
    console.error(`LOG  Gemini API error response: ${txt}`);
    const err = new Error(`Gemini request failed: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }

  const responseData = await res.json();
  console.log('LOG  Gemini API response received successfully');
  return responseData;
};

const isTransientGeminiError = (err) => {
  const msg = String(err?.message || '').toLowerCase();
  const status = err?.status;
  return status === 503 || status === 429 || msg.includes('unavailable') || msg.includes('overloaded');
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const simplePrompt = () => `You are a timetable extraction assistant. Read this timetable image carefully and return ONLY valid JSON. 

Rules:
1. Extract every class entry as an object inside \`"entries"\`.
2. JSON format must be exactly:
{
  "entries": [
    {
      "day": "Monday",
      "subject": "Course Name (Short Code)",
      "time": "09:30-10:25",
      "location": "Room number or null",
      "instructor": "Faculty Short Name or null",
      "type": "Lecture | Lab | Project | Self Study"
    }
  ]
}
3. Use the subject short codes (like STQA, INS, BDA, CPS, CS-L, etc.) with the faculty short name in parentheses, e.g., \`"STQA(ASD)"\`.
4. For "LIBRARY / SELF STUDY", set subject = "Library / Self Study", type = "Self Study", instructor = null, location = null.
5. For "PROJECT", subject = "Project", type = "Project", instructor = null, location = null.
6. For labs (e.g., CS-L, TDPT), set \`"type": "Lab"\`.
7. IMPORTANT: Skip lunch break slots from 11:20-12:20. Do not include any entries with time "11:20-12:20" regardless of what they are named (Library, Free Period, etc.).
8. Skip any break periods, lunch periods, or recess periods regardless of their names.
9. Always ensure valid JSON. Do not include any explanation or text outside the JSON.`;

const guessMimeType = (uri) => {
  if (!uri) return 'image/jpeg';
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = reader.result;
    const base64 = (result || '').toString().split(',').pop();
    resolve(base64 || '');
  };
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const parseJSONFromText = (text) => {
  let clean = text.replace(/```json\n?|```/g, '').trim();
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  return JSON.parse(clean);
};

/**
 * Normalize { entries: [ {day, subject, time, location, instructor, type} ] }
 * to existing { courses: [{ courseCode, courseName, instructor, schedule:[{day,startTime,endTime,location,type}]}], metadata }
 */
const normalizeToCoursesSchema = (structured) => {
  const entries = structured?.entries || [];
  const coursesMap = new Map();

  entries.forEach((e) => {
    const subject = e.subject || e.name || 'TBD';
    const [startTime, endTime] = splitTimeRange(e.time);
    const key = (subject || 'TBD').toUpperCase();
    if (!coursesMap.has(key)) {
      coursesMap.set(key, {
        courseCode: key,
        courseName: subject,
        instructor: e.instructor || 'TBD',
        schedule: []
      });
    }
    const course = coursesMap.get(key);
    course.schedule.push({
      day: e.day,
      startTime,
      endTime,
      location: e.location || 'TBD',
      type: e.type || 'Lecture'
    });
  });

  return {
    courses: Array.from(coursesMap.values()),
    metadata: {
      source: 'gemini_image',
      lastUpdated: new Date().toISOString()
    }
  };
};

const splitTimeRange = (time) => {
  if (!time || typeof time !== 'string') return ['09:00', '10:00'];
  const m = time.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!m) return ['09:00', '10:00'];
  return [to24h(m[1]), to24h(m[2])];
};

const to24h = (t) => {
  const pm = /pm/i.test(t);
  const am = /am/i.test(t);
  const parts = t.replace(/\s*(am|pm)/ig, '').split(':');
  let h = parseInt(parts[0]);
  const m = parts[1] || '00';
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (!am && !pm && h >= 1 && h <= 8) h += 12;
  return `${h.toString().padStart(2, '0')}:${m}`;
};


