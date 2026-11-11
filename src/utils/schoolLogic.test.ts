import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGradeAndGpa,
  canEditTargetTeacherProfile,
  canManageClassRosterAndAttendance,
  canManageSubjectMarks,
  deriveTeacherCode,
  findMatchingTeacherProfileByEmailOrUid,
  formatNumeral,
  isFullAdminUser,
  isMainAdminUser,
  isPlaceholderTeacherEmail,
  isPrivilegedReviewerUser,
  isSuperAdminUser,
  mergeAndLinkTeacherProfileUid,
  normalizeAbbr,
  parseLocalizedInt,
  parseStudentRosterCsv,
  getTeacherHierarchyTier,
  resolveInitialUserRole,
  sanitizeStudentPayload,
  sortTeachersByHierarchy,
} from './schoolLogic';
import { ClassSection, SubjectAssignment, UserProfile } from '../types/school';

test('normalizeAbbr strips dots, spaces, and hyphens and converts to uppercase', () => {
  assert.equal(normalizeAbbr('A.D.N.'), 'ADN');
  assert.equal(normalizeAbbr('J.U.C.'), 'JUC');
  assert.equal(normalizeAbbr('S.H.'), 'SH');
  assert.equal(normalizeAbbr(' a. d. n - '), 'ADN');
  assert.equal(normalizeAbbr(''), '');
});

test('resolveInitialUserRole assigns super_admin to ananneyadebnath@gmail.com and teacher to others', () => {
  assert.equal(resolveInitialUserRole('ananneyadebnath@gmail.com'), 'super_admin');
  assert.equal(resolveInitialUserRole('  AnanneyaDebnath@gmail.com '), 'super_admin');
  assert.equal(resolveInitialUserRole('shafiqul.aths@gmail.com'), 'teacher');
  assert.equal(resolveInitialUserRole(''), 'teacher');
  assert.equal(resolveInitialUserRole(null), 'teacher');
});

test('deriveTeacherCode extracts short uppercase initials accurately', () => {
  assert.equal(deriveTeacherCode('Ananneya Debnath'), 'AD');
  assert.equal(deriveTeacherCode('Md. Shafiqul Islam'), 'MSI');
  assert.equal(deriveTeacherCode('Dr. Pradip Kumar Nath'), 'PKN');
  assert.equal(deriveTeacherCode('Nasrin'), 'NAS');
  assert.equal(deriveTeacherCode(''), 'TCH');
});

test('formatNumeral and parseLocalizedInt convert between English and Bengali numerals', () => {
  assert.equal(formatNumeral(2026, 'bn'), '২০২৬');
  assert.equal(formatNumeral('Roll 104', 'bn'), 'Roll ১০৪');
  assert.equal(formatNumeral('২০২৬', 'en'), '2026');
  assert.equal(parseLocalizedInt('১২'), 12);
  assert.equal(parseLocalizedInt('45'), 45);
});

test('parseStudentRosterCsv parses valid rows, supports Bengali digits, and reports errors', () => {
  const sampleCsv = [
    'Roll, Name, Group, Optional Subject, Guardian Phone',
    '1, Tanvir Ahmed, Science, Higher Mathematics, 01811223344',
    '২, Nusrat Jahan, Humanities, Agriculture Studies, ০১৭১১২২৩৩৪৪',
    '1, Duplicate Roll Student, Science, Biology',
    'invalid_roll, Missing Roll, General, None',
  ].join('\n');

  const result = parseStudentRosterCsv(sampleCsv, { className: 'Class 9' });
  assert.equal(result.valid.length, 2);
  assert.equal(result.valid[0].roll, 1);
  assert.equal(result.valid[0].name, 'Tanvir Ahmed');
  assert.equal(result.valid[0].group, 'Science');
  assert.equal(result.valid[0].optionalSubject, 'Higher Mathematics');

  assert.equal(result.valid[1].roll, 2);
  assert.equal(result.valid[1].name, 'Nusrat Jahan');
  assert.equal(result.valid[1].group, 'Humanities');
  assert.equal(result.valid[1].guardianPhone, '01711223344');

  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].reason, /Duplicate Roll/);
  assert.match(result.errors[1].reason, /Invalid Roll/);
});

test('calculateGradeAndGpa follows Bangladesh NCTB grading scale', () => {
  assert.deepEqual(calculateGradeAndGpa(55, 25, 5, 100), {
    totalMarks: 85,
    letterGrade: 'A+',
    gpa: 5.0,
  });
  assert.deepEqual(calculateGradeAndGpa(50, 22, 0, 100), {
    totalMarks: 72,
    letterGrade: 'A',
    gpa: 4.0,
  });
  assert.deepEqual(calculateGradeAndGpa(20, 10, 0, 100), {
    totalMarks: 30,
    letterGrade: 'F',
    gpa: 0.0,
  });
});

test('Admin Hierarchy: Super Admin vs Main Admin protection and multi-stage marks locking', () => {
  const superAdminUser: UserProfile = {
    uid: 'usr_super_admin_adn',
    name: 'Ananneya Debnath',
    email: 'ananneyadebnath@gmail.com',
    photoURL: '',
    role: 'super_admin',
    teacherCode: 'ADN',
    routineAbbreviation: 'A.D.N.',
    status: 'active',
    designation: 'Super Admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mainAdminUser: UserProfile = {
    ...superAdminUser,
    uid: 'usr_main_admin_sh',
    name: 'Shahadat Hossain',
    email: 'sh@abutorab.edu.bd',
    role: 'main_admin',
    teacherCode: 'SH',
    routineAbbreviation: 'S.H.',
  };

  const headTeacherUser: UserProfile = {
    ...superAdminUser,
    uid: 'usr_hm',
    name: 'Marzahan Begum',
    email: 'hm@abutorab.edu.bd',
    role: 'head_teacher',
    teacherCode: 'HM',
    routineAbbreviation: 'H.M.',
  };

  const classTeacherA: UserProfile = {
    ...superAdminUser,
    uid: 'u_tch_a',
    email: 'a@aths.edu.bd',
    role: 'class_teacher',
    teacherCode: 'TA',
    routineAbbreviation: 'T.A.',
  };

  const subjectTeacherB: UserProfile = {
    ...superAdminUser,
    uid: 'u_tch_b',
    email: 'b@aths.edu.bd',
    role: 'subject_teacher',
    teacherCode: 'TB',
    routineAbbreviation: 'T.B.',
  };

  assert.equal(isSuperAdminUser(superAdminUser), true);
  assert.equal(isSuperAdminUser(mainAdminUser), false);
  assert.equal(isMainAdminUser(mainAdminUser), true);
  assert.equal(isFullAdminUser(superAdminUser), true);
  assert.equal(isFullAdminUser(mainAdminUser), true);
  assert.equal(isPrivilegedReviewerUser(headTeacherUser), true);
  assert.equal(isPrivilegedReviewerUser(classTeacherA), false);

  // Super Admin can edit Main Admin and Super Admin; Main Admin CANNOT edit Super Admin
  assert.equal(canEditTargetTeacherProfile(superAdminUser, mainAdminUser), true);
  assert.equal(canEditTargetTeacherProfile(superAdminUser, superAdminUser), true);
  assert.equal(canEditTargetTeacherProfile(mainAdminUser, classTeacherA), true);
  assert.equal(canEditTargetTeacherProfile(mainAdminUser, superAdminUser), false);

  const classSection6A: ClassSection = {
    id: 'cs_6a',
    academicYearId: 'ay_2026',
    className: 'Class 6',
    section: 'Section A (ক)',
    classTeacherUid: 'u_tch_a',
    classTeacherName: 'Teacher A',
    classTeacherCode: 'TA',
    roomNumber: '101',
    createdAt: '2026-01-01T00:00:00Z',
  };

  // Attendance permissions: Only Class Teacher of section or Privileged Reviewer
  assert.equal(canManageClassRosterAndAttendance(superAdminUser, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(mainAdminUser, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(headTeacherUser, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(classTeacherA, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(subjectTeacherB, classSection6A), false);

  const draftMathAssignment: SubjectAssignment = {
    id: 'asg_math_6a',
    academicYearId: 'ay_2026',
    classSectionId: 'cs_6a',
    className: 'Class 6',
    section: 'Section A (ক)',
    subjectCode: '109',
    subjectName: 'Mathematics',
    teacherUid: 'u_tch_b',
    teacherName: 'Teacher B',
    teacherCode: 'TB',
    maxMarks: 100,
    statusByTerm: { trm_hy_2026: 'draft' },
    createdAt: '2026-01-01T00:00:00Z',
  };

  assert.equal(canManageSubjectMarks(superAdminUser, draftMathAssignment, 'trm_hy_2026'), true);
  assert.equal(canManageSubjectMarks(subjectTeacherB, draftMathAssignment, 'trm_hy_2026'), true);
  assert.equal(canManageSubjectMarks(classTeacherA, draftMathAssignment, 'trm_hy_2026'), false);

  // Once submitted to Class Teacher, Subject Teacher and Class Teacher are strictly locked out!
  const submittedMathAssignment: SubjectAssignment = {
    ...draftMathAssignment,
    statusByTerm: { trm_hy_2026: 'submitted' },
  };

  assert.equal(canManageSubjectMarks(subjectTeacherB, submittedMathAssignment, 'trm_hy_2026'), false);
  assert.equal(canManageSubjectMarks(classTeacherA, submittedMathAssignment, 'trm_hy_2026'), false);
  assert.equal(canManageSubjectMarks(superAdminUser, submittedMathAssignment, 'trm_hy_2026'), true);
  assert.equal(canManageSubjectMarks(mainAdminUser, submittedMathAssignment, 'trm_hy_2026'), true);
  assert.equal(canManageSubjectMarks(headTeacherUser, submittedMathAssignment, 'trm_hy_2026'), true);
});

test('sanitizeStudentPayload enforces blueprint maxLength and valid roll range', () => {
  const sanitized = sanitizeStudentPayload({
    id: 'bad id with spaces!',
    academicYearId: 'ay_2026',
    classSectionId: 'cs_6a',
    className: 'Class 9',
    section: 'A',
    roll: -5,
    name: 'A'.repeat(200),
    group: 'Science',
    optionalSubject: 'Higher Mathematics',
    guardianPhone: '01811223344',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  });
  assert.match(sanitized.id, /^[a-zA-Z0-9_-]+$/);
  assert.equal(sanitized.roll, 1);
  assert.equal(sanitized.name.length, 120);
});

test('findMatchingTeacherProfileByEmailOrUid and mergeAndLinkTeacherProfileUid link Google UID and migrate assignments', () => {
  const seededTeacher: UserProfile = {
    uid: 'usr_dir_3_MA',
    name: 'মোহাম্মদ মোহরম আলী',
    email: 'moharam.real@gmail.com',
    photoURL: '',
    role: 'subject_teacher',
    teacherCode: 'M.A.',
    status: 'active',
    designation: 'সিনিয়র শিক্ষক — গণিত',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  assert.equal(isPlaceholderTeacherEmail('ali@automatapro.com'), true);
  assert.equal(isPlaceholderTeacherEmail('moharam.real@gmail.com'), false);

  const matched = findMatchingTeacherProfileByEmailOrUid(
    [seededTeacher],
    '  Moharam.Real@Gmail.com ',
    'firebase_uid_999'
  );
  assert.ok(matched);
  assert.equal(matched?.uid, 'usr_dir_3_MA');
  assert.equal(matched?.teacherCode, 'M.A.');

  const sampleSections: ClassSection[] = [
    {
      id: 'cs_8_a',
      academicYearId: 'ay_2026',
      className: 'Class 8',
      section: 'Section A',
      classTeacherUid: 'usr_dir_3_MA',
      classTeacherName: 'মোহাম্মদ মোহরম আলী',
      classTeacherCode: 'M.A.',
      roomNumber: '204',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleAssignments: SubjectAssignment[] = [
    {
      id: 'asg_8_math',
      academicYearId: 'ay_2026',
      classSectionId: 'cs_8_a',
      className: 'Class 8',
      section: 'Section A',
      subjectCode: '109',
      subjectName: 'Mathematics',
      teacherUid: 'usr_dir_3_MA',
      teacherName: 'মোহাম্মদ মোহরম আলী',
      teacherCode: 'M.A.',
      maxMarks: 100,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const merged = mergeAndLinkTeacherProfileUid({
    sourceUid: 'usr_dir_3_MA',
    targetUid: 'firebase_google_uid_999',
    targetEmail: 'moharam.real@gmail.com',
    users: [seededTeacher],
    classSections: sampleSections,
    subjectAssignments: sampleAssignments,
    nowIso: '2026-11-10T12:00:00Z',
  });

  assert.equal(merged.updatedUsers.length, 1);
  assert.equal(merged.linkedProfile?.uid, 'firebase_google_uid_999');
  assert.equal(merged.linkedProfile?.teacherCode, 'M.A.');
  assert.equal(merged.updatedClassSections[0].classTeacherUid, 'firebase_google_uid_999');
  assert.equal(merged.updatedSubjectAssignments[0].teacherUid, 'firebase_google_uid_999');
});

test('getTeacherHierarchyTier and sortTeachersByHierarchy place Head Teacher first and Assistant Teachers appropriately', () => {
  const headTeacher: Partial<UserProfile> = {
    uid: 'usr_tch_hm',
    name: 'মর্জিনা আক্তার',
    designation: 'প্রধান শিক্ষক',
    role: 'head_teacher',
    serial: 1,
  };
  const asstHeadTeacher: Partial<UserProfile> = {
    uid: 'usr_tch_rd',
    name: 'রতন কুমার দাশ',
    designation: 'সহকারী প্রধান শিক্ষক',
    role: 'asst_head_teacher',
    serial: 2,
  };
  const seniorTeacher: Partial<UserProfile> = {
    uid: 'usr_tch_ma',
    name: 'মোহাম্মদ মোহরম আলী',
    designation: 'সিনিয়র শিক্ষক',
    isSenior: true,
    serial: 3,
  };
  const ananneyadebnath: Partial<UserProfile> = {
    uid: 'usr_admin_ad', // Firestore ID starts with usr_admin_a...
    name: 'Ananneya Debnath',
    nameBn: 'অনন্য দেবনাথ',
    designation: 'সহকারী শিক্ষক',
    role: 'super_admin', // super_admin system role must not put assistant teacher above head teacher
    serial: 9,
  };

  assert.equal(getTeacherHierarchyTier(headTeacher), 1);
  assert.equal(getTeacherHierarchyTier(asstHeadTeacher), 2);
  assert.equal(getTeacherHierarchyTier(seniorTeacher), 3);
  assert.equal(getTeacherHierarchyTier(ananneyadebnath), 4);

  // Even if ananneyadebnath is first in the raw array (like in Firestore alphabetical document keys)
  const unsorted = [ananneyadebnath, seniorTeacher, asstHeadTeacher, headTeacher];
  const sorted = sortTeachersByHierarchy(unsorted);

  assert.equal(sorted[0].uid, 'usr_tch_hm'); // Head Teacher on top
  assert.equal(sorted[1].uid, 'usr_tch_rd'); // Asst Head Teacher second
  assert.equal(sorted[2].uid, 'usr_tch_ma'); // Senior Teacher third
  assert.equal(sorted[3].uid, 'usr_admin_ad'); // Assistant teacher in assistant section
});
