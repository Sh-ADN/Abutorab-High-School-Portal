export type UserRole =
  | 'super_admin'
  | 'main_admin'
  | 'head_teacher'
  | 'asst_head_teacher'
  | 'class_teacher'
  | 'subject_teacher'
  | 'admin'
  | 'teacher';

export type StaffType = 'teacher' | 'staff';
export type AccountStatus = 'active' | 'inactive';
export type StudentGroup = 'Science' | 'Humanities' | 'Business Studies' | 'General';
export type StudentStatus = 'active' | 'transferred' | 'inactive';
export type ExamTermType =
  | 'Class Test'
  | 'Half-Yearly'
  | 'Annual Exam'
  | 'Model Test'
  | 'Pre-Test'
  | 'Test Exam';
export type NumeralLocale = 'en' | 'bn';
export type ThemeMode = 'light' | 'dark';

export type SubjectSubmissionStatus = 'draft' | 'submitted';
export type SectionResultApprovalStatus = 'draft' | 'submitted_for_approval' | 'approved';

export type SchoolClassName = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10';

export interface UserProfile {
  uid: string;
  name: string;
  nameBn?: string;
  email: string;
  photoURL: string;
  role: UserRole;
  teacherCode: string;
  routineAbbreviation?: string;
  status: AccountStatus;
  designation: string;
  staffType?: StaffType;
  subject?: string;
  qualification?: string;
  indexNo?: string;
  joiningDate?: string;
  phone?: string;
  serial?: number;
  isSenior?: boolean;
  isLeadership?: boolean;
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
  isManualOverride?: boolean;
  sectionResultStatusByTerm?: Record<string, SectionResultApprovalStatus>;
  sectionSubmittedAtByTerm?: Record<string, string>;
  sectionApprovedAtByTerm?: Record<string, string>;
  sectionApprovedByUidByTerm?: Record<string, string>;
  createdAt: string;
}

export interface SubjectAssignment {
  id: string;
  academicYearId: string;
  classSectionId: string;
  className: SchoolClassName;
  section: string;
  subjectCode: string;
  subjectName: string;
  teacherUid: string;
  teacherName: string;
  teacherCode: string;
  maxMarks: number;
  isManualOverride?: boolean;
  assignedDaysCount?: number;
  statusByTerm?: Record<string, SubjectSubmissionStatus>;
  submittedAtByTerm?: Record<string, string>;
  submittedByUidByTerm?: Record<string, string>;
  createdAt: string;
}

export interface Student {
  id: string;
  academicYearId: string;
  classSectionId: string;
  className: SchoolClassName;
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
  days: string; // e.g., "(2-6)", "(2-4)", "(3-7)", "(2,4)"
  className: string; // e.g., "VI-A", "IX-A", "X"
  period: number; // 1 to 8
  subject: string; // e.g., "Eng-1", "Math", "Physics"
  teacher: string; // e.g., "R.D.", "A.D.N.", "J.U.C."
  updatedAt?: string;
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
