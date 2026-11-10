export type UserRole = 'admin' | 'teacher';
export type AccountStatus = 'active' | 'inactive';
export type NumeralLocale = 'en' | 'bn';
export type ThemeMode = 'light' | 'dark';

export type SchoolClassName = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10';
export type ExamTermType = 'Half-Yearly' | 'Annual Exam' | 'Class Test' | 'Pre-Test' | 'Test Exam';
export type StudentGroup = 'General' | 'Science' | 'Humanities' | 'Business Studies';
export type StudentStatus = 'active' | 'transferred' | 'inactive';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: UserRole;
  teacherCode: string;
  status: AccountStatus;
  designation: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  year: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExamTerm {
  id: string;
  academicYearId: string;
  name: string;
  termType: ExamTermType;
  totalMarksDefault: number;
  isActive: boolean;
  isLocked?: boolean;
  createdAt: string;
}

export interface ClassSection {
  id: string;
  academicYearId: string;
  className: SchoolClassName;
  section: string;
  classTeacherUid: string;
  classTeacherName: string;
  classTeacherCode: string;
  roomNumber: string;
  createdAt: string;
}

export interface SubjectAssignment {
  id: string;
  academicYearId: string;
  classSectionId: string;
  className: string;
  section: string;
  subjectCode: string;
  subjectName: string;
  teacherUid: string;
  teacherName: string;
  teacherCode: string;
  maxMarks: number;
  createdAt: string;
}

export interface Student {
  id: string;
  academicYearId: string;
  classSectionId: string;
  className: string;
  section: string;
  roll: number;
  name: string;
  group: StudentGroup;
  optionalSubject: string;
  guardianPhone: string;
  status: StudentStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  classSectionId: string;
  date: string;
  markedByUid: string;
  presentCount: number;
  absentCount: number;
  absentRolls: string;
  updatedAt: string;
}

export interface SubjectMarkRecord {
  id: string;
  assignmentId: string;
  termId: string;
  classSectionId: string;
  studentId: string;
  roll: number;
  studentName: string;
  writtenMarks: number;
  mcqMarks: number;
  practicalMarks: number;
  totalMarks: number;
  letterGrade: string;
  gpa: number;
  updatedByUid: string;
  updatedAt: string;
}

export interface ParsedStudentRow {
  roll: number;
  name: string;
  group: StudentGroup;
  optionalSubject: string;
  guardianPhone: string;
}

export interface CsvParseError {
  line: number;
  reason: string;
  raw: string;
}

export interface RoutineRecord {
  id: string;
  days: string;
  className: string;
  period: number;
  subject: string;
  teacher: string;
  updatedAt: string;
}

export interface NoticeRecord {
  id: string;
  title: string;
  date: string;
  category: string;
  isImportant: boolean;
  summary: string;
  content: string;
  publishedBy: string;
  updatedAt: string;
}


