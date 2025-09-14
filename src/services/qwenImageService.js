/**
 * Qwen Multimodal Image Parsing Service (via OpenRouter)
 * Sends timetable image directly to a Qwen VL model and returns normalized timetable JSON
 */

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const QWEN_VL_MODELS = [
  'qwen/qwen-2.5-vl-7b-instruct',
  'qwen/qwen-2.5-vl-14b-instruct',
  'qwen/qwen-2-vl-7b-instruct'
];

export const parseTimetableImageWithQwen = async (imageAsset) => {
  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key (EXPO_PUBLIC_OPENROUTER_API_KEY)');
  }

  try {
    const { uri, base64 } = imageAsset;
    const imageBase64 = base64 || (await fetch(uri).then(r => r.blob()).then(blob => blobToBase64(blob)));
    const dataUrl = `data:${guessMimeType(uri)};base64,${imageBase64}`;

    const prompt = buildPrompt();

    let text = '';
    let lastError;
    for (let m = 0; m < QWEN_VL_MODELS.length; m++) {
      const model = QWEN_VL_MODELS[m];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const json = await callOpenRouter(apiKey, model, prompt, dataUrl);
          text = json?.choices?.[0]?.message?.content || '';
          if (!text) throw new Error('Empty Qwen response');
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          const shouldRetry = isTransient(err);
          if (!shouldRetry || attempt === 3) break;
          await sleep(500 * attempt * attempt);
        }
      }
      if (text) break;
    }

    if (!text) throw lastError || new Error('Qwen parsing failed');

    const structured = parseJSONFromText(text);
    const normalized = normalizeToCoursesSchema(structured);
    return normalized;
  } catch (error) {
    console.error('Qwen image parsing failed:', error);
    throw new Error(error.message || 'Qwen image parsing failed');
  }
};

const callOpenRouter = async (apiKey, model, prompt, dataUrl) => {
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You extract university timetables from images and output strict JSON only.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    temperature: 0,
    top_p: 0.9,
    max_tokens: 2200
  };

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://your-app.com',
      'X-Title': 'Timetable Parser App'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`OpenRouter request failed: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }

  return res.json();
};

const buildPrompt = () => `
Extract the timetable from this image and return ONLY JSON with this schema:

{
  "entries": [
    {
      "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday",
      "subject": "e.g., STQA, BDA, CPS, INS, CS, LIBRARY, PROJECT",
      "time": "HH:MM-HH:MM (24h)",
      "location": "e.g., 203-A, 172(C8)",
      "instructor": "e.g., ASD, SSV, MAI, VAT",
      "type": "Lecture|Lab|Project|Library|Break"
    }
  ]
}

STRICT RULES:
1) Return JSON ONLY, no extra text.
2) Days must be Monday..Saturday.
3) Use these exact time slots if present (convert PM to 24h):
   - 09:30-10:25
   - 10:25-11:20
   - 11:20-12:15
   - 12:20-13:15 (was 12:20-01:15)
   - 13:15-14:10 (was 01:15-02:10)
   - 14:30-15:25 (was 02:30-03:25)
   - 15:25-16:20 (was 03:25-04:20)
4) Map examples:
   - "STQA(ASD) 203-A" -> subject STQA, instructor ASD, location 203-A
   - "BDA(SSV) 203-A" -> subject BDA, instructor SSV, location 203-A
   - "INS(MAI) 172(C8)" -> subject INS, instructor MAI, location 172(C8)
   - "7A12:CS:TDPIT4:172(C8)" -> subject CS, instructor TDPIT4, location 172(C8)
5) Special cells (SKIP THESE):
   - "LIBRARY / SELF STUDY" -> SKIP (do not include)
   - "PROJECT" -> SKIP (do not include)
   - Any slot from 11:20-12:20 -> SKIP (lunch break time, regardless of name)
   - Any break periods, lunch periods, or recess periods -> SKIP
6) If a subject appears multiple times across days/slots, create multiple entries.
7) If unsure on a field, omit it; do not write placeholders.
`;

const parseJSONFromText = (text) => {
  let clean = text.replace(/```json\n?|```/g, '').trim();
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  return JSON.parse(clean);
};

const normalizeToCoursesSchema = (structured) => {
  const entries = structured?.entries || [];
  const coursesMap = new Map();

  entries.forEach((e) => {
    const subject = e.subject || 'TBD';
    const [startTime, endTime] = splitTimeRange(e.time);
    const key = subject.toUpperCase();
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
      source: 'qwen_image',
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

const isTransient = (err) => {
  const msg = String(err?.message || '').toLowerCase();
  const status = err?.status;
  return status === 503 || status === 429 || msg.includes('unavailable') || msg.includes('overloaded');
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// no-op


