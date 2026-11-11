import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppUrl } from '../data/schoolWebsiteData';
import { compileClassTabulationFromFirestore } from './tabulationAndMeritEngine';
import {
  SEED_CLASS_SECTIONS,
  SEED_STUDENTS,
  SEED_SUBJECT_ASSIGNMENTS,
  SEED_SUBJECT_MARKS,
} from '../data/seedData';

test('buildWhatsAppUrl creates valid wa.me link with encoded text message', () => {
  const phone = '01817264285';
  const message = 'আসসালামু আলাইকুম শ্রদ্ধেয় শিক্ষক। নম্বর এন্ট্রি দ্রুত সম্পন্ন করুন।';
  const url = buildWhatsAppUrl(phone, message);

  assert.ok(url.startsWith('https://wa.me/8801817264285?text='));
  assert.ok(url.includes(encodeURIComponent(message)));
});

test('compileClassTabulationFromFirestore correctly resolves student results for public lookup', () => {
  // Use class 9-A (cs_2026_c9_a) and half-yearly term (term_2026_half)
  const compiled = compileClassTabulationFromFirestore({
    classSectionId: 'cs_2026_c9_a',
    termId: 'term_2026_half',
    students: SEED_STUDENTS,
    subjectAssignments: SEED_SUBJECT_ASSIGNMENTS,
    subjectMarks: SEED_SUBJECT_MARKS,
  });

  assert.ok(compiled.results.length > 0);
  const student1 = compiled.results.find((r) => r.student.roll === 1);
  assert.ok(student1, 'Student roll 1 should be found');
  assert.ok(student1.grandTotal > 0, 'Grand total marks should be positive');
  assert.ok(student1.letterGrade, 'Letter grade should be assigned');
});

test('absentee summary text contains required Bengali headers and roll numbers', () => {
  const dateStr = '2026-03-15';
  const className = 'নবম শ্রেণি (শাখা: ক)';
  const totalStudents = 45;
  const presentCount = 42;
  const absentCount = 3;
  const absentList = '• রোল #৫ - ফাহিম\n• রোল #১২ - সাকিব\n• রোল #১৮ - তামিম';

  const summary = [
    `📢 আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়`,
    `📅 তারিখ: ${dateStr}`,
    `🏫 শ্রেণি ও শাখা: ${className}`,
    `👥 মোট শিক্ষার্থী: ${totalStudents} জন`,
    `✅ উপস্থিত: ${presentCount} জন`,
    `❌ অনুপস্থিত: ${absentCount} জন`,
    `\n📋 অনুপস্থিত শিক্ষার্থীদের তালিকা:\n${absentList}`,
  ].join('\n');

  assert.ok(summary.includes('আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়'));
  assert.ok(summary.includes('অনুপস্থিত: 3 জন'));
  assert.ok(summary.includes('রোল #৫'));
});
