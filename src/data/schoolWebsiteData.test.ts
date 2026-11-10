import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_CAROUSEL_SLIDES,
  LEADERSHIP_PROFILES,
  PUBLIC_TEACHERS_DIRECTORY,
  PUBLIC_STAFF_DIRECTORY,
  SCHOOL_BRAND_INFO,
  buildWhatsAppUrl,
  computeLiveExamSummaryForClassAndTerm,
} from './schoolWebsiteData';
import { SEED_STUDENTS, SEED_SUBJECT_MARKS } from './seedData';

test('schoolWebsiteData contains exact counts for slides, leaders, teachers, and staff', () => {
  assert.equal(SCHOOL_BRAND_INFO.eiin, '104600');
  assert.equal(SCHOOL_BRAND_INFO.mpoCode, '207121301');
  assert.equal(HERO_CAROUSEL_SLIDES.length, 6);
  assert.equal(LEADERSHIP_PROFILES.length, 3);
  assert.equal(PUBLIC_TEACHERS_DIRECTORY.length, 15);
  assert.equal(PUBLIC_STAFF_DIRECTORY.length, 7);
});

test('buildWhatsAppUrl formats Bangladeshi numbers with 88 prefix', () => {
  assert.equal(buildWhatsAppUrl('01817264285'), 'https://wa.me/8801817264285');
  assert.equal(buildWhatsAppUrl('+8801834794241'), 'https://wa.me/8801834794241');
  assert.equal(buildWhatsAppUrl(''), '');
});

test('computeLiveExamSummaryForClassAndTerm calculates total, examined, and absent counts accurately', () => {
  const summaryAll = computeLiveExamSummaryForClassAndTerm({
    students: SEED_STUDENTS,
    subjectMarks: SEED_SUBJECT_MARKS,
    classNameFilter: 'ALL',
    termId: 'term_2026_half',
    termName: 'অর্ধবার্ষিক পরীক্ষা ২০২৬',
  });

  assert.ok(summaryAll.totalStudents > 0);
  assert.equal(summaryAll.examinedCount + summaryAll.absentCount, summaryAll.totalStudents);

  const summaryClass9 = computeLiveExamSummaryForClassAndTerm({
    students: SEED_STUDENTS,
    subjectMarks: SEED_SUBJECT_MARKS,
    classNameFilter: 'Class 9',
    termId: 'term_2026_half',
    termName: 'অর্ধবার্ষিক পরীক্ষা ২০২৬',
  });

  assert.ok(summaryClass9.totalStudents > 0);
  assert.ok(summaryClass9.examinedCount >= 1);
  assert.equal(
    summaryClass9.examinedCount + summaryClass9.absentCount,
    summaryClass9.totalStudents
  );
});
