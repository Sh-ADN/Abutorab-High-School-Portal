import { Student } from '../types/school';
import { formatNumeral } from './schoolLogic';

export type ApplicabilityType = 'ALL' | 'RELIGION' | 'GROUP' | 'OPTIONAL_TYPE';

export type SheetRole =
  | 'BANGLA1'
  | 'BANGLA2'
  | 'ENG1'
  | 'ENG2'
  | 'MATH'
  | 'ICT'
  | 'RELIGION'
  | 'BGS_OR_SCIENCE'
  | 'ELECTIVE1'
  | 'ELECTIVE2'
  | 'ELECTIVE3'
  | 'OPTIONAL';

export interface PredefinedSubjectItem {
  id: string;
  title: string;
  bengaliTitle: string;
}

/**
 * Ported directly from PredefinedSubjects.kt
 */
export const PREDEFINED_SUBJECTS: PredefinedSubjectItem[] = [
  { id: '101', title: 'Bangla 1st Paper', bengaliTitle: 'বাংলা ১ম পত্র' },
  { id: '102', title: 'Bangla 2nd Paper', bengaliTitle: 'বাংলা ২য় পত্র' },
  { id: '107', title: 'English 1st Paper', bengaliTitle: 'ইংরেজি ১ম পত্র' },
  { id: '108', title: 'English 2nd Paper', bengaliTitle: 'ইংরেজি ২য় পত্র' },
  { id: '109', title: 'Mathematics', bengaliTitle: 'গণিত' },
  { id: '111', title: 'Religion', bengaliTitle: 'ধর্ম ও নৈতিক শিক্ষা' },
  { id: '150', title: 'Bangladesh and Global Studies', bengaliTitle: 'বাংলাদেশ ও বিশ্বপরিচয়' },
  { id: '127', title: 'Science', bengaliTitle: 'বিজ্ঞান' },
  { id: '154', title: 'Information and Communication Technology', bengaliTitle: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
];

export interface SubjectCatalogData {
  code: string;
  name: string;
  bengaliName: string;
  sheetTabName: string;
  sheetRole: SheetRole;
  applicabilityType: ApplicabilityType;
  applicabilityValue: string | null;
  mcqMax: number | null;
  writtenMax: number | null;
  practicalMax: number | null;
  fullMarks: number;
  combinedGroup?: 'BANGLA' | 'ENGLISH';
}

/**
 * Ported directly from SubjectCatalog.kt with NCTB subject codes and Bengali titles
 */
export const SUBJECT_CATALOG: SubjectCatalogData[] = [
  {
    code: '101',
    name: 'Bangla 1st Paper',
    bengaliName: 'বাংলা ১ম পত্র',
    sheetTabName: 'Ben1_Input',
    sheetRole: 'BANGLA1',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
    combinedGroup: 'BANGLA',
  },
  {
    code: '102',
    name: 'Bangla 2nd Paper',
    bengaliName: 'বাংলা ২য় পত্র',
    sheetTabName: 'Ben2_Input',
    sheetRole: 'BANGLA2',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
    combinedGroup: 'BANGLA',
  },
  {
    code: '107',
    name: 'English 1st Paper',
    bengaliName: 'ইংরেজি ১ম পত্র',
    sheetTabName: 'Eng1_Input',
    sheetRole: 'ENG1',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: null,
    writtenMax: 100,
    practicalMax: null,
    fullMarks: 100,
    combinedGroup: 'ENGLISH',
  },
  {
    code: '108',
    name: 'English 2nd Paper',
    bengaliName: 'ইংরেজি ২য় পত্র',
    sheetTabName: 'Eng2_Input',
    sheetRole: 'ENG2',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: null,
    writtenMax: 100,
    practicalMax: null,
    fullMarks: 100,
    combinedGroup: 'ENGLISH',
  },
  {
    code: '109',
    name: 'Mathematics',
    bengaliName: 'গণিত',
    sheetTabName: 'Math_Input',
    sheetRole: 'MATH',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '154',
    name: 'Information & Communication Technology',
    bengaliName: 'তথ্য ও যোগাযোগ প্রযুক্তি',
    sheetTabName: 'ICT_Input',
    sheetRole: 'ICT',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 25,
    writtenMax: null,
    practicalMax: 25,
    fullMarks: 50,
  },
  {
    code: '111',
    name: 'Islam Religion and Moral Education',
    bengaliName: 'ইসলাম ও নৈতিক শিক্ষা',
    sheetTabName: 'Islam_Input',
    sheetRole: 'RELIGION',
    applicabilityType: 'RELIGION',
    applicabilityValue: 'I',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '112',
    name: 'Hindu Religion and Moral Education',
    bengaliName: 'হিন্দু ধর্ম ও নৈতিক শিক্ষা',
    sheetTabName: 'Hindu_Input',
    sheetRole: 'RELIGION',
    applicabilityType: 'RELIGION',
    applicabilityValue: 'H',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '113',
    name: 'Buddhist Religion and Moral Education',
    bengaliName: 'বৌদ্ধ ধর্ম ও নৈতিক শিক্ষা',
    sheetTabName: 'Buddha_Input',
    sheetRole: 'RELIGION',
    applicabilityType: 'RELIGION',
    applicabilityValue: 'B',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '150',
    name: 'Bangladesh & Global Studies',
    bengaliName: 'বাংলাদেশ ও বিশ্বপরিচয়',
    sheetTabName: 'BGS_Input',
    sheetRole: 'BGS_OR_SCIENCE',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'S',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '127',
    name: 'General Science',
    bengaliName: 'বিজ্ঞান',
    sheetTabName: 'Science_Input',
    sheetRole: 'BGS_OR_SCIENCE',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'N',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '136',
    name: 'Physics',
    bengaliName: 'পদার্থবিজ্ঞান',
    sheetTabName: 'Phy_Input',
    sheetRole: 'ELECTIVE1',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    code: '137',
    name: 'Chemistry',
    bengaliName: 'রসায়ন',
    sheetTabName: 'Chem_Input',
    sheetRole: 'ELECTIVE2',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    code: '138',
    name: 'Biology',
    bengaliName: 'জীববিজ্ঞান',
    sheetTabName: 'Bio_Input',
    sheetRole: 'ELECTIVE3',
    applicabilityType: 'GROUP',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    code: '146',
    name: 'Accounting',
    bengaliName: 'হিসাববিজ্ঞান',
    sheetTabName: 'Acc_Input',
    sheetRole: 'ELECTIVE1',
    applicabilityType: 'GROUP',
    applicabilityValue: 'C',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '152',
    name: 'Finance',
    bengaliName: 'ফিন্যান্স ও ব্যাংকিং',
    sheetTabName: 'Fin_Input',
    sheetRole: 'ELECTIVE2',
    applicabilityType: 'GROUP',
    applicabilityValue: 'C',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '143',
    name: 'B. Entrepreneurship',
    bengaliName: 'ব্যবসায় উদ্যোগ',
    sheetTabName: 'B.Entre_Input',
    sheetRole: 'ELECTIVE3',
    applicabilityType: 'GROUP',
    applicabilityValue: 'C',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '153',
    name: 'History',
    bengaliName: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা',
    sheetTabName: 'History_Input',
    sheetRole: 'ELECTIVE1',
    applicabilityType: 'GROUP',
    applicabilityValue: 'A',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '110',
    name: 'Geography',
    bengaliName: 'ভূগোল ও পরিবেশ',
    sheetTabName: 'Geo_Input',
    sheetRole: 'ELECTIVE2',
    applicabilityType: 'GROUP',
    applicabilityValue: 'A',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '140',
    name: 'Civics',
    bengaliName: 'পৌরনীতি ও নাগরিকতা',
    sheetTabName: 'Civics_Input',
    sheetRole: 'ELECTIVE3',
    applicabilityType: 'GROUP',
    applicabilityValue: 'A',
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks: 100,
  },
  {
    code: '126',
    name: 'Higher Mathematics',
    bengaliName: 'উচ্চতর গণিত',
    sheetTabName: 'HM_Input',
    sheetRole: 'OPTIONAL',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'S',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
  {
    code: '134',
    name: 'Agriculture Studies',
    bengaliName: 'কৃষিশিক্ষা',
    sheetTabName: 'Agri_Input',
    sheetRole: 'OPTIONAL',
    applicabilityType: 'OPTIONAL_TYPE',
    applicabilityValue: 'N',
    mcqMax: 25,
    writtenMax: 50,
    practicalMax: 25,
    fullMarks: 100,
  },
];

/**
 * Resolves the exact NCTB subject structure (MCQ/CQ/Practical splits, Bengali name, applicability)
 * from a subjectCode and/or subjectName.
 */
export function resolveSubjectSpec(
  subjectCode: string | undefined | null,
  subjectName: string | undefined | null,
  maxMarksOverride?: number
): SubjectCatalogData {
  const cleanCode = (subjectCode || '').trim();
  const cleanName = (subjectName || '').trim().toLowerCase();

  // 1. Exact match by subject name first (since 111 can be Islam/Hindu/Buddhist)
  const byName = SUBJECT_CATALOG.find(
    (item) =>
      item.name.toLowerCase() === cleanName ||
      item.sheetTabName.toLowerCase() === cleanName ||
      (cleanName.includes('bangla 1') && item.code === '101') ||
      (cleanName.includes('bangla 2') && item.code === '102') ||
      (cleanName.includes('english 1') && item.code === '107') ||
      (cleanName.includes('english 2') && item.code === '108') ||
      (cleanName.includes('information') && item.code === '154') ||
      (cleanName === 'ict' && item.code === '154') ||
      (cleanName.includes('higher math') && item.code === '126') ||
      (cleanName.includes('agriculture') && item.code === '134') ||
      (cleanName.includes('physics') && item.code === '136') ||
      (cleanName.includes('chemistry') && item.code === '137') ||
      (cleanName.includes('biology') && item.code === '138') ||
      (cleanName.includes('global studies') && item.code === '150') ||
      (cleanName.includes('accounting') && item.code === '146') ||
      (cleanName.includes('finance') && item.code === '152') ||
      (cleanName.includes('entrepreneur') && item.code === '143') ||
      (cleanName.includes('history') && item.code === '153') ||
      (cleanName.includes('geography') && item.code === '110') ||
      (cleanName.includes('civics') && item.code === '140')
  );
  if (byName) return byName;

  // 2. Match by subject code
  const byCode = SUBJECT_CATALOG.find((item) => item.code === cleanCode);
  if (byCode) return byCode;

  // 3. Fallback for custom 50-mark or 100-mark subjects
  const fullMarks = maxMarksOverride && maxMarksOverride > 0 ? maxMarksOverride : 100;
  if (fullMarks === 50) {
    return {
      code: cleanCode || '154',
      name: subjectName || '50-Mark Subject',
      bengaliName: subjectName || '৫০ নম্বরের বিষয়',
      sheetTabName: 'Custom50_Input',
      sheetRole: 'ICT',
      applicabilityType: 'ALL',
      applicabilityValue: null,
      mcqMax: 25,
      writtenMax: null,
      practicalMax: 25,
      fullMarks: 50,
    };
  }

  return {
    code: cleanCode || '100',
    name: subjectName || 'General Subject',
    bengaliName: subjectName || 'সাধারণ বিষয়',
    sheetTabName: 'General_Input',
    sheetRole: 'MATH',
    applicabilityType: 'ALL',
    applicabilityValue: null,
    mcqMax: 30,
    writtenMax: 70,
    practicalMax: null,
    fullMarks,
  };
}

/**
 * Ported directly from GradeUtils.kt:
 * fun calculateGrade(total: Int, outOf: Int = 100): Grade
 */
export function calculateGrade(total: number, outOf = 100): { letter: string; point: number } {
  const safeOutOf = Math.max(1, outOf);
  const percentage = (total / safeOutOf) * 100;

  if (percentage >= 80) return { letter: 'A+', point: 5.0 };
  if (percentage >= 70) return { letter: 'A', point: 4.0 };
  if (percentage >= 60) return { letter: 'A-', point: 3.5 };
  if (percentage >= 50) return { letter: 'B', point: 3.0 };
  if (percentage >= 40) return { letter: 'C', point: 2.0 };
  if (percentage >= 33) return { letter: 'D', point: 1.0 };
  return { letter: 'F', point: 0.0 };
}

/**
 * Ported directly from MarksEntryScreen.kt:
 * val componentCount = listOfNotNull(subject.mcqMax, subject.writtenMax, subject.practicalMax).size
 */
export function getSubjectComponentCount(spec: {
  mcqMax: number | null;
  writtenMax: number | null;
  practicalMax: number | null;
}): number {
  return [spec.mcqMax, spec.writtenMax, spec.practicalMax].filter(
    (v) => v !== null && v !== undefined
  ).length;
}

/**
 * Ported directly from MarksEntryScreen.kt:
 * fun belowPass(text: String, max: Int?): Boolean {
 *   if (componentCount <= 1 || max == null) return false
 *   val parsed = text.toIntOrNull() ?: return false
 *   val threshold = kotlin.math.round(max / 3.0).toInt()
 *   return parsed < threshold
 * }
 */
export function getComponentPassThreshold(
  max: number | null | undefined,
  componentCount: number
): number | null {
  if (componentCount <= 1 || max === null || max === undefined || max <= 0) return null;
  return Math.round(max / 3.0);
}

export function isComponentBelowPass(
  score: number | null | undefined,
  max: number | null | undefined,
  componentCount: number
): boolean {
  if (componentCount <= 1 || max === null || max === undefined) return false;
  if (score === null || score === undefined || Number.isNaN(score)) return false;
  const threshold = Math.round(max / 3.0);
  return score < threshold;
}

export interface EvaluatedMarkResult {
  mcq: number | null;
  written: number | null;
  practical: number | null;
  totalMarks: number;
  letterGrade: string;
  gpa: number;
  mcqBelowPass: boolean;
  writtenBelowPass: boolean;
  practicalBelowPass: boolean;
  hasAnyComponentFail: boolean;
  isComplete: boolean;
}

/**
 * Evaluates a student's component marks against a subject's NCTB structure:
 * - Enforces component pass thresholds (Math.round(max / 3.0)) when componentCount > 1
 * - Auto-calculates Total, Letter Grade (A+, A, A-, B, C, D, F), and GPA (0.00 to 5.00)
 */
export function evaluateSubjectMarkComponents(
  input: {
    mcq: number | null | undefined;
    written: number | null | undefined;
    practical: number | null | undefined;
  },
  spec: {
    mcqMax: number | null;
    writtenMax: number | null;
    practicalMax: number | null;
    fullMarks: number;
  }
): EvaluatedMarkResult {
  const componentCount = getSubjectComponentCount(spec);

  const mcq =
    spec.mcqMax !== null && input.mcq !== null && input.mcq !== undefined && !Number.isNaN(input.mcq)
      ? Math.max(0, Math.min(spec.mcqMax, Math.floor(input.mcq)))
      : null;

  const written =
    spec.writtenMax !== null &&
    input.written !== null &&
    input.written !== undefined &&
    !Number.isNaN(input.written)
      ? Math.max(0, Math.min(spec.writtenMax, Math.floor(input.written)))
      : null;

  const practical =
    spec.practicalMax !== null &&
    input.practical !== null &&
    input.practical !== undefined &&
    !Number.isNaN(input.practical)
      ? Math.max(0, Math.min(spec.practicalMax, Math.floor(input.practical)))
      : null;

  const mcqBelowPass = isComponentBelowPass(mcq, spec.mcqMax, componentCount);
  const writtenBelowPass = isComponentBelowPass(written, spec.writtenMax, componentCount);
  const practicalBelowPass = isComponentBelowPass(practical, spec.practicalMax, componentCount);

  const hasAnyComponentFail = mcqBelowPass || writtenBelowPass || practicalBelowPass;
  const totalMarks = Math.min(
    spec.fullMarks,
    (mcq ?? 0) + (written ?? 0) + (practical ?? 0)
  );

  const isComplete =
    (spec.mcqMax === null || mcq !== null) &&
    (spec.writtenMax === null || written !== null) &&
    (spec.practicalMax === null || practical !== null);

  if (hasAnyComponentFail) {
    return {
      mcq,
      written,
      practical,
      totalMarks,
      letterGrade: 'F',
      gpa: 0.0,
      mcqBelowPass,
      writtenBelowPass,
      practicalBelowPass,
      hasAnyComponentFail: true,
      isComplete,
    };
  }

  const grade = calculateGrade(totalMarks, spec.fullMarks);
  return {
    mcq,
    written,
    practical,
    totalMarks,
    letterGrade: grade.letter,
    gpa: grade.point,
    mcqBelowPass,
    writtenBelowPass,
    practicalBelowPass,
    hasAnyComponentFail: false,
    isComplete,
  };
}

/**
 * Combined 1st & 2nd Paper NCTB calculation (Bangla 1st & 2nd out of 200; English 1st & 2nd out of 200)
 */
export interface CombinedPaperResult {
  paper1Total: number;
  paper2Total: number;
  combinedMcq: number;
  combinedWritten: number;
  combinedTotal: number;
  outOf: number;
  mcqBelowPass: boolean;
  writtenBelowPass: boolean;
  letterGrade: string;
  gpa: number;
}

export function evaluateCombinedTwoPaperMarks(
  group: 'BANGLA' | 'ENGLISH',
  paper1: { mcq?: number | null; written?: number | null },
  paper2: { mcq?: number | null; written?: number | null }
): CombinedPaperResult {
  const p1Mcq = Math.max(0, paper1.mcq ?? 0);
  const p1Written = Math.max(0, paper1.written ?? 0);
  const p2Mcq = Math.max(0, paper2.mcq ?? 0);
  const p2Written = Math.max(0, paper2.written ?? 0);

  const paper1Total = p1Mcq + p1Written;
  const paper2Total = p2Mcq + p2Written;
  const combinedMcq = p1Mcq + p2Mcq;
  const combinedWritten = p1Written + p2Written;
  const combinedTotal = Math.min(200, paper1Total + paper2Total);

  if (group === 'BANGLA') {
    // Bangla 1st + 2nd combined: MCQ out of 60 (pass: round(60/3)=20), CQ out of 140 (pass: round(140/3)=47)
    const mcqBelowPass = combinedMcq < Math.round(60 / 3.0);
    const writtenBelowPass = combinedWritten < Math.round(140 / 3.0);
    if (mcqBelowPass || writtenBelowPass) {
      return {
        paper1Total,
        paper2Total,
        combinedMcq,
        combinedWritten,
        combinedTotal,
        outOf: 200,
        mcqBelowPass,
        writtenBelowPass,
        letterGrade: 'F',
        gpa: 0.0,
      };
    }
    const grade = calculateGrade(combinedTotal, 200);
    return {
      paper1Total,
      paper2Total,
      combinedMcq,
      combinedWritten,
      combinedTotal,
      outOf: 200,
      mcqBelowPass: false,
      writtenBelowPass: false,
      letterGrade: grade.letter,
      gpa: grade.point,
    };
  }

  // English 1st + 2nd combined: single written component out of 200 (pass: 33% = 66)
  const grade = calculateGrade(combinedTotal, 200);
  return {
    paper1Total,
    paper2Total,
    combinedMcq: 0,
    combinedWritten,
    combinedTotal,
    outOf: 200,
    mcqBelowPass: false,
    writtenBelowPass: combinedTotal < 66,
    letterGrade: grade.letter,
    gpa: grade.point,
  };
}

/**
 * Ported directly from CalculationUtils.kt:
 * object CalculationUtils { fun getSomonnitoMarks(...) }
 */
export interface SomonnitoMarkEntity {
  rollNumber: number;
  subjectId: string;
  year: number;
  term: 'ARDHOBARSHIK' | 'BARSHIK' | 'SOMONNITO';
  mcq: number | null;
  written: number | null;
  practical: number | null;
}

export function calculateCombinedComponent(
  ardhoVal: number | null | undefined,
  barshikVal: number | null | undefined,
  ardhoPercent: number
): number | null {
  if (
    (ardhoVal === null || ardhoVal === undefined) &&
    (barshikVal === null || barshikVal === undefined)
  ) {
    return null;
  }
  const ardhoScore = ardhoVal ?? 0;
  const barshikScore = barshikVal ?? 0;
  return Math.round(
    (ardhoScore * ardhoPercent) / 100.0 + (barshikScore * (100 - ardhoPercent)) / 100.0
  );
}

export function getSomonnitoMarks(params: {
  year: number;
  rollNumber: number;
  subjectId: string;
  ardhoPercent: number;
  ardhoMarks: SomonnitoMarkEntity[];
  barshikMarks: SomonnitoMarkEntity[];
}): SomonnitoMarkEntity | null {
  const { year, rollNumber, subjectId, ardhoPercent, ardhoMarks, barshikMarks } = params;

  const ardho = ardhoMarks.find(
    (m) =>
      m.rollNumber === rollNumber &&
      m.subjectId === subjectId &&
      m.year === year &&
      m.term === 'ARDHOBARSHIK'
  );
  const barshik = barshikMarks.find(
    (m) =>
      m.rollNumber === rollNumber &&
      m.subjectId === subjectId &&
      m.year === year &&
      m.term === 'BARSHIK'
  );

  if (!ardho && !barshik) return null;

  const mcq = calculateCombinedComponent(ardho?.mcq, barshik?.mcq, ardhoPercent);
  const written = calculateCombinedComponent(ardho?.written, barshik?.written, ardhoPercent);
  const practical = calculateCombinedComponent(ardho?.practical, barshik?.practical, ardhoPercent);

  return {
    rollNumber,
    subjectId,
    year,
    term: 'SOMONNITO',
    mcq,
    written,
    practical,
  };
}

/**
 * Ported directly from VerificationSheetDialog.kt:
 * private fun paperLabel(subjectName: String): String
 */
export function getPaperLabel(subjectName: string): string {
  if (subjectName.includes('1st Paper')) return '১ম পত্র';
  if (subjectName.includes('2nd Paper')) return '২য় পত্র';
  return '-';
}

/**
 * Ported from VerificationSheetDialog.kt / TabulationDisplay:
 * Formats "নৈঃ+রঃ+ব্যবঃ = মোট" for the physical নম্বর ফর্দ verification sheet.
 */
export function formatVerificationLedgerBreakdown(
  mark: {
    mcqMarks?: number | null;
    writtenMarks?: number | null;
    practicalMarks?: number | null;
  } | null | undefined,
  spec: {
    mcqMax: number | null;
    writtenMax: number | null;
    practicalMax: number | null;
  },
  useBengali: boolean,
  showTotal: boolean
): string {
  if (!mark) return '';
  const hasAny =
    (mark.mcqMarks !== null && mark.mcqMarks !== undefined) ||
    (mark.writtenMarks !== null && mark.writtenMarks !== undefined) ||
    (mark.practicalMarks !== null && mark.practicalMarks !== undefined);
  if (!hasAny) return '';

  const parts: number[] = [];
  if (spec.mcqMax !== null) {
    parts.push(mark.mcqMarks ?? 0);
  }
  if (spec.writtenMax !== null) {
    parts.push(mark.writtenMarks ?? 0);
  }
  if (spec.practicalMax !== null) {
    parts.push(mark.practicalMarks ?? 0);
  }

  const total = parts.reduce((acc, v) => acc + v, 0);
  let rawBreakdown = '';
  if (parts.length <= 1) {
    rawBreakdown = `${total}`;
  } else {
    rawBreakdown = `${parts.join('+')} = ${total}`;
  }

  if (!showTotal && rawBreakdown.includes('=')) {
    rawBreakdown = rawBreakdown.split('=')[0].trim();
  }

  return formatNumeral(rawBreakdown, useBengali ? 'bn' : 'en');
}

/**
 * Filters students according to SubjectCatalog applicability rules (MarksEntryScreen.kt).
 */
export function filterStudentsForSubjectApplicability(
  students: Student[],
  spec: SubjectCatalogData,
  strictApplicability = true
): Student[] {
  const active = students
    .filter((s) => s.status === 'active')
    .sort((a, b) => a.roll - b.roll);

  if (!strictApplicability || spec.applicabilityType === 'ALL') {
    return active;
  }

  if (spec.applicabilityType === 'GROUP') {
    // If all students in the class are 'General' (Class 6-8), return all active students
    const hasGroupedStudents = active.some((s) => s.group !== 'General');
    if (!hasGroupedStudents) return active;

    return active.filter((s) => {
      if (spec.applicabilityValue === 'S') return s.group === 'Science';
      if (spec.applicabilityValue === 'C') return s.group === 'Business Studies';
      if (spec.applicabilityValue === 'A') return s.group === 'Humanities';
      return true;
    });
  }

  if (spec.applicabilityType === 'OPTIONAL_TYPE') {
    if (spec.sheetRole === 'OPTIONAL') {
      const matched = active.filter((s) => {
        const optLower = (s.optionalSubject || '').toLowerCase();
        if (spec.applicabilityValue === 'S') {
          return optLower.includes('higher math') || s.group === 'Science';
        }
        if (spec.applicabilityValue === 'N') {
          return optLower.includes('agri') || s.group !== 'Science';
        }
        return true;
      });
      return matched.length > 0 ? matched : active;
    }

    if (spec.sheetRole === 'BGS_OR_SCIENCE') {
      const hasGroupedStudents = active.some((s) => s.group !== 'General');
      if (!hasGroupedStudents) return active;
      if (spec.code === '127') {
        // General Science for Humanities & Business Studies in Class 9-10
        const nonSci = active.filter((s) => s.group !== 'Science');
        return nonSci.length > 0 ? nonSci : active;
      }
      return active;
    }
  }

  return active;
}
