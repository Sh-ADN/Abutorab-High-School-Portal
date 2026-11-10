import React, { useState } from 'react';
import { SCHOOL_BRAND_INFO } from '../data/schoolWebsiteData';
import {
  CombinedStudentResult,
  StudentResult,
  TabulationDisplay,
} from '../utils/tabulationAndMeritEngine';

interface MarksheetTranscriptViewProps {
  mode: 'single-term' | 'combined';
  schoolNameBn?: string;
  schoolNameEn?: string;
  schoolAddress?: string;
  examTitle: string;
  academicYearLabel: string;
  classNameLabel: string;
  sectionLabel: string;
  singleResult?: StudentResult;
  combinedResult?: CombinedStudentResult;
  attendance?: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercent: number;
  };
  num: (value: number | string | undefined | null) => string;
}

export const MarksheetTranscriptView: React.FC<MarksheetTranscriptViewProps> = ({
  mode,
  schoolNameBn = 'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়',
  schoolNameEn = 'ABUTORAB MULTILATERAL HIGH SCHOOL',
  schoolAddress = 'ডাকঘর: আবুতোরাব, উপজেলা: মীরসরাই, জেলা: চট্টগ্রাম · স্থাপিত: ১৯১৪ খ্রি. · EIIN: 104600',
  examTitle,
  academicYearLabel,
  classNameLabel,
  sectionLabel,
  singleResult,
  combinedResult,
  attendance,
  num,
}) => {
  const [logoError, setLogoError] = useState(false);

  const student = singleResult?.student || combinedResult?.student;
  const studentName = student?.name || '';
  const roll = student?.roll ?? 0;
  const groupDisplay = student?.groupDisplay || 'General';
  const optionalSubjectDisplay = student?.optionalSubjectDisplay || 'None';

  const failedCount =
    mode === 'single-term'
      ? singleResult?.failedCount ?? 0
      : combinedResult?.failedCount ?? 0;
  const grandTotal =
    mode === 'single-term'
      ? singleResult?.grandTotal ?? 0
      : combinedResult?.grandTotal ?? 0;
  const isPass = grandTotal > 0 && failedCount === 0;
  const gpa =
    mode === 'single-term'
      ? singleResult?.gpa ?? 0
      : combinedResult?.gpa ?? 0;
  const grade =
    mode === 'single-term'
      ? singleResult?.letterGrade || 'F'
      : combinedResult?.letterGrade || 'F';
  const statusLabel = isPass ? 'PASSED' : `FAILED (F${failedCount || 1})`;
  const meritRank =
    mode === 'single-term' ? singleResult?.position : combinedResult?.position;

  return (
    <div className="marksheet-print-card relative overflow-hidden bg-white text-slate-900 border-2 border-teal-900 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5 print:border-slate-900 print:p-6">
      {/* Subtle Centered Official School Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.06] print:opacity-[0.08]"
      >
        <img
          src={SCHOOL_BRAND_INFO.logoUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-80 h-80 sm:w-96 sm:h-96 object-contain"
        />
      </div>

      <div className="relative z-10 space-y-5">
        {/* Official Academic Header */}
        <div className="border-b-2 border-teal-800 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={
                !logoError
                  ? '/assets/aistudio/school_logo_large_f25747b9.png'
                  : SCHOOL_BRAND_INFO.logoUrl
              }
              alt="School Emblem"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="w-16 h-16 rounded-full object-contain border border-teal-800/30 p-0.5 bg-white shrink-0"
            />
            <div className="text-center sm:text-left">
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-800">
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত · মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, চট্টগ্রাম
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {schoolNameBn}
              </h2>
              <div className="text-xs font-bold tracking-wide text-teal-900">{schoolNameEn}</div>
              <p className="text-[11px] text-slate-600 mt-0.5">{schoolAddress}</p>
            </div>
          </div>

          {/* Grading Scale Reference Table (NCTB Official) */}
          <div className="border border-slate-300 rounded-lg overflow-hidden text-[10px] shrink-0 bg-white/90">
            <table className="border-collapse">
              <thead>
                <tr className="bg-teal-900 text-white font-bold">
                  <th className="px-2 py-0.5 border-r border-teal-700">নম্বর পরিসর</th>
                  <th className="px-2 py-0.5 border-r border-teal-700">গ্রেড</th>
                  <th className="px-2 py-0.5">জিপিএ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 tabular-nums text-center">
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">80 - 100</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">A+</td>
                  <td className="px-2 py-0.5">5.00</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">70 - 79</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">A</td>
                  <td className="px-2 py-0.5">4.00</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">60 - 69</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">A-</td>
                  <td className="px-2 py-0.5">3.50</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">50 - 59</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">B</td>
                  <td className="px-2 py-0.5">3.00</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">40 - 49</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">C</td>
                  <td className="px-2 py-0.5">2.00</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">33 - 39</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold">D</td>
                  <td className="px-2 py-0.5">1.00</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 border-r border-slate-200">00 - 32</td>
                  <td className="px-2 py-0.5 border-r border-slate-200 font-bold text-rose-700">
                    F
                  </td>
                  <td className="px-2 py-0.5 text-rose-700">0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Transcript Banner */}
        <div className="text-center">
          <span className="inline-block px-5 py-1 rounded-full bg-teal-900 text-white text-xs font-extrabold uppercase tracking-wider shadow-2xs">
            একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট (Academic Transcript) — {examTitle}
          </span>
        </div>

        {/* Student Identity & Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/90 border border-slate-300 rounded-xl p-3.5 text-xs">
          <div>
            <span className="text-slate-500 block">শিক্ষার্থীর নাম (Student Name)</span>
            <span className="font-bold text-slate-900 text-sm">{studentName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">রোল নম্বর (Roll No.)</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              #{num(String(roll).padStart(2, '0'))}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">শ্রেণি ও শাখা (Class & Section)</span>
            <span className="font-bold text-slate-900">
              {classNameLabel} ({sectionLabel}) · {academicYearLabel}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">বিভাগ ও ৪র্থ বিষয় (Group & 4th Sub)</span>
            <span className="font-semibold text-slate-900">
              {groupDisplay}{' '}
              {optionalSubjectDisplay !== 'None' ? `(${optionalSubjectDisplay})` : ''}
            </span>
          </div>
        </div>

        {/* SINGLE-TERM SUBJECT TABLE */}
        {mode === 'single-term' && singleResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-teal-900 text-white text-[11px] font-bold uppercase">
                  <th className="border border-teal-800 py-2 px-2.5">বিষয়ের নাম (Subject)</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">পূর্ণমান</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">লিখিত (CQ)</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">MCQ</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">ব্যবহারিক</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">প্রাপ্ত মোট</th>
                  <th className="border border-teal-800 py-2 px-2 text-center">লেটার গ্রেড</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">জিপিএ (GP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 tabular-nums">
                {singleResult.subjectResults.map((sr) => {
                  const isOptional = sr.subject.sheetRole === 'OPTIONAL';
                  return (
                    <tr
                      key={sr.subject.id}
                      className={sr.letterGrade === 'F' ? 'bg-rose-50/70' : 'bg-white/80'}
                    >
                      <td className="border border-slate-300 py-2 px-2.5 font-semibold text-slate-900">
                        {sr.subject.bengaliName || sr.subject.name}
                        {isOptional && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-900 font-bold">
                            4th Subject
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-slate-600">
                        {num(sr.subject.fullMarks)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right">
                        {sr.writtenMarks !== null ? num(sr.writtenMarks) : '—'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right">
                        {sr.mcqMarks !== null ? num(sr.mcqMarks) : '—'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right">
                        {sr.practicalMarks !== null ? num(sr.practicalMarks) : '—'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right font-bold text-slate-900">
                        {num(sr.total)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                        <span
                          className={
                            sr.letterGrade === 'F'
                              ? 'text-rose-700'
                              : sr.letterGrade === 'A+'
                              ? 'text-emerald-800'
                              : 'text-slate-900'
                          }
                        >
                          {sr.letterGrade || '—'}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right font-mono font-semibold">
                        {num(sr.gradePoint.toFixed(2))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* COMBINED MULTI-TERM SUBJECT TABLE */}
        {mode === 'combined' && combinedResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-teal-900 text-white text-[11px] font-bold uppercase">
                  <th className="border border-teal-800 py-2 px-2.5">বিষয়ের নাম (Subject)</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">অর্ধ-বার্ষিক</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">বার্ষিক</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">সমন্বিত গড় নম্বর</th>
                  <th className="border border-teal-800 py-2 px-2 text-center">লেটার গ্রেড</th>
                  <th className="border border-teal-800 py-2 px-2 text-right">জিপিএ (GP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 tabular-nums">
                {combinedResult.subjectResults.map((sr) => {
                  const isOptional = sr.sheetRole === 'OPTIONAL';
                  return (
                    <tr
                      key={`${sr.sheetRole}_${sr.subjectCode}`}
                      className={sr.letterGrade === 'F' ? 'bg-rose-50/70' : 'bg-white/80'}
                    >
                      <td className="border border-slate-300 py-2 px-2.5 font-semibold text-slate-900">
                        {sr.bengaliName || sr.subjectName}
                        {isOptional && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-900 font-bold">
                            4th Subject
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right">
                        {sr.midTotal !== null ? num(sr.midTotal) : '—'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right">
                        {sr.annualTotal !== null ? num(sr.annualTotal) : '—'}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right font-bold text-slate-900">
                        {num(TabulationDisplay.formatDouble(sr.total))} / {num(sr.fullMarks)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                        <span
                          className={
                            sr.letterGrade === 'F' ? 'text-rose-700' : 'text-slate-900'
                          }
                        >
                          {sr.letterGrade || '—'}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right font-mono font-semibold">
                        {num(sr.gradePoint.toFixed(2))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Result Summary + Attendance Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-teal-50/60 border border-teal-800/30 rounded-xl p-3.5 text-xs tabular-nums">
          <div>
            <span className="text-slate-500 block">মোট প্রাপ্ত নম্বর (Total Marks)</span>
            <span className="font-mono font-bold text-base text-slate-900">
              {num(TabulationDisplay.formatDouble(grandTotal))}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">প্রাপ্ত জিপিএ (GPA)</span>
            <span className="font-mono font-extrabold text-base text-teal-900">
              {num(gpa.toFixed(2))}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">চূড়ান্ত গ্রেড ও ফলাফল</span>
            <span
              className={`font-bold text-sm ${isPass ? 'text-emerald-800' : 'text-rose-700'}`}
            >
              {grade} ({statusLabel})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">মেধা স্থান (Merit Position)</span>
            <span className="font-mono font-bold text-base text-slate-900">
              {meritRank ? `#${num(meritRank)}` : '—'}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-500 block">উপস্থিতির হার (Attendance)</span>
            <span className="font-mono font-semibold text-slate-900">
              {attendance && attendance.workingDays > 0
                ? `${num(attendance.presentDays)}/${num(attendance.workingDays)} (${num(
                    attendance.attendancePercent
                  )}%)`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Official Signature Blocks */}
        <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
          <div className="border-t border-slate-500 pt-1.5 font-semibold">
            শ্রেণি শিক্ষকের স্বাক্ষর (Class Teacher)
          </div>
          <div className="border-t border-slate-500 pt-1.5 font-semibold">
            অভিভাবকের স্বাক্ষর (Guardian)
          </div>
          <div className="border-t border-slate-500 pt-1.5 font-semibold">
            প্রধান শিক্ষকের স্বাক্ষর (Headmaster)
          </div>
        </div>
      </div>
    </div>
  );
};
