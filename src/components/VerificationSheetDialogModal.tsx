import React, { useMemo, useState } from 'react';
import { Printer, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AcademicYear, ClassSection, ExamTerm, Student, SubjectAssignment, SubjectMarkRecord } from '../types/school';
import { formatNumeral } from '../utils/schoolLogic';
import {
  SubjectCatalogData,
  formatVerificationLedgerBreakdown,
  getPaperLabel,
} from '../utils/marksCatalogAndLogic';

const SCHOOL_NAME_BN = 'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়';
const ROWS_PER_COLUMN = 50;
const ZOOM_LEVELS = [0.8, 1.0, 1.2, 1.4];
const BASE_ROLL_COL_WIDTH = 62;
const BASE_MARKS_COL_WIDTH = 190;
const BASE_HEADER_PX = 13;
const BASE_BODY_PX = 16;

interface VerificationSheetDialogModalProps {
  year: AcademicYear | undefined;
  term: ExamTerm | undefined;
  classSection: ClassSection | undefined;
  assignment: SubjectAssignment;
  subjectSpec: SubjectCatalogData;
  students: Student[];
  marks: SubjectMarkRecord[];
  onDismiss: () => void;
}

/**
 * Ported directly from VerificationSheetDialog.kt:
 * Full-screen look-alike of the paper "নম্বর ফর্দ" (marks ledger) teachers write
 * marks on by hand, so a teacher can flip back and forth between the physical
 * sheet and this view to catch data-entry mistakes.
 */
export const VerificationSheetDialogModal: React.FC<VerificationSheetDialogModalProps> = ({
  year,
  term,
  classSection,
  assignment,
  subjectSpec,
  students,
  marks,
  onDismiss,
}) => {
  // Bengali by default since that's how the physical sheet itself is printed
  const [useBengali, setUseBengali] = useState<boolean>(true);
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [zoomIndex, setZoomIndex] = useState<number>(1); // index 1 == 1.0x base size

  const studentByRoll = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.roll, s));
    return map;
  }, [students]);

  const marksByStudentId = useMemo(() => {
    const map = new Map<string, SubjectMarkRecord>();
    marks.forEach((m) => map.set(m.studentId, m));
    return map;
  }, [marks]);

  // Derived from the actual roster (1..maxRoll) just like VerificationSheetDialog.kt
  const maxRoll = useMemo(() => {
    if (students.length === 0) return 0;
    return Math.max(...students.map((s) => s.roll));
  }, [students]);

  const allRolls = useMemo(() => {
    if (maxRoll <= 0) return [];
    const list: number[] = [];
    for (let r = 1; r <= maxRoll; r++) {
      list.push(r);
    }
    return list;
  }, [maxRoll]);

  const enteredCount = useMemo(() => {
    return students.filter((s) => {
      const m = marksByStudentId.get(s.id);
      if (!m) return false;
      return (
        m.mcqMarks > 0 ||
        m.writtenMarks > 0 ||
        m.practicalMarks > 0 ||
        m.totalMarks > 0
      );
    }).length;
  }, [students, marksByStudentId]);

  const step = ZOOM_LEVELS[zoomIndex] ?? 1.0;
  const rollWidthPx = Math.round(BASE_ROLL_COL_WIDTH * step);
  const marksWidthPx = Math.round(BASE_MARKS_COL_WIDTH * step);
  const headerFontPx = Math.round(BASE_HEADER_PX * step);
  const bodyFontPx = Math.round(BASE_BODY_PX * step);

  const columns = useMemo(() => {
    const chunks: number[][] = [];
    for (let i = 0; i < allRolls.length; i += ROWS_PER_COLUMN) {
      chunks.push(allRolls.slice(i, i + ROWS_PER_COLUMN));
    }
    return chunks;
  }, [allRolls]);

  const loc = (val: string | number) => formatNumeral(val, useBengali ? 'bn' : 'en');
  const paperText = getPaperLabel(assignment.subjectName);

  const componentHeaderLabel = useMemo(() => {
    const labels: string[] = [];
    if (subjectSpec.mcqMax !== null) labels.push('নৈঃ');
    if (subjectSpec.writtenMax !== null) labels.push('রঃ');
    if (subjectSpec.practicalMax !== null) labels.push('ব্যবঃ');
    if (labels.length <= 1) return 'প্রাপ্ত নম্বর';
    return `প্রাপ্ত নম্বর\n${labels.join('+')} = মোট`;
  }, [subjectSpec]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verify Marks Against Paper Sheet (নম্বর ফর্দ)"
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Top App Bar */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Close Verification Sheet"
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Verify Marks — নম্বর ফর্দ (Paper Ledger Proof Sheet)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Compare side-by-side with your handwritten marksheet to catch any data-entry mistakes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Proof Sheet</span>
            </button>
          </div>
        </div>

        {/* Sheet Header (Ported from SheetHeader in VerificationSheetDialog.kt) */}
        <div className="px-6 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {SCHOOL_NAME_BN}
            </h3>
          </div>

          <div className="my-2.5 border-t border-slate-200 dark:border-slate-800" />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span>
              পরীক্ষা: <strong>{term?.name || 'অর্ধ-বার্ষিক পরীক্ষা'}</strong>, শিক্ষাবর্ষ:{' '}
              <strong>{loc(year?.year || '2026')}</strong>
            </span>
            <span>
              শ্রেণি: <strong>{loc(classSection?.className || assignment.className)}</strong>, শাখা:{' '}
              <strong>{classSection?.section || assignment.section}</strong>
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span>
              বিষয়: <strong>{subjectSpec.bengaliName}</strong> ({assignment.subjectName}) · কোড:{' '}
              <strong className="font-mono">{loc(assignment.subjectCode)}</strong>
            </span>
            <span>
              পত্র: <strong>{paperText}</strong> · বিষয় শিক্ষক:{' '}
              <strong>
                {assignment.teacherName} [{assignment.teacherCode}]
              </strong>
            </span>
          </div>

          <div className="mt-3 flex flex-col items-center gap-1.5">
            <div className="px-5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white">
              নম্বর ফর্দ (পূর্ণমান: {loc(subjectSpec.fullMarks)})
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {loc(enteredCount)}/{loc(students.length)} entered
            </div>
          </div>
        </div>

        {/* Control Strip (Numeral Toggle বাং/EN, Show Total Switch, Zoom Out / Zoom In) */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-around gap-4 shrink-0">
          {/* Numeral Toggle বাং / EN */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseBengali(true)}
              className={`px-2.5 py-1 text-xs rounded font-semibold cursor-pointer ${
                useBengali
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              বাং (১২৩)
            </button>
            <button
              type="button"
              onClick={() => setUseBengali(false)}
              className={`px-2.5 py-1 text-xs rounded font-semibold cursor-pointer ${
                !useBengali
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              EN (123)
            </button>
          </div>

          {/* Show Total Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <span>Show Total (= মোট)</span>
            <input
              type="checkbox"
              checked={showTotal}
              onChange={(e) => setShowTotal(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-700 cursor-pointer"
            />
          </label>

          {/* Zoom Controls (80%, 100%, 120%, 140%) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomIndex <= 0}
              onClick={() => setZoomIndex((idx) => Math.max(0, idx - 1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {Math.round(step * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
              onClick={() =>
                setZoomIndex((idx) => Math.min(ZOOM_LEVELS.length - 1, idx + 1))
              }
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fixed Paper-Tone 2-Axis Scrollable Ledger Grid (#FFFDF7 background with black ink borders) */}
        <div
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: '#FFFDF7' }}
        >
          {allRolls.length === 0 ? (
            <div className="py-12 text-center text-sm font-medium text-slate-700">
              No students enrolled in this class section to verify yet.
            </div>
          ) : (
            <div className="flex items-start gap-4">
              {columns.map((columnRolls, colIdx) => {
                const totalColWidth = rollWidthPx + marksWidthPx + 2;
                return (
                  <div
                    key={colIdx}
                    style={{ width: `${totalColWidth}px`, borderColor: '#000000' }}
                    className="border shrink-0"
                  >
                    {/* Column Header Row */}
                    <div
                      style={{ backgroundColor: '#F2EEE3', borderColor: '#000000' }}
                      className="flex items-stretch border-b"
                    >
                      <div
                        style={{
                          width: `${rollWidthPx}px`,
                          fontSize: `${headerFontPx}px`,
                          borderColor: '#000000',
                        }}
                        className="px-2 py-1.5 font-bold text-black text-center whitespace-pre-line border-r flex items-center justify-center leading-tight"
                      >
                        {'রোল\nনং'}
                      </div>
                      <div
                        style={{
                          width: `${marksWidthPx}px`,
                          fontSize: `${headerFontPx}px`,
                        }}
                        className="px-2 py-1.5 font-bold text-black text-center whitespace-pre-line flex items-center justify-center leading-tight"
                      >
                        {componentHeaderLabel}
                      </div>
                    </div>

                    {/* Roll Data Rows */}
                    {columnRolls.map((roll, rowIdx) => {
                      const student = studentByRoll.get(roll);
                      const mark = student ? marksByStudentId.get(student.id) : undefined;
                      const breakdown = formatVerificationLedgerBreakdown(
                        mark,
                        subjectSpec,
                        useBengali,
                        showTotal
                      );

                      return (
                        <div
                          key={roll}
                          style={{ borderColor: '#000000' }}
                          className={`flex items-stretch ${
                            rowIdx < columnRolls.length - 1 ? 'border-b' : ''
                          }`}
                        >
                          <div
                            style={{
                              width: `${rollWidthPx}px`,
                              fontSize: `${bodyFontPx}px`,
                              borderColor: '#000000',
                            }}
                            className="px-2 py-1 font-bold text-black text-center border-r truncate tabular-nums"
                          >
                            {formatNumeral(roll, 'bn')}
                          </div>
                          <div
                            style={{
                              width: `${marksWidthPx}px`,
                              fontSize: `${bodyFontPx}px`,
                            }}
                            title={student ? `${student.roll}. ${student.name}` : `Roll ${roll}`}
                            className="px-2.5 py-1 font-bold text-black text-left truncate tabular-nums"
                          >
                            {breakdown}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
