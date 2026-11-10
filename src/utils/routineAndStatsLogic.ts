import { ClassSection, RoutineRecord, UserProfile } from '../types/school';

export const LIVE_ROUTINE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzGUBlzXFJ_OS8cDTKOvEl4-7B1TMFYvF-n_RySMP61SnUOSTcmnWll5L6-fvNrabdmKw/exec';

export interface RawRoutineJsonItem {
  days: string;
  className: string;
  period: number;
  subject: string;
  teacher: string;
}

/**
 * Exact raw routine data from attached /public/assets/aistudio/routine_5f760d2b.json
 */
export const ATTACHED_ROUTINE_RAW: RawRoutineJsonItem[] = [
  { days: '(3-6)', className: 'X-B', period: 2, subject: 'Eng-2', teacher: 'H.M.' },
  { days: '(2-5)', className: 'X-A', period: 3, subject: 'Eng-2', teacher: 'H.M.' },

  { days: '(2-6)', className: 'X-A', period: 2, subject: 'Math', teacher: 'A.H.M.' },
  { days: '(2-6)', className: 'VIII-A', period: 4, subject: 'Math', teacher: 'A.H.M.' },
  { days: '(5-6)', className: 'IX-B', period: 5, subject: 'G.Sci', teacher: 'A.H.M.' },
  { days: '(4-6)', className: 'X-A', period: 7, subject: 'G.Sci', teacher: 'A.H.M.' },

  { days: '(2-6)', className: 'X-B', period: 1, subject: 'Math', teacher: 'M.A.' },
  { days: '(2-6)', className: 'VII-A', period: 3, subject: 'Math', teacher: 'M.A.' },
  { days: '(2-6)', className: 'IX-A', period: 4, subject: 'Math', teacher: 'M.A.' },
  { days: '(4-6)', className: 'X', period: 6, subject: 'Chemistry', teacher: 'M.A.' },
  { days: '(2-3)', className: 'X', period: 7, subject: 'H-Math', teacher: 'M.A.' },
  { days: '(6)', className: 'IX', period: 7, subject: 'H-Math', teacher: 'M.A.' },

  { days: '(2-6)', className: 'VII-A', period: 2, subject: 'Ben-1 & 2', teacher: 'S.B.' },
  { days: '(5-6)', className: 'IX', period: 3, subject: 'Religion', teacher: 'S.B.' },
  { days: '(2-3)', className: 'X', period: 4, subject: 'Religion', teacher: 'S.B.' },
  { days: '(2-3)', className: 'VII-B', period: 5, subject: 'ICT', teacher: 'S.B.' },
  { days: '(4-6)', className: 'VII', period: 5, subject: 'Religion', teacher: 'S.B.' },
  { days: '(5-6)', className: 'VI', period: 6, subject: 'Religion', teacher: 'S.B.' },
  { days: '(2-4)', className: 'VIII', period: 7, subject: 'Religion', teacher: 'S.B.' },
  { days: '(5-6)', className: 'VI-A', period: 7, subject: 'Eng-2', teacher: 'S.B.' },

  { days: '(2-6)', className: 'VIII-A', period: 1, subject: 'Ben-1 & 2', teacher: 'A.B.S.' },
  { days: '(2-4)', className: 'IX', period: 3, subject: 'Acc', teacher: 'A.B.S.' },
  { days: '(4-6)', className: 'VI-A', period: 4, subject: 'Ben-1', teacher: 'A.B.S.' },
  { days: '(2-3)', className: 'VII-A', period: 5, subject: 'ICT', teacher: 'A.B.S.' },
  { days: '(4-6)', className: 'X', period: 6, subject: 'Acc', teacher: 'A.B.S.' },
  { days: '(2-4)', className: 'VI-A', period: 7, subject: 'ICT', teacher: 'A.B.S.' },
  { days: '(5-6)', className: 'VII-B', period: 7, subject: 'Ben-2', teacher: 'A.B.S.' },

  { days: '(2-6)', className: 'VI-A', period: 2, subject: 'BGS', teacher: 'S.I.' },
  { days: '(2-6)', className: 'VII-B', period: 3, subject: 'BGS', teacher: 'S.I.' },
  { days: '(4-6)', className: 'X', period: 4, subject: 'B.Ent', teacher: 'S.I.' },
  { days: '(2)', className: 'X-A', period: 5, subject: 'P.Ed', teacher: 'S.I.' },
  { days: '(4)', className: 'X-B', period: 5, subject: 'P.Ed', teacher: 'S.I.' },
  { days: '(2-4)', className: 'IX', period: 6, subject: 'B.Ent', teacher: 'S.I.' },
  { days: '(5-6)', className: 'VIII-B', period: 7, subject: 'ICT', teacher: 'S.I.' },

  { days: '(2-6)', className: 'VI-B', period: 2, subject: 'Ben-1 & 2', teacher: 'M.C.' },
  { days: '(5-6)', className: 'IX', period: 3, subject: 'Religion', teacher: 'M.C.' },
  { days: '(2-3)', className: 'X', period: 4, subject: 'Religion', teacher: 'M.C.' },
  { days: '(4-6)', className: 'VII', period: 5, subject: 'Religion', teacher: 'M.C.' },
  { days: '(2-4)', className: 'IX', period: 6, subject: 'History', teacher: 'M.C.' },
  { days: '(5-6)', className: 'VI', period: 6, subject: 'Religion', teacher: 'M.C.' },
  { days: '(2-4)', className: 'VIII', period: 7, subject: 'Religion', teacher: 'M.C.' },

  { days: '(2-6)', className: 'VII-B', period: 2, subject: 'Eng-1', teacher: 'J.U.C.' },
  { days: '(2)', className: 'X-B', period: 3, subject: 'ICT', teacher: 'J.U.C.' },
  { days: '(6)', className: 'X-A', period: 3, subject: 'ICT', teacher: 'J.U.C.' },
  { days: '(2-3)', className: 'VI-A', period: 4, subject: 'Ben-2', teacher: 'J.U.C.' },
  { days: '(2-4)', className: 'VI-A', period: 5, subject: 'Eng-2', teacher: 'J.U.C.' },
  { days: '(2-6)', className: 'VIII-B', period: 6, subject: 'BGS', teacher: 'J.U.C.' },
  { days: '(2-4)', className: 'VI-B', period: 7, subject: 'Eng-2', teacher: 'J.U.C.' },

  { days: '(2-6)', className: 'IX-B', period: 2, subject: 'Eng-1', teacher: 'F.A.' },
  { days: '(3-6)', className: 'X-B', period: 3, subject: 'Eng-1', teacher: 'F.A.' },
  { days: '(3-6)', className: 'X-A', period: 5, subject: 'Eng-1', teacher: 'F.A.' },
  { days: '(2-6)', className: 'VIII-A', period: 6, subject: 'Eng-1', teacher: 'F.A.' },
  { days: '(2-5)', className: 'IX-A', period: 7, subject: 'Eng-2', teacher: 'F.A.' },

  { days: '(2-6)', className: 'VIII-B', period: 2, subject: 'Eng-2', teacher: 'N.Z.' },
  { days: '(2-4)', className: 'IX', period: 3, subject: 'Geo', teacher: 'N.Z.' },
  { days: '(2-6)', className: 'VIII-B', period: 4, subject: 'Eng-1', teacher: 'N.Z.' },
  { days: '(2-3)', className: 'X-B', period: 5, subject: 'Ben-2', teacher: 'N.Z.' },
  { days: '(4-6)', className: 'X', period: 6, subject: 'History', teacher: 'N.Z.' },
  { days: '(2-6)', className: 'VII-A', period: 7, subject: 'Eng-2', teacher: 'N.Z.' },

  { days: '(2-6)', className: 'VII-B', period: 1, subject: 'Math', teacher: 'N.Y.' },
  { days: '(2-6)', className: 'VIII-A', period: 2, subject: 'G.Sci', teacher: 'N.Y.' },
  { days: '(2-3)', className: 'VI-B', period: 5, subject: 'G.Sci', teacher: 'N.Y.' },
  { days: '(5-6)', className: 'IX-A', period: 5, subject: 'G.Sci', teacher: 'N.Y.' },
  { days: '(2-6)', className: 'VII-B', period: 6, subject: 'G.Sci', teacher: 'N.Y.' },
  { days: '(2-3)', className: 'X', period: 7, subject: 'Agri', teacher: 'N.Y.' },

  { days: '(2-6)', className: 'X-A', period: 1, subject: 'Ben-1 & 2', teacher: 'MOR.' },
  { days: '(2-4)', className: 'VIII-B', period: 3, subject: 'Ben-1', teacher: 'MOR.' },
  { days: '(2-6)', className: 'IX-B', period: 4, subject: 'Ben-1 & 2', teacher: 'MOR.' },
  { days: '(2-6)', className: 'VII-A', period: 6, subject: 'BGS', teacher: 'MOR.' },
  { days: '(2-4)', className: 'VII-B', period: 7, subject: 'Ben-1', teacher: 'MOR.' },

  { days: '(2-6)', className: 'VI-A', period: 1, subject: 'Eng-1', teacher: 'H.P.' },
  { days: '(2-6)', className: 'VIII-A', period: 3, subject: 'BGS', teacher: 'H.P.' },
  { days: '(2-6)', className: 'VII-B', period: 4, subject: 'Eng-2', teacher: 'H.P.' },
  { days: '(2-4)', className: 'IX', period: 5, subject: 'Civics', teacher: 'H.P.' },
  { days: '(5-6)', className: 'IX', period: 5, subject: 'BGS', teacher: 'H.P.' },
  { days: '(2-3)', className: 'X', period: 6, subject: 'BGS', teacher: 'H.P.' },

  { days: '(2-6)', className: 'VIII-B', period: 1, subject: 'Math', teacher: 'F.H.' },
  { days: '(2-4)', className: 'IX', period: 3, subject: 'Bio', teacher: 'F.H.' },
  { days: '(4-6)', className: 'X', period: 4, subject: 'Bio', teacher: 'F.H.' },
  { days: '(2-6)', className: 'VIII-B', period: 5, subject: 'G.Sci', teacher: 'F.H.' },
  { days: '(5-6)', className: 'IX-A', period: 6, subject: 'ICT', teacher: 'F.H.' },
  { days: '(4-6)', className: 'X-B', period: 7, subject: 'G.Sci', teacher: 'F.H.' },

  { days: '(2-6)', className: 'IX-B', period: 1, subject: 'Math', teacher: 'A.D.N.' },
  { days: '(2-6)', className: 'VI-A', period: 3, subject: 'Math', teacher: 'A.D.N.' },
  { days: '(4-6)', className: 'X', period: 4, subject: 'Geo', teacher: 'A.D.N.' },
  { days: '(4-6)', className: 'VI-B', period: 5, subject: 'G.Sci', teacher: 'A.D.N.' },
  { days: '(2-4)', className: 'IX', period: 6, subject: 'Phy', teacher: 'A.D.N.' },
  { days: '(4-6)', className: 'X', period: 7, subject: 'Phy', teacher: 'A.D.N.' },

  { days: '(2-6)', className: 'VI-B', period: 1, subject: 'Eng-1', teacher: 'Z.H.C' },
  { days: '(5-6)', className: 'IX-A', period: 3, subject: 'Religion', teacher: 'Z.H.C' },
  { days: '(2-3)', className: 'X-B', period: 4, subject: 'Religion', teacher: 'Z.H.C' },
  { days: '(4-6)', className: 'VII-B', period: 5, subject: 'Religion', teacher: 'Z.H.C' },
  { days: '(5-6)', className: 'VI-A', period: 6, subject: 'Religion', teacher: 'Z.H.C' },
  { days: '(2-4)', className: 'VIII-A', period: 7, subject: 'Religion', teacher: 'Z.H.C' },
  { days: '(5-6)', className: 'VI-B', period: 7, subject: 'Eng-2', teacher: 'Z.H.C' },

  { days: '(2-6)', className: 'IX-A', period: 1, subject: 'Ben-1 & 2', teacher: 'M.U.' },
  { days: '(2)', className: 'X-B', period: 2, subject: 'Ben-1', teacher: 'M.U.' },
  { days: '(5-6)', className: 'VIII-B', period: 3, subject: 'Ben-2', teacher: 'M.U.' },
  { days: '(2-4)', className: 'VI-B', period: 4, subject: 'BGS', teacher: 'M.U.' },
  { days: '(2-4)', className: 'IX', period: 5, subject: 'F&B', teacher: 'M.U.' },
  { days: '(5-6)', className: 'X-B', period: 5, subject: 'Ben-1', teacher: 'M.U.' },
  { days: '(2-3)', className: 'X', period: 6, subject: 'F&B', teacher: 'M.U.' },
  { days: '(5-6)', className: 'VIII-A', period: 7, subject: 'ICT', teacher: 'M.U.' },

  { days: '(2-6)', className: 'VI-B', period: 3, subject: 'Math', teacher: 'S.H.' },
  { days: '(2-6)', className: 'VII-A', period: 4, subject: 'G.Sci', teacher: 'S.H.' },
  { days: '(2-4)', className: 'IX', period: 5, subject: 'Chemistry', teacher: 'S.H.' },
  { days: '(5-6)', className: 'VI-A', period: 5, subject: 'G.Sci', teacher: 'S.H.' },
  { days: '(2-4)', className: 'VI-A', period: 6, subject: 'G.Sci', teacher: 'S.H.' },
  { days: '(5-6)', className: 'IX-B', period: 6, subject: 'ICT', teacher: 'S.H.' },

  { days: '(2-6)', className: 'VII-A', period: 1, subject: 'Eng-1', teacher: 'S.R.' },
  { days: '(2-6)', className: 'IX-A', period: 2, subject: 'Eng-1', teacher: 'S.R.' },
  { days: '(2-6)', className: 'VIII-A', period: 5, subject: 'Eng-2', teacher: 'S.R.' },
  { days: '(2-3)', className: 'X', period: 6, subject: 'Civics', teacher: 'S.R.' },
  { days: '(2-5)', className: 'IX-B', period: 7, subject: 'Eng-2', teacher: 'S.R.' },
  { days: '(6)', className: 'IX-B', period: 7, subject: 'Agri', teacher: 'S.R.' },

  { days: '(5-6)', className: 'IX-B', period: 3, subject: 'Religion', teacher: 'Md.R' },
  { days: '(2-3)', className: 'X-A', period: 4, subject: 'Religion', teacher: 'Md.R' },
  { days: '(5-6)', className: 'VI-B', period: 4, subject: 'BGS', teacher: 'Md.R' },
  { days: '(4-6)', className: 'VII-A', period: 5, subject: 'Religion', teacher: 'Md.R' },
  { days: '(2-4)', className: 'VI-B', period: 6, subject: 'ICT', teacher: 'Md.R' },
  { days: '(5-6)', className: 'VI-B', period: 6, subject: 'Religion', teacher: 'Md.R' },
  { days: '(2-4)', className: 'VIII-B', period: 7, subject: 'Religion', teacher: 'Md.R' },
  { days: '(6)', className: 'IX-A', period: 7, subject: 'Agri', teacher: 'Md.R' },
];

export const SEED_ROUTINE_RECORDS: RoutineRecord[] = ATTACHED_ROUTINE_RAW.map((item, idx) => ({
  id: `rt_${String(idx + 1).padStart(3, '0')}`,
  days: item.days,
  className: item.className,
  period: item.period,
  subject: item.subject,
  teacher: item.teacher,
  updatedAt: '2026-01-15T00:00:00.000Z',
}));

/**
 * Days Configuration matching TeacherStatistics.kt & Google Apps Script:
 * 2 = Sunday, 3 = Monday, 4 = Tuesday, 5 = Wednesday, 6 = Thursday
 */
export interface RoutineDayConfig {
  day: number;
  name: string;
  shortName: string;
  bengaliName: string;
}

export const DAYS_CONFIG: RoutineDayConfig[] = [
  { day: 2, name: 'Sunday', shortName: 'Sun', bengaliName: 'রবিবার' },
  { day: 3, name: 'Monday', shortName: 'Mon', bengaliName: 'সোমবার' },
  { day: 4, name: 'Tuesday', shortName: 'Tue', bengaliName: 'মঙ্গলবার' },
  { day: 5, name: 'Wednesday', shortName: 'Wed', bengaliName: 'বুধবার' },
  { day: 6, name: 'Thursday', shortName: 'Thu', bengaliName: 'বৃহস্পতিবার' },
];

export interface PeriodBellSchedule {
  period: number;
  label: string;
  bengaliLabel: string;
  durationMinutes: number;
  timeRange: string;
}

export const PERIOD_SCHEDULE: PeriodBellSchedule[] = [
  { period: 1, label: '1st Period', bengaliLabel: '১ম পিরিয়ড', durationMinutes: 45, timeRange: '10:00 – 10:45' },
  { period: 2, label: '2nd Period', bengaliLabel: '২য় পিরিয়ড', durationMinutes: 40, timeRange: '10:45 – 11:25' },
  { period: 3, label: '3rd Period', bengaliLabel: '৩য় পিরিয়ড', durationMinutes: 40, timeRange: '11:25 – 12:05' },
  { period: 4, label: '4th Period', bengaliLabel: '৪র্থ পিরিয়ড', durationMinutes: 40, timeRange: '12:05 – 12:45' },
  // Tiffin Break: 12:45 - 01:15 (between 4th and 5th Period)
  { period: 5, label: '5th Period', bengaliLabel: '৫ম পিরিয়ড', durationMinutes: 40, timeRange: '01:15 – 01:55' },
  { period: 6, label: '6th Period', bengaliLabel: '৬ষ্ঠ পিরিয়ড', durationMinutes: 40, timeRange: '01:55 – 02:35' },
  { period: 7, label: '7th Period', bengaliLabel: '৭ম পিরিয়ড', durationMinutes: 40, timeRange: '02:35 – 03:15' },
];

/**
 * Ported directly from ClassUtils.kt:
 * fun isClassMatch(c1: String, c2: String): Boolean {
 *     if (c1 == c2) return true
 *     val base1 = c1.split("-")[0].trim()
 *     val base2 = c2.split("-")[0].trim()
 *     if (base1 != base2) return false
 *     return c1.contains(c2) || c2.contains(c1)
 * }
 */
export function isClassMatch(c1: string, c2: string): boolean {
  const clean1 = c1.trim().toUpperCase();
  const clean2 = c2.trim().toUpperCase();
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;
  const base1 = clean1.split('-')[0].trim();
  const base2 = clean2.split('-')[0].trim();
  if (base1 !== base2) return false;
  return clean1.includes(clean2) || clean2.includes(clean1);
}

/**
 * Parses a routine days expression such as "(2-6)", "(3-6)", "(2)", "(2,4)", "(2, 5-6)"
 * into a sorted array of distinct weekday numbers in [2..6].
 */
export function parseDaysExpression(daysExpr: string | undefined | null): number[] {
  if (!daysExpr) return [2, 3, 4, 5, 6];
  const inner = daysExpr.replace(/[()]/g, '').trim();
  if (!inner) return [2, 3, 4, 5, 6];

  const daySet = new Set<number>();
  const parts = inner.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-').map((s) => s.trim());
      const start = Number(startStr);
      const end = Number(endStr);
      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let d = start; d <= end; d++) {
          if (d >= 2 && d <= 6) daySet.add(d);
        }
      }
    } else {
      const d = Number(trimmed);
      if (!Number.isNaN(d) && d >= 2 && d <= 6) {
        daySet.add(d);
      }
    }
  }
  return Array.from(daySet).sort((a, b) => a - b);
}

/**
 * Formats a "(2-6)" days expression into human-readable weekday range (e.g. "Sun–Thu")
 */
export function formatDaysExpressionLabel(daysExpr: string): string {
  const days = parseDaysExpression(daysExpr);
  if (days.length === 5) return 'Sun–Thu (All Days)';
  if (days.length === 0) return daysExpr;

  const isContiguous = days.every((d, idx) => idx === 0 || d === days[idx - 1] + 1);
  const nameOf = (d: number) => DAYS_CONFIG.find((c) => c.day === d)?.shortName || String(d);
  if (isContiguous && days.length >= 2) {
    return `${nameOf(days[0])}–${nameOf(days[days.length - 1])}`;
  }
  return days.map(nameOf).join(', ');
}

export interface ExpandedRoutineEntry {
  recordId: string;
  day: number; // 2=Sun, 3=Mon, 4=Tue, 5=Wed, 6=Thu
  dayName: string;
  daysRaw: string;
  className: string;
  baseClass: string;
  period: number;
  subject: string;
  teacher: string;
}

/**
 * Expands RoutineRecord[] into daily RoutineEntry[] (one entry per active weekday)
 * so TeacherStatistics.kt and daily timetable grids operate on exact daily instances.
 */
export function expandRoutineRecordsToEntries(records: RoutineRecord[]): ExpandedRoutineEntry[] {
  const expanded: ExpandedRoutineEntry[] = [];
  for (const rec of records) {
    const activeDays = parseDaysExpression(rec.days);
    const baseClass = rec.className.split('-')[0].trim().toUpperCase();
    for (const d of activeDays) {
      const dayCfg = DAYS_CONFIG.find((c) => c.day === d);
      expanded.push({
        recordId: rec.id,
        day: d,
        dayName: dayCfg?.name || 'Sunday',
        daysRaw: rec.days,
        className: rec.className.trim(),
        baseClass,
        period: rec.period,
        subject: rec.subject.trim(),
        teacher: rec.teacher.trim(),
      });
    }
  }
  return expanded;
}

export interface DayStats {
  day: number;
  dayName: string;
  shortName: string;
  bengaliName: string;
  classCount: number;
  gaps: number;
  periods: number[];
}

export interface TeacherSubjectClassBreakdown {
  subject: string;
  className: string;
  daysLabel: string;
  period: number;
  weeklyPeriods: number;
}

export interface TeacherStatisticsSummary {
  teacherCode: string;
  teacherDisplayName: string;
  totalClasses: number;
  totalMinutes: number;
  hours: number;
  minutes: number;
  totalTeachingHoursStr: string;
  uniqueClasses: number;
  uniqueClassesList: string[];
  uniqueSubjects: number;
  uniqueSubjectsList: string[];
  averageClasses: string;
  busiestWeekdayStr: string;
  leastBusyWeekdayStr: string;
  dayStatsList: DayStats[];
  breakdownRows: TeacherSubjectClassBreakdown[];
}

/**
 * Direct port of TeacherStatistics.kt
 */
export function computeTeacherStatistics(
  entries: ExpandedRoutineEntry[],
  teacherCode = 'ALL',
  teacherDisplayName = ''
): TeacherStatisticsSummary {
  const totalClasses = entries.length;
  let totalMinutes = 0;
  entries.forEach((entry) => {
    totalMinutes += entry.period === 1 ? 45 : 40;
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalTeachingHoursStr = `${hours}h ${minutes}m`;

  const uniqueClassesSet = new Set<string>();
  entries.forEach((entry) => {
    const base = entry.className.split('-')[0].trim();
    if (base) uniqueClassesSet.add(base);
  });
  const uniqueClassesList = Array.from(uniqueClassesSet);
  const uniqueClasses = uniqueClassesList.length;

  const uniqueSubjectsSet = new Set<string>();
  entries.forEach((entry) => {
    const subjectStr = entry.subject.trim();
    const subjects = subjectStr.endsWith('-1 & 2')
      ? [
          `${subjectStr.slice(0, -'-1 & 2'.length)}-1`,
          `${subjectStr.slice(0, -'-1 & 2'.length)}-2`,
        ]
      : [subjectStr];
    subjects.forEach((s) => {
      uniqueSubjectsSet.add(`${s}-${entry.className.trim()}`);
    });
  });
  const uniqueSubjectsList = Array.from(uniqueSubjectsSet);
  const uniqueSubjects = uniqueSubjectsList.length;

  const daysCount = DAYS_CONFIG.length;
  const averageClasses =
    daysCount > 0 ? (totalClasses / daysCount).toFixed(1) : '0.0';

  const dayStatsList: DayStats[] = DAYS_CONFIG.map((cfg) => {
    const dayEntries = entries.filter((e) => e.day === cfg.day);
    const classCount = dayEntries.length;
    const periods = dayEntries.map((e) => e.period).sort((a, b) => a - b);
    const gaps =
      periods.length > 1
        ? periods[periods.length - 1] - periods[0] + 1 - periods.length
        : 0;
    return {
      day: cfg.day,
      dayName: cfg.name,
      shortName: cfg.shortName,
      bengaliName: cfg.bengaliName,
      classCount,
      gaps,
      periods,
    };
  });

  let busiestDayEntry: DayStats | null = null;
  let leastBusyDayEntry: DayStats | null = null;

  for (const st of dayStatsList) {
    if (
      !busiestDayEntry ||
      st.classCount > busiestDayEntry.classCount ||
      (st.classCount === busiestDayEntry.classCount && st.gaps < busiestDayEntry.gaps)
    ) {
      busiestDayEntry = st;
    }
    if (
      !leastBusyDayEntry ||
      st.classCount < leastBusyDayEntry.classCount ||
      (st.classCount === leastBusyDayEntry.classCount && st.gaps > leastBusyDayEntry.gaps)
    ) {
      leastBusyDayEntry = st;
    }
  }

  const busiestWeekdayStr =
    totalClasses > 0 && busiestDayEntry
      ? `${busiestDayEntry.dayName} (${busiestDayEntry.classCount} classes)`
      : 'N/A';

  const leastBusyWeekdayStr =
    totalClasses > 0 && leastBusyDayEntry
      ? `${leastBusyDayEntry.dayName} (${leastBusyDayEntry.classCount} classes)`
      : 'N/A';

  // Build grouped subject/class breakdown
  const groupedMap = new Map<
    string,
    { subject: string; className: string; daysRaw: string; period: number; count: number }
  >();
  for (const e of entries) {
    const key = `${e.period}_${e.className}_${e.subject}_${e.daysRaw}`;
    const existing = groupedMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groupedMap.set(key, {
        subject: e.subject,
        className: e.className,
        daysRaw: e.daysRaw,
        period: e.period,
        count: 1,
      });
    }
  }

  const breakdownRows: TeacherSubjectClassBreakdown[] = Array.from(groupedMap.values())
    .sort((a, b) => a.period - b.period || a.className.localeCompare(b.className))
    .map((g) => ({
      subject: g.subject,
      className: g.className,
      daysLabel: `${formatDaysExpressionLabel(g.daysRaw)} ${g.daysRaw}`,
      period: g.period,
      weeklyPeriods: g.count,
    }));

  return {
    teacherCode,
    teacherDisplayName: teacherDisplayName || teacherCode,
    totalClasses,
    totalMinutes,
    hours,
    minutes,
    totalTeachingHoursStr,
    uniqueClasses,
    uniqueClassesList,
    uniqueSubjects,
    uniqueSubjectsList,
    averageClasses,
    busiestWeekdayStr,
    leastBusyWeekdayStr,
    dayStatsList,
    breakdownRows,
  };
}

/**
 * Known directory of teacher codes in routine.json + Portal Faculty mapping
 */
export const ROUTINE_TEACHER_DIRECTORY: Record<string, string> = {
  'A.D.N.': 'Ananneya Debnath (A.D.N.)',
  'H.M.': 'Headmaster (H.M.)',
  'A.H.M.': 'Assistant Headmaster (A.H.M.)',
  'M.A.': 'M.A. (Senior Mathematics Teacher)',
  'S.B.': 'S.B. (Bangla & Religion Teacher)',
  'A.B.S.': 'A.B.S. (Bangla, Accounting & ICT)',
  'S.I.': 'Md. Shafiqul Islam (S.I.)',
  'M.C.': 'M.C. (Bangla, History & Religion)',
  'J.U.C.': 'J.U.C. (English, BGS & ICT)',
  'F.A.': 'Farhana Yeasmin / F.A. (English)',
  'N.Z.': 'Nasrin Akter / N.Z. (English, Geo & History)',
  'N.Y.': 'N.Y. (Math, Science & Agriculture)',
  'MOR.': 'MOR. (Bangla & BGS)',
  'H.P.': 'H.P. (English, BGS & Civics)',
  'F.H.': 'Pradip Kumar Nath / F.H. (Math, Biology & Science)',
  'Z.H.C': 'Z.H.C (English & Religion)',
  'M.U.': 'M.U. (Bangla, BGS, F&B & ICT)',
  'S.H.': 'Kamrul Hasan / S.H. (Math, Chemistry, Science & ICT)',
  'S.R.': 'S.R. (English, Civics & Agriculture)',
  'Md.R': 'Md.R (Religion, BGS, ICT & Agriculture)',
  'R.H': 'R.H (English & Mathematics)',
  'N.S.': 'N.S. (Assistant Teacher)',
};

export function normalizeTeacherCodeKey(code: string | undefined | null): string {
  if (!code) return '';
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Resolves a portal UserProfile to their matching teacher code in routine.json
 */
export function resolveRoutineTeacherCodeForUser(
  user: UserProfile | null | undefined,
  availableRoutineTeachers: string[]
): string {
  if (!user || availableRoutineTeachers.length === 0) return availableRoutineTeachers[0] || 'A.D.N.';

  const userKey = normalizeTeacherCodeKey(user.teacherCode);
  // 1. Direct normalized match (e.g. "ADN" === "A.D.N.", "SI" === "S.I.")
  const exactMatch = availableRoutineTeachers.find(
    (t) => normalizeTeacherCodeKey(t) === userKey
  );
  if (exactMatch) return exactMatch;

  // 2. Portal seed faculty aliases
  const aliasMap: Record<string, string[]> = {
    AD: ['A.D.N.'],
    ADN: ['A.D.N.'],
    MSI: ['S.I.', 'M.A.'],
    NA: ['N.Z.', 'N.Y.'],
    FY: ['F.A.'],
    PKN: ['F.H.', 'S.H.'],
    KH: ['S.H.', 'J.U.C.'],
  };
  const candidates = aliasMap[userKey] || [];
  for (const cand of candidates) {
    const found = availableRoutineTeachers.find(
      (t) => normalizeTeacherCodeKey(t) === normalizeTeacherCodeKey(cand)
    );
    if (found) return found;
  }

  // 3. Prefix / substring match on initials
  const partialMatch = availableRoutineTeachers.find((t) => {
    const tk = normalizeTeacherCodeKey(t);
    return tk.startsWith(userKey) || userKey.startsWith(tk);
  });
  if (partialMatch) return partialMatch;

  return availableRoutineTeachers[0] || 'A.D.N.';
}

/**
 * Maps a SchoolContext ClassSection (e.g., Class 9 — Section A, Class 6 — Ka (ক))
 * to its corresponding routine className (e.g., "IX-A", "VI-A")
 */
export function mapClassSectionToRoutineClassCode(
  cs: Pick<ClassSection, 'className' | 'section'>
): string {
  const romanMap: Record<string, string> = {
    'Class 6': 'VI',
    'Class 7': 'VII',
    'Class 8': 'VIII',
    'Class 9': 'IX',
    'Class 10': 'X',
  };
  const roman = romanMap[cs.className] || 'IX';
  const secUpper = cs.section.toUpperCase();
  if (secUpper.includes('KHA') || secUpper.includes('খ') || secUpper.includes('SECTION B') || secUpper === 'B') {
    return `${roman}-B`;
  }
  return `${roman}-A`;
}

export const ALL_ROUTINE_CLASS_CODES = [
  'VI-A',
  'VI-B',
  'VII-A',
  'VII-B',
  'VIII-A',
  'VIII-B',
  'IX-A',
  'IX-B',
  'X-A',
  'X-B',
];

/**
 * Returns the routine weekday number (2=Sun..6=Thu) for a given JS Date or defaults to 4 (Tuesday) on weekends.
 */
export function getRoutineDayForDate(date = new Date()): {
  dayNumber: number;
  isSchoolDay: boolean;
  dayConfig: RoutineDayConfig;
} {
  // JS getDay(): 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  const jsDay = date.getDay();
  if (jsDay >= 0 && jsDay <= 4) {
    const routineDay = jsDay + 2; // 0->2 (Sun), 1->3 (Mon), 2->4 (Tue), 3->5 (Wed), 4->6 (Thu)
    const cfg = DAYS_CONFIG.find((c) => c.day === routineDay) || DAYS_CONFIG[0];
    return { dayNumber: routineDay, isSchoolDay: true, dayConfig: cfg };
  }
  // On Friday/Saturday weekend, preview Sunday (day 2) and mark isSchoolDay = false
  return { dayNumber: 2, isSchoolDay: false, dayConfig: DAYS_CONFIG[0] };
}

/**
 * Parses the live Google Apps Script getFullDatabase payload:
 * { teachers: string[], masterGrid: string[][] }
 * into normalized RoutineRecord[] so live updates from the Apps Script URL
 * integrate directly into the Routine Viewer, Teacher Dashboard, and Teacher Statistics.
 */
export function parseLiveMasterGridToRoutineRecords(payload: {
  teachers?: string[];
  masterGrid?: string[][];
}): RoutineRecord[] {
  const teachers = Array.isArray(payload?.teachers) ? payload.teachers : [];
  const masterGrid = Array.isArray(payload?.masterGrid) ? payload.masterGrid : [];
  const nowIso = new Date().toISOString();
  const records: RoutineRecord[] = [];
  let counter = 1;

  for (let tIdx = 0; tIdx < teachers.length; tIdx++) {
    const teacherCode = String(teachers[tIdx] || '').trim();
    const row = masterGrid[tIdx];
    if (!teacherCode || !Array.isArray(row)) continue;

    // masterGrid columns: 0->P1, 1->P2, 2->P3, 3->P4, 4->Break, 5->P5, 6->P6, 7->P7
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      if (colIdx === 4) continue; // Tiffin Break column
      const period = colIdx < 4 ? colIdx + 1 : colIdx;
      const rawCell = String(row[colIdx] || '').trim();
      if (!rawCell || rawCell === '-') continue;

      // A cell can contain multiple segments separated by ",\n" or " / "
      // e.g. "H-Math X (2-3),\nH-Math IX (6)" or "P.Ed X-A (2) / X-B (4)"
      const lines = rawCell
        .split(/,\s*\n|\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const line of lines) {
        // Check if line has " / " sharing a subject prefix, e.g. "P.Ed X-A (2) / X-B (4)"
        const slashParts = line.split(/\s+\/\s+/);
        let sharedSubject = '';

        for (const part of slashParts) {
          // Match pattern: [Subject] [RomanClass(-Section)?] [(days)]?
          // e.g. "Ben-1 & 2  VII-A", "Eng-2 X-B (3-6)", "X-A (6)"
          const match = part
            .trim()
            .match(/^(?:(.+?)\s+)?((?:VI|VII|VIII|IX|X)(?:-[A-Z])?)(?:\s*(\([^)]+\)))?$/i);
          if (match) {
            const subjCandidate = (match[1] || '').trim();
            if (subjCandidate) sharedSubject = subjCandidate;
            const subject = subjCandidate || sharedSubject || 'Class';
            const className = match[2].toUpperCase();
            const days = match[3] ? match[3].replace(/\s+/g, '') : '(2-6)';

            records.push({
              id: `rt_live_${String(counter++).padStart(3, '0')}`,
              days,
              className,
              period,
              subject,
              teacher: teacherCode,
              updatedAt: nowIso,
            });
          }
        }
      }
    }
  }

  return records;
}
