import {
  ClassSection,
  CsvParseError,
  NumeralLocale,
  ParsedStudentRow,
  SectionResultApprovalStatus,
  Student,
  StudentGroup,
  SubjectAssignment,
  SubjectSubmissionStatus,
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
 * Dot-insensitive, space-insensitive, hyphen-insensitive routine abbreviation normalizer.
 * Examples:
 * - "A.D.N." -> "ADN"
 * - "J.U.C." -> "JUC"
 * - "S.H."   -> "SH"
 * - "R.D."   -> "RD"
 * - "Z.H.C"  -> "ZHC"
 */
export function normalizeAbbr(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[.\s\-_]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

/**
 * Normalizes a teacherCode for comparison (alias of normalizeAbbr).
 */
export function normalizeTeacherCodeCompareKey(code: string | null | undefined): string {
  return normalizeAbbr(code);
}

/**
 * Returns the normalized routine abbreviation for a UserProfile, checking routineAbbreviation first, then teacherCode.
 */
export function getUserNormalizedAbbr(user: UserProfile | null | undefined): string {
  if (!user) return '';
  return normalizeAbbr(user.routineAbbreviation || user.teacherCode);
}

/**
 * Checks if a user is the Super Admin (Exclusively Ananneya Debnath / ADN / ananneyadebnath@gmail.com).
 */
export function isSuperAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  if (email === SUPER_ADMIN_EMAIL) return true;
  if (user.role === 'super_admin') return true;
  const abbr = getUserNormalizedAbbr(user);
  return abbr === 'ADN' && user.role === 'admin';
}

/**
 * Checks if a user is the Main Admin (Computer Lab Operator SH or role === 'main_admin').
 */
export function isMainAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user || isSuperAdminUser(user)) return false;
  if (user.role === 'main_admin') return true;
  const abbr = getUserNormalizedAbbr(user);
  return abbr === 'SH' && user.role === 'admin';
}

/**
 * Checks if a user has full administrative privileges (Super Admin, Main Admin, or legacy 'admin').
 */
export function isFullAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user || user.status === 'inactive') return false;
  return (
    isSuperAdminUser(user) ||
    isMainAdminUser(user) ||
    user.role === 'admin'
  );
}

/**
 * Checks if a user is Head Teacher or Assistant Head Teacher.
 */
export function isHeadOrAsstHeadUser(user: UserProfile | null | undefined): boolean {
  if (!user || user.status === 'inactive') return false;
  if (user.role === 'head_teacher' || user.role === 'asst_head_teacher') return true;
  const abbr = getUserNormalizedAbbr(user);
  return abbr === 'HM' || abbr === 'RD';
}

/**
 * Checks if a user has privileged oversight (super_admin, main_admin, head_teacher, asst_head_teacher, or admin).
 * These roles can view all sections' attendance/marks, unlock/edit submitted marks, and approve section results.
 */
export function isPrivilegedReviewerUser(user: UserProfile | null | undefined): boolean {
  if (!user || user.status === 'inactive') return false;
  return isFullAdminUser(user) || isHeadOrAsstHeadUser(user);
}

/**
 * Enforces the Admin Hierarchy rule:
 * - super_admin (ADN) can edit/delete/assign anyone, including main_admin (SH).
 * - main_admin (SH) has all admin powers EXCEPT main_admin CANNOT edit, demote, or delete super_admin (ADN).
 */
export function canEditTargetTeacherProfile(
  actor: UserProfile | null | undefined,
  target: UserProfile | null | undefined
): boolean {
  if (!actor || !target || actor.status === 'inactive') return false;
  if (isSuperAdminUser(actor)) return true;
  if (isFullAdminUser(actor)) {
    return !isSuperAdminUser(target);
  }
  return false;
}

/**
 * Automatically assigns 'super_admin' to ananneyadebnath@gmail.com and 'teacher' to all others.
 */
export function resolveInitialUserRole(email: string | null | undefined): UserRole {
  if (!email) return 'teacher';
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL ? 'super_admin' : 'teacher';
}

/**
 * Derives short uppercase teacher initials (teacherCode) from a full name.
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

    const cols = trimmed
      .split(/\t|,|\|/)
      .map((c) => c.trim().replace(/^["']|["']$/g, ''));

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
 * Checks whether a user is the directly assigned Class Teacher of a ClassSection.
 */
export function isAssignedClassTeacherForSection(
  user: UserProfile | null | undefined,
  classSection: ClassSection | null | undefined
): boolean {
  if (!user || user.status !== 'active' || !classSection) return false;
  if (classSection.classTeacherUid && classSection.classTeacherUid === user.uid) return true;
  const userCode = getUserNormalizedAbbr(user);
  const csCode = normalizeAbbr(classSection.classTeacherCode);
  return Boolean(userCode && csCode && userCode === csCode);
}

/**
 * Checks whether a user has permission to view, take, and submit Attendance & Student Roster for a ClassSection.
 * Rule 4: Only the assigned Class Teacher of a specific class-section (plus super_admin, main_admin,
 * head_teacher, and asst_head_teacher) can view, take, and submit attendance for that section.
 */
export function canManageClassRosterAndAttendance(
  user: UserProfile | null | undefined,
  classSection: ClassSection | null | undefined
): boolean {
  if (!user || user.status !== 'active' || !classSection) return false;
  if (isPrivilegedReviewerUser(user)) return true;
  return isAssignedClassTeacherForSection(user, classSection);
}

/**
 * Returns the submission status ('draft' | 'submitted') of a SubjectAssignment for a given termId.
 */
export function getSubjectSubmissionStatus(
  assignment: SubjectAssignment | null | undefined,
  termId?: string | null
): SubjectSubmissionStatus {
  if (!assignment || !termId) return 'draft';
  return assignment.statusByTerm?.[termId] === 'submitted' ? 'submitted' : 'draft';
}

/**
 * Returns the section approval status ('draft' | 'submitted_for_approval' | 'approved') for a ClassSection & termId.
 */
export function getSectionApprovalStatus(
  classSection: ClassSection | null | undefined,
  termId?: string | null
): SectionResultApprovalStatus {
  if (!classSection || !termId) return 'draft';
  return classSection.sectionResultStatusByTerm?.[termId] || 'draft';
}

/**
 * Checks whether a user is the assigned Subject Teacher for a SubjectAssignment.
 */
export function isAssignedSubjectTeacher(
  user: UserProfile | null | undefined,
  assignment: SubjectAssignment | null | undefined
): boolean {
  if (!user || user.status !== 'active' || !assignment) return false;
  if (assignment.teacherUid && assignment.teacherUid === user.uid) return true;
  const userCode = getUserNormalizedAbbr(user);
  const asgCode = normalizeAbbr(assignment.teacherCode);
  return Boolean(userCode && asgCode && userCode === asgCode);
}

/**
 * Checks whether a user has permission to enter/edit Exam Marks for a SubjectAssignment.
 * Strict Lock Rule:
 * - While status is 'draft', the assigned Subject Teacher (and privileged reviewers) can input/edit marks.
 * - Once a Subject Teacher submits a subject's marks (status: 'submitted'), NO ONE except
 *   super_admin, main_admin, head_teacher, and asst_head_teacher can edit or unlock those marks
 *   (neither the Subject Teacher nor the Class Teacher can edit them after submission).
 */
export function canManageSubjectMarks(
  user: UserProfile | null | undefined,
  assignment: SubjectAssignment | null | undefined,
  termId?: string | null
): boolean {
  if (!user || user.status !== 'active' || !assignment) return false;
  if (isPrivilegedReviewerUser(user)) return true;

  const isSubjectTch = isAssignedSubjectTeacher(user, assignment);
  if (!isSubjectTch) return false;

  if (termId && getSubjectSubmissionStatus(assignment, termId) === 'submitted') {
    return false;
  }
  return true;
}

/**
 * Returns true if the email is a seeded placeholder (@automatapro.com, @aths.edu.bd, or @aths.gmail.com) or empty.
 */
export function isPlaceholderTeacherEmail(email: string | null | undefined): boolean {
  if (!email || !email.trim()) return true;
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith('@automatapro.com') ||
    lower.endsWith('@aths.edu.bd') ||
    lower.endsWith('@aths.gmail.com')
  );
}

/**
 * Finds an existing teacher profile by exact UID or case-insensitive email match (ignoring empty emails).
 */
export function findMatchingTeacherProfileByEmailOrUid(
  users: UserProfile[],
  email: string | null | undefined,
  uid?: string | null
): UserProfile | null {
  if (uid) {
    const byUid = users.find((u) => u.uid === uid);
    if (byUid) return byUid;
  }
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return null;
  return users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail) || null;
}

/**
 * Links a signed-in Google user's UID (targetUid) to an existing seeded teacher profile (sourceUid),
 * preserving teacherCode, role, Class Teacher sections, and Subject Assignments.
 */
export function mergeAndLinkTeacherProfileUid(params: {
  sourceUid: string;
  targetUid: string;
  targetEmail?: string;
  targetPhotoURL?: string;
  users: UserProfile[];
  classSections: ClassSection[];
  subjectAssignments: SubjectAssignment[];
  nowIso?: string;
}): {
  linkedProfile: UserProfile | null;
  updatedUsers: UserProfile[];
  updatedClassSections: ClassSection[];
  updatedSubjectAssignments: SubjectAssignment[];
} {
  const {
    sourceUid,
    targetUid,
    targetEmail,
    targetPhotoURL,
    users,
    classSections,
    subjectAssignments,
    nowIso = new Date().toISOString(),
  } = params;

  const sourceProfile = users.find((u) => u.uid === sourceUid);
  const targetProfile = users.find((u) => u.uid === targetUid);

  if (!sourceProfile) {
    return {
      linkedProfile: targetProfile || null,
      updatedUsers: users,
      updatedClassSections: classSections,
      updatedSubjectAssignments: subjectAssignments,
    };
  }

  const resolvedEmail = (
    targetEmail ||
    (targetProfile && !isPlaceholderTeacherEmail(targetProfile.email)
      ? targetProfile.email
      : sourceProfile.email)
  )
    .trim()
    .toLowerCase()
    .slice(0, 160);

  const isSuperAdmin = resolvedEmail === SUPER_ADMIN_EMAIL;
  const resolvedRole: UserRole = isSuperAdmin
    ? 'super_admin'
    : sourceProfile.role || targetProfile?.role || 'teacher';

  const linkedProfile: UserProfile = {
    ...sourceProfile,
    uid: targetUid,
    name: sourceProfile.name.slice(0, 120),
    email: resolvedEmail,
    photoURL: (targetPhotoURL || targetProfile?.photoURL || sourceProfile.photoURL || '').slice(
      0,
      500
    ),
    role: resolvedRole,
    teacherCode: sourceProfile.teacherCode.trim().toUpperCase().slice(0, 12) || 'TCH',
    status: sourceProfile.status,
    designation: sourceProfile.designation.slice(0, 80),
    createdAt: sourceProfile.createdAt || targetProfile?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  const updatedUsers: UserProfile[] = [];
  let inserted = false;
  for (const u of users) {
    if (u.uid === sourceUid || u.uid === targetUid) {
      if (!inserted) {
        updatedUsers.push(linkedProfile);
        inserted = true;
      }
    } else {
      updatedUsers.push(u);
    }
  }
  if (!inserted) {
    updatedUsers.push(linkedProfile);
  }

  const sourceCodeKey = getUserNormalizedAbbr(sourceProfile);

  const updatedClassSections = classSections.map((cs) => {
    const csCodeKey = normalizeAbbr(cs.classTeacherCode);
    if (
      cs.classTeacherUid === sourceUid ||
      (sourceCodeKey && csCodeKey === sourceCodeKey)
    ) {
      return {
        ...cs,
        classTeacherUid: targetUid,
        classTeacherName: linkedProfile.name,
        classTeacherCode: linkedProfile.teacherCode,
      };
    }
    return cs;
  });

  const updatedSubjectAssignments = subjectAssignments.map((asg) => {
    const asgCodeKey = normalizeAbbr(asg.teacherCode);
    if (
      asg.teacherUid === sourceUid ||
      (sourceCodeKey && asgCodeKey === sourceCodeKey)
    ) {
      return {
        ...asg,
        teacherUid: targetUid,
        teacherName: linkedProfile.name,
        teacherCode: linkedProfile.teacherCode,
      };
    }
    return asg;
  });

  return {
    linkedProfile,
    updatedUsers,
    updatedClassSections,
    updatedSubjectAssignments,
  };
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
    className: student.className || 'Class 6',
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

/**
 * Determines institutional seniority tier for academic faculty.
 * 1 = Head Teacher (প্রধান শিক্ষক)
 * 2 = Assistant Head Teacher (সহকারী প্রধান শিক্ষক)
 * 3 = Senior Teachers (সিনিয়র শিক্ষক)
 * 4 = Assistant Teachers (সহকারী শিক্ষক) / General Faculty
 */
export function getTeacherHierarchyTier(user: Partial<UserProfile>): number {
  const role = user.role;
  const desBn = user.designation || '';
  const desEn = desBn.toLowerCase();

  // Tier 1: Head Teacher
  if (
    role === 'head_teacher' ||
    (desBn.includes('প্রধান শিক্ষক') && !desBn.includes('সহকারী প্রধান শিক্ষক')) ||
    desEn.includes('headmaster') ||
    desEn.includes('head teacher') ||
    desEn.includes('principal')
  ) {
    return 1;
  }

  // Tier 2: Assistant Head Teacher
  if (
    role === 'asst_head_teacher' ||
    desBn.includes('সহকারী প্রধান শিক্ষক') ||
    desEn.includes('asst. head') ||
    desEn.includes('assistant head') ||
    desEn.includes('vice principal')
  ) {
    return 2;
  }

  // Tier 3: Senior Teachers
  if (
    user.isSenior ||
    desBn.includes('সিনিয়র') ||
    desEn.includes('senior')
  ) {
    return 3;
  }

  // Tier 4: Assistant / Junior Teachers (including newbie teachers)
  return 4;
}

/**
 * Sorts teachers according to institutional hierarchy (Head Teacher > Asst Head > Senior Teachers > Assistant Teachers),
 * then by official serial number, joining date, and Bengali name.
 */
export function sortTeachersByHierarchy<T extends Partial<UserProfile>>(teachers: T[]): T[] {
  return [...teachers].sort((a, b) => {
    const tierA = getTeacherHierarchyTier(a);
    const tierB = getTeacherHierarchyTier(b);
    if (tierA !== tierB) {
      return tierA - tierB;
    }
    const serialA = typeof a.serial === 'number' && !Number.isNaN(a.serial) ? a.serial : 999;
    const serialB = typeof b.serial === 'number' && !Number.isNaN(b.serial) ? b.serial : 999;
    if (serialA !== serialB) {
      return serialA - serialB;
    }
    if (a.joiningDate && b.joiningDate && a.joiningDate !== b.joiningDate) {
      return a.joiningDate.localeCompare(b.joiningDate);
    }
    const nameA = a.nameBn || a.name || '';
    const nameB = b.nameBn || b.name || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sorts non-teaching staff by serial number, then joining date, then name.
 */
export function sortStaffByHierarchy<T extends Partial<UserProfile>>(staffList: T[]): T[] {
  return [...staffList].sort((a, b) => {
    const serialA = typeof a.serial === 'number' && !Number.isNaN(a.serial) ? a.serial : 999;
    const serialB = typeof b.serial === 'number' && !Number.isNaN(b.serial) ? b.serial : 999;
    if (serialA !== serialB) {
      return serialA - serialB;
    }
    if (a.joiningDate && b.joiningDate && a.joiningDate !== b.joiningDate) {
      return a.joiningDate.localeCompare(b.joiningDate);
    }
    const nameA = a.nameBn || a.name || '';
    const nameB = b.nameBn || b.name || '';
    return nameA.localeCompare(nameB);
  });
}

