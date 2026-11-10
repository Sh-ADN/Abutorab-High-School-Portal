import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromotionSummary,
  formatRollSection,
  MeritListEngine,
  TabulationDisplay,
  TabulationEngine,
  TabulationMarkEntity,
  TabulationStudentEntity,
  TabulationSubjectEntity,
} from './tabulationAndMeritEngine';

const SAMPLE_SUBJECTS: TabulationSubjectEntity[] = [
  {
    id: 'sub_ban1',
    code: '101',
    name: 'Bangla 1st Paper',
    bengaliName: 'বাংলা ১ম পত্র',
    sheetRole: 'BANGLA1',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_ban2',
    code: '102',
    name: 'Bangla 2nd Paper',
    bengaliName: 'বাংলা ২য় পত্র',
    sheetRole: 'BANGLA2',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_eng1',
    code: '107',
    name: 'English 1st Paper',
    bengaliName: 'ইংরেজি ১ম পত্র',
    sheetRole: 'ENG1',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: null,
    writtenMax: 100,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_eng2',
    code: '108',
    name: 'English 2nd Paper',
    bengaliName: 'ইংরেজি ২য় পত্র',
    sheetRole: 'ENG2',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: null,
    writtenMax: 100,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_math',
    code: '109',
    name: 'Mathematics',
    bengaliName: 'গণিত',
    sheetRole: 'MATH',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_rel_i',
    code: '111',
    name: 'Islam Religion',
    bengaliName: 'ইসলাম ও নৈতিক শিক্ষা',
    sheetRole: 'RELIGION',
    applicabilityType: 'RELIGION',
    applicabilityValue: 'I',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_bgs',
    code: '150',
    name: 'Bangladesh & Global Studies',
    bengaliName: 'বাংলাদেশ ও বিশ্বপরিচয়',
    sheetRole: 'BGS_OR_SCIENCE',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'S',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    id: 'sub_ict',
    code: '154',
    name: 'ICT',
    bengaliName: 'তথ্য ও যোগাযোগ প্রযুক্তি',
    sheetRole: 'ICT',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 25,
    writtenMax: null,
    practicalMax: 25,
    fullMarks: 50,
  },
  {
    id: 'sub_phy',
    code: '136',
    name: 'Physics',
    bengaliName: 'পদার্থবিজ্ঞান',
    sheetRole: 'ELECTIVE1',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    id: 'sub_chem',
    code: '137',
    name: 'Chemistry',
    bengaliName: 'রসায়ন',
    sheetRole: 'ELECTIVE2',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    id: 'sub_bio',
    code: '138',
    name: 'Biology',
    bengaliName: 'জীববিজ্ঞান',
    sheetRole: 'ELECTIVE3',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    id: 'sub_hmath',
    code: '126',
    name: 'Higher Mathematics',
    bengaliName: 'উচ্চতর গণিত',
    sheetRole: 'OPTIONAL',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
];

const SAMPLE_STUDENTS: TabulationStudentEntity[] = [
  {
    id: 'stu_1',
    roll: 1,
    name: 'Tanvir Hossain',
    section: 'Section A',
    className: 'Class 9',
    group: 'S',
    groupDisplay: 'Science',
    religion: 'I',
    religionDisplay: 'Islam',
    optionalType: 'S',
    optionalSubjectDisplay: 'Higher Mathematics',
  },
  {
    id: 'stu_2',
    roll: 2,
    name: 'Rafiul Alam',
    section: 'Section A',
    className: 'Class 9',
    group: 'S',
    groupDisplay: 'Science',
    religion: 'I',
    religionDisplay: 'Islam',
    optionalType: 'S',
    optionalSubjectDisplay: 'Higher Mathematics',
  },
  {
    id: 'stu_3',
    roll: 3,
    name: 'Sadia Islam',
    section: 'Section A',
    className: 'Class 9',
    group: 'S',
    groupDisplay: 'Science',
    religion: 'I',
    religionDisplay: 'Islam',
    optionalType: 'S',
    optionalSubjectDisplay: 'Higher Mathematics',
  },
];

test('TabulationEngine.optionalBonus adds points above 2.00 and caps GPA at 5.00', () => {
  assert.equal(TabulationEngine.optionalBonus(5.0), 3.0);
  assert.equal(TabulationEngine.optionalBonus(4.0), 2.0);
  assert.equal(TabulationEngine.optionalBonus(3.5), 1.5);
  assert.equal(TabulationEngine.optionalBonus(2.0), 0.0);
  assert.equal(TabulationEngine.optionalBonus(1.0), 0.0);
  assert.equal(TabulationEngine.optionalBonus(0.0), 0.0);
});

test('TabulationEngine.compute applies combined 1st/2nd paper rules, 4th subject bonus, and F counts', () => {
  // Student 1: All A (4.0) in 9 compulsory units (36.0) + A+ (5.0 -> +3.0 bonus) in Higher Math => 39.0 / 9 = 4.33 (A)
  // Wait: let's also verify failing Optional subject does NOT increment failedCount!
  const marks: TabulationMarkEntity[] = [
    // Student 1: 75 in 100-mark subjects (A = 4.0), 36 in ICT (A = 4.0), 85 in Higher Math (A+ = 5.0 -> +3.0 bonus)
    { studentId: 'stu_1', subjectId: 'sub_ban1', mcqMarks: 22, writtenMarks: 53, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_ban2', mcqMarks: 22, writtenMarks: 53, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_eng1', mcqMarks: null, writtenMarks: 75, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_eng2', mcqMarks: null, writtenMarks: 75, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_math', mcqMarks: 22, writtenMarks: 53, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_rel_i', mcqMarks: 22, writtenMarks: 53, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_bgs', mcqMarks: 22, writtenMarks: 53, practicalMarks: null },
    { studentId: 'stu_1', subjectId: 'sub_ict', mcqMarks: 18, writtenMarks: null, practicalMarks: 18 },
    { studentId: 'stu_1', subjectId: 'sub_phy', mcqMarks: 18, writtenMarks: 37, practicalMarks: 20 },
    { studentId: 'stu_1', subjectId: 'sub_chem', mcqMarks: 18, writtenMarks: 37, practicalMarks: 20 },
    { studentId: 'stu_1', subjectId: 'sub_bio', mcqMarks: 18, writtenMarks: 37, practicalMarks: 20 },
    { studentId: 'stu_1', subjectId: 'sub_hmath', mcqMarks: 22, writtenMarks: 43, practicalMarks: 20 }, // 85 -> A+ (5.0), bonus +3.0

    // Student 2: Fails Optional subject (Higher Math = 20 -> F), but passes all 9 compulsory with A+ (5.0)
    { studentId: 'stu_2', subjectId: 'sub_ban1', mcqMarks: 25, writtenMarks: 60, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_ban2', mcqMarks: 25, writtenMarks: 60, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_eng1', mcqMarks: null, writtenMarks: 85, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_eng2', mcqMarks: null, writtenMarks: 85, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_math', mcqMarks: 25, writtenMarks: 60, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_rel_i', mcqMarks: 25, writtenMarks: 60, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_bgs', mcqMarks: 25, writtenMarks: 60, practicalMarks: null },
    { studentId: 'stu_2', subjectId: 'sub_ict', mcqMarks: 22, writtenMarks: null, practicalMarks: 22 },
    { studentId: 'stu_2', subjectId: 'sub_phy', mcqMarks: 20, writtenMarks: 42, practicalMarks: 22 },
    { studentId: 'stu_2', subjectId: 'sub_chem', mcqMarks: 20, writtenMarks: 42, practicalMarks: 22 },
    { studentId: 'stu_2', subjectId: 'sub_bio', mcqMarks: 20, writtenMarks: 42, practicalMarks: 22 },
    { studentId: 'stu_2', subjectId: 'sub_hmath', mcqMarks: 5, writtenMarks: 10, practicalMarks: 5 }, // F in Optional

    // Student 3: Fails Mathematics (MCQ 8 < 10) -> failedCount = 1 (1F), GPA = 0.0
    { studentId: 'stu_3', subjectId: 'sub_ban1', mcqMarks: 24, writtenMarks: 56, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_ban2', mcqMarks: 24, writtenMarks: 56, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_eng1', mcqMarks: null, writtenMarks: 80, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_eng2', mcqMarks: null, writtenMarks: 80, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_math', mcqMarks: 8, writtenMarks: 50, practicalMarks: null }, // F!
    { studentId: 'stu_3', subjectId: 'sub_rel_i', mcqMarks: 24, writtenMarks: 56, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_bgs', mcqMarks: 24, writtenMarks: 56, practicalMarks: null },
    { studentId: 'stu_3', subjectId: 'sub_ict', mcqMarks: 20, writtenMarks: null, practicalMarks: 20 },
    { studentId: 'stu_3', subjectId: 'sub_phy', mcqMarks: 20, writtenMarks: 40, practicalMarks: 20 },
    { studentId: 'stu_3', subjectId: 'sub_chem', mcqMarks: 20, writtenMarks: 40, practicalMarks: 20 },
    { studentId: 'stu_3', subjectId: 'sub_bio', mcqMarks: 20, writtenMarks: 40, practicalMarks: 20 },
    { studentId: 'stu_3', subjectId: 'sub_hmath', mcqMarks: 20, writtenMarks: 40, practicalMarks: 20 },
  ];

  const results = TabulationEngine.compute(SAMPLE_STUDENTS, SAMPLE_SUBJECTS, marks);
  const r1 = results.find((r) => r.student.id === 'stu_1')!;
  const r2 = results.find((r) => r.student.id === 'stu_2')!;
  const r3 = results.find((r) => r.student.id === 'stu_3')!;

  // Student 1: 9 units * 4.0 = 36.0 + 3.0 bonus = 39.0 / 9 = 4.33
  assert.equal(r1.failedCount, 0);
  assert.equal(r1.optionalBonusGP, 3.0);
  assert.equal(r1.gpa, 4.33);
  assert.equal(r1.letterGrade, 'A');
  assert.equal(r1.position, 2);

  // Student 2: Optional subject F does NOT cause failure! GPA = 5.00, Position = 1
  assert.equal(r2.failedCount, 0);
  assert.equal(r2.optionalBonusGP, 0.0);
  assert.equal(r2.gpa, 5.0);
  assert.equal(r2.letterGrade, 'A+');
  assert.equal(r2.position, 1);

  // Student 3: 1 failed compulsory subject -> failedCount = 1, GPA = 0.0, letterGrade = 'F', Position = 3
  assert.equal(r3.failedCount, 1);
  assert.equal(r3.gpa, 0.0);
  assert.equal(r3.letterGrade, 'F');
  assert.equal(r3.position, 3);
});

test('MeritListEngine.generateMeritList ranks by exact tie-breaking hierarchy and filters', () => {
  // Create two students with identical GPA (5.00) and identical Grand Total to test Roll tie-breaker
  const tieMarks: TabulationMarkEntity[] = [];
  for (const stuId of ['stu_1', 'stu_2']) {
    for (const sub of SAMPLE_SUBJECTS) {
      if (sub.id === 'sub_ict') {
        tieMarks.push({ studentId: stuId, subjectId: sub.id, mcqMarks: 22, writtenMarks: null, practicalMarks: 22 });
      } else if (sub.mcqMax === null) {
        tieMarks.push({ studentId: stuId, subjectId: sub.id, mcqMarks: null, writtenMarks: 85, practicalMarks: null });
      } else if (sub.practicalMax !== null) {
        tieMarks.push({ studentId: stuId, subjectId: sub.id, mcqMarks: 20, writtenMarks: 42, practicalMarks: 23 });
      } else {
        tieMarks.push({ studentId: stuId, subjectId: sub.id, mcqMarks: 25, writtenMarks: 60, practicalMarks: null });
      }
    }
  }

  const results = TabulationEngine.compute(SAMPLE_STUDENTS, SAMPLE_SUBJECTS, tieMarks);
  const meritList = MeritListEngine.generateMeritList(results, { excludeFailed: true });

  // Student 3 has 0 grandTotal (not in tieMarks) -> excluded automatically
  assert.equal(meritList.length, 2);
  // Both have GPA 5.00 and same Grand Total, so Roll 1 ranks #1 and Roll 2 ranks #2
  assert.equal(meritList[0].roll, 1);
  assert.equal(meritList[0].rank, 1);
  assert.equal(meritList[1].roll, 2);
  assert.equal(meritList[1].rank, 2);

  // Subject toppers competition ranking: both tied at 85 in Math -> both get rank 1!
  const toppers = MeritListEngine.generateSubjectToppers(results, 3);
  const mathToppers = toppers.find((t) => t.sheetRole === 'MATH')!;
  assert.equal(mathToppers.toppers.length, 2);
  assert.equal(mathToppers.toppers[0].rank, 1);
  assert.equal(mathToppers.toppers[1].rank, 1);
});

test('TabulationEngine.computeCombined averages Mid and Annual components and classifies promotion tiers', () => {
  const midMarks: TabulationMarkEntity[] = [
    { studentId: 'stu_1', subjectId: 'sub_math', mcqMarks: 24, writtenMarks: 60, practicalMarks: null }, // 84
  ];
  const annMarks: TabulationMarkEntity[] = [
    { studentId: 'stu_1', subjectId: 'sub_math', mcqMarks: 28, writtenMarks: 66, practicalMarks: null }, // 94
  ];

  const combined = TabulationEngine.computeCombined(
    [SAMPLE_STUDENTS[0]],
    [SAMPLE_SUBJECTS[4]],
    midMarks,
    [SAMPLE_SUBJECTS[4]],
    annMarks
  );

  assert.equal(combined.length, 1);
  const mathRes = combined[0].subjectResults[0];
  assert.equal(mathRes.midTotal, 84);
  assert.equal(mathRes.annualTotal, 94);
  assert.equal(mathRes.mcqMarks, 26);
  assert.equal(mathRes.writtenMarks, 63);
  assert.equal(mathRes.total, 89);
  assert.equal(mathRes.letterGrade, 'A+');
  assert.equal(TabulationDisplay.formatCombinedBreakdown(mathRes), '26+63=89');

  const promo = buildPromotionSummary(combined);
  assert.equal(promo.counts.meritCount, 1);
  assert.equal(promo.students[0].category, 'MERIT');
  assert.equal(promo.students[0].categoryBengali, 'মেধাতালিকা');
  assert.equal(formatRollSection(1, 'Section A'), '০১ক');
});
