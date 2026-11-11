import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACHED_ROUTINE_RAW,
  computeTeacherStatistics,
  deriveClassTeachersAndSubjectAssignmentsFromRoutine,
  expandRoutineRecordsToEntries,
  isClassMatch,
  parseDaysExpression,
  parseLiveMasterGridToRoutineRecords,
  SEED_ROUTINE_RECORDS,
} from './routineAndStatsLogic';
import { SEED_CLASS_SECTIONS, SEED_SUBJECT_ASSIGNMENTS, SEED_USERS } from '../data/seedData';

test('ClassUtils.isClassMatch matches exact sections and base class umbrella entries', () => {
  assert.equal(isClassMatch('IX-A', 'IX-A'), true);
  assert.equal(isClassMatch('IX', 'IX-A'), true);
  assert.equal(isClassMatch('IX-A', 'IX'), true);
  assert.equal(isClassMatch('IX-B', 'IX-A'), false);
  assert.equal(isClassMatch('X', 'IX-A'), false);
  assert.equal(isClassMatch('VI', 'VII'), false);
});

test('parseDaysExpression expands range, single day, and comma-separated day expressions', () => {
  assert.deepEqual(parseDaysExpression('(2-6)'), [2, 3, 4, 5, 6]);
  assert.deepEqual(parseDaysExpression('(3-6)'), [3, 4, 5, 6]);
  assert.deepEqual(parseDaysExpression('(2-4)'), [2, 3, 4]);
  assert.deepEqual(parseDaysExpression('(6)'), [6]);
  assert.deepEqual(parseDaysExpression('(2, 5-6)'), [2, 5, 6]);
});

test('TeacherStatistics.computeTeacherStatistics replicates TeacherStatistics.kt calculations accurately', () => {
  const allExpanded = expandRoutineRecordsToEntries(SEED_ROUTINE_RECORDS);
  const adnEntries = allExpanded.filter((e) => e.teacher === 'A.D.N.');
  const stats = computeTeacherStatistics(adnEntries, 'A.D.N.');

  assert.equal(stats.totalClasses, 22);
  assert.equal(stats.totalTeachingHoursStr, '15h 5m');
  assert.equal(stats.uniqueClasses, 3); // IX, VI, X
  assert.equal(stats.uniqueSubjects, 6);
  assert.equal(stats.averageClasses, '4.4');
  assert.ok(stats.busiestWeekdayStr.includes('Tuesday (6 classes)'));
  assert.ok(stats.leastBusyWeekdayStr.includes('3 classes'));

  const sbEntries = allExpanded.filter((e) => e.teacher === 'S.B.');
  const sbStats = computeTeacherStatistics(sbEntries, 'S.B.');
  assert.ok(sbStats.uniqueSubjectsList.includes('Ben-1-VII-A'));
  assert.ok(sbStats.uniqueSubjectsList.includes('Ben-2-VII-A'));
});

test('parseLiveMasterGridToRoutineRecords converts Google Apps Script getFullDatabase grid into RoutineRecords', () => {
  assert.equal(ATTACHED_ROUTINE_RAW.length, 123);
  const sampleLivePayload = {
    teachers: ['H.M.', 'A.D.N.'],
    masterGrid: [
      ['-', 'Eng-2 X-B (3-6)', 'Eng-2 X-A (2-5)', '-', '', '-', '-', '-'],
      [
        'Math IX-B',
        '-',
        'Math VI-A',
        'Geography X (4-6)',
        '',
        'G.Science VI-B (3, 5-6)',
        'Physics IX (2-4)',
        'Physics X (4-6)',
      ],
    ],
  };

  const parsed = parseLiveMasterGridToRoutineRecords(sampleLivePayload);
  assert.equal(parsed.length, 8);
  assert.equal(parsed[0].teacher, 'H.M.');
  assert.equal(parsed[0].period, 2);
  assert.equal(parsed[0].className, 'X-B');
  assert.equal(parsed[0].days, '(3-6)');
  assert.equal(parsed[2].teacher, 'A.D.N.');
  assert.equal(parsed[2].period, 1);
  assert.equal(parsed[2].days, '(2-6)');
});

test('deriveClassTeachersAndSubjectAssignmentsFromRoutine enforces Rule A (1st Period Class Teacher), Rule B (Majority-Day Subject Teacher), and Rule C (Manual Override)', () => {
  const derived = deriveClassTeachersAndSubjectAssignmentsFromRoutine({
    routineRecords: SEED_ROUTINE_RECORDS,
    teachers: SEED_USERS,
    classSections: SEED_CLASS_SECTIONS,
    existingAssignments: SEED_SUBJECT_ASSIGNMENTS,
    academicYearId: 'ay_2026',
  });

  // All 10 class-sections exist and have 1st period Class Teachers assigned
  assert.equal(derived.updatedClassSections.length, 10);

  const expectedFirstPeriodCodes: Record<string, string> = {
    cs_2026_c6_ka: 'H.P.',
    cs_2026_c6_kha: 'J.H.',
    cs_2026_c7_ka: 'S.B.',
    cs_2026_c7_kha: 'N.I.',
    cs_2026_c8_a: 'A.B.S',
    cs_2026_c8_b: 'F.H.',
    cs_2026_c9_a: 'MSI',
    cs_2026_c9_b: 'ADN', // A.D.N. normalized matches ADN profile
    cs_2026_c10_a: 'G.M.',
    cs_2026_c10_b: 'M.A.',
  };

  for (const section of derived.updatedClassSections) {
    assert.equal(
      section.classTeacherCode,
      expectedFirstPeriodCodes[section.id],
      `Expected ${section.id} 1st period teacher to be ${expectedFirstPeriodCodes[section.id]}`
    );
  }

  // Rule B: Majority-Day Subject Teacher assignment test
  // In Class 6 Section Kha (VI-B), G.Science is taught by A.D.N. on (4-6) = 3 days, and S.D. on (2-3) = 2 days.
  // So A.D.N. (3 days > 2 days) must win G.Science (127) for cs_2026_c6_kha!
  const viBScience = derived.updatedSubjectAssignments.find(
    (a) => a.classSectionId === 'cs_2026_c6_kha' && a.subjectCode === '127'
  );
  assert.ok(viBScience);
  assert.equal(viBScience?.teacherCode, 'ADN');
  assert.equal(viBScience?.assignedDaysCount, 3);

  // Rule C: Manual override preservation test
  const manualSection = derived.updatedClassSections.map((s) =>
    s.id === 'cs_2026_c6_ka'
      ? {
          ...s,
          classTeacherUid: 'usr_hm_1_HM',
          classTeacherName: 'মরজাহান বেগম',
          classTeacherCode: 'H.M.',
          isManualOverride: true,
        }
      : s
  );

  const reDerived = deriveClassTeachersAndSubjectAssignmentsFromRoutine({
    routineRecords: SEED_ROUTINE_RECORDS,
    teachers: SEED_USERS,
    classSections: manualSection,
    existingAssignments: derived.updatedSubjectAssignments,
    academicYearId: 'ay_2026',
  });

  const cs6aAfter = reDerived.updatedClassSections.find((s) => s.id === 'cs_2026_c6_ka');
  assert.equal(cs6aAfter?.classTeacherCode, 'H.M.');
  assert.equal(cs6aAfter?.isManualOverride, true);
});
