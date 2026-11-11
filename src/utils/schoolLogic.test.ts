import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGradeAndGpa,
  canManageClassRosterAndAttendance,
  canManageSubjectMarks,
  deriveTeacherCode,
  findMatchingTeacherProfileByEmailOrUid,
  formatNumeral,
  isPlaceholderTeacherEmail,
  mergeAndLinkTeacherProfileUid,
  parseLocalizedInt,
  parseStudentRosterCsv,
  resolveInitialUserRole,
  sanitizeStudentPayload,
} from './schoolLogic';
import { ClassSection, SubjectAssignment, UserProfile } from '../types/school';

test('resolveInitialUserRole assigns admin to ananneyadebnath@gmail.com and teacher to others', () => {
  assert.equal(resolveInitialUserRole('ananneyadebnath@gmail.com'), 'admin');
  assert.equal(resolveInitialUserRole('  AnanneyaDebnath@gmail.com '), 'admin');
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

test('RBAC permission helpers enforce Admin, Class Teacher, and Subject Teacher boundaries', () => {
  const adminUser: UserProfile = {
    uid: 'u_admin',
    name: 'Ananneya Debnath',
    email: 'ananneyadebnath@gmail.com',
    photoURL: '',
    role: 'admin',
    teacherCode: 'AD',
    status: 'active',
    designation: 'Admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const teacherA: UserProfile = {
    ...adminUser,
    uid: 'u_tch_a',
    email: 'a@aths.edu.bd',
    role: 'teacher',
    teacherCode: 'TA',
  };

  const teacherB: UserProfile = {
    ...adminUser,
    uid: 'u_tch_b',
    email: 'b@aths.edu.bd',
    role: 'teacher',
    teacherCode: 'TB',
  };

  const classSection6A: ClassSection = {
    id: 'cs_6a',
    academicYearId: 'ay_2026',
    className: 'Class 6',
    section: 'Ka (ক)',
    classTeacherUid: 'u_tch_a',
    classTeacherName: 'Teacher A',
    classTeacherCode: 'TA',
    roomNumber: '101',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const mathAssignment: SubjectAssignment = {
    id: 'asg_math_6a',
    academicYearId: 'ay_2026',
    classSectionId: 'cs_6a',
    className: 'Class 6',
    section: 'Ka (ক)',
    subjectCode: '109',
    subjectName: 'Mathematics',
    teacherUid: 'u_tch_b',
    teacherName: 'Teacher B',
    teacherCode: 'TB',
    maxMarks: 100,
    createdAt: '2026-01-01T00:00:00Z',
  };

  assert.equal(canManageClassRosterAndAttendance(adminUser, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(teacherA, classSection6A), true);
  assert.equal(canManageClassRosterAndAttendance(teacherB, classSection6A), false);

  assert.equal(canManageSubjectMarks(adminUser, mathAssignment), true);
  assert.equal(canManageSubjectMarks(teacherB, mathAssignment), true);
  assert.equal(canManageSubjectMarks(teacherA, mathAssignment), false);
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
    role: 'teacher',
    teacherCode: 'M.A.',
    status: 'active',
    designation: 'সিনিয়র শিক্ষক — গণিত',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  assert.equal(isPlaceholderTeacherEmail('ali@automatapro.com'), true);
  assert.equal(isPlaceholderTeacherEmail('moharam.real@gmail.com'), false);

  // Case-insensitive match by email when UID is different
  const matched = findMatchingTeacherProfileByEmailOrUid(
    [seededTeacher],
    '  Moharam.Real@Gmail.com ',
    'firebase_uid_999'
  );
  assert.ok(matched);
  assert.equal(matched?.uid, 'usr_dir_3_MA');
  assert.equal(matched?.teacherCode, 'M.A.');

  // Merge & link UID to preserve teacherCode, Class Teacher role, and Subject Assignments
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
