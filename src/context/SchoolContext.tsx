import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  AcademicYear,
  AccountStatus,
  AttendanceRecord,
  ClassSection,
  ExamTerm,
  ExamTermType,
  NoticeRecord,
  NumeralLocale,
  ParsedStudentRow,
  RoutineRecord,
  SchoolClassName,
  StaffType,
  Student,
  StudentGroup,
  SubjectAssignment,
  SubjectMarkRecord,
  ThemeMode,
  UserProfile,
  UserRole,
} from '../types/school';
import {
  SEED_ACADEMIC_YEARS,
  SEED_ATTENDANCE,
  SEED_CLASS_SECTIONS,
  SEED_EXAM_TERMS,
  SEED_STUDENTS,
  SEED_SUBJECT_ASSIGNMENTS,
  SEED_SUBJECT_MARKS,
  SEED_USERS,
} from '../data/seedData';
import {
  canEditTargetTeacherProfile,
  canManageClassRosterAndAttendance,
  canManageSubjectMarks,
  deriveTeacherCode,
  findMatchingTeacherProfileByEmailOrUid,
  formatNumeral,
  isAssignedClassTeacherForSection,
  isFullAdminUser,
  isPrivilegedReviewerUser,
  isSuperAdminUser,
  mergeAndLinkTeacherProfileUid,
  normalizeAbbr,
  resolveInitialUserRole,
  sanitizeFirestoreId,
  sanitizeStudentPayload,
  sortTeachersByHierarchy,
} from '../utils/schoolLogic';

import { parseAbsentRollsSet, serializeAbsentRolls } from '../utils/attendanceAnalytics';
import { evaluateSubjectMarkComponents, resolveSubjectSpec } from '../utils/marksCatalogAndLogic';
import {
  deriveClassTeachersAndSubjectAssignmentsFromRoutine,
  SEED_ROUTINE_RECORDS,
} from '../utils/routineAndStatsLogic';
import {
  PUBLIC_STAFF_DIRECTORY,
  PUBLIC_TEACHERS_DIRECTORY,
  SEED_NOTICES,
} from '../data/schoolWebsiteData';

export type WorkspaceView =
  | 'teacher-dashboard'
  | 'student-attendance'
  | 'exam-marks'
  | 'results-tabulation'
  | 'school-routine'
  | 'admin-panel'
  | 'admin-teachers'
  | 'admin-academic'
  | 'admin-matrix'
  | 'student-roster';

export interface TeacherStaffCrudInput {
  name: string;
  nameBn?: string;
  email?: string;
  teacherCode?: string;
  routineAbbreviation?: string;
  designation?: string;
  staffType?: StaffType;
  subject?: string;
  qualification?: string;
  indexNo?: string;
  joiningDate?: string;
  phone?: string;
  photoURL?: string;
  role?: UserRole;
  status?: AccountStatus;
  isSenior?: boolean;
  serial?: number;
}

interface SchoolContextValue {
  // Auth & User State
  currentUser: UserProfile | null; // Effective user (switches when View As is active)
  realAuthUser: UserProfile | null; // Actual logged-in user (Super Admin / Main Admin)
  viewAsTeacherUid: string | null;
  setViewAsTeacherUid: (uid: string | null) => void;
  authLoading: boolean;
  authError: string | null;
  isFirebaseAuthenticated: boolean;
  isSuperAdminSession: boolean;
  activeView: WorkspaceView;
  setActiveView: (view: WorkspaceView) => void;
  showPublicWebsite: boolean;
  setShowPublicWebsite: (show: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  enterSandboxAs: (uid: string) => void;
  logout: () => Promise<void>;

  // Preferences
  theme: ThemeMode;
  toggleTheme: () => void;
  numeralLocale: NumeralLocale;
  toggleNumeralLocale: () => void;
  num: (value: number | string | undefined | null) => string;

  // Collections
  users: UserProfile[];
  academicYears: AcademicYear[];
  examTerms: ExamTerm[];
  classSections: ClassSection[];
  subjectAssignments: SubjectAssignment[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  subjectMarks: SubjectMarkRecord[];
  routineRecords: RoutineRecord[];
  notices: NoticeRecord[];

  // Active Context Selectors
  selectedAcademicYearId: string;
  setSelectedAcademicYearId: (id: string) => void;
  selectedTermId: string;
  setSelectedTermId: (id: string) => void;
  selectedAttendanceClassSectionId: string;
  setSelectedAttendanceClassSectionId: (id: string) => void;
  selectedMarksAssignmentId: string;
  setSelectedMarksAssignmentId: (id: string) => void;

  // Attendance Analytics Settings
  finePerAbsentDay: number;
  setFinePerAbsentDay: (rate: number) => void;
  holidays: string[];
  toggleHolidayDate: (dateStr: string) => void;

  // Admin: Teacher & Staff Management
  updateUserRoleAndStatus: (uid: string, updates: Partial<TeacherStaffCrudInput>) => Promise<void>;
  linkUserToTeacherProfile: (sourceTeacherUid: string, targetGoogleUid: string) => Promise<void>;
  createTeacherAccount: (input: TeacherStaffCrudInput) => Promise<void>;
  deleteTeacherAccount: (uid: string) => Promise<void>;
  seedDirectoryTeachers: () => Promise<number>;

  // Admin: Academic Structure
  createAcademicYear: (year: string, label: string, makeActive: boolean) => Promise<void>;
  setActiveAcademicYear: (yearId: string) => Promise<void>;
  createExamTerm: (input: {
    academicYearId: string;
    name: string;
    termType: ExamTermType;
    totalMarksDefault: number;
    isActive: boolean;
  }) => Promise<void>;
  setActiveExamTerm: (termId: string) => Promise<void>;
  toggleExamTermLock: (termId: string) => Promise<void>;
  deleteExamTerm: (termId: string) => Promise<void>;
  createClassSection: (input: {
    academicYearId: string;
    className: SchoolClassName;
    section: string;
    roomNumber: string;
    classTeacherUid?: string;
  }) => Promise<void>;
  deleteClassSection: (classSectionId: string) => Promise<void>;

  // Admin: Assignment Matrix & Routine Sync
  assignClassTeacher: (
    classSectionId: string,
    teacherUid: string,
    isManualOverride?: boolean
  ) => Promise<void>;
  createOrUpdateSubjectAssignment: (input: {
    id?: string;
    academicYearId: string;
    classSectionId: string;
    subjectCode: string;
    subjectName: string;
    teacherUid: string;
    maxMarks: number;
    isManualOverride?: boolean;
  }) => Promise<void>;
  deleteSubjectAssignment: (assignmentId: string) => Promise<void>;
  syncAssignmentsFromRoutineNow: () => Promise<{
    updatedSectionsCount: number;
    updatedSubjectsCount: number;
  }>;

  // Multi-Stage Marks Submission & Approval Workflow
  submitSubjectMarksToClassTeacher: (assignmentId: string, termId: string) => Promise<void>;
  unlockSubjectMarksToDraft: (assignmentId: string, termId: string) => Promise<void>;
  submitSectionResultsForApproval: (classSectionId: string, termId: string) => Promise<void>;
  approveSectionResults: (classSectionId: string, termId: string) => Promise<void>;
  unlockSectionResultsToDraft: (classSectionId: string, termId: string) => Promise<void>;

  // Student Roster (Admin & Class Teacher)
  addSingleStudent: (input: {
    academicYearId: string;
    classSectionId: string;
    roll: number;
    name: string;
    group: StudentGroup;
    optionalSubject: string;
    guardianPhone?: string;
  }) => Promise<void>;
  bulkImportStudents: (
    academicYearId: string,
    classSectionId: string,
    rows: ParsedStudentRow[]
  ) => Promise<number>;
  updateStudentRecord: (
    studentId: string,
    updates: Partial<
      Pick<Student, 'roll' | 'name' | 'group' | 'optionalSubject' | 'guardianPhone' | 'status'>
    >
  ) => Promise<void>;
  deleteStudentRecord: (studentId: string) => Promise<void>;

  // Teacher Workflows (Attendance & Marks)
  saveAttendanceRecord: (input: {
    classSectionId: string;
    date: string;
    presentCount: number;
    absentCount: number;
    absentRolls: string;
  }) => Promise<void>;
  clearAttendanceForDate: (classSectionId: string, date: string) => Promise<void>;
  toggleStudentAttendanceOnDate: (
    classSectionId: string,
    date: string,
    roll: number
  ) => Promise<void>;
  saveSubjectMarkRecord: (input: {
    assignmentId: string;
    termId: string;
    classSectionId: string;
    studentId: string;
    roll: number;
    studentName: string;
    writtenMarks: number;
    mcqMarks: number;
    practicalMarks: number;
    maxMarks: number;
  }) => Promise<void>;
  clearSubjectMarksForAssignment: (
    assignmentId: string,
    termId: string
  ) => Promise<SubjectMarkRecord[]>;
  restoreSubjectMarksBatch: (records: SubjectMarkRecord[]) => Promise<void>;
  replaceRoutineRecords: (records: RoutineRecord[]) => Promise<void>;
  saveRoutineRecord: (record: RoutineRecord) => Promise<void>;
  saveNotice: (input: {
    id?: string;
    title: string;
    date: string;
    category: string;
    isImportant: boolean;
    summary: string;
    content: string;
    publishedBy?: string;
  }) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  seedFirestoreDefaults: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

const INITIAL_DERIVED = deriveClassTeachersAndSubjectAssignmentsFromRoutine({
  routineRecords: SEED_ROUTINE_RECORDS,
  classSections: SEED_CLASS_SECTIONS,
  teachers: SEED_USERS,
  existingAssignments: SEED_SUBJECT_ASSIGNMENTS,
  academicYearId: 'ay_2026',
});

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [sandboxUid, setSandboxUid] = useState<string | null>(
    initialAutostart ? 'usr_admin_ad' : null
  );
  const [viewAsTeacherUid, setViewAsTeacherUid] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>('teacher-dashboard');
  const [showPublicWebsite, setShowPublicWebsite] = useState<boolean>(false);

  // Theme & Numeral Locale
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('aths_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const [numeralLocale, setNumeralLocale] = useState<NumeralLocale>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('aths_numeral');
      if (saved === 'bn' || saved === 'en') return saved;
    }
    return 'en';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('aths_theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('aths_numeral', numeralLocale);
  }, [numeralLocale]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleNumeralLocale = useCallback(() => {
    setNumeralLocale((prev) => (prev === 'en' ? 'bn' : 'en'));
  }, []);

  const num = useCallback(
    (value: number | string | undefined | null) => formatNumeral(value, numeralLocale),
    [numeralLocale]
  );

  // Application Data State
  const [users, setUsers] = useState<UserProfile[]>(() => sortTeachersByHierarchy(SEED_USERS));
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(SEED_ACADEMIC_YEARS);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>(SEED_EXAM_TERMS);
  const [classSections, setClassSections] = useState<ClassSection[]>(
    INITIAL_DERIVED.updatedClassSections
  );
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>(
    INITIAL_DERIVED.updatedSubjectAssignments
  );
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(SEED_ATTENDANCE);
  const [subjectMarks, setSubjectMarks] = useState<SubjectMarkRecord[]>(SEED_SUBJECT_MARKS);
  const [routineRecords, setRoutineRecords] = useState<RoutineRecord[]>(SEED_ROUTINE_RECORDS);
  const [notices, setNotices] = useState<NoticeRecord[]>(SEED_NOTICES);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('ay_2026');
  const [selectedTermId, setSelectedTermId] = useState<string>('term_2026_half');
  const [selectedAttendanceClassSectionId, setSelectedAttendanceClassSectionId] =
    useState<string>('');
  const [selectedMarksAssignmentId, setSelectedMarksAssignmentId] = useState<string>('');

  // Automatically keep non-overridden Class Teachers (1st period) and Subject Assignments (majority days)
  // synced whenever routineRecords or users change
  useEffect(() => {
    const derived = deriveClassTeachersAndSubjectAssignmentsFromRoutine({
      routineRecords,
      classSections,
      teachers: users,
      existingAssignments: subjectAssignments,
      academicYearId: selectedAcademicYearId,
    });
    setClassSections(derived.updatedClassSections);
    setSubjectAssignments(derived.updatedSubjectAssignments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineRecords, users, selectedAcademicYearId]);

  const [finePerAbsentDay, setFinePerAbsentDayState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('aths_fine_rate');
      if (saved !== null && !Number.isNaN(Number(saved))) {
        return Math.max(0, Math.floor(Number(saved)));
      }
    }
    return 5;
  });

  const [holidays, setHolidays] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('aths_holidays');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const setFinePerAbsentDay = useCallback((rate: number) => {
    const clean = Math.max(0, Math.min(10000, Math.floor(Number(rate) || 0)));
    setFinePerAbsentDayState(clean);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aths_fine_rate', String(clean));
    }
  }, []);

  const toggleHolidayDate = useCallback((dateStr: string) => {
    setHolidays((prev) => {
      const exists = prev.includes(dateStr);
      const next = exists ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('aths_holidays', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Firebase Auth listener & automatic user profile provisioning in Firestore users/{uid} & teachers/{uid}
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 900);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer);
      setFbUser(user);
      if (!user) {
        setAuthLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }

        const nowIso = new Date().toISOString();
        const email = (user.email || '').trim().toLowerCase();
        const initialRole = resolveInitialUserRole(email);
        const displayName = (user.displayName || email.split('@')[0] || 'Teacher').slice(0, 120);
        const derivedCode = deriveTeacherCode(displayName);

        if (!userSnap || !userSnap.exists()) {
          const matchedSeedProfile = findMatchingTeacherProfileByEmailOrUid(
            SEED_USERS,
            email,
            user.uid
          );
          const matchedDirEntry = PUBLIC_TEACHERS_DIRECTORY.find(
            (d) => (d.email || '').trim().toLowerCase() === email
          );

          const resolvedName = (
            matchedSeedProfile?.name ||
            matchedDirEntry?.name ||
            displayName
          ).slice(0, 120);
          const resolvedCode = (
            matchedSeedProfile?.teacherCode ||
            matchedDirEntry?.teacherCode ||
            derivedCode
          )
            .trim()
            .toUpperCase()
            .slice(0, 12);
          const resolvedDesignation = (
            matchedSeedProfile?.designation ||
            (matchedDirEntry
              ? matchedDirEntry.designation
              : initialRole === 'super_admin'
                ? 'System Administrator & Senior Faculty'
                : 'Assistant Teacher')
          ).slice(0, 80);

          const newProfile: UserProfile = {
            ...(matchedSeedProfile || {}),
            uid: user.uid,
            name: resolvedName,
            nameBn: matchedSeedProfile?.nameBn || matchedDirEntry?.name || resolvedName,
            email: email || '',
            photoURL: (
              user.photoURL ||
              matchedSeedProfile?.photoURL ||
              matchedDirEntry?.photoUrl ||
              ''
            ).slice(0, 500),
            role: email === 'ananneyadebnath@gmail.com' ? 'super_admin' : matchedSeedProfile?.role || initialRole,
            teacherCode: resolvedCode || 'TCH',
            routineAbbreviation: matchedSeedProfile?.routineAbbreviation || resolvedCode || 'TCH',
            status: 'active',
            staffType: matchedSeedProfile?.staffType || 'teacher',
            designation: resolvedDesignation,
            subject: matchedSeedProfile?.subject || matchedDirEntry?.subject || '',
            phone: matchedSeedProfile?.phone || matchedDirEntry?.phone || '',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          try {
            await setDoc(userDocRef, newProfile);
            await setDoc(doc(db, 'teachers', user.uid), newProfile);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          }
        } else {
          const existingData = userSnap.data() as UserProfile;
          if (
            email === 'ananneyadebnath@gmail.com' &&
            (existingData.role !== 'super_admin' || existingData.status !== 'active')
          ) {
            const updatedAdmin: UserProfile = {
              ...existingData,
              role: 'super_admin',
              status: 'active',
              updatedAt: nowIso,
            };
            try {
              await setDoc(userDocRef, updatedAdmin);
              await setDoc(doc(db, 'teachers', user.uid), updatedAdmin);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
            }
          }
        }
      } catch (err) {
        console.error('Auth profile sync error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listeners when authenticated with Firebase
  useEffect(() => {
    if (!fbUser) return;

    const unsubTeachers = onSnapshot(
      collection(db, 'teachers'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as UserProfile);
          setUsers(sortTeachersByHierarchy(list));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'teachers')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!snap.empty) {
          setUsers((prev) => {
            const byUid = new Map<string, UserProfile>();
            prev.forEach((u) => byUid.set(u.uid, u));
            snap.docs.forEach((d) => {
              const u = d.data() as UserProfile;
              byUid.set(u.uid, { ...(byUid.get(u.uid) || {}), ...u });
            });
            return sortTeachersByHierarchy(Array.from(byUid.values()));
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubYears = onSnapshot(
      collection(db, 'academicYears'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as AcademicYear);
          setAcademicYears(list);
          const active = list.find((y) => y.isActive);
          if (active) setSelectedAcademicYearId(active.id);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'academicYears')
    );

    const unsubTerms = onSnapshot(
      collection(db, 'examTerms'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as ExamTerm);
          setExamTerms(list);
          const active = list.find((t) => t.isActive);
          if (active) setSelectedTermId(active.id);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'examTerms')
    );

    const unsubClasses = onSnapshot(
      collection(db, 'classSections'),
      (snap) => {
        if (!snap.empty) {
          setClassSections(snap.docs.map((d) => d.data() as ClassSection));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'classSections')
    );

    const unsubAssignments = onSnapshot(
      collection(db, 'subjectAssignments'),
      (snap) => {
        if (!snap.empty) {
          setSubjectAssignments(snap.docs.map((d) => d.data() as SubjectAssignment));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subjectAssignments')
    );

    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snap) => {
        if (!snap.empty) {
          setStudents(snap.docs.map((d) => d.data() as Student));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'students')
    );

    const unsubAttendance = onSnapshot(
      collection(db, 'attendanceRecords'),
      (snap) => {
        if (!snap.empty) {
          setAttendanceRecords(snap.docs.map((d) => d.data() as AttendanceRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendanceRecords')
    );

    const unsubMarks = onSnapshot(
      collection(db, 'subjectMarks'),
      (snap) => {
        if (!snap.empty) {
          setSubjectMarks(snap.docs.map((d) => d.data() as SubjectMarkRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subjectMarks')
    );

    const unsubRoutine = onSnapshot(
      collection(db, 'routineEntries'),
      (snap) => {
        if (!snap.empty) {
          setRoutineRecords(snap.docs.map((d) => d.data() as RoutineRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'routineEntries')
    );

    const unsubNotices = onSnapshot(
      collection(db, 'notices'),
      (snap) => {
        if (!snap.empty) {
          setNotices(snap.docs.map((d) => d.data() as NoticeRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notices')
    );

    return () => {
      unsubTeachers();
      unsubUsers();
      unsubYears();
      unsubTerms();
      unsubClasses();
      unsubAssignments();
      unsubStudents();
      unsubAttendance();
      unsubMarks();
      unsubRoutine();
      unsubNotices();
    };
  }, [fbUser]);

  // Actual logged-in user before "View As" override
  const realAuthUser = useMemo<UserProfile | null>(() => {
    if (fbUser) {
      const matched = findMatchingTeacherProfileByEmailOrUid(users, fbUser.email, fbUser.uid);
      if (matched) {
        const isSuperAdmin =
          (fbUser.email || '').trim().toLowerCase() === 'ananneyadebnath@gmail.com';
        return {
          ...matched,
          uid: fbUser.uid,
          email: fbUser.email || matched.email,
          photoURL: fbUser.photoURL || matched.photoURL,
          role: isSuperAdmin ? 'super_admin' : matched.role,
        };
      }
      const email = fbUser.email || '';
      const role = resolveInitialUserRole(email);
      return {
        uid: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0] || 'Teacher',
        email,
        photoURL: fbUser.photoURL || '',
        role,
        teacherCode: deriveTeacherCode(fbUser.displayName || email),
        status: 'active',
        staffType: 'teacher',
        designation: role === 'super_admin' ? 'System Administrator' : 'Assistant Teacher',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (sandboxUid) {
      return (
        users.find((u) => u.uid === sandboxUid) ||
        users.find((u) => u.uid === 'usr_admin_ad') ||
        SEED_USERS[0]
      );
    }
    return null;
  }, [fbUser, sandboxUid, users]);

  // Effective user (switches to the inspected teacher when View As is active for super_admin or main_admin)
  const currentUser = useMemo<UserProfile | null>(() => {
    if (!realAuthUser) return null;
    if (viewAsTeacherUid && isFullAdminUser(realAuthUser)) {
      const target = users.find((u) => u.uid === viewAsTeacherUid);
      if (target) return target;
    }
    return realAuthUser;
  }, [realAuthUser, viewAsTeacherUid, users]);

  const isSuperAdminSession = useMemo<boolean>(() => {
    if (initialAutostart) return true;
    return isSuperAdminUser(realAuthUser) || isFullAdminUser(realAuthUser);
  }, [initialAutostart, realAuthUser]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setSandboxUid(null);
      setViewAsTeacherUid(null);
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Google Sign-In popup was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Popup was blocked by the browser. Please allow popups or use a Quick Role Session below.'
        );
      } else {
        setAuthError(error?.message || 'Unable to complete Google Sign-In.');
      }
    }
  }, []);

  const enterSandboxAs = useCallback((uid: string) => {
    setAuthError(null);
    setSandboxUid(uid);
    setViewAsTeacherUid(null);
    setShowPublicWebsite(false);
  }, []);

  const logout = useCallback(async () => {
    setSandboxUid(null);
    setViewAsTeacherUid(null);
    setShowPublicWebsite(false);
    if (fbUser) {
      await signOut(auth);
    }
  }, [fbUser]);

  // Seed default school data into Firestore when Admin requests
  const seedFirestoreDefaults = useCallback(async () => {
    if (!fbUser) return;
    try {
      const batch = writeBatch(db);
      SEED_USERS.forEach((u) => {
        batch.set(doc(db, 'users', u.uid), u);
        batch.set(doc(db, 'teachers', u.uid), u);
      });
      SEED_ACADEMIC_YEARS.forEach((y) => batch.set(doc(db, 'academicYears', y.id), y));
      SEED_EXAM_TERMS.forEach((t) => batch.set(doc(db, 'examTerms', t.id), t));
      INITIAL_DERIVED.updatedClassSections.forEach((c) =>
        batch.set(doc(db, 'classSections', c.id), c)
      );
      INITIAL_DERIVED.updatedSubjectAssignments.forEach((a) =>
        batch.set(doc(db, 'subjectAssignments', a.id), a)
      );
      SEED_STUDENTS.forEach((s) => batch.set(doc(db, 'students', s.id), s));
      SEED_ROUTINE_RECORDS.forEach((r) => batch.set(doc(db, 'routineEntries', r.id), r));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedDefaults');
    }
  }, [fbUser]);

  // 1. Manage Teachers & Staff (Restricted to Super Admin / Main Admin with hierarchy protection)
  const updateUserRoleAndStatus = useCallback(
    async (uid: string, updates: Partial<TeacherStaffCrudInput>) => {
      const actor = realAuthUser || currentUser;
      if (!isFullAdminUser(actor)) return;

      const target = users.find((u) => u.uid === uid);
      if (!target) return;

      // Enforce Admin Hierarchy: main_admin CANNOT edit or demote super_admin
      if (!canEditTargetTeacherProfile(actor, target)) {
        return;
      }

      const rawEmail = updates.email !== undefined ? updates.email : target.email;
      const cleanEmail = (rawEmail || '').trim().toLowerCase().slice(0, 160);
      const isTargetSuperAdmin =
        isSuperAdminUser(target) || cleanEmail === 'ananneyadebnath@gmail.com';

      // Only Super Admin can assign the 'super_admin' role
      let nextRole: UserRole = updates.role ?? target.role;
      if (isTargetSuperAdmin) {
        nextRole = 'super_admin';
      } else if (nextRole === 'super_admin' && !isSuperAdminUser(actor)) {
        nextRole = 'main_admin';
      }

      const nextName = (updates.name ?? target.name).trim().slice(0, 120) || target.name;
      const nextNameBn =
        updates.nameBn !== undefined
          ? updates.nameBn.trim().slice(0, 120)
          : target.nameBn || nextName;
      const nextCode =
        (updates.teacherCode ?? target.teacherCode).trim().toUpperCase().slice(0, 12) || 'TCH';
      const nextRoutineAbbr =
        updates.routineAbbreviation !== undefined
          ? updates.routineAbbreviation.trim().slice(0, 16)
          : target.routineAbbreviation || nextCode;

      const updated: UserProfile = {
        ...target,
        name: nextName,
        nameBn: nextNameBn,
        email: cleanEmail,
        photoURL:
          updates.photoURL !== undefined
            ? updates.photoURL.trim().slice(0, 500)
            : target.photoURL,
        role: nextRole,
        status: isTargetSuperAdmin ? 'active' : updates.status ?? target.status,
        teacherCode: nextCode,
        routineAbbreviation: nextRoutineAbbr,
        staffType: updates.staffType ?? target.staffType ?? 'teacher',
        designation: (updates.designation ?? target.designation).trim().slice(0, 80),
        subject:
          updates.subject !== undefined
            ? updates.subject.trim().slice(0, 120)
            : target.subject || '',
        qualification:
          updates.qualification !== undefined
            ? updates.qualification.trim().slice(0, 120)
            : target.qualification || '',
        indexNo:
          updates.indexNo !== undefined
            ? updates.indexNo.trim().slice(0, 40)
            : target.indexNo || '',
        joiningDate:
          updates.joiningDate !== undefined
            ? updates.joiningDate.trim().slice(0, 32)
            : target.joiningDate || '',
        phone:
          updates.phone !== undefined ? updates.phone.trim().slice(0, 32) : target.phone || '',
        isSenior: updates.isSenior !== undefined ? updates.isSenior : target.isSenior,
        serial: updates.serial !== undefined ? updates.serial : target.serial,
        updatedAt: new Date().toISOString(),
      };

      // If a non-empty email matches another user profile, link them automatically
      const existingGoogleUserWithSameEmail =
        updates.email !== undefined && cleanEmail
          ? users.find((u) => u.uid !== uid && (u.email || '').trim().toLowerCase() === cleanEmail)
          : undefined;

      if (existingGoogleUserWithSameEmail) {
        const merged = mergeAndLinkTeacherProfileUid({
          sourceUid: uid,
          targetUid: existingGoogleUserWithSameEmail.uid,
          targetEmail: cleanEmail,
          targetPhotoURL: existingGoogleUserWithSameEmail.photoURL,
          users: users.map((u) => (u.uid === uid ? updated : u)),
          classSections,
          subjectAssignments,
        });
        setUsers(merged.updatedUsers);
        setClassSections(merged.updatedClassSections);
        setSubjectAssignments(merged.updatedSubjectAssignments);

        if (fbUser && merged.linkedProfile) {
          try {
            const batch = writeBatch(db);
            batch.set(doc(db, 'users', merged.linkedProfile.uid), merged.linkedProfile);
            batch.set(doc(db, 'teachers', merged.linkedProfile.uid), merged.linkedProfile);
            if (uid !== merged.linkedProfile.uid) {
              batch.delete(doc(db, 'users', uid));
              batch.delete(doc(db, 'teachers', uid));
            }
            merged.updatedClassSections.forEach((cs) => {
              batch.set(doc(db, 'classSections', cs.id), cs);
            });
            merged.updatedSubjectAssignments.forEach((asg) => {
              batch.set(doc(db, 'subjectAssignments', asg.id), asg);
            });
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${merged.linkedProfile.uid}`);
          }
        }
        return;
      }

      setUsers((prev) => prev.map((u) => (u.uid === uid ? updated : u)));

      setClassSections((prev) =>
        prev.map((cs) =>
          cs.classTeacherUid === uid
            ? {
                ...cs,
                classTeacherName: updated.name,
                classTeacherCode: updated.teacherCode,
              }
            : cs
        )
      );
      setSubjectAssignments((prev) =>
        prev.map((asg) =>
          asg.teacherUid === uid
            ? {
                ...asg,
                teacherName: updated.name,
                teacherCode: updated.teacherCode,
              }
            : asg
        )
      );

      if (fbUser) {
        try {
          await setDoc(doc(db, 'users', uid), updated);
          await setDoc(doc(db, 'teachers', uid), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      }
    },
    [realAuthUser, currentUser, users, classSections, subjectAssignments, fbUser]
  );

  const linkUserToTeacherProfile = useCallback(
    async (sourceTeacherUid: string, targetGoogleUid: string) => {
      const actor = realAuthUser || currentUser;
      if (!isFullAdminUser(actor)) return;
      if (!sourceTeacherUid || !targetGoogleUid || sourceTeacherUid === targetGoogleUid) return;

      const merged = mergeAndLinkTeacherProfileUid({
        sourceUid: sourceTeacherUid,
        targetUid: targetGoogleUid,
        users,
        classSections,
        subjectAssignments,
      });

      if (!merged.linkedProfile) return;

      setUsers(merged.updatedUsers);
      setClassSections(merged.updatedClassSections);
      setSubjectAssignments(merged.updatedSubjectAssignments);

      if (fbUser) {
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', merged.linkedProfile.uid), merged.linkedProfile);
          batch.set(doc(db, 'teachers', merged.linkedProfile.uid), merged.linkedProfile);
          batch.delete(doc(db, 'users', sourceTeacherUid));
          batch.delete(doc(db, 'teachers', sourceTeacherUid));
          merged.updatedClassSections.forEach((cs) => {
            batch.set(doc(db, 'classSections', cs.id), cs);
          });
          merged.updatedSubjectAssignments.forEach((asg) => {
            batch.set(doc(db, 'subjectAssignments', asg.id), asg);
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${merged.linkedProfile.uid}`);
        }
      }
    },
    [realAuthUser, currentUser, users, classSections, subjectAssignments, fbUser]
  );

  const createTeacherAccount = useCallback(
    async (input: TeacherStaffCrudInput) => {
      const actor = realAuthUser || currentUser;
      if (!isFullAdminUser(actor)) return;

      const cleanName = (input.name || input.nameBn || '').trim().slice(0, 120);
      const cleanNameBn = (input.nameBn || input.name || '').trim().slice(0, 120);
      if (!cleanName) return;

      // Email is completely optional!
      const cleanEmail = (input.email || '').trim().toLowerCase().slice(0, 160);
      const uid = sanitizeFirestoreId(`usr_${Date.now()}`, 64);

      let role: UserRole =
        cleanEmail === 'ananneyadebnath@gmail.com'
          ? 'super_admin'
          : input.role || (input.staffType === 'staff' ? 'teacher' : 'subject_teacher');

      if (role === 'super_admin' && !isSuperAdminUser(actor)) {
        role = 'main_admin';
      }

      const code =
        (input.teacherCode || input.routineAbbreviation || deriveTeacherCode(cleanName))
          .trim()
          .toUpperCase()
          .slice(0, 12) || 'TCH';
      const routineAbbr = (input.routineAbbreviation || code).trim().slice(0, 16);
      const staffType: StaffType = input.staffType === 'staff' ? 'staff' : 'teacher';
      const nowIso = new Date().toISOString();

      const sameTypeCount = users.filter((u) => (u.staffType || 'teacher') === staffType).length;

      const newProfile: UserProfile = {
        uid,
        serial: input.serial ?? sameTypeCount + 1,
        name: cleanName,
        nameBn: cleanNameBn,
        email: cleanEmail,
        photoURL: (input.photoURL || '').trim().slice(0, 500),
        role,
        teacherCode: code,
        routineAbbreviation: routineAbbr,
        status: input.status || 'active',
        staffType,
        designation: (
          input.designation || (staffType === 'staff' ? 'অফিস কর্মচারী' : 'সহকারী শিক্ষক')
        )
          .trim()
          .slice(0, 80),
        subject: (input.subject || '').trim().slice(0, 120),
        qualification: (input.qualification || '').trim().slice(0, 120),
        indexNo: (input.indexNo || '').trim().slice(0, 40),
        joiningDate: (input.joiningDate || '').trim().slice(0, 32),
        phone: (input.phone || '').trim().slice(0, 32),
        isSenior: Boolean(input.isSenior),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setUsers((prev) => [...prev, newProfile]);

      if (fbUser) {
        try {
          await setDoc(doc(db, 'users', uid), newProfile);
          await setDoc(doc(db, 'teachers', uid), newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }
    },
    [realAuthUser, currentUser, users, fbUser]
  );

  const deleteTeacherAccount = useCallback(
    async (uid: string) => {
      const actor = realAuthUser || currentUser;
      if (!isFullAdminUser(actor)) return;

      const target = users.find((u) => u.uid === uid);
      if (!target) return;

      // Enforce Admin Hierarchy: main_admin CANNOT delete super_admin, and no one can delete Super Admin
      if (isSuperAdminUser(target) || !canEditTargetTeacherProfile(actor, target)) {
        return;
      }

      setUsers((prev) => prev.filter((u) => u.uid !== uid));

      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'users', uid));
          await deleteDoc(doc(db, 'teachers', uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
        }
      }
    },
    [realAuthUser, currentUser, users, fbUser]
  );

  const seedDirectoryTeachers = useCallback(async (): Promise<number> => {
    const actor = realAuthUser || currentUser;
    if (!isFullAdminUser(actor)) return 0;
    const nowIso = new Date().toISOString();
    const byUid = new Map<string, UserProfile>();

    users.forEach((u) => {
      byUid.set(u.uid, u);
    });

    const syncedProfiles: UserProfile[] = [];

    PUBLIC_TEACHERS_DIRECTORY.forEach((dirT, idx) => {
      const emailLower = (dirT.email || '').trim().toLowerCase();
      const existing =
        users.find(
          (u) =>
            (emailLower && (u.email || '').trim().toLowerCase() === emailLower) ||
            normalizeAbbr(u.teacherCode) === normalizeAbbr(dirT.teacherCode) ||
            normalizeAbbr(u.routineAbbreviation) === normalizeAbbr(dirT.teacherCode)
        ) || SEED_USERS.find((s) => s.serial === dirT.serial && s.staffType === 'teacher');

      const isSuperAdmin = emailLower === 'ananneyadebnath@gmail.com';
      const uid = existing
        ? existing.uid
        : sanitizeFirestoreId(`usr_dir_${idx + 1}_${dirT.teacherCode}`, 64);

      const profile: UserProfile = {
        ...(existing || {}),
        uid,
        serial: dirT.serial,
        name: (existing?.name || dirT.name).slice(0, 120),
        nameBn: (existing?.nameBn || dirT.name).slice(0, 120),
        email: emailLower || existing?.email || '',
        photoURL: (dirT.photoUrl || existing?.photoURL || '').slice(0, 500),
        role: isSuperAdmin
          ? 'super_admin'
          : existing?.role ||
            (idx === 0 ? 'head_teacher' : idx === 1 ? 'asst_head_teacher' : 'subject_teacher'),
        teacherCode: (existing?.teacherCode || dirT.teacherCode).trim().toUpperCase().slice(0, 12),
        routineAbbreviation: existing?.routineAbbreviation || dirT.teacherCode,
        status: existing?.status || 'active',
        staffType: 'teacher',
        designation: dirT.designation.slice(0, 80),
        subject: dirT.subject.slice(0, 120),
        phone: dirT.phone || existing?.phone || '',
        isSenior: dirT.isSenior,
        isLeadership: dirT.isLeadership,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      byUid.set(uid, profile);
      syncedProfiles.push(profile);
    });

    PUBLIC_STAFF_DIRECTORY.forEach((dirS, idx) => {
      const existing =
        users.find((u) => u.indexNo === dirS.indexNo && u.staffType === 'staff') ||
        SEED_USERS.find((s) => s.serial === dirS.serial && s.staffType === 'staff');

      const uid = existing ? existing.uid : sanitizeFirestoreId(`usr_stf_${idx + 1}`, 64);

      const profile: UserProfile = {
        ...(existing || {}),
        uid,
        serial: dirS.serial,
        name: (existing?.name || dirS.name).slice(0, 120),
        nameBn: (existing?.nameBn || dirS.name).slice(0, 120),
        email: existing?.email || '',
        photoURL: existing?.photoURL || '',
        role: existing?.role || (idx === 0 ? 'main_admin' : 'teacher'),
        teacherCode: existing?.teacherCode || (idx === 0 ? 'SH' : `STF${idx + 1}`),
        routineAbbreviation: existing?.routineAbbreviation || (idx === 0 ? 'S.H.' : ''),
        status: existing?.status || 'active',
        staffType: 'staff',
        designation: dirS.designation.slice(0, 80),
        indexNo: dirS.indexNo,
        phone: dirS.phone,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      byUid.set(uid, profile);
      syncedProfiles.push(profile);
    });

    const finalUsers = Array.from(byUid.values());
    setUsers(finalUsers);

    if (fbUser) {
      try {
        const batch = writeBatch(db);
        syncedProfiles.forEach((p) => {
          batch.set(doc(db, 'users', p.uid), p);
          batch.set(doc(db, 'teachers', p.uid), p);
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users/seedDirectoryTeachers');
      }
    }

    return syncedProfiles.length;
  }, [realAuthUser, currentUser, users, fbUser]);

  // 2. Manage Academic Years, Terms & Classes
  const createAcademicYear = useCallback(
    async (year: string, label: string, makeActive: boolean) => {
      const cleanYear = year.trim().slice(0, 16);
      const cleanLabel = (label.trim() || `Academic Session ${cleanYear}`).slice(0, 80);
      const id = sanitizeFirestoreId(`ay_${cleanYear}`, 64);
      const nowIso = new Date().toISOString();

      const newYear: AcademicYear = {
        id,
        year: cleanYear,
        label: cleanLabel,
        isActive: makeActive,
        createdAt: nowIso,
      };

      setAcademicYears((prev) => {
        const filtered = prev.filter((y) => y.id !== id);
        const mapped = makeActive ? filtered.map((y) => ({ ...y, isActive: false })) : filtered;
        return [newYear, ...mapped];
      });
      if (makeActive) setSelectedAcademicYearId(id);

      if (fbUser) {
        try {
          await setDoc(doc(db, 'academicYears', id), newYear);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `academicYears/${id}`);
        }
      }
    },
    [fbUser]
  );

  const setActiveAcademicYear = useCallback(
    async (yearId: string) => {
      setAcademicYears((prev) =>
        prev.map((y) => ({
          ...y,
          isActive: y.id === yearId,
        }))
      );
      setSelectedAcademicYearId(yearId);

      if (fbUser) {
        try {
          const target = academicYears.find((y) => y.id === yearId);
          if (target) {
            await setDoc(doc(db, 'academicYears', yearId), { ...target, isActive: true });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `academicYears/${yearId}`);
        }
      }
    },
    [academicYears, fbUser]
  );

  const createExamTerm = useCallback(
    async (input: {
      academicYearId: string;
      name: string;
      termType: ExamTermType;
      totalMarksDefault: number;
      isActive: boolean;
    }) => {
      const id = sanitizeFirestoreId(`term_${Date.now()}`, 64);
      const newTerm: ExamTerm = {
        id,
        academicYearId: sanitizeFirestoreId(input.academicYearId, 64),
        name: input.name.trim().slice(0, 100),
        termType: input.termType,
        totalMarksDefault: Math.min(200, Math.max(1, Number(input.totalMarksDefault) || 100)),
        isActive: input.isActive,
        createdAt: new Date().toISOString(),
      };

      setExamTerms((prev) => {
        const mapped = input.isActive ? prev.map((t) => ({ ...t, isActive: false })) : prev;
        return [...mapped, newTerm];
      });
      if (input.isActive) setSelectedTermId(id);

      if (fbUser) {
        try {
          await setDoc(doc(db, 'examTerms', id), newTerm);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `examTerms/${id}`);
        }
      }
    },
    [fbUser]
  );

  const setActiveExamTerm = useCallback(
    async (termId: string) => {
      setExamTerms((prev) =>
        prev.map((t) => ({
          ...t,
          isActive: t.id === termId,
        }))
      );
      setSelectedTermId(termId);

      if (fbUser) {
        try {
          const target = examTerms.find((t) => t.id === termId);
          if (target) {
            await setDoc(doc(db, 'examTerms', termId), { ...target, isActive: true });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `examTerms/${termId}`);
        }
      }
    },
    [examTerms, fbUser]
  );

  const toggleExamTermLock = useCallback(
    async (termId: string) => {
      const target = examTerms.find((t) => t.id === termId);
      if (!target) return;
      const nextLocked = !Boolean(target.isLocked);
      const updatedTerm: ExamTerm = {
        ...target,
        isLocked: nextLocked,
      };
      setExamTerms((prev) => prev.map((t) => (t.id === termId ? updatedTerm : t)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'examTerms', termId), updatedTerm);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `examTerms/${termId}`);
        }
      }
    },
    [examTerms, fbUser]
  );

  const deleteExamTerm = useCallback(
    async (termId: string) => {
      setExamTerms((prev) => prev.filter((t) => t.id !== termId));
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'examTerms', termId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `examTerms/${termId}`);
        }
      }
    },
    [fbUser]
  );

  const createClassSection = useCallback(
    async (input: {
      academicYearId: string;
      className: SchoolClassName;
      section: string;
      roomNumber: string;
      classTeacherUid?: string;
    }) => {
      const id = sanitizeFirestoreId(
        `cs_${input.academicYearId}_${input.className}_${input.section}_${Date.now()}`,
        64
      );
      const assignedTeacher = users.find((u) => u.uid === input.classTeacherUid);

      const newCs: ClassSection = {
        id,
        academicYearId: sanitizeFirestoreId(input.academicYearId, 64),
        className: input.className,
        section: input.section.trim().slice(0, 32),
        classTeacherUid: assignedTeacher ? assignedTeacher.uid : '',
        classTeacherName: assignedTeacher ? assignedTeacher.name : 'Unassigned',
        classTeacherCode: assignedTeacher ? assignedTeacher.teacherCode : '-',
        roomNumber: (input.roomNumber.trim() || 'TBD').slice(0, 32),
        isManualOverride: Boolean(assignedTeacher),
        createdAt: new Date().toISOString(),
      };

      setClassSections((prev) => [...prev, newCs]);

      if (fbUser) {
        try {
          await setDoc(doc(db, 'classSections', id), newCs);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `classSections/${id}`);
        }
      }
    },
    [users, fbUser]
  );

  const deleteClassSection = useCallback(
    async (classSectionId: string) => {
      setClassSections((prev) => prev.filter((c) => c.id !== classSectionId));
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'classSections', classSectionId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `classSections/${classSectionId}`);
        }
      }
    },
    [fbUser]
  );

  // 3. Class Teacher & Subject Assignment Matrix (with Manual Override support)
  const assignClassTeacher = useCallback(
    async (classSectionId: string, teacherUid: string, isManualOverride = true) => {
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs) return;

      const teacher = users.find((u) => u.uid === teacherUid);
      const updatedCs: ClassSection = {
        ...targetCs,
        classTeacherUid: teacher ? teacher.uid : '',
        classTeacherName: teacher ? teacher.name : 'Unassigned',
        classTeacherCode: teacher ? teacher.teacherCode : '-',
        isManualOverride: teacher ? isManualOverride : false,
      };

      setClassSections((prev) => prev.map((c) => (c.id === classSectionId ? updatedCs : c)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'classSections', classSectionId), updatedCs);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `classSections/${classSectionId}`);
        }
      }
    },
    [classSections, users, fbUser]
  );

  const createOrUpdateSubjectAssignment = useCallback(
    async (input: {
      id?: string;
      academicYearId: string;
      classSectionId: string;
      subjectCode: string;
      subjectName: string;
      teacherUid: string;
      maxMarks: number;
      isManualOverride?: boolean;
    }) => {
      const targetCs = classSections.find((c) => c.id === input.classSectionId);
      const teacher = users.find((u) => u.uid === input.teacherUid);
      if (!targetCs || !teacher) return;

      const existing = subjectAssignments.find(
        (a) =>
          (input.id && a.id === input.id) ||
          (a.classSectionId === input.classSectionId && a.subjectCode === input.subjectCode.trim())
      );

      const id = existing
        ? existing.id
        : input.id
          ? sanitizeFirestoreId(input.id, 64)
          : sanitizeFirestoreId(
              `asg_${input.classSectionId}_${input.subjectCode}_${Date.now()}`,
              64
            );

      const assignment: SubjectAssignment = {
        ...(existing || {}),
        id,
        academicYearId: sanitizeFirestoreId(input.academicYearId, 64),
        classSectionId: targetCs.id,
        className: targetCs.className,
        section: targetCs.section,
        subjectCode: input.subjectCode.trim().slice(0, 24),
        subjectName: input.subjectName.trim().slice(0, 100),
        teacherUid: teacher.uid,
        teacherName: teacher.name,
        teacherCode: teacher.teacherCode,
        maxMarks: Math.min(200, Math.max(1, Number(input.maxMarks) || 100)),
        isManualOverride: input.isManualOverride ?? true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      setSubjectAssignments((prev) => {
        const exists = prev.some((a) => a.id === id);
        if (exists) {
          return prev.map((a) => (a.id === id ? assignment : a));
        }
        return [...prev, assignment];
      });

      if (fbUser) {
        try {
          await setDoc(doc(db, 'subjectAssignments', id), assignment);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `subjectAssignments/${id}`);
        }
      }
    },
    [classSections, users, subjectAssignments, fbUser]
  );

  const deleteSubjectAssignment = useCallback(
    async (assignmentId: string) => {
      setSubjectAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'subjectAssignments', assignmentId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `subjectAssignments/${assignmentId}`);
        }
      }
    },
    [fbUser]
  );

  const syncAssignmentsFromRoutineNow = useCallback(async () => {
    const resetClasses = classSections.map((cs) =>
      cs.academicYearId === selectedAcademicYearId ? { ...cs, isManualOverride: false } : cs
    );
    const resetAsgs = subjectAssignments.map((a) =>
      a.academicYearId === selectedAcademicYearId ? { ...a, isManualOverride: false } : a
    );
    const derived = deriveClassTeachersAndSubjectAssignmentsFromRoutine({
      routineRecords,
      classSections: resetClasses,
      teachers: users,
      existingAssignments: resetAsgs,
      academicYearId: selectedAcademicYearId,
    });
    setClassSections(derived.updatedClassSections);
    setSubjectAssignments(derived.updatedSubjectAssignments);

    if (fbUser && isFullAdminUser(realAuthUser || currentUser)) {
      try {
        const batch = writeBatch(db);
        derived.updatedClassSections.forEach((cs) =>
          batch.set(doc(db, 'classSections', cs.id), cs)
        );
        derived.updatedSubjectAssignments.forEach((asg) =>
          batch.set(doc(db, 'subjectAssignments', asg.id), asg)
        );
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'syncAssignmentsFromRoutineNow');
      }
    }
    return {
      updatedSectionsCount: derived.updatedClassSections.length,
      updatedSubjectsCount: derived.updatedSubjectAssignments.length,
    };
  }, [
    classSections,
    subjectAssignments,
    routineRecords,
    users,
    selectedAcademicYearId,
    fbUser,
    realAuthUser,
    currentUser,
  ]);

  // Multi-Stage Marks Submission & Section Approval Workflow
  const submitSubjectMarksToClassTeacher = useCallback(
    async (assignmentId: string, termId: string) => {
      if (!currentUser) return;
      const target = subjectAssignments.find((a) => a.id === assignmentId);
      if (!target) return;
      if (!canManageSubjectMarks(currentUser, target, termId)) return;

      const nowIso = new Date().toISOString();
      const updated: SubjectAssignment = {
        ...target,
        statusByTerm: {
          ...(target.statusByTerm || {}),
          [termId]: 'submitted',
        },
        submittedAtByTerm: {
          ...(target.submittedAtByTerm || {}),
          [termId]: nowIso,
        },
        submittedByUidByTerm: {
          ...(target.submittedByUidByTerm || {}),
          [termId]: currentUser.uid,
        },
      };

      setSubjectAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'subjectAssignments', assignmentId), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `subjectAssignments/${assignmentId}`);
        }
      }
    },
    [currentUser, subjectAssignments, fbUser]
  );

  const unlockSubjectMarksToDraft = useCallback(
    async (assignmentId: string, termId: string) => {
      if (!isPrivilegedReviewerUser(currentUser)) return;
      const target = subjectAssignments.find((a) => a.id === assignmentId);
      if (!target) return;

      const updated: SubjectAssignment = {
        ...target,
        statusByTerm: {
          ...(target.statusByTerm || {}),
          [termId]: 'draft',
        },
      };

      setSubjectAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'subjectAssignments', assignmentId), updated);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `subjectAssignments/${assignmentId}`);
        }
      }
    },
    [currentUser, subjectAssignments, fbUser]
  );

  const submitSectionResultsForApproval = useCallback(
    async (classSectionId: string, termId: string) => {
      if (!currentUser) return;
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs) return;
      if (
        !isAssignedClassTeacherForSection(currentUser, targetCs) &&
        !isPrivilegedReviewerUser(currentUser)
      ) {
        return;
      }

      const nowIso = new Date().toISOString();
      const updatedCs: ClassSection = {
        ...targetCs,
        sectionResultStatusByTerm: {
          ...(targetCs.sectionResultStatusByTerm || {}),
          [termId]: 'submitted_for_approval',
        },
        sectionSubmittedAtByTerm: {
          ...(targetCs.sectionSubmittedAtByTerm || {}),
          [termId]: nowIso,
        },
      };

      setClassSections((prev) => prev.map((c) => (c.id === classSectionId ? updatedCs : c)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'classSections', classSectionId), updatedCs);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `classSections/${classSectionId}`);
        }
      }
    },
    [currentUser, classSections, fbUser]
  );

  const approveSectionResults = useCallback(
    async (classSectionId: string, termId: string) => {
      if (!currentUser || !isPrivilegedReviewerUser(currentUser)) return;
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs) return;

      const nowIso = new Date().toISOString();
      const updatedCs: ClassSection = {
        ...targetCs,
        sectionResultStatusByTerm: {
          ...(targetCs.sectionResultStatusByTerm || {}),
          [termId]: 'approved',
        },
        sectionApprovedAtByTerm: {
          ...(targetCs.sectionApprovedAtByTerm || {}),
          [termId]: nowIso,
        },
        sectionApprovedByUidByTerm: {
          ...(targetCs.sectionApprovedByUidByTerm || {}),
          [termId]: currentUser.uid,
        },
      };

      setClassSections((prev) => prev.map((c) => (c.id === classSectionId ? updatedCs : c)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'classSections', classSectionId), updatedCs);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `classSections/${classSectionId}`);
        }
      }
    },
    [currentUser, classSections, fbUser]
  );

  const unlockSectionResultsToDraft = useCallback(
    async (classSectionId: string, termId: string) => {
      if (!currentUser || !isPrivilegedReviewerUser(currentUser)) return;
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs) return;

      const updatedCs: ClassSection = {
        ...targetCs,
        sectionResultStatusByTerm: {
          ...(targetCs.sectionResultStatusByTerm || {}),
          [termId]: 'draft',
        },
      };

      setClassSections((prev) => prev.map((c) => (c.id === classSectionId ? updatedCs : c)));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'classSections', classSectionId), updatedCs);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `classSections/${classSectionId}`);
        }
      }
    },
    [currentUser, classSections, fbUser]
  );

  // 4. Master Student Roster Management
  const addSingleStudent = useCallback(
    async (input: {
      academicYearId: string;
      classSectionId: string;
      roll: number;
      name: string;
      group: StudentGroup;
      optionalSubject: string;
      guardianPhone?: string;
    }) => {
      const targetCs = classSections.find((c) => c.id === input.classSectionId);
      if (!targetCs) return;

      const id = sanitizeFirestoreId(
        `stu_${input.classSectionId}_r${input.roll}_${Date.now()}`,
        64
      );
      const newStudent = sanitizeStudentPayload({
        id,
        academicYearId: input.academicYearId,
        classSectionId: targetCs.id,
        className: targetCs.className,
        section: targetCs.section,
        roll: input.roll,
        name: input.name,
        group: input.group,
        optionalSubject: input.optionalSubject || 'None',
        guardianPhone: input.guardianPhone || '',
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      setStudents((prev) => [...prev, newStudent].sort((a, b) => a.roll - b.roll));

      if (fbUser) {
        try {
          await setDoc(doc(db, 'students', newStudent.id), newStudent);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `students/${newStudent.id}`);
        }
      }
    },
    [classSections, fbUser]
  );

  const bulkImportStudents = useCallback(
    async (academicYearId: string, classSectionId: string, rows: ParsedStudentRow[]) => {
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs || rows.length === 0) return 0;

      const nowIso = new Date().toISOString();
      const createdList: Student[] = rows.map((row, idx) => {
        const id = sanitizeFirestoreId(
          `stu_${classSectionId}_r${row.roll}_${Date.now()}_${idx}`,
          64
        );
        return sanitizeStudentPayload({
          id,
          academicYearId,
          classSectionId: targetCs.id,
          className: targetCs.className,
          section: targetCs.section,
          roll: row.roll,
          name: row.name,
          group: row.group,
          optionalSubject: row.optionalSubject || 'None',
          guardianPhone: row.guardianPhone || '',
          status: 'active',
          createdAt: nowIso,
        });
      });

      setStudents((prev) => {
        const incomingRolls = new Set(createdList.map((s) => s.roll));
        const filtered = prev.filter(
          (s) => !(s.classSectionId === classSectionId && incomingRolls.has(s.roll))
        );
        return [...filtered, ...createdList].sort((a, b) => a.roll - b.roll);
      });

      if (fbUser) {
        try {
          const batch = writeBatch(db);
          createdList.forEach((st) => {
            batch.set(doc(db, 'students', st.id), st);
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'students/bulkImport');
        }
      }

      return createdList.length;
    },
    [classSections, fbUser]
  );

  const updateStudentRecord = useCallback(
    async (
      studentId: string,
      updates: Partial<
        Pick<Student, 'roll' | 'name' | 'group' | 'optionalSubject' | 'guardianPhone' | 'status'>
      >
    ) => {
      const existing = students.find((s) => s.id === studentId);
      if (!existing) return;

      const updated = sanitizeStudentPayload({
        ...existing,
        ...updates,
      });

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? updated : s)).sort((a, b) => a.roll - b.roll)
      );

      if (fbUser) {
        try {
          await updateDoc(doc(db, 'students', studentId), {
            roll: updated.roll,
            name: updated.name,
            group: updated.group,
            optionalSubject: updated.optionalSubject,
            guardianPhone: updated.guardianPhone,
            status: updated.status,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
        }
      }
    },
    [students, fbUser]
  );

  const deleteStudentRecord = useCallback(
    async (studentId: string) => {
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'students', studentId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
        }
      }
    },
    [fbUser]
  );

  // 5. Attendance & Exam Marks Entry
  const saveAttendanceRecord = useCallback(
    async (input: {
      classSectionId: string;
      date: string;
      presentCount: number;
      absentCount: number;
      absentRolls: string;
    }) => {
      if (!currentUser) return;
      const targetCs = classSections.find((c) => c.id === input.classSectionId);
      if (!canManageClassRosterAndAttendance(currentUser, targetCs)) return;

      const id = sanitizeFirestoreId(`att_${input.classSectionId}_${input.date}`, 128);
      const record: AttendanceRecord = {
        id,
        classSectionId: sanitizeFirestoreId(input.classSectionId, 64),
        date: input.date.slice(0, 16),
        markedByUid: currentUser.uid,
        presentCount: Math.max(0, Math.floor(input.presentCount)),
        absentCount: Math.max(0, Math.floor(input.absentCount)),
        absentRolls: input.absentRolls.slice(0, 1000),
        updatedAt: new Date().toISOString(),
      };

      setAttendanceRecords((prev) => {
        const exists = prev.some((r) => r.id === id);
        return exists ? prev.map((r) => (r.id === id ? record : r)) : [record, ...prev];
      });

      if (fbUser) {
        try {
          await setDoc(doc(db, 'attendanceRecords', id), record);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `attendanceRecords/${id}`);
        }
      }
    },
    [currentUser, classSections, fbUser]
  );

  const clearAttendanceForDate = useCallback(
    async (classSectionId: string, date: string) => {
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!canManageClassRosterAndAttendance(currentUser, targetCs)) return;

      const id = sanitizeFirestoreId(`att_${classSectionId}_${date}`, 128);
      setAttendanceRecords((prev) =>
        prev.filter((r) => !(r.classSectionId === classSectionId && r.date === date))
      );
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'attendanceRecords', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `attendanceRecords/${id}`);
        }
      }
    },
    [currentUser, classSections, fbUser]
  );

  const toggleStudentAttendanceOnDate = useCallback(
    async (classSectionId: string, date: string, roll: number) => {
      if (!currentUser) return;
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!canManageClassRosterAndAttendance(currentUser, targetCs)) return;

      const existing = attendanceRecords.find(
        (r) => r.classSectionId === classSectionId && r.date === date
      );
      const classStudentCount = students.filter(
        (s) => s.classSectionId === classSectionId && s.status === 'active'
      ).length;
      const absentSet = parseAbsentRollsSet(existing?.absentRolls);
      if (absentSet.has(roll)) {
        absentSet.delete(roll);
      } else {
        absentSet.add(roll);
      }
      const absentCount = absentSet.size;
      const presentCount = Math.max(0, classStudentCount - absentCount);
      const absentRolls = serializeAbsentRolls(absentSet);

      await saveAttendanceRecord({
        classSectionId,
        date,
        presentCount,
        absentCount,
        absentRolls,
      });
    },
    [currentUser, classSections, attendanceRecords, students, saveAttendanceRecord]
  );

  const saveSubjectMarkRecord = useCallback(
    async (input: {
      assignmentId: string;
      termId: string;
      classSectionId: string;
      studentId: string;
      roll: number;
      studentName: string;
      writtenMarks: number;
      mcqMarks: number;
      practicalMarks: number;
      maxMarks: number;
    }) => {
      if (!currentUser) return;
      const targetTerm = examTerms.find((t) => t.id === input.termId);
      if (targetTerm?.isLocked && !isPrivilegedReviewerUser(currentUser)) {
        return;
      }

      const assignment = subjectAssignments.find((a) => a.id === input.assignmentId);
      // Enforce strict lock rule: if status is 'submitted', only privileged reviewers can edit!
      if (!canManageSubjectMarks(currentUser, assignment, input.termId)) {
        return;
      }

      const id = sanitizeFirestoreId(
        `mk_${input.assignmentId}_${input.termId}_${input.studentId}`,
        128
      );

      const spec = resolveSubjectSpec(
        assignment?.subjectCode,
        assignment?.subjectName,
        input.maxMarks
      );
      const evaluated = evaluateSubjectMarkComponents(
        {
          mcq: spec.mcqMax !== null ? input.mcqMarks : null,
          written: spec.writtenMax !== null ? input.writtenMarks : null,
          practical: spec.practicalMax !== null ? input.practicalMarks : null,
        },
        spec
      );

      const record: SubjectMarkRecord = {
        id,
        assignmentId: sanitizeFirestoreId(input.assignmentId, 64),
        termId: sanitizeFirestoreId(input.termId, 64),
        classSectionId: sanitizeFirestoreId(input.classSectionId, 64),
        studentId: sanitizeFirestoreId(input.studentId, 64),
        roll: input.roll,
        studentName: input.studentName.slice(0, 120),
        writtenMarks: evaluated.written ?? 0,
        mcqMarks: evaluated.mcq ?? 0,
        practicalMarks: evaluated.practical ?? 0,
        totalMarks: evaluated.totalMarks,
        letterGrade: evaluated.letterGrade,
        gpa: evaluated.gpa,
        updatedByUid: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      setSubjectMarks((prev) => {
        const exists = prev.some((m) => m.id === id);
        return exists ? prev.map((m) => (m.id === id ? record : m)) : [...prev, record];
      });

      if (fbUser) {
        try {
          await setDoc(doc(db, 'subjectMarks', id), record);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `subjectMarks/${id}`);
        }
      }
    },
    [currentUser, examTerms, subjectAssignments, fbUser]
  );

  const clearSubjectMarksForAssignment = useCallback(
    async (assignmentId: string, termId: string): Promise<SubjectMarkRecord[]> => {
      if (!currentUser) return [];
      const targetTerm = examTerms.find((t) => t.id === termId);
      if (targetTerm?.isLocked && !isPrivilegedReviewerUser(currentUser)) {
        return [];
      }
      const assignment = subjectAssignments.find((a) => a.id === assignmentId);
      if (!canManageSubjectMarks(currentUser, assignment, termId)) {
        return [];
      }

      const snapshot = subjectMarks
        .filter((m) => m.assignmentId === assignmentId && m.termId === termId)
        .map((m) => ({ ...m }));

      setSubjectMarks((prev) =>
        prev.filter((m) => !(m.assignmentId === assignmentId && m.termId === termId))
      );

      if (fbUser && snapshot.length > 0) {
        try {
          const batch = writeBatch(db);
          snapshot.forEach((m) => {
            batch.delete(doc(db, 'subjectMarks', m.id));
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'subjectMarks/clearAssignment');
        }
      }

      return snapshot;
    },
    [currentUser, examTerms, subjectAssignments, subjectMarks, fbUser]
  );

  const restoreSubjectMarksBatch = useCallback(
    async (records: SubjectMarkRecord[]) => {
      if (!currentUser || records.length === 0) return;
      setSubjectMarks((prev) => {
        const ids = new Set(records.map((r) => r.id));
        const filtered = prev.filter((m) => !ids.has(m.id));
        return [...filtered, ...records];
      });

      if (fbUser) {
        try {
          const batch = writeBatch(db);
          records.forEach((r) => {
            batch.set(doc(db, 'subjectMarks', r.id), r);
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'subjectMarks/restoreBatch');
        }
      }
    },
    [currentUser, fbUser]
  );

  const replaceRoutineRecords = useCallback(
    async (records: RoutineRecord[]) => {
      if (!records || records.length === 0) return;
      const sanitized: RoutineRecord[] = records.map((r, idx) => ({
        id: sanitizeFirestoreId(r.id || `rt_${String(idx + 1).padStart(3, '0')}`, 64),
        days: String(r.days || '(2-6)').slice(0, 32),
        className: String(r.className || 'IX-A').slice(0, 32),
        period: Math.min(10, Math.max(1, Math.floor(Number(r.period) || 1))),
        subject: String(r.subject || 'Subject').slice(0, 64),
        teacher: String(r.teacher || 'T.C.').slice(0, 32),
        updatedAt: r.updatedAt || new Date().toISOString(),
      }));

      const previousIds = new Set(routineRecords.map((r) => r.id));
      const nextIds = new Set(sanitized.map((r) => r.id));

      setRoutineRecords(sanitized);

      if (fbUser && isFullAdminUser(realAuthUser || currentUser)) {
        try {
          const batch = writeBatch(db);
          previousIds.forEach((oldId) => {
            if (!nextIds.has(oldId)) {
              batch.delete(doc(db, 'routineEntries', oldId));
            }
          });
          sanitized.forEach((rec) => {
            batch.set(doc(db, 'routineEntries', rec.id), rec);
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'routineEntries/replaceBatch');
        }
      }
    },
    [routineRecords, fbUser, realAuthUser, currentUser]
  );

  const saveRoutineRecord = useCallback(
    async (record: RoutineRecord) => {
      const clean: RoutineRecord = {
        id: sanitizeFirestoreId(record.id || `rt_${Date.now()}`, 64),
        days: record.days.trim().slice(0, 32) || '(2-6)',
        className: record.className.trim().toUpperCase().slice(0, 32),
        period: Math.min(10, Math.max(1, Math.floor(Number(record.period) || 1))),
        subject: record.subject.trim().slice(0, 64),
        teacher: record.teacher.trim().slice(0, 32),
        updatedAt: new Date().toISOString(),
      };

      setRoutineRecords((prev) => {
        const exists = prev.some((r) => r.id === clean.id);
        return exists ? prev.map((r) => (r.id === clean.id ? clean : r)) : [...prev, clean];
      });

      if (fbUser && isFullAdminUser(realAuthUser || currentUser)) {
        try {
          await setDoc(doc(db, 'routineEntries', clean.id), clean);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `routineEntries/${clean.id}`);
        }
      }
    },
    [fbUser, realAuthUser, currentUser]
  );

  const saveNotice = useCallback(
    async (input: {
      id?: string;
      title: string;
      date: string;
      category: string;
      isImportant: boolean;
      summary: string;
      content: string;
      publishedBy?: string;
    }) => {
      const cleanTitle = input.title.trim().slice(0, 200);
      if (!cleanTitle) return;
      const id = sanitizeFirestoreId(input.id || `notice_${Date.now()}`, 64);
      const record: NoticeRecord = {
        id,
        title: cleanTitle,
        date: (input.date.trim() || '২০২৬ শিক্ষাবর্ষ').slice(0, 40),
        category: (input.category.trim() || 'সাধারণ বিজ্ঞপ্তি').slice(0, 60),
        isImportant: Boolean(input.isImportant),
        summary: (input.summary.trim() || cleanTitle).slice(0, 400),
        content: (input.content.trim() || input.summary.trim() || cleanTitle).slice(0, 3000),
        publishedBy: (
          input.publishedBy?.trim() ||
          currentUser?.name ||
          'জনাব মর্জিনা আক্তার (প্রধান শিক্ষক)'
        ).slice(0, 120),
        updatedAt: new Date().toISOString(),
      };

      setNotices((prev) => {
        const exists = prev.some((n) => n.id === id);
        return exists ? prev.map((n) => (n.id === id ? record : n)) : [record, ...prev];
      });

      if (fbUser && isFullAdminUser(realAuthUser || currentUser)) {
        try {
          await setDoc(doc(db, 'notices', id), record);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `notices/${id}`);
        }
      }
    },
    [fbUser, realAuthUser, currentUser]
  );

  const deleteNotice = useCallback(
    async (noticeId: string) => {
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      if (fbUser && isFullAdminUser(realAuthUser || currentUser)) {
        try {
          await deleteDoc(doc(db, 'notices', noticeId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `notices/${noticeId}`);
        }
      }
    },
    [fbUser, realAuthUser, currentUser]
  );

  const value = useMemo<SchoolContextValue>(
    () => ({
      currentUser,
      realAuthUser,
      viewAsTeacherUid,
      setViewAsTeacherUid,
      authLoading,
      authError,
      isFirebaseAuthenticated: Boolean(fbUser),
      isSuperAdminSession,
      activeView,
      setActiveView,
      showPublicWebsite,
      setShowPublicWebsite,
      signInWithGoogle,
      enterSandboxAs,
      logout,
      theme,
      toggleTheme,
      numeralLocale,
      toggleNumeralLocale,
      num,
      users,
      academicYears,
      examTerms,
      classSections,
      subjectAssignments,
      students,
      attendanceRecords,
      subjectMarks,
      routineRecords,
      notices,
      selectedAcademicYearId,
      setSelectedAcademicYearId,
      selectedTermId,
      setSelectedTermId,
      selectedAttendanceClassSectionId,
      setSelectedAttendanceClassSectionId,
      selectedMarksAssignmentId,
      setSelectedMarksAssignmentId,
      finePerAbsentDay,
      setFinePerAbsentDay,
      holidays,
      toggleHolidayDate,
      updateUserRoleAndStatus,
      linkUserToTeacherProfile,
      createTeacherAccount,
      deleteTeacherAccount,
      seedDirectoryTeachers,
      createAcademicYear,
      setActiveAcademicYear,
      createExamTerm,
      setActiveExamTerm,
      toggleExamTermLock,
      deleteExamTerm,
      createClassSection,
      deleteClassSection,
      assignClassTeacher,
      createOrUpdateSubjectAssignment,
      deleteSubjectAssignment,
      syncAssignmentsFromRoutineNow,
      submitSubjectMarksToClassTeacher,
      unlockSubjectMarksToDraft,
      submitSectionResultsForApproval,
      approveSectionResults,
      unlockSectionResultsToDraft,
      addSingleStudent,
      bulkImportStudents,
      updateStudentRecord,
      deleteStudentRecord,
      saveAttendanceRecord,
      clearAttendanceForDate,
      toggleStudentAttendanceOnDate,
      saveSubjectMarkRecord,
      clearSubjectMarksForAssignment,
      restoreSubjectMarksBatch,
      replaceRoutineRecords,
      saveRoutineRecord,
      saveNotice,
      deleteNotice,
      seedFirestoreDefaults,
    }),
    [
      currentUser,
      realAuthUser,
      viewAsTeacherUid,
      authLoading,
      authError,
      fbUser,
      isSuperAdminSession,
      activeView,
      showPublicWebsite,
      signInWithGoogle,
      enterSandboxAs,
      logout,
      theme,
      toggleTheme,
      numeralLocale,
      toggleNumeralLocale,
      num,
      users,
      academicYears,
      examTerms,
      classSections,
      subjectAssignments,
      students,
      attendanceRecords,
      subjectMarks,
      routineRecords,
      notices,
      selectedAcademicYearId,
      selectedTermId,
      selectedAttendanceClassSectionId,
      selectedMarksAssignmentId,
      finePerAbsentDay,
      setFinePerAbsentDay,
      holidays,
      toggleHolidayDate,
      updateUserRoleAndStatus,
      linkUserToTeacherProfile,
      createTeacherAccount,
      deleteTeacherAccount,
      seedDirectoryTeachers,
      createAcademicYear,
      setActiveAcademicYear,
      createExamTerm,
      setActiveExamTerm,
      toggleExamTermLock,
      deleteExamTerm,
      createClassSection,
      deleteClassSection,
      assignClassTeacher,
      createOrUpdateSubjectAssignment,
      deleteSubjectAssignment,
      syncAssignmentsFromRoutineNow,
      submitSubjectMarksToClassTeacher,
      unlockSubjectMarksToDraft,
      submitSectionResultsForApproval,
      approveSectionResults,
      unlockSectionResultsToDraft,
      addSingleStudent,
      bulkImportStudents,
      updateStudentRecord,
      deleteStudentRecord,
      saveAttendanceRecord,
      clearAttendanceForDate,
      toggleStudentAttendanceOnDate,
      saveSubjectMarkRecord,
      clearSubjectMarksForAssignment,
      restoreSubjectMarksBatch,
      replaceRoutineRecords,
      saveRoutineRecord,
      saveNotice,
      deleteNotice,
      seedFirestoreDefaults,
    ]
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

export function useSchool(): SchoolContextValue {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return ctx;
}
