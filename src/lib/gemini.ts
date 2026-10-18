// Turns a meeting recording into a client-ready summary and task list using
// Google's Gemini API (audio goes in directly, no separate transcription step).

const API = "https://generativelanguage.googleapis.com";

export type DraftTask = {
  title: string;
  description: string;
  deadlineDays: number;
};

export type MeetingDraft = {
  title: string;
  summary: string;
  nextFocus: string;
  tasks: DraftTask[];
};

const PROMPT = `אתה עוזר ליועץ כלכלת משפחה חרדי בירושלים. מצורפת הקלטה של פגישה בין היועץ למשפחה.

כתוב בעברית, ובפורמט JSON לפי הסכמה בלבד:
- title: כותרת קצרה לפגישה (עד 6 מילים), למשל "פגישה על קרן חירום".
- summary: סיכום שנשלח ללקוח. בלשון רבים ("דיברנו", "החלטתם"), פשוט וחם, 120 עד 250 מילים, בפסקאות קצרות. רק מה שנאמר בפועל בהקלטה. אל תמציא מספרים, החלטות או הבטחות. בלי האשמות ובלי שפה שיפוטית: "עוד לא הגענו ליעד" ולא "נכשלתם".
- nextFocus: משפט אחד על מה שנתמקד בו בפגישה הבאה, רק אם עלה בהקלטה. אחרת מחרוזת ריקה.
- tasks: בין 0 ל-6 משימות קטנות, קונקרטיות וברות ביצוע שהוסכם עליהן בהקלטה (למשל "לפתוח הוראת קבע של 300 ש״ח לקרן חירום"). לכל משימה: title קצר, description של משפט אחד, ו-deadlineDays: בעוד כמה ימים כדאי לבצע אותה (ברירת מחדל 7). אם לא הוסכמו משימות, החזר רשימה ריקה.

כללים: אל תכלול מספרי תעודת זהות, מספרי חשבון בנק או כרטיס אשראי. אם חלק מההקלטה לא ברור, דלג עליו במקום לנחש.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    nextFocus: { type: "STRING" },
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          deadlineDays: { type: "INTEGER" },
        },
        required: ["title", "description", "deadlineDays"],
      },
    },
  },
  required: ["title", "summary", "nextFocus", "tasks"],
};

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("חסר מפתח GEMINI_API_KEY בהגדרות השרת.");
  return key;
}

async function geminiError(res: Response, step: string): Promise<Error> {
  const body = await res.text().catch(() => "");
  return new Error(`${step} נכשל (${res.status}). ${body.slice(0, 300)}`);
}

// Uploads the audio to Gemini's Files API (resumable) and waits until it is usable.
async function uploadAudio(audio: ArrayBuffer, mimeType: string, displayName: string) {
  const key = apiKey();

  const start = await fetch(`${API}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(audio.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  if (!start.ok) throw await geminiError(start, "פתיחת העלאה ל-Gemini");
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini לא החזיר כתובת העלאה.");

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(audio.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: audio,
  });
  if (!upload.ok) throw await geminiError(upload, "העלאת ההקלטה ל-Gemini");
  const { file } = (await upload.json()) as { file: { name: string; uri: string; state?: string } };

  // Audio is processed asynchronously: poll until ACTIVE.
  let state = file.state ?? "PROCESSING";
  for (let i = 0; i < 60 && state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${API}/v1beta/${file.name}`, { headers: { "x-goog-api-key": key } });
    if (!res.ok) throw await geminiError(res, "בדיקת סטטוס הקובץ");
    state = ((await res.json()) as { state: string }).state;
  }
  if (state !== "ACTIVE") throw new Error("Gemini לא הצליח לעבד את קובץ ההקלטה.");

  return file;
}

async function deleteFile(name: string) {
  await fetch(`${API}/v1beta/${name}`, {
    method: "DELETE",
    headers: { "x-goog-api-key": apiKey() },
  }).catch(() => {});
}

export async function analyzeMeetingRecording(input: {
  audio: ArrayBuffer;
  mimeType: string;
  displayName: string;
}): Promise<MeetingDraft> {
  const key = apiKey();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const file = await uploadAudio(input.audio, input.mimeType, input.displayName);

  try {
    const res = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { file_data: { mime_type: input.mimeType, file_uri: file.uri } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.3,
        },
      }),
    });
    if (!res.ok) throw await geminiError(res, "יצירת הסיכום");

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) throw new Error("Gemini לא החזיר תשובה (ייתכן שההקלטה ריקה או לא ברורה).");

    const parsed = JSON.parse(text) as Partial<MeetingDraft>;
    return {
      title: String(parsed.title ?? "").trim() || "סיכום פגישה",
      summary: String(parsed.summary ?? "").trim(),
      nextFocus: String(parsed.nextFocus ?? "").trim(),
      tasks: (parsed.tasks ?? [])
        .map((t) => ({
          title: String(t.title ?? "").trim(),
          description: String(t.description ?? "").trim(),
          deadlineDays: Number.isFinite(t.deadlineDays) ? Math.min(Math.max(t.deadlineDays, 1), 90) : 7,
        }))
        .filter((t) => t.title),
    };
  } finally {
    // Keep client audio on Google's side only as long as needed.
    await deleteFile(file.name);
  }
}
