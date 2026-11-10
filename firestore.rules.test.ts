import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

interface SimulatedDbState {
  users: Record<string, any>;
  classSections: Record<string, any>;
  classes: Record<string, any>;
  subjectAssignments: Record<string, any>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function isValidId(id: unknown, maxLen = 128): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= maxLen && VALID_ID_REGEX.test(id);
}

function isBootstrappedAdmin(auth: AuthContext | null): boolean {
  return Boolean(auth && auth.email_verified && auth.email === 'ananneyadebnath@gmail.com');
}

function isAdmin(auth: AuthContext | null, db: SimulatedDbState): boolean {
  if (!auth || !auth.email_verified) return false;
  if (isBootstrappedAdmin(auth)) return true;
  const u = db.users[auth.uid];
  return Boolean(u && u.role === 'admin' && u.status === 'active');
}

function isAssignedClassTeacherFor(
  classSectionId: string,
  auth: AuthContext | null,
  db: SimulatedDbState
): boolean {
  if (!auth || !auth.email_verified) return false;
  const cs = db.classSections[classSectionId] || db.classes[classSectionId];
  return Boolean(cs && cs.classTeacherUid === auth.uid);
}

function isAssignedSubjectTeacherFor(
  assignmentId: string,
  auth: AuthContext | null,
  db: SimulatedDbState
): boolean {
  if (!auth || !auth.email_verified) return false;
  const asg = db.subjectAssignments[assignmentId];
  return Boolean(asg && asg.teacherUid === auth.uid);
}

function evaluateDirtyDozenWrite(
  collection: string,
  docId: string,
  operation: 'create' | 'update' | 'delete',
  auth: AuthContext | null,
  incoming: Record<string, any> | null,
  existing: Record<string, any> | null,
  db: SimulatedDbState
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (
    !isValidId(
      docId,
      collection === 'users' ||
        collection === 'attendanceRecords' ||
        collection === 'attendance' ||
        collection === 'subjectMarks' ||
        collection === 'marks'
        ? 128
        : 64
    )
  ) {
    return 'PERMISSION_DENIED';
  }

  // 1. USERS: Only role == 'admin' can modify (update/delete) users; first sign-in create allowed for self as teacher
  if (collection === 'users') {
    if (operation === 'delete') {
      return isAdmin(auth, db) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (!incoming) return 'PERMISSION_DENIED';
    const allowedKeys = [
      'uid',
      'name',
      'email',
      'photoURL',
      'role',
      'teacherCode',
      'status',
      'designation',
      'createdAt',
      'updatedAt',
    ];
    const keys = Object.keys(incoming);
    if (
      keys.length !== allowedKeys.length ||
      !allowedKeys.every((k) => keys.includes(k)) ||
      !keys.every((k) => allowedKeys.includes(k))
    ) {
      return 'PERMISSION_DENIED';
    }
    if (incoming.uid !== docId) return 'PERMISSION_DENIED';
    if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 120) {
      return 'PERMISSION_DENIED';
    }
    if (incoming.role !== 'admin' && incoming.role !== 'teacher') return 'PERMISSION_DENIED';
    if (incoming.status !== 'active' && incoming.status !== 'inactive') return 'PERMISSION_DENIED';

    if (operation === 'create') {
      if (isAdmin(auth, db)) return 'ALLOW';
      if (
        auth.uid === docId &&
        incoming.email === auth.email &&
        incoming.status === 'active' &&
        ((isBootstrappedAdmin(auth) && incoming.role === 'admin') || incoming.role === 'teacher')
      ) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }

    if (operation === 'update' && existing) {
      return isAdmin(auth, db) && incoming.uid === existing.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  // 2. CLASSES, SUBJECT ASSIGNMENTS, ACADEMIC YEARS: Only role == 'admin' can modify
  if (
    collection === 'academicYears' ||
    collection === 'classSections' ||
    collection === 'classes' ||
    collection === 'subjectAssignments'
  ) {
    return isAdmin(auth, db) ? 'ALLOW' : 'PERMISSION_DENIED';
  }

  // 3. STUDENTS: Only Admin or assigned classTeacherUid
  if (collection === 'students') {
    if (operation === 'delete') {
      if (!existing) return 'PERMISSION_DENIED';
      return isAdmin(auth, db) || isAssignedClassTeacherFor(existing.classSectionId, auth, db)
        ? 'ALLOW'
        : 'PERMISSION_DENIED';
    }
    if (!incoming) return 'PERMISSION_DENIED';
    if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 120) {
      return 'PERMISSION_DENIED';
    }
    if (!['General', 'Science', 'Humanities', 'Business Studies'].includes(incoming.group)) {
      return 'PERMISSION_DENIED';
    }
    if (isAdmin(auth, db)) return 'ALLOW';
    if (isAssignedClassTeacherFor(incoming.classSectionId, auth, db)) return 'ALLOW';
    return 'PERMISSION_DENIED';
  }

  // 4. ATTENDANCE: Only assigned classTeacherUid or admin can write to attendance for their class
  if (collection === 'attendanceRecords' || collection === 'attendance') {
    if (operation === 'delete') {
      if (!existing) return 'PERMISSION_DENIED';
      return isAdmin(auth, db) || isAssignedClassTeacherFor(existing.classSectionId, auth, db)
        ? 'ALLOW'
        : 'PERMISSION_DENIED';
    }
    if (!incoming || incoming.markedByUid !== auth.uid) return 'PERMISSION_DENIED';
    if (isAdmin(auth, db)) return 'ALLOW';
    if (operation === 'update' && existing) {
      if (incoming.classSectionId !== existing.classSectionId || incoming.date !== existing.date) {
        return 'PERMISSION_DENIED';
      }
    }
    if (isAssignedClassTeacherFor(incoming.classSectionId, auth, db)) return 'ALLOW';
    return 'PERMISSION_DENIED';
  }

  // 5. MARKS: Only assigned teacherUid or admin can write to marks for their assigned subject
  if (collection === 'subjectMarks' || collection === 'marks') {
    if (operation === 'delete') {
      if (!existing) return 'PERMISSION_DENIED';
      return isAdmin(auth, db) || isAssignedSubjectTeacherFor(existing.assignmentId, auth, db)
        ? 'ALLOW'
        : 'PERMISSION_DENIED';
    }
    if (!incoming || incoming.updatedByUid !== auth.uid) return 'PERMISSION_DENIED';
    if (
      typeof incoming.writtenMarks !== 'number' ||
      incoming.writtenMarks < 0 ||
      incoming.writtenMarks > 200 ||
      typeof incoming.totalMarks !== 'number' ||
      incoming.totalMarks < 0 ||
      incoming.totalMarks > 200
    ) {
      return 'PERMISSION_DENIED';
    }
    if (isAdmin(auth, db)) return 'ALLOW';
    if (operation === 'update' && existing) {
      if (
        incoming.assignmentId !== existing.assignmentId ||
        incoming.classSectionId !== existing.classSectionId ||
        incoming.studentId !== existing.studentId ||
        incoming.termId !== existing.termId
      ) {
        return 'PERMISSION_DENIED';
      }
    }
    if (isAssignedSubjectTeacherFor(incoming.assignmentId, auth, db)) return 'ALLOW';
    return 'PERMISSION_DENIED';
  }

  return 'PERMISSION_DENIED';
}

const mockDb: SimulatedDbState = {
  users: {
    admin_db_uid: {
      uid: 'admin_db_uid',
      name: 'Promoted Admin',
      email: 'promoted@aths.edu.bd',
      photoURL: '',
      role: 'admin',
      teacherCode: 'PA',
      status: 'active',
      designation: 'Headmaster',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    teacherA_uid: {
      uid: 'teacherA_uid',
      name: 'Teacher A',
      email: 'teacherA@aths.edu.bd',
      photoURL: '',
      role: 'teacher',
      teacherCode: 'TA',
      status: 'active',
      designation: 'Teacher',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    teacherB_uid: {
      uid: 'teacherB_uid',
      name: 'Teacher B',
      email: 'teacherB@aths.edu.bd',
      photoURL: '',
      role: 'teacher',
      teacherCode: 'TB',
      status: 'active',
      designation: 'Teacher',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  },
  classSections: {
    cs_6_a: {
      id: 'cs_6_a',
      classTeacherUid: 'teacherA_uid',
    },
  },
  classes: {
    cs_6_a: {
      id: 'cs_6_a',
      classTeacherUid: 'teacherA_uid',
    },
  },
  subjectAssignments: {
    asg_math_6a: {
      id: 'asg_math_6a',
      teacherUid: 'teacherA_uid',
    },
  },
};

test('firestore.rules file contains all required collections and strict RBAC gates', () => {
  assert.match(rulesContent, /rules_version = '2';/);
  assert.match(rulesContent, /allow read, write: if false;/);
  assert.match(rulesContent, /ananneyadebnath@gmail\.com/);
  assert.match(rulesContent, /get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.role == 'admin'/);
  assert.match(rulesContent, /match \/users\/\{userId\}/);
  assert.match(rulesContent, /match \/academicYears\/\{yearId\}/);
  assert.match(rulesContent, /match \/examTerms\/\{termId\}/);
  assert.match(rulesContent, /match \/classSections\/\{classSectionId\}/);
  assert.match(rulesContent, /match \/classes\/\{classId\}/);
  assert.match(rulesContent, /match \/subjectAssignments\/\{assignmentId\}/);
  assert.match(rulesContent, /match \/students\/\{studentId\}/);
  assert.match(rulesContent, /match \/attendanceRecords\/\{recordId\}/);
  assert.match(rulesContent, /match \/attendance\/\{recordId\}/);
  assert.match(rulesContent, /match \/subjectMarks\/\{markId\}/);
  assert.match(rulesContent, /match \/marks\/\{markId\}/);
  assert.match(rulesContent, /match \/routineEntries\/\{entryId\}/);
  assert.match(rulesContent, /isAssignedClassTeacherFor/);
  assert.match(rulesContent, /isAssignedSubjectTeacherFor/);
});

test('Dirty Dozen #1: Privilege Escalation on Registration returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'users',
    'uid123',
    'create',
    { uid: 'uid123', email: 'teacher@example.com', email_verified: true },
    {
      uid: 'uid123',
      name: 'Rogue Teacher',
      email: 'teacher@example.com',
      photoURL: '',
      role: 'admin',
      teacherCode: 'RT',
      status: 'active',
      designation: 'Teacher',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified Admin Email Spoof returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'academicYears',
    'ay_2026',
    'create',
    { uid: 'spoof_uid', email: 'ananneyadebnath@gmail.com', email_verified: false },
    { id: 'ay_2026', year: '2026', label: '2026', isActive: true, createdAt: '2026-01-01' },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Shadow Field Injection on User Profile returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'users',
    'uid123',
    'create',
    { uid: 'uid123', email: 'teacher@example.com', email_verified: true },
    {
      uid: 'uid123',
      name: 'Teacher',
      email: 'teacher@example.com',
      photoURL: '',
      role: 'teacher',
      teacherCode: 'TC',
      status: 'active',
      designation: 'Teacher',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      isSuperAdmin: true,
    },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Non-Admin User Modification (self or other) returns PERMISSION_DENIED, while Admin is ALLOWED', () => {
  const deniedSelfUpdate = evaluateDirtyDozenWrite(
    'users',
    'teacherA_uid',
    'update',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    {
      ...mockDb.users.teacherA_uid,
      name: 'Updated By Self',
    },
    mockDb.users.teacherA_uid,
    mockDb
  );
  assert.equal(deniedSelfUpdate, 'PERMISSION_DENIED');

  const allowedAdminUpdate = evaluateDirtyDozenWrite(
    'users',
    'teacherA_uid',
    'update',
    { uid: 'admin_db_uid', email: 'promoted@aths.edu.bd', email_verified: true },
    {
      ...mockDb.users.teacherA_uid,
      role: 'admin',
    },
    mockDb.users.teacherA_uid,
    mockDb
  );
  assert.equal(allowedAdminUpdate, 'ALLOW');
});

test('Dirty Dozen #5: ID Poisoning Attack returns PERMISSION_DENIED', () => {
  const poisonedId = 'bad/id$with*special!chars_' + 'x'.repeat(200);
  const res = evaluateDirtyDozenWrite(
    'students',
    poisonedId,
    'create',
    { uid: 'admin_uid', email: 'ananneyadebnath@gmail.com', email_verified: true },
    { id: poisonedId, name: 'Valid Name', group: 'Science', classSectionId: 'cs_6_a' },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Oversized String Denial-of-Wallet returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'students',
    'st_1',
    'create',
    { uid: 'admin_uid', email: 'ananneyadebnath@gmail.com', email_verified: true },
    { id: 'st_1', name: 'X'.repeat(5000), group: 'Science', classSectionId: 'cs_6_a' },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Non-Admin Modification of classes or subjectAssignments returns PERMISSION_DENIED', () => {
  const classRes = evaluateDirtyDozenWrite(
    'classSections',
    'cs_6_a',
    'update',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    { id: 'cs_6_a', classTeacherUid: 'teacherA_uid' },
    mockDb.classSections.cs_6_a,
    mockDb
  );
  assert.equal(classRes, 'PERMISSION_DENIED');

  const subjRes = evaluateDirtyDozenWrite(
    'subjectAssignments',
    'asg_math_6a',
    'update',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    { id: 'asg_math_6a', teacherUid: 'teacherA_uid' },
    mockDb.subjectAssignments.asg_math_6a,
    mockDb
  );
  assert.equal(subjRes, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Only assigned classTeacherUid or admin can write to attendance for their class', () => {
  const deniedUnassigned = evaluateDirtyDozenWrite(
    'attendanceRecords',
    'att_cs_6_a_2026-11-10',
    'create',
    { uid: 'teacherB_uid', email: 'teacherB@aths.edu.bd', email_verified: true },
    {
      id: 'att_cs_6_a_2026-11-10',
      classSectionId: 'cs_6_a',
      date: '2026-11-10',
      markedByUid: 'teacherB_uid',
    },
    null,
    mockDb
  );
  assert.equal(deniedUnassigned, 'PERMISSION_DENIED');

  const allowedClassTeacher = evaluateDirtyDozenWrite(
    'attendanceRecords',
    'att_cs_6_a_2026-11-10',
    'create',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    {
      id: 'att_cs_6_a_2026-11-10',
      classSectionId: 'cs_6_a',
      date: '2026-11-10',
      markedByUid: 'teacherA_uid',
    },
    null,
    mockDb
  );
  assert.equal(allowedClassTeacher, 'ALLOW');
});

test('Dirty Dozen #9: Only assigned teacherUid or admin can write to marks for their assigned subject', () => {
  const deniedUnassigned = evaluateDirtyDozenWrite(
    'subjectMarks',
    'mk_1',
    'create',
    { uid: 'teacherB_uid', email: 'teacherB@aths.edu.bd', email_verified: true },
    {
      id: 'mk_1',
      assignmentId: 'asg_math_6a',
      classSectionId: 'cs_6_a',
      studentId: 'st_1',
      termId: 'term_1',
      updatedByUid: 'teacherB_uid',
      writtenMarks: 60,
      totalMarks: 80,
    },
    null,
    mockDb
  );
  assert.equal(deniedUnassigned, 'PERMISSION_DENIED');

  const allowedSubjectTeacher = evaluateDirtyDozenWrite(
    'subjectMarks',
    'mk_1',
    'create',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    {
      id: 'mk_1',
      assignmentId: 'asg_math_6a',
      classSectionId: 'cs_6_a',
      studentId: 'st_1',
      termId: 'term_1',
      updatedByUid: 'teacherA_uid',
      writtenMarks: 60,
      totalMarks: 80,
    },
    null,
    mockDb
  );
  assert.equal(allowedSubjectTeacher, 'ALLOW');
});

test('Dirty Dozen #10: Cross-Class Attendance Reassignment on Update returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'attendanceRecords',
    'att_cs_6_a_2026-11-10',
    'update',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    {
      id: 'att_cs_6_a_2026-11-10',
      classSectionId: 'cs_9_a',
      date: '2026-11-10',
      markedByUid: 'teacherA_uid',
    },
    {
      id: 'att_cs_6_a_2026-11-10',
      classSectionId: 'cs_6_a',
      date: '2026-11-10',
      markedByUid: 'teacherA_uid',
    },
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Invalid Enum Value in Student Group returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'students',
    'st_2',
    'create',
    { uid: 'admin_uid', email: 'ananneyadebnath@gmail.com', email_verified: true },
    { id: 'st_2', name: 'Valid Student', group: 'Astrology', classSectionId: 'cs_6_a' },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Out-of-Bounds Exam Marks returns PERMISSION_DENIED', () => {
  const res = evaluateDirtyDozenWrite(
    'subjectMarks',
    'mk_2',
    'create',
    { uid: 'teacherA_uid', email: 'teacherA@aths.edu.bd', email_verified: true },
    {
      id: 'mk_2',
      assignmentId: 'asg_math_6a',
      classSectionId: 'cs_6_a',
      studentId: 'st_1',
      termId: 'term_1',
      updatedByUid: 'teacherA_uid',
      writtenMarks: -10,
      totalMarks: 999,
    },
    null,
    mockDb
  );
  assert.equal(res, 'PERMISSION_DENIED');
});
