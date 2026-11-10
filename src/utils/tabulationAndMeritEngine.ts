import {
  AttendanceRecord,
  Student,
  SubjectAssignment,
  SubjectMarkRecord,
} from '../types/school';
import {
  ApplicabilityType,
  resolveSubjectSpec,
  SheetRole,
  SUBJECT_CATALOG,
} from './marksCatalogAndLogic';
import { parseAbsentRollsSet } from './attendanceAnalytics';
import { formatNumeral } from './schoolLogic';

/**
 * Entities ported from TabulationEngine.kt & MeritListEngine.kt
 */
export interface TabulationSubjectEntity {
  id: string;
  code: string;
  name: string;
  bengaliName: string;
  sheetRole: SheetRole | 'NONE';
  applicabilityType: ApplicabilityType;
  applicabilityValue: string | null;
  mcqMax: number | null;
  writtenMax: number | null;
  practicalMax: number | null;
  fullMarks: number;
}

export interface TabulationStudentEntity {
  id: string;
  roll: number;
  name: string;
  section: string;
  className: string;
  /**
   * "S" (Science), "C" (Business Studies / Commerce), "A" (Humanities / Arts), or "G" (General)
   */
  group: string;
  groupDisplay: string;
  /**
   * "I" (Islam), "H" (Hindu), "B" (Buddhist)
   */
  religion: string;
  religionDisplay: string;
  /**
   * "S" (Higher Math / Science optional), "N" (Agriculture / Non-science optional)
   */
  optionalType: string;
  optionalSubjectDisplay: string;
}

export interface TabulationMarkEntity {
  studentId: string;
  subjectId: string;
  mcqMarks: number | null;
  writtenMarks: number | null;
  practicalMarks: number | null;
}

export interface SubjectResult {
  subject: TabulationSubjectEntity;
  mcqMarks: number | null;
  writtenMarks: number | null;
  practicalMarks: number | null;
  total: number;
  letterGrade: string;
  gradePoint: number;
}

export interface StudentResult {
  student: TabulationStudentEntity;
  subjectResults: SubjectResult[];
  grandTotal: number;
  failedCount: number;
  gpa: number | null;
  letterGrade: string;
  position: number | null;
  optionalBonusGP: number;
  banglaCombinedTotal: number | null;
  banglaCombinedGP: number | null;
  banglaCombinedGrade: string | null;
  englishCombinedTotal: number | null;
  englishCombinedGP: number | null;
  englishCombinedGrade: string | null;
}

export interface CombinedSubjectResult {
  sheetRole: string;
  applicabilityValue: string | null;
  subjectName: string;
  bengaliName: string;
  subjectCode: string;
  fullMarks: number;
  mcqMax: number | null;
  writtenMax: number | null;
  practicalMax: number | null;
  mcqMarks: number | null;
  writtenMarks: number | null;
  practicalMarks: number | null;
  total: number;
  letterGrade: string;
  gradePoint: number;
  midTotal: number | null;
  annualTotal: number | null;
}

export interface CombinedStudentResult {
  student: TabulationStudentEntity;
  subjectResults: CombinedSubjectResult[];
  grandTotal: number;
  failedCount: number;
  gpa: number | null;
  letterGrade: string;
  position: number | null;
  optionalBonusGP: number;
}

/**
 * MeritListEngine.kt data structures
 */
export interface MeritListFilter {
  group?: string | null; // "S" | "C" | "A" | "G" or null
  religion?: string | null; // "I" | "H" | "B" or null
  optionalType?: string | null; // "S" | "N" or null
  excludeFailed?: boolean;
  topN?: number | null;
}

export interface MeritListEntry {
  studentId: string;
  rank: number;
  roll: number;
  name: string;
  section: string;
  group: string;
  groupDisplay: string;
  religion: string;
  religionDisplay: string;
  optionalType: string;
  optionalSubjectDisplay: string;
  grandTotal: number;
  gpa: number | null;
  letterGrade: string;
  failedCount: number;
  optionalBonusGP: number;
}

export interface SubjectTopperEntry {
  rank: number;
  roll: number;
  name: string;
  total: number;
  letterGrade: string;
  breakdown: string;
}

export interface SubjectTopperGroup {
  sheetRole: string;
  applicabilityValue: string | null;
  subjectName: string;
  bengaliName: string;
  fullMarks: number;
  toppers: SubjectTopperEntry[];
}

/**
 * CombinedResultScreen.kt promotion consideration categories
 */
export type PromotionCategory =
  | 'MERIT'
  | '1ST_CONSIDERATION'
  | '2ND_CONSIDERATION'
  | 'SPECIAL_CONSIDERATION'
  | 'NOT_PASSED';

export interface PromotionSummaryStudent {
  studentId: string;
  oldRoll: number;
  newRoll: number | null;
  section: string;
  name: string;
  groupDisplay: string;
  totalMarks: number;
  failedCount: number;
  gpa: number | null;
  letterGrade: string;
  category: PromotionCategory;
  categoryBengali: string;
}

export interface PromotionSummaryCounts {
  meritCount: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  passCount: number;
  notPassedCount: number;
  totalStudents: number;
}

/**
 * TabulationDisplay helper functions ported from the Kotlin app
 */
export const TabulationDisplay = {
  formatBreakdown(
    mcqMarks: number | null | undefined,
    writtenMarks: number | null | undefined,
    practicalMarks: number | null | undefined,
    total: number
  ): string {
    const parts = [mcqMarks, writtenMarks, practicalMarks].filter(
      (v): v is number => v !== null && v !== undefined
    );
    if (parts.length === 0 || total === 0) return '-';
    if (parts.length <= 1) return `${total}`;
    return `${parts.join('+')}=${total}`;
  },

  formatDouble(value: number): string {
    const roundedInt = Math.trunc(value);
    if (Math.abs(value - roundedInt) < 1e-6) {
      return `${roundedInt}`;
    }
    return value.toFixed(1);
  },

  formatCombinedBreakdown(sr: CombinedSubjectResult | null | undefined): string {
    if (!sr) return '-';
    const parts = [sr.mcqMarks, sr.writtenMarks, sr.practicalMarks].filter(
      (v): v is number => v !== null && v !== undefined
    );
    if (parts.length === 0 || sr.total === 0) return '-';
    if (parts.length <= 1) return TabulationDisplay.formatDouble(sr.total);
    return (
      parts.map((p) => TabulationDisplay.formatDouble(p)).join('+') +
      '=' +
      TabulationDisplay.formatDouble(sr.total)
    );
  },

  columnGroupKey(subject: { sheetRole: string; applicabilityValue: string | null }): string {
    // Religion and Group electives share canonical slot columns in the tabulation sheet unless BGS_OR_SCIENCE
    if (subject.sheetRole === 'BGS_OR_SCIENCE') {
      return `${subject.sheetRole}_${subject.applicabilityValue ?? 'ALL'}`;
    }
    return `${subject.sheetRole}_${subject.applicabilityValue ?? 'ALL'}`;
  },

  bengaliLabel(sheetRole: string, applicabilityValue: string | null, fallbackName?: string): string {
    switch (sheetRole) {
      case 'BANGLA1':
        return 'বাংলা ১ম';
      case 'BANGLA2':
        return 'বাংলা ২য়';
      case 'ENG1':
        return 'ইংরেজি ১ম';
      case 'ENG2':
        return 'ইংরেজি ২য়';
      case 'MATH':
        return 'গণিত';
      case 'ICT':
        return 'আইসিটি';
      case 'RELIGION':
        if (applicabilityValue === 'H') return 'হিন্দুধর্ম';
        if (applicabilityValue === 'B') return 'বৌদ্ধধর্ম';
        return 'ইসলাম ধর্ম';
      case 'BGS_OR_SCIENCE':
        return applicabilityValue === 'N' ? 'বিজ্ঞান' : 'বাওবি';
      case 'ELECTIVE1':
        if (applicabilityValue === 'C') return 'হিসাববিজ্ঞান';
        if (applicabilityValue === 'A') return 'ইতিহাস';
        return 'পদার্থবিজ্ঞান';
      case 'ELECTIVE2':
        if (applicabilityValue === 'C') return 'ফিন্যান্স';
        if (applicabilityValue === 'A') return 'ভূগোল';
        return 'রসায়ন';
      case 'ELECTIVE3':
        if (applicabilityValue === 'C') return 'ব্যবসায় উদ্যোগ';
        if (applicabilityValue === 'A') return 'পৌরনীতি';
        return 'জীববিজ্ঞান';
      case 'OPTIONAL':
        return applicabilityValue === 'N' ? 'কৃষিশিক্ষা (৪র্থ)' : 'উচ্চতর গণিত (৪র্থ)';
      default:
        return fallbackName || sheetRole;
    }
  },

  canonicalOrder(sheetRole: string, applicabilityValue: string | null): number {
    switch (sheetRole) {
      case 'BANGLA1':
        return 10;
      case 'BANGLA2':
        return 20;
      case 'ENG1':
        return 30;
      case 'ENG2':
        return 40;
      case 'MATH':
        return 50;
      case 'RELIGION':
        if (applicabilityValue === 'I') return 60;
        if (applicabilityValue === 'H') return 61;
        if (applicabilityValue === 'B') return 62;
        return 60;
      case 'BGS_OR_SCIENCE':
        return applicabilityValue === 'S' ? 70 : 75;
      case 'ICT':
        return 80;
      case 'ELECTIVE1':
        if (applicabilityValue === 'S') return 90;
        if (applicabilityValue === 'C') return 91;
        return 92;
      case 'ELECTIVE2':
        if (applicabilityValue === 'S') return 100;
        if (applicabilityValue === 'C') return 101;
        return 102;
      case 'ELECTIVE3':
        if (applicabilityValue === 'S') return 110;
        if (applicabilityValue === 'C') return 111;
        return 112;
      case 'OPTIONAL':
        return applicabilityValue === 'S' ? 120 : 125;
      default:
        return 999;
    }
  },

  marksheetSubjectOrder(subject: TabulationSubjectEntity): number {
    switch (subject.sheetRole) {
      case 'BANGLA1':
        return 1;
      case 'BANGLA2':
        return 2;
      case 'ENG1':
        return 3;
      case 'ENG2':
        return 4;
      case 'MATH':
        return 5;
      case 'RELIGION':
        return 6;
      // 7 is placeholder: শরীর চর্চা ও চারুকারু
      case 'BGS_OR_SCIENCE':
        return subject.applicabilityValue === 'S' ? 8 : 9;
      case 'ELECTIVE1':
        if (subject.applicabilityValue === 'S') return 10; // Physics
        if (subject.applicabilityValue === 'C') return 14; // Accounting
        return 17; // History
      case 'ELECTIVE2':
        if (subject.applicabilityValue === 'S') return 11; // Chemistry
        if (subject.applicabilityValue === 'C') return 15; // Finance
        return 18; // Geography
      case 'ELECTIVE3':
        if (subject.applicabilityValue === 'S') return 12; // Biology
        if (subject.applicabilityValue === 'C') return 16; // Business Ent.
        return 19; // Civics
      // 13 is placeholder: কম্পিউটার
      case 'ICT':
        return 20;
      case 'OPTIONAL':
        return 21;
      // 22 is placeholder: কর্ম ও জীবন মুখী শিক্ষা
      default:
        return 25;
    }
  },

  bengaliSubjectName(subject: TabulationSubjectEntity): string {
    if (subject.sheetRole === 'RELIGION') {
      return 'ধর্ম ও নৈতিক শিক্ষা';
    }
    return subject.bengaliName || subject.name;
  },
};

/**
 * Exact TypeScript port of TabulationEngine.kt
 */
export const TabulationEngine = {
  letterGrade(
    total: number,
    fullMarks: number,
    sheetRole: SheetRole | 'NONE',
    hasMarksForSubject = false
  ): string {
    if (total === 0 && !hasMarksForSubject) return '';
    if (sheetRole === 'ICT' || fullMarks === 50) {
      if (total >= 40) return 'A+';
      if (total >= 35) return 'A';
      if (total >= 30) return 'A-';
      if (total >= 25) return 'B';
      if (total >= 20) return 'C';
      if (total >= 16) return 'D';
      return 'F';
    } else {
      if (total >= 80) return 'A+';
      if (total >= 70) return 'A';
      if (total >= 60) return 'A-';
      if (total >= 50) return 'B';
      if (total >= 40) return 'C';
      if (total >= 33) return 'D';
      return 'F';
    }
  },

  letterGradeDouble(
    total: number,
    fullMarks: number,
    sheetRole: SheetRole | 'NONE',
    hasMarksForSubject = false
  ): string {
    if (total <= 0.0 && !hasMarksForSubject) return '';
    if (sheetRole === 'ICT' || fullMarks === 50) {
      if (total >= 40) return 'A+';
      if (total >= 35) return 'A';
      if (total >= 30) return 'A-';
      if (total >= 25) return 'B';
      if (total >= 20) return 'C';
      if (total >= 16) return 'D';
      return 'F';
    } else {
      if (total >= 80) return 'A+';
      if (total >= 70) return 'A';
      if (total >= 60) return 'A-';
      if (total >= 50) return 'B';
      if (total >= 40) return 'C';
      if (total >= 33) return 'D';
      return 'F';
    }
  },

  gradePointFromLetter(lg: string): number {
    switch (lg) {
      case 'A+':
        return 5.0;
      case 'A':
        return 4.0;
      case 'A-':
        return 3.5;
      case 'B':
        return 3.0;
      case 'C':
        return 2.0;
      case 'D':
        return 1.0;
      case 'F':
      case '':
      default:
        return 0.0;
    }
  },

  letterFromGradePoint(gp: number): string {
    if (gp >= 5.0) return 'A+';
    if (gp >= 4.0) return 'A';
    if (gp >= 3.5) return 'A-';
    if (gp >= 3.0) return 'B';
    if (gp >= 2.0) return 'C';
    if (gp >= 1.0) return 'D';
    return 'F';
  },

  combinedGP(combined: number, _outOf = 200): number {
    if (combined >= 160) return 5.0;
    if (combined >= 140) return 4.0;
    if (combined >= 120) return 3.5;
    if (combined >= 100) return 3.0;
    if (combined >= 80) return 2.0;
    if (combined >= 66) return 1.0;
    return 0.0;
  },

  combinedGPDouble(combined: number, _outOf = 200): number {
    if (combined >= 160) return 5.0;
    if (combined >= 140) return 4.0;
    if (combined >= 120) return 3.5;
    if (combined >= 100) return 3.0;
    if (combined >= 80) return 2.0;
    if (combined >= 66) return 1.0;
    return 0.0;
  },

  optionalBonus(gp: number): number {
    return Math.max(0.0, gp - 2.0);
  },

  passesComponentMinimums(
    mcqMarks: number | null | undefined,
    writtenMarks: number | null | undefined,
    practicalMarks: number | null | undefined,
    mcqMax: number | null | undefined,
    writtenMax: number | null | undefined,
    practicalMax: number | null | undefined
  ): boolean {
    const componentCount = [mcqMax, writtenMax, practicalMax].filter(
      (v) => v !== null && v !== undefined
    ).length;
    if (componentCount <= 1) return true;

    const clears = (mark: number | null | undefined, max: number | null | undefined): boolean => {
      if (max === null || max === undefined) return true;
      const threshold = Math.round(max / 3.0);
      return (mark ?? 0) >= threshold;
    };

    return (
      clears(mcqMarks, mcqMax) &&
      clears(writtenMarks, writtenMax) &&
      clears(practicalMarks, practicalMax)
    );
  },

  passesComponentMinimumsDouble(
    mcqMarks: number | null | undefined,
    writtenMarks: number | null | undefined,
    practicalMarks: number | null | undefined,
    mcqMax: number | null | undefined,
    writtenMax: number | null | undefined,
    practicalMax: number | null | undefined
  ): boolean {
    const componentCount = [mcqMax, writtenMax, practicalMax].filter(
      (v) => v !== null && v !== undefined
    ).length;
    if (componentCount <= 1) return true;

    const clears = (mark: number | null | undefined, max: number | null | undefined): boolean => {
      if (max === null || max === undefined) return true;
      const threshold = Math.round(max / 3.0);
      return (mark ?? 0.0) >= threshold;
    };

    return (
      clears(mcqMarks, mcqMax) &&
      clears(writtenMarks, writtenMax) &&
      clears(practicalMarks, practicalMax)
    );
  },

  passesCombinedMinimums(
    totalMcq: number,
    totalWritten: number,
    totalPractical: number,
    mcqMax1: number,
    mcqMax2: number,
    writtenMax1: number,
    writtenMax2: number,
    practicalMax1: number,
    practicalMax2: number
  ): boolean {
    const hasMultipleComponents =
      [mcqMax1 + mcqMax2, writtenMax1 + writtenMax2, practicalMax1 + practicalMax2].filter(
        (v) => v > 0
      ).length > 1;
    if (!hasMultipleComponents) return true;

    const threshold = (max1: number, max2: number): number => {
      const t1 = max1 > 0 ? Math.round(max1 / 3.0) : 0;
      const t2 = max2 > 0 ? Math.round(max2 / 3.0) : 0;
      return t1 + t2;
    };

    return (
      totalMcq >= threshold(mcqMax1, mcqMax2) &&
      totalWritten >= threshold(writtenMax1, writtenMax2) &&
      totalPractical >= threshold(practicalMax1, practicalMax2)
    );
  },

  passesCombinedMinimumsDouble(
    totalMcq: number,
    totalWritten: number,
    totalPractical: number,
    mcqMax1: number,
    mcqMax2: number,
    writtenMax1: number,
    writtenMax2: number,
    practicalMax1: number,
    practicalMax2: number
  ): boolean {
    return TabulationEngine.passesCombinedMinimums(
      totalMcq,
      totalWritten,
      totalPractical,
      mcqMax1,
      mcqMax2,
      writtenMax1,
      writtenMax2,
      practicalMax1,
      practicalMax2
    );
  },

  /**
   * Direct port of TabulationEngine.compute(students, subjects, marks)
   */
  compute(
    students: TabulationStudentEntity[],
    subjects: TabulationSubjectEntity[],
    marks: TabulationMarkEntity[],
    options?: { strictNineDivisor?: boolean }
  ): StudentResult[] {
    const subjectsWithMarks = new Set(marks.map((m) => m.subjectId));
    const studentResults: StudentResult[] = [];

    for (const student of students) {
      const applicableSubjects = subjects.filter((subject) => {
        switch (subject.applicabilityType) {
          case 'ALL':
            return true;
          case 'RELIGION':
            return subject.applicabilityValue === student.religion;
          case 'GROUP':
            // In General group (Classes 6-8), group subjects if assigned are applicable to all
            if (student.group === 'G') return true;
            return subject.applicabilityValue === student.group;
          case 'OPTIONAL_TYPE':
            if (student.group === 'G') return true;
            return subject.applicabilityValue === student.optionalType;
          default:
            return false;
        }
      });

      const subjectResults: SubjectResult[] = [];
      let grandTotal = 0;
      let failedCount = 0;

      let bangla1Total = 0;
      let bangla2Total = 0;
      let eng1Total = 0;
      let eng2Total = 0;

      const individualGPs: number[] = [];
      let optionalBonusGP = 0.0;

      let bangla1Result: SubjectResult | null = null;
      let bangla2Result: SubjectResult | null = null;
      let eng1Result: SubjectResult | null = null;
      let eng2Result: SubjectResult | null = null;

      for (const subject of applicableSubjects) {
        const mark = marks.find(
          (m) => m.studentId === student.id && m.subjectId === subject.id
        );
        const total =
          (mark?.mcqMarks ?? 0) + (mark?.writtenMarks ?? 0) + (mark?.practicalMarks ?? 0);
        grandTotal += total;

        const sheetRole = subject.sheetRole || 'NONE';
        const hasMarksForSubject = subjectsWithMarks.has(subject.id);
        const rawLg = TabulationEngine.letterGrade(
          total,
          subject.fullMarks,
          sheetRole,
          hasMarksForSubject
        );
        const passesComp = TabulationEngine.passesComponentMinimums(
          mark?.mcqMarks,
          mark?.writtenMarks,
          mark?.practicalMarks,
          subject.mcqMax,
          subject.writtenMax,
          subject.practicalMax
        );
        const lg = rawLg.length > 0 && !passesComp ? 'F' : rawLg;
        const gp = TabulationEngine.gradePointFromLetter(lg);

        if (lg === 'F' && sheetRole !== 'OPTIONAL') {
          if (
            sheetRole !== 'BANGLA1' &&
            sheetRole !== 'BANGLA2' &&
            sheetRole !== 'ENG1' &&
            sheetRole !== 'ENG2'
          ) {
            failedCount++;
          }
        }

        const res: SubjectResult = {
          subject,
          mcqMarks: mark?.mcqMarks ?? null,
          writtenMarks: mark?.writtenMarks ?? null,
          practicalMarks: mark?.practicalMarks ?? null,
          total,
          letterGrade: lg,
          gradePoint: gp,
        };
        subjectResults.push(res);

        switch (sheetRole) {
          case 'BANGLA1':
            bangla1Total = total;
            bangla1Result = res;
            break;
          case 'BANGLA2':
            bangla2Total = total;
            bangla2Result = res;
            break;
          case 'ENG1':
            eng1Total = total;
            eng1Result = res;
            break;
          case 'ENG2':
            eng2Total = total;
            eng2Result = res;
            break;
          case 'MATH':
          case 'RELIGION':
          case 'BGS_OR_SCIENCE':
          case 'ELECTIVE1':
          case 'ELECTIVE2':
          case 'ELECTIVE3':
          case 'ICT':
            if (hasMarksForSubject || options?.strictNineDivisor) {
              individualGPs.push(gp);
            }
            break;
          case 'OPTIONAL':
            if (hasMarksForSubject || options?.strictNineDivisor) {
              optionalBonusGP = TabulationEngine.optionalBonus(gp);
            }
            break;
          default:
            break;
        }
      }

      let banglaGP = 0.0;
      let banglaCombinedTotal: number | null = null;
      let banglaCombinedGrade: string | null = null;
      const hasBangla = bangla1Result !== null || bangla2Result !== null;

      if (hasBangla) {
        const bothBanglaPapers = bangla1Result !== null && bangla2Result !== null;
        if (bothBanglaPapers || options?.strictNineDivisor) {
          const totalMcq = (bangla1Result?.mcqMarks ?? 0) + (bangla2Result?.mcqMarks ?? 0);
          const totalWritten =
            (bangla1Result?.writtenMarks ?? 0) + (bangla2Result?.writtenMarks ?? 0);
          const totalPractical =
            (bangla1Result?.practicalMarks ?? 0) + (bangla2Result?.practicalMarks ?? 0);

          const clearsComponents = TabulationEngine.passesCombinedMinimums(
            totalMcq,
            totalWritten,
            totalPractical,
            bangla1Result?.subject.mcqMax ?? 0,
            bangla2Result?.subject.mcqMax ?? 0,
            bangla1Result?.subject.writtenMax ?? 0,
            bangla2Result?.subject.writtenMax ?? 0,
            bangla1Result?.subject.practicalMax ?? 0,
            bangla2Result?.subject.practicalMax ?? 0
          );

          banglaCombinedTotal = bangla1Total + bangla2Total;
          const rawGP = TabulationEngine.combinedGP(banglaCombinedTotal, 200);
          if (clearsComponents && rawGP > 0.0) {
            banglaGP = rawGP;
          }
          banglaCombinedGrade =
            banglaGP > 0 ? TabulationEngine.letterFromGradePoint(banglaGP) : 'F';
          if (banglaGP === 0.0) {
            failedCount++;
          }
        } else {
          // Single-paper Bangla fallback (e.g. Class 6 where only 1st paper is configured)
          const singleRes = (bangla1Result || bangla2Result)!;
          banglaGP = singleRes.gradePoint;
          banglaCombinedTotal = singleRes.total;
          banglaCombinedGrade = singleRes.letterGrade || 'F';
          if (singleRes.letterGrade === 'F' || banglaGP === 0.0) {
            failedCount++;
          }
        }
      }

      let engGP = 0.0;
      let englishCombinedTotal: number | null = null;
      let englishCombinedGrade: string | null = null;
      const hasEng = eng1Result !== null || eng2Result !== null;

      if (hasEng) {
        const bothEngPapers = eng1Result !== null && eng2Result !== null;
        if (bothEngPapers || options?.strictNineDivisor) {
          const totalMcq = (eng1Result?.mcqMarks ?? 0) + (eng2Result?.mcqMarks ?? 0);
          const totalWritten =
            (eng1Result?.writtenMarks ?? 0) + (eng2Result?.writtenMarks ?? 0);
          const totalPractical =
            (eng1Result?.practicalMarks ?? 0) + (eng2Result?.practicalMarks ?? 0);

          const clearsComponents = TabulationEngine.passesCombinedMinimums(
            totalMcq,
            totalWritten,
            totalPractical,
            eng1Result?.subject.mcqMax ?? 0,
            eng2Result?.subject.mcqMax ?? 0,
            eng1Result?.subject.writtenMax ?? 0,
            eng2Result?.subject.writtenMax ?? 0,
            eng1Result?.subject.practicalMax ?? 0,
            eng2Result?.subject.practicalMax ?? 0
          );

          englishCombinedTotal = eng1Total + eng2Total;
          const rawGP = TabulationEngine.combinedGP(englishCombinedTotal, 200);
          if (clearsComponents && rawGP > 0.0) {
            engGP = rawGP;
          }
          englishCombinedGrade =
            engGP > 0 ? TabulationEngine.letterFromGradePoint(engGP) : 'F';
          if (engGP === 0.0) {
            failedCount++;
          }
        } else {
          const singleRes = (eng1Result || eng2Result)!;
          engGP = singleRes.gradePoint;
          englishCombinedTotal = singleRes.total;
          englishCombinedGrade = singleRes.letterGrade || 'F';
          if (singleRes.letterGrade === 'F' || engGP === 0.0) {
            failedCount++;
          }
        }
      }

      const gpSum =
        individualGPs.reduce((acc, v) => acc + v, 0) +
        banglaGP +
        engGP +
        optionalBonusGP;

      // In standard NCTB 9-unit setup (or when strictNineDivisor is true), divide by 9.0.
      // When a junior class has fewer compulsory units assigned, divide by the active compulsory unit count.
      const activeCompulsoryUnits =
        individualGPs.length + (hasBangla ? 1 : 0) + (hasEng ? 1 : 0);
      const divisor =
        options?.strictNineDivisor || activeCompulsoryUnits >= 9
          ? 9.0
          : Math.max(1.0, activeCompulsoryUnits);

      const gpa: number | null =
        grandTotal === 0
          ? null
          : (() => {
              const raw = failedCount > 0 ? 0.0 : Math.min(5.0, gpSum / divisor);
              return Math.round(raw * 100.0) / 100.0;
            })();

      const overallLg = (() => {
        if (gpa === null) return '';
        if (failedCount > 0) return 'F';
        if (gpa >= 5.0) return 'A+';
        if (gpa >= 4.0) return 'A';
        if (gpa >= 3.5) return 'A-';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        if (gpa >= 1.0) return 'D';
        return 'F';
      })();

      studentResults.push({
        student,
        subjectResults,
        grandTotal,
        failedCount,
        gpa,
        letterGrade: overallLg,
        position: null,
        optionalBonusGP,
        banglaCombinedTotal,
        banglaCombinedGP: hasBangla ? banglaGP : null,
        banglaCombinedGrade,
        englishCombinedTotal,
        englishCombinedGP: hasEng ? engGP : null,
        englishCombinedGrade,
      });
    }

    // Rank students using exact tie-breaking hierarchy from TabulationEngine.kt
    return studentResults.map((result) => {
      if (result.grandTotal === 0) {
        return { ...result, position: null };
      }
      const betterCount = studentResults.filter((it) => {
        if (it.grandTotal === 0) return false;
        if (it.failedCount < result.failedCount) {
          return true;
        } else if (it.failedCount === result.failedCount) {
          if (result.failedCount === 0) {
            const itGpa = it.gpa ?? 0.0;
            const resultGpa = result.gpa ?? 0.0;
            if (itGpa > resultGpa) return true;
            if (itGpa === resultGpa && it.grandTotal > result.grandTotal) return true;
            if (itGpa === resultGpa && it.grandTotal === result.grandTotal) {
              return it.student.roll < result.student.roll;
            }
            return false;
          } else {
            if (it.grandTotal > result.grandTotal) return true;
            if (it.grandTotal === result.grandTotal) {
              return it.student.roll < result.student.roll;
            }
            return false;
          }
        }
        return false;
      }).length;

      return {
        ...result,
        position: betterCount + 1,
      };
    });
  },

  /**
   * Direct port of TabulationEngine.computeCombined(students, midSubjects, midMarks, annualSubjects, annualMarks)
   */
  computeCombined(
    students: TabulationStudentEntity[],
    midSubjects: TabulationSubjectEntity[],
    midMarks: TabulationMarkEntity[],
    annualSubjects: TabulationSubjectEntity[],
    annualMarks: TabulationMarkEntity[],
    options?: { strictNineDivisor?: boolean }
  ): CombinedStudentResult[] {
    const midSubjectsWithMarks = new Set(midMarks.map((m) => m.subjectId));
    const annualSubjectsWithMarks = new Set(annualMarks.map((m) => m.subjectId));

    const midResultsList = TabulationEngine.compute(students, midSubjects, midMarks, options);
    const annualResultsList = TabulationEngine.compute(
      students,
      annualSubjects,
      annualMarks,
      options
    );

    const midResults = new Map(midResultsList.map((r) => [r.student.id, r]));
    const annualResults = new Map(annualResultsList.map((r) => [r.student.id, r]));

    const studentResults: CombinedStudentResult[] = [];

    for (const student of students) {
      const midSr = midResults.get(student.id)?.subjectResults ?? [];
      const annSr = annualResults.get(student.id)?.subjectResults ?? [];

      const slotKeySet = new Set<string>();
      const slotKeys: { role: SheetRole | 'NONE'; value: string | null }[] = [];

      for (const sr of [...midSr, ...annSr]) {
        const key = `${sr.subject.sheetRole}__${sr.subject.applicabilityValue ?? 'NULL'}`;
        if (!slotKeySet.has(key)) {
          slotKeySet.add(key);
          slotKeys.push({
            role: sr.subject.sheetRole,
            value: sr.subject.applicabilityValue,
          });
        }
      }

      const combinedSubjects: CombinedSubjectResult[] = [];
      let grandTotal = 0.0;
      let failedCount = 0;

      let bangla1Total = 0.0;
      let bangla2Total = 0.0;
      let eng1Total = 0.0;
      let eng2Total = 0.0;

      const individualGPs: number[] = [];
      let optionalBonusGP = 0.0;

      let bangla1Result: CombinedSubjectResult | null = null;
      let bangla2Result: CombinedSubjectResult | null = null;
      let eng1Result: CombinedSubjectResult | null = null;
      let eng2Result: CombinedSubjectResult | null = null;

      const combineComponent = (
        midVal: number | null | undefined,
        annVal: number | null | undefined
      ): number | null => {
        if (
          (midVal === null || midVal === undefined) &&
          (annVal === null || annVal === undefined)
        ) {
          return null;
        }
        return ((midVal ?? 0) + (annVal ?? 0)) / 2.0;
      };

      for (const { role, value } of slotKeys) {
        const m = midSr.find(
          (it) =>
            it.subject.sheetRole === role && it.subject.applicabilityValue === value
        );
        const a = annSr.find(
          (it) =>
            it.subject.sheetRole === role && it.subject.applicabilityValue === value
        );
        const referenceSubject = m?.subject ?? a?.subject;
        if (!referenceSubject) continue;

        const cMcq = combineComponent(m?.mcqMarks, a?.mcqMarks);
        const cWritten = combineComponent(m?.writtenMarks, a?.writtenMarks);
        const cPractical = combineComponent(m?.practicalMarks, a?.practicalMarks);
        const cTotal = (cMcq ?? 0.0) + (cWritten ?? 0.0) + (cPractical ?? 0.0);

        const hasMarksForMid = m?.subject.id
          ? midSubjectsWithMarks.has(m.subject.id)
          : false;
        const hasMarksForAnn = a?.subject.id
          ? annualSubjectsWithMarks.has(a.subject.id)
          : false;
        const hasMarksForSubject = hasMarksForMid || hasMarksForAnn;

        const rawLg = TabulationEngine.letterGradeDouble(
          cTotal,
          referenceSubject.fullMarks,
          role,
          hasMarksForSubject
        );
        const passesComp = TabulationEngine.passesComponentMinimumsDouble(
          cMcq,
          cWritten,
          cPractical,
          referenceSubject.mcqMax,
          referenceSubject.writtenMax,
          referenceSubject.practicalMax
        );
        const lg = rawLg.length > 0 && !passesComp ? 'F' : rawLg;
        const gp = TabulationEngine.gradePointFromLetter(lg);

        if (lg === 'F' && role !== 'OPTIONAL') {
          if (
            role !== 'BANGLA1' &&
            role !== 'BANGLA2' &&
            role !== 'ENG1' &&
            role !== 'ENG2'
          ) {
            failedCount++;
          }
        }

        const midTotal = m && hasMarksForMid ? m.total : m?.total ? m.total : null;
        const annualTotal = a && hasMarksForAnn ? a.total : a?.total ? a.total : null;

        const res: CombinedSubjectResult = {
          sheetRole: role,
          applicabilityValue: value,
          subjectName: referenceSubject.name,
          bengaliName: referenceSubject.bengaliName,
          subjectCode: referenceSubject.code,
          fullMarks: referenceSubject.fullMarks,
          mcqMax: referenceSubject.mcqMax,
          writtenMax: referenceSubject.writtenMax,
          practicalMax: referenceSubject.practicalMax,
          mcqMarks: cMcq,
          writtenMarks: cWritten,
          practicalMarks: cPractical,
          total: cTotal,
          letterGrade: lg,
          gradePoint: gp,
          midTotal,
          annualTotal,
        };
        combinedSubjects.push(res);
        grandTotal += cTotal;

        switch (role) {
          case 'BANGLA1':
            bangla1Total = cTotal;
            bangla1Result = res;
            break;
          case 'BANGLA2':
            bangla2Total = cTotal;
            bangla2Result = res;
            break;
          case 'ENG1':
            eng1Total = cTotal;
            eng1Result = res;
            break;
          case 'ENG2':
            eng2Total = cTotal;
            eng2Result = res;
            break;
          case 'MATH':
          case 'RELIGION':
          case 'BGS_OR_SCIENCE':
          case 'ELECTIVE1':
          case 'ELECTIVE2':
          case 'ELECTIVE3':
          case 'ICT':
            individualGPs.push(gp);
            break;
          case 'OPTIONAL':
            optionalBonusGP = TabulationEngine.optionalBonus(gp);
            break;
          default:
            break;
        }
      }

      let banglaGP = 0.0;
      const hasBangla = bangla1Result !== null || bangla2Result !== null;
      if (hasBangla) {
        const bothBanglaPapers = bangla1Result !== null && bangla2Result !== null;
        if (bothBanglaPapers || options?.strictNineDivisor) {
          const b1Ref =
            midSr.find((it) => it.subject.sheetRole === 'BANGLA1')?.subject ??
            annSr.find((it) => it.subject.sheetRole === 'BANGLA1')?.subject;
          const b2Ref =
            midSr.find((it) => it.subject.sheetRole === 'BANGLA2')?.subject ??
            annSr.find((it) => it.subject.sheetRole === 'BANGLA2')?.subject;

          const totalMcq = (bangla1Result?.mcqMarks ?? 0.0) + (bangla2Result?.mcqMarks ?? 0.0);
          const totalWritten =
            (bangla1Result?.writtenMarks ?? 0.0) + (bangla2Result?.writtenMarks ?? 0.0);
          const totalPractical =
            (bangla1Result?.practicalMarks ?? 0.0) + (bangla2Result?.practicalMarks ?? 0.0);

          const clearsComponents = TabulationEngine.passesCombinedMinimumsDouble(
            totalMcq,
            totalWritten,
            totalPractical,
            b1Ref?.mcqMax ?? 0,
            b2Ref?.mcqMax ?? 0,
            b1Ref?.writtenMax ?? 0,
            b2Ref?.writtenMax ?? 0,
            b1Ref?.practicalMax ?? 0,
            b2Ref?.practicalMax ?? 0
          );

          const rawGP = TabulationEngine.combinedGPDouble(bangla1Total + bangla2Total, 200);
          if (clearsComponents && rawGP > 0.0) {
            banglaGP = rawGP;
          }

          if (banglaGP === 0.0) {
            failedCount++;
            if (bangla1Result) {
              const idx = combinedSubjects.indexOf(bangla1Result);
              if (idx >= 0) combinedSubjects[idx] = { ...bangla1Result, letterGrade: 'F' };
            }
            if (bangla2Result) {
              const idx = combinedSubjects.indexOf(bangla2Result);
              if (idx >= 0) combinedSubjects[idx] = { ...bangla2Result, letterGrade: 'F' };
            }
          }
        } else {
          const singleRes = (bangla1Result || bangla2Result)!;
          banglaGP = singleRes.gradePoint;
          if (singleRes.letterGrade === 'F' || banglaGP === 0.0) {
            failedCount++;
          }
        }
      }

      let engGP = 0.0;
      const hasEng = eng1Result !== null || eng2Result !== null;
      if (hasEng) {
        const bothEngPapers = eng1Result !== null && eng2Result !== null;
        if (bothEngPapers || options?.strictNineDivisor) {
          const e1Ref =
            midSr.find((it) => it.subject.sheetRole === 'ENG1')?.subject ??
            annSr.find((it) => it.subject.sheetRole === 'ENG1')?.subject;
          const e2Ref =
            midSr.find((it) => it.subject.sheetRole === 'ENG2')?.subject ??
            annSr.find((it) => it.subject.sheetRole === 'ENG2')?.subject;

          const totalMcq = (eng1Result?.mcqMarks ?? 0.0) + (eng2Result?.mcqMarks ?? 0.0);
          const totalWritten =
            (eng1Result?.writtenMarks ?? 0.0) + (eng2Result?.writtenMarks ?? 0.0);
          const totalPractical =
            (eng1Result?.practicalMarks ?? 0.0) + (eng2Result?.practicalMarks ?? 0.0);

          const clearsComponents = TabulationEngine.passesCombinedMinimumsDouble(
            totalMcq,
            totalWritten,
            totalPractical,
            e1Ref?.mcqMax ?? 0,
            e2Ref?.mcqMax ?? 0,
            e1Ref?.writtenMax ?? 0,
            e2Ref?.writtenMax ?? 0,
            e1Ref?.practicalMax ?? 0,
            e2Ref?.practicalMax ?? 0
          );

          const rawGP = TabulationEngine.combinedGPDouble(eng1Total + eng2Total, 200);
          if (clearsComponents && rawGP > 0.0) {
            engGP = rawGP;
          }

          if (engGP === 0.0) {
            failedCount++;
            if (eng1Result) {
              const idx = combinedSubjects.indexOf(eng1Result);
              if (idx >= 0) combinedSubjects[idx] = { ...eng1Result, letterGrade: 'F' };
            }
            if (eng2Result) {
              const idx = combinedSubjects.indexOf(eng2Result);
              if (idx >= 0) combinedSubjects[idx] = { ...eng2Result, letterGrade: 'F' };
            }
          }
        } else {
          const singleRes = (eng1Result || eng2Result)!;
          engGP = singleRes.gradePoint;
          if (singleRes.letterGrade === 'F' || engGP === 0.0) {
            failedCount++;
          }
        }
      }

      const gpSum =
        individualGPs.reduce((acc, v) => acc + v, 0) +
        banglaGP +
        engGP +
        optionalBonusGP;

      const activeCompulsoryUnits =
        individualGPs.length + (hasBangla ? 1 : 0) + (hasEng ? 1 : 0);
      const divisor =
        options?.strictNineDivisor || activeCompulsoryUnits >= 9
          ? 9.0
          : Math.max(1.0, activeCompulsoryUnits);

      const gpa: number | null =
        grandTotal === 0.0
          ? null
          : (() => {
              const raw = failedCount > 0 ? 0.0 : Math.min(5.0, gpSum / divisor);
              return Math.round(raw * 100.0) / 100.0;
            })();

      const overallLg = (() => {
        if (gpa === null) return '';
        if (failedCount > 0) return 'F';
        if (gpa >= 5.0) return 'A+';
        if (gpa >= 4.0) return 'A';
        if (gpa >= 3.5) return 'A-';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        if (gpa >= 1.0) return 'D';
        return 'F';
      })();

      studentResults.push({
        student,
        subjectResults: combinedSubjects,
        grandTotal,
        failedCount,
        gpa,
        letterGrade: overallLg,
        position: null,
        optionalBonusGP,
      });
    }

    return studentResults.map((result) => {
      if (result.grandTotal === 0.0) {
        return { ...result, position: null };
      }
      const betterCount = studentResults.filter((it) => {
        if (it.grandTotal === 0.0) return false;
        if (it.failedCount < result.failedCount) {
          return true;
        } else if (it.failedCount === result.failedCount) {
          if (result.failedCount === 0) {
            const itGpa = it.gpa ?? 0.0;
            const resultGpa = result.gpa ?? 0.0;
            if (itGpa > resultGpa) return true;
            if (itGpa === resultGpa && it.grandTotal > result.grandTotal) return true;
            if (itGpa === resultGpa && it.grandTotal === result.grandTotal) {
              return it.student.roll < result.student.roll;
            }
            return false;
          } else {
            if (it.grandTotal > result.grandTotal) return true;
            if (it.grandTotal === result.grandTotal) {
              return it.student.roll < result.student.roll;
            }
            return false;
          }
        }
        return false;
      }).length;

      return {
        ...result,
        position: betterCount + 1,
      };
    });
  },
};

/**
 * Exact TypeScript port of MeritListEngine.kt
 */
export const MeritListEngine = {
  generateMeritList(
    results: (StudentResult | CombinedStudentResult)[],
    filter: MeritListFilter = {}
  ): MeritListEntry[] {
    const excludeFailed = filter.excludeFailed ?? true;
    const eligible = results
      .filter((it) => it.gpa !== null && it.grandTotal > 0)
      .filter((it) => !filter.group || it.student.group === filter.group)
      .filter((it) => !filter.religion || it.student.religion === filter.religion)
      .filter((it) => !filter.optionalType || it.student.optionalType === filter.optionalType)
      .filter((it) => !excludeFailed || it.failedCount === 0);

    const ranked: MeritListEntry[] = eligible
      .map((result) => {
        const betterCount = eligible.filter((it) => {
          if (it.failedCount < result.failedCount) {
            return true;
          } else if (it.failedCount === result.failedCount) {
            if (result.failedCount === 0) {
              const itGpa = it.gpa ?? 0.0;
              const resultGpa = result.gpa ?? 0.0;
              if (itGpa > resultGpa) return true;
              if (itGpa === resultGpa && it.grandTotal > result.grandTotal) return true;
              if (itGpa === resultGpa && it.grandTotal === result.grandTotal) {
                return it.student.roll < result.student.roll;
              }
              return false;
            } else {
              if (it.grandTotal > result.grandTotal) return true;
              if (it.grandTotal === result.grandTotal) {
                return it.student.roll < result.student.roll;
              }
              return false;
            }
          }
          return false;
        }).length;

        return {
          studentId: result.student.id,
          rank: betterCount + 1,
          roll: result.student.roll,
          name: result.student.name,
          section: result.student.section,
          group: result.student.group,
          groupDisplay: result.student.groupDisplay,
          religion: result.student.religion,
          religionDisplay: result.student.religionDisplay,
          optionalType: result.student.optionalType,
          optionalSubjectDisplay: result.student.optionalSubjectDisplay,
          grandTotal: result.grandTotal,
          gpa: result.gpa,
          letterGrade: result.letterGrade,
          failedCount: result.failedCount,
          optionalBonusGP: result.optionalBonusGP,
        };
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (b.grandTotal !== a.grandTotal) return b.grandTotal - a.grandTotal;
        return a.roll - b.roll;
      });

    if (filter.topN !== null && filter.topN !== undefined && filter.topN > 0) {
      return ranked.slice(0, filter.topN);
    }
    return ranked;
  },

  generateSubjectToppers(results: StudentResult[], topN = 3): SubjectTopperGroup[] {
    const entries: { student: TabulationStudentEntity; sr: SubjectResult }[] = [];

    for (const result of results) {
      for (const sr of result.subjectResults) {
        if (sr.letterGrade.length > 0 && sr.total > 0) {
          entries.push({ student: result.student, sr });
        }
      }
    }

    const grouped = new Map<string, { student: TabulationStudentEntity; sr: SubjectResult }[]>();
    for (const entry of entries) {
      const key = `${entry.sr.subject.sheetRole}__${entry.sr.subject.applicabilityValue ?? 'NULL'}`;
      const list = grouped.get(key) ?? [];
      list.push(entry);
      grouped.set(key, list);
    }

    const groups: SubjectTopperGroup[] = [];
    for (const [, group] of grouped.entries()) {
      const first = group[0].sr;
      const sorted = [...group].sort((a, b) => {
        if (b.sr.total !== a.sr.total) return b.sr.total - a.sr.total;
        return a.student.roll - b.student.roll;
      });

      const toppers: SubjectTopperEntry[] = [];
      let rank = 0;
      let prevTotal: number | null = null;

      sorted.forEach((item, index) => {
        if (prevTotal === null || item.sr.total !== prevTotal) {
          rank = index + 1;
          prevTotal = item.sr.total;
        }
        if (rank <= topN) {
          toppers.push({
            rank,
            roll: item.student.roll,
            name: item.student.name,
            total: item.sr.total,
            letterGrade: item.sr.letterGrade,
            breakdown: TabulationDisplay.formatBreakdown(
              item.sr.mcqMarks,
              item.sr.writtenMarks,
              item.sr.practicalMarks,
              item.sr.total
            ),
          });
        }
      });

      groups.push({
        sheetRole: first.subject.sheetRole,
        applicabilityValue: first.subject.applicabilityValue,
        subjectName: first.subject.name,
        bengaliName: first.subject.bengaliName,
        fullMarks: first.subject.fullMarks,
        toppers,
      });
    }

    return groups.sort(
      (a, b) =>
        TabulationDisplay.canonicalOrder(a.sheetRole, a.applicabilityValue) -
        TabulationDisplay.canonicalOrder(b.sheetRole, b.applicabilityValue)
    );
  },
};

/**
 * CombinedResultScreen.kt formatting & promotion tier classification
 */
export function formatRollSection(roll: number, section: string): string {
  const padded = String(roll).padStart(2, '0');
  const rollBn = formatNumeral(padded, 'bn');
  const cleanSec = section.trim().toUpperCase();
  let secStr = section;
  if (cleanSec.includes('KA') || cleanSec === 'A' || cleanSec.includes('SECTION A')) {
    secStr = 'ক';
  } else if (cleanSec.includes('KHA') || cleanSec === 'B' || cleanSec.includes('SECTION B')) {
    secStr = 'খ';
  } else if (cleanSec === 'C' || cleanSec.includes('SECTION C')) {
    secStr = 'গ';
  }
  return `${rollBn}${secStr}`;
}

export function classifyPromotionCategory(
  failedCount: number,
  grandTotal: number
): { category: PromotionCategory; bengaliLabel: string } {
  if (grandTotal <= 0) {
    return { category: 'NOT_PASSED', bengaliLabel: 'অনুত্তীর্ণ' };
  }
  if (failedCount === 0) {
    return { category: 'MERIT', bengaliLabel: 'মেধাতালিকা' };
  }
  if (failedCount === 1) {
    return { category: '1ST_CONSIDERATION', bengaliLabel: '১ম বিবেচনা' };
  }
  if (failedCount === 2) {
    return { category: '2ND_CONSIDERATION', bengaliLabel: '২য় বিবেচনা' };
  }
  if (failedCount === 3) {
    return { category: 'SPECIAL_CONSIDERATION', bengaliLabel: 'বিশেষ বিবেচনা' };
  }
  return { category: 'NOT_PASSED', bengaliLabel: 'অনুত্তীর্ণ' };
}

export function buildPromotionSummary(
  results: (StudentResult | CombinedStudentResult)[]
): {
  counts: PromotionSummaryCounts;
  students: PromotionSummaryStudent[];
} {
  let meritCount = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let notPassedCount = 0;

  const categoryOrder: Record<PromotionCategory, number> = {
    MERIT: 0,
    '1ST_CONSIDERATION': 1,
    '2ND_CONSIDERATION': 2,
    SPECIAL_CONSIDERATION: 3,
    NOT_PASSED: 4,
  };

  const rows: PromotionSummaryStudent[] = results.map((r) => {
    const { category, bengaliLabel } = classifyPromotionCategory(r.failedCount, r.grandTotal);
    if (category === 'MERIT') meritCount++;
    else if (category === '1ST_CONSIDERATION') tier1Count++;
    else if (category === '2ND_CONSIDERATION') tier2Count++;
    else if (category === 'SPECIAL_CONSIDERATION') tier3Count++;
    else notPassedCount++;

    return {
      studentId: r.student.id,
      oldRoll: r.student.roll,
      newRoll: category !== 'NOT_PASSED' ? r.position : null,
      section: r.student.section,
      name: r.student.name,
      groupDisplay: r.student.groupDisplay,
      totalMarks: Math.round(r.grandTotal * 10) / 10,
      failedCount: r.failedCount,
      gpa: r.gpa,
      letterGrade: r.letterGrade,
      category,
      categoryBengali: bengaliLabel,
    };
  });

  rows.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    if ((a.newRoll ?? 9999) !== (b.newRoll ?? 9999)) {
      return (a.newRoll ?? 9999) - (b.newRoll ?? 9999);
    }
    return a.oldRoll - b.oldRoll;
  });

  const passCount = meritCount + tier1Count + tier2Count + tier3Count;
  return {
    counts: {
      meritCount,
      tier1Count,
      tier2Count,
      tier3Count,
      passCount,
      notPassedCount,
      totalStudents: results.length,
    },
    students: rows,
  };
}

/**
 * Adapters from Firestore / SchoolContext models (Student, SubjectAssignment, SubjectMarkRecord)
 * to TabulationEngine entities
 */
export function inferStudentReligionCode(name: string): { code: 'I' | 'H' | 'B'; display: string } {
  const lower = name.toLowerCase();
  if (
    lower.includes('barua') ||
    lower.includes('chakma') ||
    lower.includes('marma') ||
    lower.includes('mutsuddi')
  ) {
    return { code: 'B', display: 'Buddhism' };
  }
  if (
    lower.includes('das') ||
    lower.includes('debnath') ||
    lower.includes('chakraborty') ||
    lower.includes('nath') ||
    lower.includes('rani') ||
    lower.includes('puja') ||
    lower.includes('soumik') ||
    lower.includes('sharma') ||
    lower.includes('dey') ||
    lower.includes('sen')
  ) {
    return { code: 'H', display: 'Hinduism' };
  }
  return { code: 'I', display: 'Islam' };
}

export function mapSchoolStudentToTabulationStudent(student: Student): TabulationStudentEntity {
  const groupCode =
    student.group === 'Science'
      ? 'S'
      : student.group === 'Business Studies'
      ? 'C'
      : student.group === 'Humanities'
      ? 'A'
      : 'G';

  const optLower = (student.optionalSubject || '').toLowerCase();
  const optionalType =
    optLower.includes('higher math') || (student.group === 'Science' && !optLower.includes('agri'))
      ? 'S'
      : 'N';

  const religion = inferStudentReligionCode(student.name);

  return {
    id: student.id,
    roll: student.roll,
    name: student.name,
    section: student.section,
    className: student.className,
    group: groupCode,
    groupDisplay: student.group,
    religion: religion.code,
    religionDisplay: religion.display,
    optionalType,
    optionalSubjectDisplay: student.optionalSubject || 'None',
  };
}

export function mapAssignmentsToTabulationSubjects(
  assignments: SubjectAssignment[]
): TabulationSubjectEntity[] {
  return assignments.map((asg) => {
    const spec = resolveSubjectSpec(asg.subjectCode, asg.subjectName, asg.maxMarks);
    return {
      id: asg.id,
      code: asg.subjectCode || spec.code,
      name: asg.subjectName || spec.name,
      bengaliName: spec.bengaliName,
      sheetRole: spec.sheetRole,
      applicabilityType: spec.applicabilityType,
      applicabilityValue: spec.applicabilityValue,
      mcqMax: spec.mcqMax,
      writtenMax: spec.writtenMax,
      practicalMax: spec.practicalMax,
      fullMarks: asg.maxMarks || spec.fullMarks,
    };
  });
}

export function mapMarksToTabulationMarks(
  marks: SubjectMarkRecord[],
  assignments: SubjectAssignment[]
): TabulationMarkEntity[] {
  const specByAsgId = new Map(
    assignments.map((a) => [
      a.id,
      resolveSubjectSpec(a.subjectCode, a.subjectName, a.maxMarks),
    ])
  );

  return marks.map((m) => {
    const spec = specByAsgId.get(m.assignmentId);
    return {
      studentId: m.studentId,
      subjectId: m.assignmentId,
      mcqMarks: spec ? (spec.mcqMax !== null ? m.mcqMarks : null) : m.mcqMarks,
      writtenMarks: spec ? (spec.writtenMax !== null ? m.writtenMarks : null) : m.writtenMarks,
      practicalMarks: spec
        ? spec.practicalMax !== null
          ? m.practicalMarks
          : null
        : m.practicalMarks,
    };
  });
}

/**
 * Compiles live Single-Term and Combined Multi-Term results for a given ClassSection from Firestore records
 */
export function compileClassTabulationFromFirestore(params: {
  classSectionId: string;
  termId: string;
  students: Student[];
  subjectAssignments: SubjectAssignment[];
  subjectMarks: SubjectMarkRecord[];
}) {
  const classStudents = params.students
    .filter((s) => s.classSectionId === params.classSectionId && s.status === 'active')
    .sort((a, b) => a.roll - b.roll)
    .map(mapSchoolStudentToTabulationStudent);

  const classAssignments = params.subjectAssignments.filter(
    (a) => a.classSectionId === params.classSectionId
  );

  const tabSubjects = mapAssignmentsToTabulationSubjects(classAssignments);

  // If Religion or BGS_OR_SCIENCE is assigned once (e.g. code 111 or 150), ensure students match that single slot
  const religionSubjects = tabSubjects.filter((s) => s.sheetRole === 'RELIGION');
  const bgsOrSciSubjects = tabSubjects.filter((s) => s.sheetRole === 'BGS_OR_SCIENCE');
  const normalizedSubjects = tabSubjects.map((s) => {
    if (s.sheetRole === 'RELIGION' && religionSubjects.length === 1) {
      return { ...s, applicabilityType: 'ALL' as ApplicabilityType, applicabilityValue: null };
    }
    if (s.sheetRole === 'BGS_OR_SCIENCE' && bgsOrSciSubjects.length === 1) {
      return { ...s, applicabilityType: 'ALL' as ApplicabilityType, applicabilityValue: null };
    }
    return s;
  });

  const termMarks = params.subjectMarks.filter(
    (m) => m.classSectionId === params.classSectionId && m.termId === params.termId
  );
  const tabMarks = mapMarksToTabulationMarks(termMarks, classAssignments);

  const results = TabulationEngine.compute(classStudents, normalizedSubjects, tabMarks);
  return {
    students: classStudents,
    subjects: normalizedSubjects,
    marks: tabMarks,
    results,
  };
}

/**
 * Computes a student's attendance summary for their Marksheet transcript
 */
export function computeStudentAttendanceSummary(
  classSectionId: string,
  roll: number,
  attendanceRecords: AttendanceRecord[]
): {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercent: number;
} {
  const classRecords = attendanceRecords.filter((r) => r.classSectionId === classSectionId);
  const workingDays = classRecords.length;
  if (workingDays === 0) {
    return { workingDays: 0, presentDays: 0, absentDays: 0, attendancePercent: 100 };
  }

  let absentDays = 0;
  for (const rec of classRecords) {
    const absentSet = parseAbsentRollsSet(rec.absentRolls);
    if (absentSet.has(roll)) {
      absentDays++;
    }
  }
  const presentDays = Math.max(0, workingDays - absentDays);
  const attendancePercent = Math.round((presentDays / workingDays) * 1000) / 10;

  return {
    workingDays,
    presentDays,
    absentDays,
    attendancePercent,
  };
}

export { SUBJECT_CATALOG };
