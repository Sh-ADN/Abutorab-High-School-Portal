import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeClassAttendanceAnalytics,
  formatCutoffDisplay,
  formatShortMonth,
  generateAttendanceReportCsv,
  isWeekendDate,
  parseAbsentRollsSet,
  serializeAbsentRolls,
} from './attendanceAnalytics';
import { AttendanceRecord, ClassSection, Student } from '../types/school';

const mockClass9A: ClassSection = {
  id: 'cs_2026_c9_a',
  academicYearId: 'ay_2026',
  className: 'Class 9',
  section: 'Section A',
  classTeacherUid: 'usr_tch_msi',
  classTeacherName: 'Md. Shafiqul Islam',
  classTeacherCode: 'MSI',
  roomNumber: '301',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockStudents: Student[] = [
  {
    id: 'stu_1',
    academicYearId: 'ay_2026',
    classSectionId: 'cs_2026_c9_a',
    className: 'Class 9',
    section: 'Section A',
    roll: 1,
    name: 'Tanvir Hossain',
    group: 'Science',
    optionalSubject: 'Higher Mathematics',
    guardianPhone: '01819223344',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'stu_2',
    academicYearId: 'ay_2026',
    classSectionId: 'cs_2026_c9_a',
    className: 'Class 9',
    section: 'Section A',
    roll: 2,
    name: 'Arpita Rani Das',
    group: 'Science',
    optionalSubject: 'Biology',
    guardianPhone: '01715445566',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

test('isWeekendDate identifies Friday and Saturday as Bangladesh school weekends', () => {
  // 2026-11-06 is Friday, 2026-11-07 is Saturday, 2026-11-08 is Sunday
  assert.equal(isWeekendDate('2026-11-06'), true);
  assert.equal(isWeekendDate('2026-11-07'), true);
  assert.equal(isWeekendDate('2026-11-08'), false);
  assert.equal(isWeekendDate('2026-11-10'), false);
});

test('parseAbsentRollsSet and serializeAbsentRolls round-trip accurately', () => {
  const set = parseAbsentRollsSet('4, 2, 4, 1');
  assert.deepEqual(Array.from(set).sort(), [1, 2, 4]);
  assert.equal(serializeAbsentRolls(set), '1, 2, 4');
});

test('computeClassAttendanceAnalytics calculates monthly absences, streaks, low-attendance, and fines', () => {
  const records: AttendanceRecord[] = [
    {
      id: 'att_1',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-10-12', // Monday
      markedByUid: 'usr_tch_msi',
      presentCount: 1,
      absentCount: 1,
      absentRolls: '2',
      updatedAt: '2026-10-12T09:00:00Z',
    },
    {
      id: 'att_2',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-10-13', // Tuesday
      markedByUid: 'usr_tch_msi',
      presentCount: 1,
      absentCount: 1,
      absentRolls: '2',
      updatedAt: '2026-10-13T09:00:00Z',
    },
    {
      id: 'att_3',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-11-09', // Monday
      markedByUid: 'usr_tch_msi',
      presentCount: 2,
      absentCount: 0,
      absentRolls: '',
      updatedAt: '2026-11-09T09:00:00Z',
    },
    {
      id: 'att_4',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-11-10', // Tuesday
      markedByUid: 'usr_tch_msi',
      presentCount: 1,
      absentCount: 1,
      absentRolls: '2',
      updatedAt: '2026-11-10T09:00:00Z',
    },
    // Weekend date (Friday) should be excluded automatically
    {
      id: 'att_weekend',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-11-06',
      markedByUid: 'usr_tch_msi',
      presentCount: 0,
      absentCount: 2,
      absentRolls: '1, 2',
      updatedAt: '2026-11-06T09:00:00Z',
    },
  ];

  const analytics = computeClassAttendanceAnalytics({
    students: mockStudents,
    classRecords: records,
    cutoffDate: '2026-11-10',
    holidays: [],
    finePerAbsentDay: 10,
  });

  assert.deepEqual(analytics.activeMonths, ['2026-10', '2026-11']);
  assert.equal(analytics.totalSchoolDaysCounted, 4);
  assert.equal(analytics.schoolDaysByMonth['2026-10'], 2);
  assert.equal(analytics.schoolDaysByMonth['2026-11'], 2);

  // Roll 1: 4 present, 0 absent -> 100%, ৳0 fine
  const st1 = analytics.studentStats[0];
  assert.equal(st1.roll, 1);
  assert.equal(st1.presentCount, 4);
  assert.equal(st1.absentCount, 0);
  assert.equal(st1.percentage, 100);
  assert.equal(st1.dueFine, 0);
  assert.equal(st1.isLowAttendance, false);
  assert.equal(st1.hasConsecutiveAlert, false);

  // Roll 2: 1 present, 3 absent -> 25%, ৳30 fine, max streak 2
  const st2 = analytics.studentStats[1];
  assert.equal(st2.roll, 2);
  assert.equal(st2.presentCount, 1);
  assert.equal(st2.absentCount, 3);
  assert.equal(st2.percentage, 25);
  assert.equal(st2.dueFine, 30);
  assert.equal(st2.maxConsecutiveAbsences, 2);
  assert.equal(st2.isLowAttendance, true);
  assert.equal(st2.hasConsecutiveAlert, true);
  assert.equal(st2.monthlyAbsent['2026-10'], 2);
  assert.equal(st2.monthlyAbsent['2026-11'], 1);

  assert.equal(analytics.consecutiveAbsenceCount, 1);
  assert.equal(analytics.lowAttendanceCount, 1);
  assert.equal(analytics.totalClassDueFine, 30);
});

test('generateAttendanceReportCsv outputs header banner, school days counted, monthly columns, and TOTAL row', () => {
  const records: AttendanceRecord[] = [
    {
      id: 'att_1',
      classSectionId: 'cs_2026_c9_a',
      date: '2026-11-10',
      markedByUid: 'usr_tch_msi',
      presentCount: 1,
      absentCount: 1,
      absentRolls: '2',
      updatedAt: '2026-11-10T09:00:00Z',
    },
  ];
  const analytics = computeClassAttendanceAnalytics({
    students: mockStudents,
    classRecords: records,
    cutoffDate: '2026-11-10',
    finePerAbsentDay: 5,
  });

  const csv = generateAttendanceReportCsv({
    classSection: mockClass9A,
    academicYearLabel: '2026',
    cutoffDate: '2026-11-10',
    finePerAbsentDay: 5,
    analytics,
  });

  assert.equal(formatShortMonth('2026-11'), 'Nov');
  assert.equal(formatCutoffDisplay('2026-11-10'), '10 Nov 2026');
  assert.match(csv, /Fine per absent day \(৳\),5/);
  assert.match(csv, /School days counted,1,1,1/);
  assert.match(csv, /Roll,Name,Nov,Total Present,Total Absent,Attendance %,Due Fine \(৳\),Status/);
  assert.match(csv, /1,Tanvir Hossain,0,1,0,100\.0%,0,Regular/);
  assert.match(csv, /2,Arpita Rani Das,1,0,1,0\.0%,5/);
  assert.match(csv, /,TOTAL,1,1,1,50\.0%,5,/);
});
