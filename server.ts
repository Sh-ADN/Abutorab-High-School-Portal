import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Server-side Gemini AI Marksheet Scanner endpoint
  app.post('/api/marks/scan-sheet', async (req, res) => {
    try {
      const { imageBase64, mimeType, subjectName, mcqMax, writtenMax, practicalMax, fullMarks, studentRoster } =
        req.body || {};

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        res.status(400).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets or use Sample Marksheet / CSV Paste.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const rosterContext = Array.isArray(studentRoster)
        ? studentRoster.map((s: { roll: number; name: string }) => `Roll ${s.roll}: ${s.name}`).join('\n')
        : '';

      const promptText = `You are an expert OCR and NCTB Bangladesh school exam marksheet scanner for Abu Torab High School.
Extract the student marks for subject "${subjectName || 'Subject'}" (Full Marks: ${fullMarks || 100}).
Component maximums:
- MCQ Max: ${mcqMax ?? 'N/A (null)'}
- Written (CQ) Max: ${writtenMax ?? 'N/A (null)'}
- Practical Max: ${practicalMax ?? 'N/A (null)'}

Known Class Roster:
${rosterContext}

Convert any Bengali numerals (০১২৩৪৫৬৭৮৯) into standard integers. Return a JSON array of extracted student mark rows matching the schema.`;

      const contentsParts: any[] = [];
      if (imageBase64 && mimeType) {
        contentsParts.push({
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        });
      }
      contentsParts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: contentsParts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roll: {
                  type: Type.INTEGER,
                  description: 'Student roll number.',
                },
                mcq: {
                  type: Type.INTEGER,
                  description: 'Extracted MCQ marks (0 if not applicable).',
                },
                written: {
                  type: Type.INTEGER,
                  description: 'Extracted Written / CQ marks (0 if not applicable).',
                },
                practical: {
                  type: Type.INTEGER,
                  description: 'Extracted Practical marks (0 if not applicable).',
                },
              },
              required: ['roll', 'mcq', 'written', 'practical'],
            },
          },
        },
      });

      const rawJson = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawJson);
      res.json({ rows: Array.isArray(parsed) ? parsed : [] });
    } catch (error: any) {
      console.error('Gemini marksheet scan error:', error);
      res.status(500).json({
        error: error?.message || 'Failed to scan marksheet with Gemini AI.',
      });
    }
  });

  // Live School Routine JSON proxy & Web View from Google Apps Script Web App
  const LIVE_ROUTINE_URL =
    'https://script.google.com/macros/s/AKfycbzGUBlzXFJ_OS8cDTKOvEl4-7B1TMFYvF-n_RySMP61SnUOSTcmnWll5L6-fvNrabdmKw/exec';

  let cachedLiveRoutine: {
    teachers: string[];
    masterGrid: string[][];
    fetchedAt: string;
    sourceUrl: string;
  } | null = null;

  async function fetchLiveRoutineData(forceRefresh = false) {
    if (cachedLiveRoutine && !forceRefresh) {
      return cachedLiveRoutine;
    }
    const targetUrl = `${LIVE_ROUTINE_URL}?action=getFullDatabase`;
    const response = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'aistudio-build',
      },
    });
    if (!response.ok) {
      throw new Error(`Apps Script responded with HTTP ${response.status}`);
    }
    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    cachedLiveRoutine = {
      teachers: Array.isArray(parsed?.teachers) ? parsed.teachers : [],
      masterGrid: Array.isArray(parsed?.masterGrid) ? parsed.masterGrid : [],
      fetchedAt: new Date().toISOString(),
      sourceUrl: LIVE_ROUTINE_URL,
    };
    return cachedLiveRoutine;
  }

  app.get('/api/routine/live', async (req, res) => {
    try {
      const force = req.query.refresh === '1';
      const data = await fetchLiveRoutineData(force);
      res.json(data);
    } catch (error: any) {
      console.error('Live routine fetch error:', error);
      res.status(500).json({
        error: error?.message || 'Failed to fetch live routine data from Google Apps Script.',
      });
    }
  });

  app.get('/api/routine/webview', async (_req, res) => {
    try {
      const data = await fetchLiveRoutineData(false);
      const rowsHtml = data.teachers
        .map((tCode, idx) => {
          const row = data.masterGrid[idx] || [];
          const cells = [0, 1, 2, 3, 4, 5, 6, 7]
            .map((cIdx) => {
              if (cIdx === 4) {
                return `<td style="background:#fef3c7;color:#92400e;text-align:center;font-weight:600;">TIFFIN</td>`;
              }
              const val = String(row[cIdx] || '-')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br/>');
              return `<td>${val}</td>`;
            })
            .join('');
          return `<tr><td style="font-weight:700;color:#1d4ed8;background:#f8fafc;">${tCode}</td>${cells}</tr>`;
        })
        .join('');

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Abu Torab High School — Live Routine Web View</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
    .hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .hdr h1 { font-size: 15px; margin: 0; color: #0f172a; }
    .hdr span { font-size: 11px; color: #475569; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 11px; border: 1px solid #cbd5e1; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #0f172a; color: #fff; font-weight: 600; }
  </style>
</head>
<body>
  <div class="hdr">
    <h1>Abu Torab High School — Live Apps Script Master Routine Grid (${data.teachers.length} Teachers)</h1>
    <span>Synced: ${data.fetchedAt}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Teacher</th>
        <th>1st (10:00-10:45)</th>
        <th>2nd (10:45-11:25)</th>
        <th>3rd (11:25-12:05)</th>
        <th>4th (12:05-12:45)</th>
        <th>Break</th>
        <th>5th (01:15-01:55)</th>
        <th>6th (01:55-02:35)</th>
        <th>7th (02:35-03:15)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err: any) {
      res
        .status(500)
        .send(`<html><body style="font-family:sans-serif;padding:16px;">Unable to load live routine webview: ${err?.message || 'Error'}</body></html>`);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Abu Torab High School server running on http://localhost:${PORT}`);
  });
}

startServer();
