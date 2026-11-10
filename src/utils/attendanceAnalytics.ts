import { AttendanceRecord, ClassSection, Student } from '../types/school';

export type StatSortOption =
  | 'ROLL'
  | 'NAME'
  | 'LOWEST_ATTENDANCE'
  | 'HIGHEST_FINE'
  | 'CONSECUTIVE_ABSENCES';

export type SummaryViewMode = 'MONTHLY_FINE_SHEET' | 'OVERVIEW_CARDS';

export type StudentLogFilter = 'ABSENT_ONLY' | 'PRESENT_ONLY' | 'ALL_DATES';

export interface StudentAttendanceLogEntry {
  date: string;
  roll: number;
  studentId: string;
  studentName: string;
  status: 'P' | 'A';
}

export interface StudentAttendanceStat {
  studentId: string;
  roll: number;
  name: string;
  group: string;
  presentCount: number;
  absentCount: number;
  dueFine: number;
  percentage: number;
  totalClasses: number;
  maxConsecutiveAbsences: number;
  currentConsecutiveAbsences: number;
  monthlyAbsent: Record<string, number>;
  monthlyPresent: Record<string, number>;
  monthlyPercentage: Record<string, number>;
  statusText: string;
  isLowAttendance: boolean;
  hasConsecutiveAlert: boolean;
  records: StudentAttendanceLogEntry[];
}

export interface ClassAttendanceAnalytics {
  activeMonths: string[];
  schoolDaysByMonth: Record<string, number>;
  totalSchoolDaysCounted: number;
  studentStats: StudentAttendanceStat[];
  totalStudents: number;
  totalClassPresent: number;
  totalClassAbsent: number;
  totalClassDueFine: number;
  classAvgPct: number;
  consecutiveAbsenceCount: number;
  lowAttendanceCount: number;
  monthlyClassAbsentTotals: Record<string, number>;
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Checks if a YYYY-MM-DD date falls on a Friday or Saturday (Bangladesh school weekend),
 * matching SummaryDashboardScreen.kt.
 */
export function isWeekendDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return false;
  const dow = dt.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
  return dow === 5 || dow === 6;
}

/**
 * Formats "2026-11" -> "Nov"
 */
export function formatShortMonth(yearMonth: string): string {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const monthIdx = Number(yearMonth.slice(5, 7)) - 1;
  return SHORT_MONTH_NAMES[monthIdx] || yearMonth;
}

/**
 * Formats "2026-11-10" -> "10 Nov 2026"
 */
export function formatCutoffDisplay(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthName = SHORT_MONTH_NAMES[m - 1] || '';
  return `${String(d).padStart(2, '0')} ${monthName} ${y}`;
}

/**
 * Formats "2026-11-10" -> "Tue, 10 Nov 2026"
 */
export function formatDayAndDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayName = SHORT_DAY_NAMES[dt.getUTCDay()] || '';
  const monthName = SHORT_MONTH_NAMES[m - 1] || '';
  return `${dayName}, ${String(d).padStart(2, '0')} ${monthName} ${y}`;
}

/**
 * Parses comma-separated absentRolls string into a Set of roll numbers.
 */
export function parseAbsentRollsSet(absentRolls: string | undefined | null): Set<number> {
  const set = new Set<number>();
  if (!absentRolls || !absentRolls.trim()) return set;
  absentRolls
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0)
    .forEach((n) => set.add(n));
  return set;
}

/**
 * Serializes a Set or array of absent roll numbers into a sorted comma-separated string.
 */
export function serializeAbsentRolls(rolls: Iterable<number>): string {
  return Array.from(new Set(rolls))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
    .join(', ');
}

/**
 * Computes full class & student attendance analytics matching SummaryDashboardScreen.kt.
 */
export function computeClassAttendanceAnalytics(params: {
  students: Student[];
  classRecords: AttendanceRecord[];
  cutoffDate: string;
  holidays?: string[];
  finePerAbsentDay?: number;
}): ClassAttendanceAnalytics {
  const {
    students,
    classRecords,
    cutoffDate,
    holidays = [],
    finePerAbsentDay = 5,
  } = params;

  const holidaySet = new Set(holidays);
  const sortedStudents = [...students].sort((a, b) => a.roll - b.roll);

  // Deduplicate records by date and filter up to cutoffDate, excluding weekends and holidays
  const recordByDate = new Map<string, AttendanceRecord>();
  classRecords.forEach((rec) => {
    const d = rec.date;
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(d) &&
      d <= cutoffDate &&
      !holidaySet.has(d) &&
      !isWeekendDate(d)
    ) {
      recordByDate.set(d, rec);
    }
  });

  const validDates = Array.from(recordByDate.keys()).sort();

  const activeMonths = Array.from(
    new Set(validDates.map((d) => d.slice(0, 7)))
  ).sort();

  const schoolDaysByMonth: Record<string, number> = {};
  activeMonths.forEach((ym) => {
    schoolDaysByMonth[ym] = validDates.filter((d) => d.startsWith(ym)).length;
  });

  const totalSchoolDaysCounted = validDates.length;

  // Pre-parse absent roll sets per valid date
  const absentSetByDate = new Map<string, Set<number>>();
  validDates.forEach((d) => {
    const rec = recordByDate.get(d);
    absentSetByDate.set(d, parseAbsentRollsSet(rec?.absentRolls));
  });

  const studentStats: StudentAttendanceStat[] = sortedStudents.map((stu) => {
    const records: StudentAttendanceLogEntry[] = validDates.map((d) => {
      const isAbsent = absentSetByDate.get(d)?.has(stu.roll) ?? false;
      return {
        date: d,
        roll: stu.roll,
        studentId: stu.id,
        studentName: stu.name,
        status: isAbsent ? 'A' : 'P',
      };
    });

    const presentCount = records.filter((r) => r.status === 'P').length;
    const absentCount = records.filter((r) => r.status === 'A').length;
    const totalClasses = presentCount + absentCount;
    const dueFine = absentCount * Math.max(0, finePerAbsentDay);
    const percentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

    let maxConsecutiveAbsences = 0;
    let run = 0;
    for (const r of records) {
      if (r.status === 'A') {
        run += 1;
        if (run > maxConsecutiveAbsences) {
          maxConsecutiveAbsences = run;
        }
      } else {
        run = 0;
      }
    }
    const currentConsecutiveAbsences = run;

    const monthlyAbsent: Record<string, number> = {};
    const monthlyPresent: Record<string, number> = {};
    const monthlyPercentage: Record<string, number> = {};

    activeMonths.forEach((ym) => {
      const mRecs = records.filter((r) => r.date.startsWith(ym));
      const mAbs = mRecs.filter((r) => r.status === 'A').length;
      const mPres = mRecs.filter((r) => r.status === 'P').length;
      const mTot = mAbs + mPres;
      monthlyAbsent[ym] = mAbs;
      monthlyPresent[ym] = mPres;
      monthlyPercentage[ym] = mTot > 0 ? (mPres / mTot) * 100 : 0;
    });

    const isLowAttendance = totalClasses > 0 && percentage < 75;
    const hasConsecutiveAlert = maxConsecutiveAbsences >= 2;

    let statusText = 'Regular';
    if (stu.status !== 'active') {
      statusText = 'Inactive';
    } else if (totalClasses === 0) {
      statusText = 'No classes logged';
    } else if (hasConsecutiveAlert && isLowAttendance) {
      statusText = `Low (${percentage.toFixed(0)}%) · ${maxConsecutiveAbsences}d Streak`;
    } else if (hasConsecutiveAlert) {
      statusText = `${maxConsecutiveAbsences}d Absent Streak`;
    } else if (isLowAttendance) {
      statusText = `Low Attendance (<75%)`;
    }

    return {
      studentId: stu.id,
      roll: stu.roll,
      name: stu.name,
      group: stu.group,
      presentCount,
      absentCount,
      dueFine,
      percentage,
      totalClasses,
      maxConsecutiveAbsences,
      currentConsecutiveAbsences,
      monthlyAbsent,
      monthlyPresent,
      monthlyPercentage,
      statusText,
      isLowAttendance,
      hasConsecutiveAlert,
      records,
    };
  });

  const totalStudents = studentStats.length;
  const totalClassPresent = studentStats.reduce((acc, s) => acc + s.presentCount, 0);
  const totalClassAbsent = studentStats.reduce((acc, s) => acc + s.absentCount, 0);
  const totalClassDueFine = studentStats.reduce((acc, s) => acc + s.dueFine, 0);
  const totalClassRecords = totalClassPresent + totalClassAbsent;
  const classAvgPct =
    totalClassRecords > 0 ? (totalClassPresent / totalClassRecords) * 100 : 0;
  const consecutiveAbsenceCount = studentStats.filter((s) => s.hasConsecutiveAlert).length;
  const lowAttendanceCount = studentStats.filter((s) => s.isLowAttendance).length;

  const monthlyClassAbsentTotals: Record<string, number> = {};
  activeMonths.forEach((ym) => {
    monthlyClassAbsentTotals[ym] = studentStats.reduce(
      (acc, s) => acc + (s.monthlyAbsent[ym] || 0),
      0
    );
  });

  return {
    activeMonths,
    schoolDaysByMonth,
    totalSchoolDaysCounted,
    studentStats,
    totalStudents,
    totalClassPresent,
    totalClassAbsent,
    totalClassDueFine,
    classAvgPct,
    consecutiveAbsenceCount,
    lowAttendanceCount,
    monthlyClassAbsentTotals,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates the analytical CSV export matching SummaryDashboardScreen.kt.
 */
export function generateAttendanceReportCsv(params: {
  classSection: ClassSection;
  academicYearLabel: string;
  cutoffDate: string;
  finePerAbsentDay: number;
  analytics: ClassAttendanceAnalytics;
}): string {
  const { classSection, academicYearLabel, cutoffDate, finePerAbsentDay, analytics } = params;
  const { activeMonths, schoolDaysByMonth, totalSchoolDaysCounted, studentStats } = analytics;

  const lines: string[] = [];
  const formattedCutoff = formatCutoffDisplay(cutoffDate);
  const titleBanner = `Abu Torab High School — ${classSection.className} (${classSection.section}) — ${academicYearLabel} — Absent days & due fine (till ${formattedCutoff})`;

  // Row 1: Title Banner
  lines.push(escapeCsvCell(titleBanner));

  // Row 2: Fine per absent day
  lines.push(
    `,Fine per absent day (৳),${finePerAbsentDay},← change here to recalculate every due`
  );

  // Row 3: School days counted
  const row3 = [
    '',
    'School days counted',
    ...activeMonths.map((ym) => String(schoolDaysByMonth[ym] || 0)),
    String(totalSchoolDaysCounted),
    String(totalSchoolDaysCounted),
    '',
    '',
    '',
  ];
  lines.push(row3.join(','));

  // Row 4: Column Headers
  const headers = [
    'Roll',
    'Name',
    ...activeMonths.map((ym) => escapeCsvCell(formatShortMonth(ym))),
    'Total Present',
    'Total Absent',
    'Attendance %',
    'Due Fine (৳)',
    'Status',
  ];
  lines.push(headers.join(','));

  // Student Rows sorted by Roll
  const sortedForExport = [...studentStats].sort((a, b) => a.roll - b.roll);
  sortedForExport.forEach((st) => {
    const row = [
      escapeCsvCell(st.roll),
      escapeCsvCell(st.name),
      ...activeMonths.map((ym) => String(st.monthlyAbsent[ym] || 0)),
      String(st.presentCount),
      String(st.absentCount),
      `${st.percentage.toFixed(1)}%`,
      String(st.dueFine),
      escapeCsvCell(st.statusText),
    ];
    lines.push(row.join(','));
  });

  // Footer Row: TOTAL
  const sumPresent = sortedForExport.reduce((acc, s) => acc + s.presentCount, 0);
  const sumAbsent = sortedForExport.reduce((acc, s) => acc + s.absentCount, 0);
  const sumFine = sortedForExport.reduce((acc, s) => acc + s.dueFine, 0);
  const avgPct =
    sumPresent + sumAbsent > 0
      ? `${((sumPresent / (sumPresent + sumAbsent)) * 100).toFixed(1)}%`
      : '0.0%';

  const footerRow = [
    '',
    'TOTAL',
    ...activeMonths.map((ym) =>
      String(sortedForExport.reduce((acc, s) => acc + (s.monthlyAbsent[ym] || 0), 0))
    ),
    String(sumPresent),
    String(sumAbsent),
    avgPct,
    String(sumFine),
    '',
  ];
  lines.push(footerRow.join(','));

  return lines.join('\n');
}
