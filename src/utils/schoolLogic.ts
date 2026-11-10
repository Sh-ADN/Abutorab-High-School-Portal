import {
  ClassSection,
  CsvParseError,
  NumeralLocale,
  ParsedStudentRow,
  Student,
  StudentGroup,
  SubjectAssignment,
  UserProfile,
  UserRole,
} from '../types/school';

export const SUPER_ADMIN_EMAIL = 'ananneyadebnath@gmail.com';

const EN_TO_BN_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Formats numbers or strings containing digits into English or Bengali numerals.
 */
export function formatNumeral(value: number | string | undefined | null, locale: NumeralLocale): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (locale === 'en') {
    return str.replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] ?? d);
  }
  return str.replace(/[0-9]/g, (d) => EN_TO_BN_DIGITS[d] ?? d);
}

/**
 * Normalizes a string containing Bengali or English digits into an English digit string.
 */
export function normalizeDigitsToEnglish(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] ?? d);
}

/**
 * Parses an integer from a string that may contain Bengali or English numerals.
 */
export function parseLocalizedInt(input: string | number): number {
  if (typeof input === 'number') return Math.floor(input);
  const normalized = normalizeDigitsToEnglish(String(input).trim());
  return parseInt(normalized, 10);
}

/**
 * Automatically assigns 'admin' to ananneyadebnath@gmail.com and 'teacher' to all others.
 */
export function resolveInitialUserRole(email: string | null | undefined): UserRole {
  if (!email) return 'teacher';
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'teacher';
}

/**
 * Derives short uppercase teacher initials (teacherCode) from a full name.
 * Examples:
 * - "Ananneya Debnath" -> "AD"
 * - "Md. Shafiqul Islam" -> "MSI"
 * - "Nasrin" -> "NAS"
 */
export function deriveTeacherCode(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'TCH';
  const cleaned = name
    .replace(/\b(mr|mrs|ms|dr|prof)\.?\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'TCH';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  const initials = parts
    .map((part) => part[0].toUpperCase())
    .join('')
    .slice(0, 6);
  return initials || 'TCH';
}

/**
 * Normalizes student academic group name.
 */
export function normalizeStudentGroup(rawGroup: string | undefined, className?: string): StudentGroup {
  if (!rawGroup || !rawGroup.trim()) {
    if (className === 'Class 9' || className === 'Class 10') {
      return 'Science';
    }
    return 'General';
  }
  const lower = rawGroup.trim().toLowerCase();
  if (lower.includes('sci') || lower === 'বিজ্ঞান') return 'Science';
  if (lower.includes('hum') || lower.includes('art') || lower === 'মানবিক') return 'Humanities';
  if (lower.includes('bus') || lower.includes('com') || lower === 'ব্যবসায় শিক্ষা') return 'Business Studies';
  return 'General';
}

/**
 * Parses CSV or TSV/pasted lines of student records:
 * Format: Roll, Name, Group, Optional Subject[, Guardian Phone]
 */
export function parseStudentRosterCsv(
  rawText: string,
  options?: { className?: string; existingRolls?: number[] }
): { valid: ParsedStudentRow[]; errors: CsvParseError[] } {
  const valid: ParsedStudentRow[] = [];
  const errors: CsvParseError[] = [];
  const seenRolls = new Set<number>(options?.existingRolls ?? []);

  if (!rawText || !rawText.trim()) {
    return { valid, errors };
  }

  const lines = rawText.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    // Split by comma, tab, or pipe
    const cols = trimmed
      .split(/\t|,|\|/)
      .map((c) => c.trim().replace(/^["']|["']$/g, ''));

    // Skip header row if first column is "Roll" or "রোল"
    const firstColLower = cols[0].toLowerCase();
    if (
      lineNumber === 1 &&
      (firstColLower === 'roll' ||
        firstColLower === 'roll no' ||
        firstColLower === 'roll number' ||
        firstColLower === 'রোল')
    ) {
      return;
    }

    if (cols.length < 2) {
      errors.push({
        line: lineNumber,
        reason: 'Expected at least Roll and Name separated by comma or tab.',
        raw: rawLine,
      });
      return;
    }

    const rollNum = parseLocalizedInt(cols[0]);
    if (Number.isNaN(rollNum) || rollNum < 1 || rollNum > 9999) {
      errors.push({
        line: lineNumber,
        reason: `Invalid Roll number "${cols[0]}" (must be 1–9999).`,
        raw: rawLine,
      });
      return;
    }

    if (seenRolls.has(rollNum)) {
      errors.push({
        line: lineNumber,
        reason: `Duplicate Roll number ${rollNum}.`,
        raw: rawLine,
      });
      return;
    }

    const studentName = cols[1].trim().slice(0, 120);
    if (!studentName) {
      errors.push({
        line: lineNumber,
        reason: 'Student Name cannot be empty.',
        raw: rawLine,
      });
      return;
    }

    const group = normalizeStudentGroup(cols[2], options?.className);
    const optionalSubject = (cols[3] ? cols[3].trim() : 'None').slice(0, 100) || 'None';
    const guardianPhone = (cols[4] ? normalizeDigitsToEnglish(cols[4].trim()) : '').slice(0, 32);

    seenRolls.add(rollNum);
    valid.push({
      roll: rollNum,
      name: studentName,
      group,
      optionalSubject,
      guardianPhone,
    });
  });

  return { valid, errors };
}

/**
 * Calculates total marks, NCTB letter grade, and GPA.
 */
export function calculateGradeAndGpa(
  writtenMarks: number,
  mcqMarks: number,
  practicalMarks: number,
  maxMarks = 100
): { totalMarks: number; letterGrade: string; gpa: number } {
  const w = Math.max(0, Number.isFinite(writtenMarks) ? writtenMarks : 0);
  const m = Math.max(0, Number.isFinite(mcqMarks) ? mcqMarks : 0);
  const p = Math.max(0, Number.isFinite(practicalMarks) ? practicalMarks : 0);
  const rawTotal = Math.round(w + m + p);
  const boundedTotal = Math.min(rawTotal, Math.max(1, maxMarks));
  const percentage = (boundedTotal / Math.max(1, maxMarks)) * 100;

  if (percentage >= 80) return { totalMarks: boundedTotal, letterGrade: 'A+', gpa: 5.0 };
  if (percentage >= 70) return { totalMarks: boundedTotal, letterGrade: 'A', gpa: 4.0 };
  if (percentage >= 60) return { totalMarks: boundedTotal, letterGrade: 'A-', gpa: 3.5 };
  if (percentage >= 50) return { totalMarks: boundedTotal, letterGrade: 'B', gpa: 3.0 };
  if (percentage >= 40) return { totalMarks: boundedTotal, letterGrade: 'C', gpa: 2.0 };
  if (percentage >= 33) return { totalMarks: boundedTotal, letterGrade: 'D', gpa: 1.0 };
  return { totalMarks: boundedTotal, letterGrade: 'F', gpa: 0.0 };
}

/**
 * Checks whether a user has permission to manage Attendance & Student Roster for a ClassSection.
 */
export function canManageClassRosterAndAttendance(
  user: UserProfile | null | undefined,
  classSection: ClassSection | null | undefined
): boolean {
  if (!user || user.status !== 'active' || !classSection) return false;
  if (user.role === 'admin') return true;
  return classSection.classTeacherUid === user.uid;
}

/**
 * Checks whether a user has permission to enter Exam Marks for a SubjectAssignment.
 */
export function canManageSubjectMarks(
  user: UserProfile | null | undefined,
  assignment: SubjectAssignment | null | undefined
): boolean {
  if (!user || user.status !== 'active' || !assignment) return false;
  if (user.role === 'admin') return true;
  return assignment.teacherUid === user.uid;
}

/**
 * Sanitizes a safe Firestore ID matching ^[a-zA-Z0-9_\-]+$ and maxLength.
 */
export function sanitizeFirestoreId(rawId: string, maxLength = 64): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLength);
  return cleaned || `id_${Date.now()}`;
}

/**
 * Enforces blueprint constraints on a Student object prior to Firestore write.
 */
export function sanitizeStudentPayload(student: Student): Student {
  return {
    id: sanitizeFirestoreId(student.id, 64),
    academicYearId: sanitizeFirestoreId(student.academicYearId, 64),
    classSectionId: sanitizeFirestoreId(student.classSectionId, 64),
    className: String(student.className || 'Class 6').slice(0, 32),
    section: String(student.section || 'A').slice(0, 32),
    roll: Math.min(9999, Math.max(1, Math.floor(Number(student.roll) || 1))),
    name: String(student.name || 'Unnamed Student').trim().slice(0, 120),
    group: normalizeStudentGroup(student.group, student.className),
    optionalSubject: String(student.optionalSubject || 'None').trim().slice(0, 100),
    guardianPhone: String(student.guardianPhone || '').trim().slice(0, 32),
    status:
      student.status === 'transferred' || student.status === 'inactive' ? student.status : 'active',
    createdAt: String(student.createdAt || new Date().toISOString()).slice(0, 40),
  };
}
