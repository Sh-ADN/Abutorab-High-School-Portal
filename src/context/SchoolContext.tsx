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
  calculateGradeAndGpa,
  deriveTeacherCode,
  formatNumeral,
  resolveInitialUserRole,
  sanitizeFirestoreId,
  sanitizeStudentPayload,
} from '../utils/schoolLogic';

import { parseAbsentRollsSet, serializeAbsentRolls } from '../utils/attendanceAnalytics';
import { evaluateSubjectMarkComponents, resolveSubjectSpec } from '../utils/marksCatalogAndLogic';
import { SEED_ROUTINE_RECORDS } from '../utils/routineAndStatsLogic';
import { PUBLIC_TEACHERS_DIRECTORY, SEED_NOTICES } from '../data/schoolWebsiteData';

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

interface SchoolContextValue {
  // Auth & User State
  currentUser: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  isFirebaseAuthenticated: boolean;
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

  // Admin: Teacher Management
  updateUserRoleAndStatus: (
    uid: string,
    updates: {
      role?: UserRole;
      status?: AccountStatus;
      teacherCode?: string;
      designation?: string;
      name?: string;
    }
  ) => Promise<void>;
  createTeacherAccount: (input: {
    name: string;
    email: string;
    teacherCode?: string;
    designation?: string;
    role?: UserRole;
  }) => Promise<void>;
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

  // Admin: Assignment Matrix
  assignClassTeacher: (classSectionId: string, teacherUid: string) => Promise<void>;
  createOrUpdateSubjectAssignment: (input: {
    id?: string;
    academicYearId: string;
    classSectionId: string;
    subjectCode: string;
    subjectName: string;
    teacherUid: string;
    maxMarks: number;
  }) => Promise<void>;
  deleteSubjectAssignment: (assignmentId: string) => Promise<void>;

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
    updates: Partial<Pick<Student, 'roll' | 'name' | 'group' | 'optionalSubject' | 'guardianPhone' | 'status'>>
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

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Support ?autostart=1 for automated testing or quick preview
  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [sandboxUid, setSandboxUid] = useState<string | null>(
    initialAutostart ? 'usr_admin_ad' : null
  );
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

  // Application Data State (Seeded locally and synced with Firestore when signed in via Firebase)
  const [users, setUsers] = useState<UserProfile[]>(SEED_USERS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(SEED_ACADEMIC_YEARS);
  const [examTerms, setExamTerms] = useState<ExamTerm[]>(SEED_EXAM_TERMS);
  const [classSections, setClassSections] = useState<ClassSection[]>(SEED_CLASS_SECTIONS);
  const [subjectAssignments, setSubjectAssignments] =
    useState<SubjectAssignment[]>(SEED_SUBJECT_ASSIGNMENTS);
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

  // Firebase Auth listener & automatic user profile provisioning in Firestore users/{uid}
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
        const email = (user.email || '').trim();
        const initialRole = resolveInitialUserRole(email);
        const displayName = (user.displayName || email.split('@')[0] || 'Teacher').slice(0, 120);
        const derivedCode = deriveTeacherCode(displayName);

        if (!userSnap || !userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            name: displayName,
            email: email || 'teacher@aths.edu.bd',
            photoURL: (user.photoURL || '').slice(0, 500),
            role: initialRole,
            teacherCode: derivedCode,
            status: 'active',
            designation:
              initialRole === 'admin'
                ? 'System Administrator & Senior Faculty'
                : 'Assistant Teacher',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          try {
            await setDoc(userDocRef, newProfile);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          }
        } else {
          // Ensure ananneyadebnath@gmail.com always has admin & active status
          const existingData = userSnap.data() as UserProfile;
          if (
            email.toLowerCase() === 'ananneyadebnath@gmail.com' &&
            (existingData.role !== 'admin' || existingData.status !== 'active')
          ) {
            const updatedAdmin: UserProfile = {
              ...existingData,
              role: 'admin',
              status: 'active',
              updatedAt: nowIso,
            };
            try {
              await setDoc(userDocRef, updatedAdmin);
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

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!snap.empty) {
          setUsers(snap.docs.map((d) => d.data() as UserProfile));
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

  const currentUser = useMemo<UserProfile | null>(() => {
    if (fbUser) {
      const found = users.find((u) => u.uid === fbUser.uid);
      if (found) return found;
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
        designation: role === 'admin' ? 'System Administrator' : 'Assistant Teacher',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (sandboxUid) {
      return users.find((u) => u.uid === sandboxUid) || SEED_USERS[0];
    }
    return null;
  }, [fbUser, sandboxUid, users]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setSandboxUid(null);
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
    setShowPublicWebsite(false);
  }, []);

  const logout = useCallback(async () => {
    setSandboxUid(null);
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
      SEED_USERS.forEach((u) => batch.set(doc(db, 'users', u.uid), u));
      SEED_ACADEMIC_YEARS.forEach((y) => batch.set(doc(db, 'academicYears', y.id), y));
      SEED_EXAM_TERMS.forEach((t) => batch.set(doc(db, 'examTerms', t.id), t));
      SEED_CLASS_SECTIONS.forEach((c) => batch.set(doc(db, 'classSections', c.id), c));
      SEED_SUBJECT_ASSIGNMENTS.forEach((a) => batch.set(doc(db, 'subjectAssignments', a.id), a));
      SEED_STUDENTS.forEach((s) => batch.set(doc(db, 'students', s.id), s));
      SEED_ROUTINE_RECORDS.forEach((r) => batch.set(doc(db, 'routineEntries', r.id), r));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedDefaults');
    }
  }, [fbUser]);

  // 1. Manage Teachers & Admins (Restricted to role === 'admin')
  const updateUserRoleAndStatus = useCallback(
    async (
      uid: string,
      updates: {
        role?: UserRole;
        status?: AccountStatus;
        teacherCode?: string;
        designation?: string;
        name?: string;
      }
    ) => {
      if (currentUser?.role !== 'admin') return;
      const target = users.find((u) => u.uid === uid);
      if (!target) return;

      const updated: UserProfile = {
        ...target,
        role: updates.role ?? target.role,
        status: updates.status ?? target.status,
        teacherCode: (updates.teacherCode ?? target.teacherCode)
          .trim()
          .toUpperCase()
          .slice(0, 12) || 'TCH',
        designation: (updates.designation ?? target.designation).trim().slice(0, 80),
        name: (updates.name ?? target.name).trim().slice(0, 120),
        updatedAt: new Date().toISOString(),
      };

      setUsers((prev) => prev.map((u) => (u.uid === uid ? updated : u)));

      // Also keep teacherCode & teacherName synced in classSections & subjectAssignments
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
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      }
    },
    [currentUser, users, fbUser]
  );

  const createTeacherAccount = useCallback(
    async (input: {
      name: string;
      email: string;
      teacherCode?: string;
      designation?: string;
      role?: UserRole;
    }) => {
      const cleanName = input.name.trim().slice(0, 120);
      const cleanEmail = input.email.trim().toLowerCase().slice(0, 160);
      if (!cleanName || !cleanEmail) return;

      const uid = sanitizeFirestoreId(`usr_${Date.now()}`, 64);
      const role: UserRole =
        cleanEmail === 'ananneyadebnath@gmail.com' ? 'admin' : input.role || 'teacher';
      const code =
        (input.teacherCode || deriveTeacherCode(cleanName)).trim().toUpperCase().slice(0, 12) ||
        'TCH';
      const nowIso = new Date().toISOString();

      const newProfile: UserProfile = {
        uid,
        name: cleanName,
        email: cleanEmail,
        photoURL: '',
        role,
        teacherCode: code,
        status: 'active',
        designation: (input.designation || 'Assistant Teacher').trim().slice(0, 80),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setUsers((prev) => [...prev, newProfile]);

      if (fbUser) {
        try {
          await setDoc(doc(db, 'users', uid), newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }
    },
    [fbUser]
  );

  const seedDirectoryTeachers = useCallback(async (): Promise<number> => {
    if (currentUser?.role !== 'admin') return 0;
    const nowIso = new Date().toISOString();
    const mergedByEmail = new Map<string, UserProfile>();

    users.forEach((u) => {
      mergedByEmail.set(u.email.toLowerCase(), u);
    });

    const syncedProfiles: UserProfile[] = [];

    PUBLIC_TEACHERS_DIRECTORY.forEach((dirT, idx) => {
      const fallbackEmail = `teacher.${dirT.teacherCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@aths.edu.bd`;
      const emailLower = (dirT.email || fallbackEmail).trim().toLowerCase();
      const existing =
        mergedByEmail.get(emailLower) ||
        users.find((u) => u.teacherCode.toUpperCase() === dirT.teacherCode.toUpperCase());

      const isSuperAdmin = emailLower === 'ananneyadebnath@gmail.com';
      const uid = existing
        ? existing.uid
        : sanitizeFirestoreId(`usr_dir_${idx + 1}_${dirT.teacherCode}`, 64);

      const profile: UserProfile = {
        uid,
        name: (existing?.name || dirT.name).slice(0, 120),
        email: emailLower,
        photoURL: (dirT.photoUrl || existing?.photoURL || '').slice(0, 500),
        role: isSuperAdmin ? 'admin' : existing?.role || (idx === 0 ? 'admin' : 'teacher'),
        teacherCode: dirT.teacherCode.trim().toUpperCase().slice(0, 12),
        status: existing?.status || 'active',
        designation: `${dirT.designation} — ${dirT.subject}`.slice(0, 80),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      mergedByEmail.set(emailLower, profile);
      syncedProfiles.push(profile);
    });

    const finalUsers = Array.from(mergedByEmail.values());
    setUsers(finalUsers);

    if (fbUser) {
      try {
        const batch = writeBatch(db);
        syncedProfiles.forEach((p) => {
          batch.set(doc(db, 'users', p.uid), p);
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users/seedDirectoryTeachers');
      }
    }

    return syncedProfiles.length;
  }, [currentUser, users, fbUser]);

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

  // 3. Class Teacher & Subject Assignment Matrix
  const assignClassTeacher = useCallback(
    async (classSectionId: string, teacherUid: string) => {
      const targetCs = classSections.find((c) => c.id === classSectionId);
      if (!targetCs) return;

      const teacher = users.find((u) => u.uid === teacherUid);
      const updatedCs: ClassSection = {
        ...targetCs,
        classTeacherUid: teacher ? teacher.uid : '',
        classTeacherName: teacher ? teacher.name : 'Unassigned',
        classTeacherCode: teacher ? teacher.teacherCode : '-',
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
    }) => {
      const targetCs = classSections.find((c) => c.id === input.classSectionId);
      const teacher = users.find((u) => u.uid === input.teacherUid);
      if (!targetCs || !teacher) return;

      const id = input.id
        ? sanitizeFirestoreId(input.id, 64)
        : sanitizeFirestoreId(
            `asg_${input.classSectionId}_${input.subjectCode}_${Date.now()}`,
            64
          );

      const assignment: SubjectAssignment = {
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
        createdAt: new Date().toISOString(),
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
    [classSections, users, fbUser]
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
        // Replace existing students with the same roll in that classSection or append
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
    [currentUser, fbUser]
  );

  const clearAttendanceForDate = useCallback(
    async (classSectionId: string, date: string) => {
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
    [fbUser]
  );

  const toggleStudentAttendanceOnDate = useCallback(
    async (classSectionId: string, date: string, roll: number) => {
      if (!currentUser) return;
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
    [currentUser, attendanceRecords, students, saveAttendanceRecord]
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
      if (targetTerm?.isLocked && currentUser.role !== 'admin') {
        return;
      }

      const id = sanitizeFirestoreId(
        `mk_${input.assignmentId}_${input.termId}_${input.studentId}`,
        128
      );

      const assignment = subjectAssignments.find((a) => a.id === input.assignmentId);
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
      if (targetTerm?.isLocked && currentUser.role !== 'admin') {
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
    [currentUser, examTerms, subjectMarks, fbUser]
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

      if (fbUser && currentUser?.role === 'admin') {
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
    [routineRecords, fbUser, currentUser]
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

      if (fbUser && currentUser?.role === 'admin') {
        try {
          await setDoc(doc(db, 'routineEntries', clean.id), clean);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `routineEntries/${clean.id}`);
        }
      }
    },
    [fbUser, currentUser]
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

      if (fbUser && currentUser?.role === 'admin') {
        try {
          await setDoc(doc(db, 'notices', id), record);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `notices/${id}`);
        }
      }
    },
    [fbUser, currentUser]
  );

  const deleteNotice = useCallback(
    async (noticeId: string) => {
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      if (fbUser && currentUser?.role === 'admin') {
        try {
          await deleteDoc(doc(db, 'notices', noticeId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `notices/${noticeId}`);
        }
      }
    },
    [fbUser, currentUser]
  );

  const value = useMemo<SchoolContextValue>(
    () => ({
      currentUser,
      authLoading,
      authError,
      isFirebaseAuthenticated: Boolean(fbUser),
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
      createTeacherAccount,
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
      authLoading,
      authError,
      fbUser,
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
      createTeacherAccount,
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
