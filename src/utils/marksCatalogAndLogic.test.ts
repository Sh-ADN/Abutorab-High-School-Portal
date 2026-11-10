import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREDEFINED_SUBJECTS,
  SUBJECT_CATALOG,
  calculateGrade,
  evaluateCombinedTwoPaperMarks,
  evaluateSubjectMarkComponents,
  formatVerificationLedgerBreakdown,
  getComponentPassThreshold,
  getPaperLabel,
  getSomonnitoMarks,
  isComponentBelowPass,
  resolveSubjectSpec,
} from './marksCatalogAndLogic';

test('SubjectCatalog and PredefinedSubjects contain all NCTB subjects and component splits', () => {
  assert.equal(PREDEFINED_SUBJECTS.length, 9);
  assert.equal(SUBJECT_CATALOG.length, 22);

  const eng1 = resolveSubjectSpec('107', 'English 1st Paper');
  assert.equal(eng1.mcqMax, null);
  assert.equal(eng1.writtenMax, 100);
  assert.equal(eng1.practicalMax, null);
  assert.equal(eng1.fullMarks, 100);

  const ict = resolveSubjectSpec('154', 'Information & Communication Technology');
  assert.equal(ict.mcqMax, 25);
  assert.equal(ict.writtenMax, null);
  assert.equal(ict.practicalMax, 25);
  assert.equal(ict.fullMarks, 50);

  const physics = resolveSubjectSpec('136', 'Physics');
  assert.equal(physics.mcqMax, 25);
  assert.equal(physics.writtenMax, 50);
  assert.equal(physics.practicalMax, 25);
  assert.equal(physics.fullMarks, 100);
});

test('GradeUtils.calculateGrade matches NCTB percentage thresholds for 100 and 50 fullMarks', () => {
  assert.deepEqual(calculateGrade(80, 100), { letter: 'A+', point: 5.0 });
  assert.deepEqual(calculateGrade(72, 100), { letter: 'A', point: 4.0 });
  assert.deepEqual(calculateGrade(65, 100), { letter: 'A-', point: 3.5 });
  assert.deepEqual(calculateGrade(50, 100), { letter: 'B', point: 3.0 });
  assert.deepEqual(calculateGrade(40, 100), { letter: 'C', point: 2.0 });
  assert.deepEqual(calculateGrade(33, 100), { letter: 'D', point: 1.0 });
  assert.deepEqual(calculateGrade(32, 100), { letter: 'F', point: 0.0 });

  // 50-mark ICT subject
  assert.deepEqual(calculateGrade(40, 50), { letter: 'A+', point: 5.0 });
  assert.deepEqual(calculateGrade(35, 50), { letter: 'A', point: 4.0 });
  assert.deepEqual(calculateGrade(17, 50), { letter: 'D', point: 1.0 });
  assert.deepEqual(calculateGrade(16, 50), { letter: 'F', point: 0.0 });
});

test('MarksEntryScreen belowPass enforces round(max / 3.0) component pass rules', () => {
  // Math: MCQ 30 (pass 10), CQ 70 (pass 23)
  assert.equal(getComponentPassThreshold(30, 2), 10);
  assert.equal(getComponentPassThreshold(70, 2), 23);
  assert.equal(isComponentBelowPass(9, 30, 2), true);
  assert.equal(isComponentBelowPass(10, 30, 2), false);
  assert.equal(isComponentBelowPass(22, 70, 2), true);
  assert.equal(isComponentBelowPass(23, 70, 2), false);

  // Physics: MCQ 25 (pass 8), CQ 50 (pass 17), Prac 25 (pass 8)
  assert.equal(getComponentPassThreshold(25, 3), 8);
  assert.equal(getComponentPassThreshold(50, 3), 17);

  // Student with 68 in CQ and 9 in MCQ (total 77) still gets F due to MCQ < 10
  const mathSpec = resolveSubjectSpec('109', 'Mathematics');
  const failedMcqEval = evaluateSubjectMarkComponents(
    { mcq: 9, written: 68, practical: null },
    mathSpec
  );
  assert.equal(failedMcqEval.totalMarks, 77);
  assert.equal(failedMcqEval.mcqBelowPass, true);
  assert.equal(failedMcqEval.letterGrade, 'F');
  assert.equal(failedMcqEval.gpa, 0.0);

  // Student passing both components gets A
  const passedEval = evaluateSubjectMarkComponents(
    { mcq: 22, written: 52, practical: null },
    mathSpec
  );
  assert.equal(passedEval.totalMarks, 74);
  assert.equal(passedEval.hasAnyComponentFail, false);
  assert.equal(passedEval.letterGrade, 'A');
  assert.equal(passedEval.gpa, 4.0);
});

test('evaluateCombinedTwoPaperMarks calculates 1st & 2nd paper combined results accurately', () => {
  const banglaPass = evaluateCombinedTwoPaperMarks(
    'BANGLA',
    { mcq: 24, written: 58 },
    { mcq: 22, written: 56 }
  );
  assert.equal(banglaPass.combinedTotal, 160);
  assert.equal(banglaPass.letterGrade, 'A+');
  assert.equal(banglaPass.gpa, 5.0);

  const banglaFailMcq = evaluateCombinedTwoPaperMarks(
    'BANGLA',
    { mcq: 10, written: 60 },
    { mcq: 8, written: 60 }
  );
  // Combined MCQ is 18 (< 20 threshold for 60 max)
  assert.equal(banglaFailMcq.mcqBelowPass, true);
  assert.equal(banglaFailMcq.letterGrade, 'F');
  assert.equal(banglaFailMcq.gpa, 0.0);
});

test('CalculationUtils.getSomonnitoMarks computes weighted Half-Yearly and Annual combined marks', () => {
  const result = getSomonnitoMarks({
    year: 2026,
    rollNumber: 1,
    subjectId: '109',
    ardhoPercent: 50,
    ardhoMarks: [
      {
        rollNumber: 1,
        subjectId: '109',
        year: 2026,
        term: 'ARDHOBARSHIK',
        mcq: 24,
        written: 56,
        practical: null,
      },
    ],
    barshikMarks: [
      {
        rollNumber: 1,
        subjectId: '109',
        year: 2026,
        term: 'BARSHIK',
        mcq: 28,
        written: 62,
        practical: null,
      },
    ],
  });

  assert.ok(result);
  assert.equal(result.mcq, 26);
  assert.equal(result.written, 59);
  assert.equal(result.practical, null);
  assert.equal(result.term, 'SOMONNITO');
});

test('VerificationSheetDialog helpers format paper labels and নম্বর ফর্দ breakdowns in Bengali & English', () => {
  assert.equal(getPaperLabel('Bangla 1st Paper'), '১ম পত্র');
  assert.equal(getPaperLabel('English 2nd Paper'), '২য় পত্র');
  assert.equal(getPaperLabel('Mathematics'), '-');

  const physicsSpec = resolveSubjectSpec('136', 'Physics');
  const bnWithTotal = formatVerificationLedgerBreakdown(
    { mcqMarks: 22, writtenMarks: 44, practicalMarks: 24 },
    physicsSpec,
    true,
    true
  );
  assert.equal(bnWithTotal, '২২+৪৪+২৪ = ৯০');

  const enWithoutTotal = formatVerificationLedgerBreakdown(
    { mcqMarks: 22, writtenMarks: 44, practicalMarks: 24 },
    physicsSpec,
    false,
    false
  );
  assert.equal(enWithoutTotal, '22+44+24');
});
