import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACHED_ROUTINE_RAW,
  computeTeacherStatistics,
  expandRoutineRecordsToEntries,
  isClassMatch,
  parseDaysExpression,
  parseLiveMasterGridToRoutineRecords,
  SEED_ROUTINE_RECORDS,
} from './routineAndStatsLogic';

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
  // Test for A.D.N.
  // A.D.N. has:
  // (2-6) IX-B P1 Math -> 5 days * 45m = 225m
  // (2-6) VI-A P3 Math -> 5 days * 40m = 200m
  // (4-6) X P4 Geo -> 3 days * 40m = 120m
  // (4-6) VI-B P5 G.Sci -> 3 days * 40m = 120m
  // (2-4) IX P6 Phy -> 3 days * 40m = 120m
  // (4-6) X P7 Phy -> 3 days * 40m = 120m
  // Total weekly classes = 5 + 5 + 3 + 3 + 3 + 3 = 22 classes
  // Total minutes = 225 + 200 + 120 + 120 + 120 + 120 = 905m = 15h 5m
  const adnEntries = allExpanded.filter((e) => e.teacher === 'A.D.N.');
  const stats = computeTeacherStatistics(adnEntries, 'A.D.N.');

  assert.equal(stats.totalClasses, 22);
  assert.equal(stats.totalTeachingHoursStr, '15h 5m');
  assert.equal(stats.uniqueClasses, 3); // IX, VI, X
  assert.equal(stats.uniqueSubjects, 6);
  assert.equal(stats.averageClasses, '4.4'); // 22 / 5 = 4.4
  assert.ok(stats.busiestWeekdayStr.includes('Tuesday (6 classes)'));
  assert.ok(stats.leastBusyWeekdayStr.includes('3 classes'));

  // Test "-1 & 2" subject expansion rule from TeacherStatistics.kt (e.g., S.B. has "Ben-1 & 2" in VII-A)
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
