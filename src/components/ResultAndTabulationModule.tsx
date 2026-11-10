import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Download,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  Search,
  Table,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  CombinedStudentResult,
  compileClassTabulationFromFirestore,
  computeStudentAttendanceSummary,
  MeritListEngine,
  MeritListEntry,
  StudentResult,
  TabulationDisplay,
  TabulationEngine,
} from '../utils/tabulationAndMeritEngine';
import { MarksheetTranscriptView } from './MarksheetTranscriptView';

type ResultSubTab =
  | 'single-tabulation'
  | 'combined-tabulation'
  | 'merit-list'
  | 'marksheet-generator';

export const ResultAndTabulationModule: React.FC = () => {
  const {
    academicYears,
    examTerms,
    classSections,
    subjectAssignments,
    students,
    subjectMarks,
    attendanceRecords,
    selectedAcademicYearId,
    selectedTermId,
    setSelectedTermId,
    num,
  } = useSchool();

  const [activeSubTab, setActiveSubTab] = useState<ResultSubTab>('single-tabulation');
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const [marksheetMode, setMarksheetMode] = useState<'single-term' | 'combined'>('single-term');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL_BATCH');

  const activeYear = useMemo(
    () => academicYears.find((y) => y.id === selectedAcademicYearId) || academicYears[0],
    [academicYears, selectedAcademicYearId]
  );

  const yearTerms = useMemo(
    () => examTerms.filter((t) => t.academicYearId === selectedAcademicYearId),
    [examTerms, selectedAcademicYearId]
  );

  const activeTerm = useMemo(
    () => yearTerms.find((t) => t.id === selectedTermId) || yearTerms[0] || null,
    [yearTerms, selectedTermId]
  );

  const yearSections = useMemo(
    () => classSections.filter((cs) => cs.academicYearId === selectedAcademicYearId),
    [classSections, selectedAcademicYearId]
  );

  useEffect(() => {
    if (
      !selectedClassSectionId ||
      !yearSections.some((cs) => cs.id === selectedClassSectionId)
    ) {
      const preferred =
        yearSections.find((cs) => cs.id === 'cs_9_a') || yearSections[0];
      setSelectedClassSectionId(preferred?.id || '');
    }
  }, [yearSections, selectedClassSectionId]);

  const activeSection = useMemo(
    () => yearSections.find((cs) => cs.id === selectedClassSectionId) || null,
    [yearSections, selectedClassSectionId]
  );

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.classSectionId === selectedClassSectionId && s.status === 'active')
        .sort((a, b) => a.roll - b.roll),
    [students, selectedClassSectionId]
  );

  // 1. Real-Time Single-Term Tabulation Compilation
  const singleCompiled = useMemo(() => {
    if (!selectedClassSectionId || !activeTerm) {
      return {
        students: [],
        subjects: [],
        marks: [],
        results: [] as StudentResult[],
      };
    }
    return compileClassTabulationFromFirestore({
      classSectionId: selectedClassSectionId,
      termId: activeTerm.id,
      students,
      subjectAssignments,
      subjectMarks,
    });
  }, [selectedClassSectionId, activeTerm, students, subjectAssignments, subjectMarks]);

  // 2. Real-Time Combined Multi-Term Tabulation Compilation
  const combinedResults = useMemo<CombinedStudentResult[]>(() => {
    if (!selectedClassSectionId) return [];
    const halfTerm =
      yearTerms.find((t) => t.termType === 'Half-Yearly') || yearTerms[0];
    const annualTerm =
      yearTerms.find((t) => t.termType === 'Annual Exam') ||
      yearTerms[1] ||
      yearTerms[0];
    if (!halfTerm || !annualTerm) return [];

    const midComp = compileClassTabulationFromFirestore({
      classSectionId: selectedClassSectionId,
      termId: halfTerm.id,
      students,
      subjectAssignments,
      subjectMarks,
    });
    const annComp = compileClassTabulationFromFirestore({
      classSectionId: selectedClassSectionId,
      termId: annualTerm.id,
      students,
      subjectAssignments,
      subjectMarks,
    });

    return TabulationEngine.computeCombined(
      midComp.students,
      midComp.subjects,
      midComp.marks,
      annComp.subjects,
      annComp.marks
    );
  }, [selectedClassSectionId, yearTerms, students, subjectAssignments, subjectMarks]);

  const meritList = useMemo<MeritListEntry[]>(
    () =>
      MeritListEngine.generateMeritList(singleCompiled.results, {
        excludeFailed: false,
      }),
    [singleCompiled.results]
  );

  const singleStats = useMemo(() => {
    const passedCount = singleCompiled.results.filter(
      (r) => r.grandTotal > 0 && r.failedCount === 0
    ).length;
    const failedCount = singleCompiled.results.filter(
      (r) => r.grandTotal === 0 || r.failedCount > 0
    ).length;
    const aPlusCount = singleCompiled.results.filter(
      (r) => r.failedCount === 0 && r.letterGrade === 'A+'
    ).length;
    return { passedCount, failedCount, aPlusCount };
  }, [singleCompiled.results]);

  const combinedStats = useMemo(() => {
    const passedCount = combinedResults.filter(
      (r) => r.grandTotal > 0 && r.failedCount === 0
    ).length;
    const failedCount = combinedResults.filter(
      (r) => r.grandTotal === 0 || r.failedCount > 0
    ).length;
    return { passedCount, failedCount };
  }, [combinedResults]);

  const filteredSingleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return singleCompiled.results;
    return singleCompiled.results.filter(
      (r: StudentResult) =>
        r.student.name.toLowerCase().includes(q) || String(r.student.roll).includes(q)
    );
  }, [singleCompiled.results, searchQuery]);

  const filteredCombinedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return combinedResults;
    return combinedResults.filter(
      (r: CombinedStudentResult) =>
        r.student.name.toLowerCase().includes(q) || String(r.student.roll).includes(q)
    );
  }, [combinedResults, searchQuery]);

  const filteredMeritRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return meritList;
    return meritList.filter(
      (r: MeritListEntry) =>
        r.name.toLowerCase().includes(q) || String(r.roll).includes(q)
    );
  }, [meritList, searchQuery]);

  const subjectHeaders = useMemo(
    () => singleCompiled.subjects.map((s) => s.bengaliName || s.name),
    [singleCompiled.subjects]
  );

  const combinedSubjectHeaders = useMemo(() => {
    const set = new Set<string>();
    combinedResults.forEach((r) => {
      r.subjectResults.forEach((sr) => {
        set.add(sr.bengaliName || sr.subjectName);
      });
    });
    return Array.from(set);
  }, [combinedResults]);

  const triggerCsvDownload = (filename: string, csvText: string) => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentCsv = () => {
    const classLabel = activeSection
      ? `${activeSection.className}_${activeSection.section}`
      : 'Class';
    const termLabel = activeTerm ? activeTerm.termType.replace(/\s+/g, '_') : 'Term';

    if (activeSubTab === 'single-tabulation') {
      const headers = ['Roll', 'Name', ...subjectHeaders, 'Total', 'GPA', 'Grade', 'Position'];
      const rows = singleCompiled.results.map((r) => [
        r.student.roll,
        `"${r.student.name}"`,
        ...singleCompiled.subjects.map((sub) => {
          const sr = r.subjectResults.find((it) => it.subject.id === sub.id);
          return sr ? `${sr.total} (${sr.letterGrade || '-'})` : '-';
        }),
        r.grandTotal,
        r.gpa !== null ? r.gpa.toFixed(2) : '0.00',
        r.letterGrade || 'F',
        r.position ?? '-',
      ]);
      const csv = [headers.join(','), ...rows.map((line) => line.join(','))].join('\n');
      triggerCsvDownload(`Tabulation_${classLabel}_${termLabel}.csv`, csv);
    } else if (activeSubTab === 'combined-tabulation') {
      const headers = ['Roll', 'Name', ...combinedSubjectHeaders, 'Combined Total', 'GPA', 'Grade', 'Position'];
      const rows = combinedResults.map((r) => [
        r.student.roll,
        `"${r.student.name}"`,
        ...combinedSubjectHeaders.map((h) => {
          const sr = r.subjectResults.find((it) => (it.bengaliName || it.subjectName) === h);
          return sr ? `${TabulationDisplay.formatDouble(sr.total)} (${sr.letterGrade || '-'})` : '-';
        }),
        TabulationDisplay.formatDouble(r.grandTotal),
        r.gpa !== null ? r.gpa.toFixed(2) : '0.00',
        r.letterGrade || 'F',
        r.position ?? '-',
      ]);
      const csv = [headers.join(','), ...rows.map((line) => line.join(','))].join('\n');
      triggerCsvDownload(`Combined_Tabulation_${classLabel}.csv`, csv);
    } else if (activeSubTab === 'merit-list') {
      const headers = ['Rank', 'Roll', 'Name', 'Group', 'Total Marks', 'GPA', 'Grade', 'Failed Subjects'];
      const rows = meritList.map((m) => [
        m.rank,
        m.roll,
        `"${m.name}"`,
        m.groupDisplay,
        m.grandTotal,
        m.gpa !== null ? m.gpa.toFixed(2) : '0.00',
        m.letterGrade,
        m.failedCount,
      ]);
      const csv = [headers.join(','), ...rows.map((line) => line.join(','))].join('\n');
      triggerCsvDownload(`Merit_List_${classLabel}_${termLabel}.csv`, csv);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Module Bar & Segmented Control Sub-Tabs (No-Print) */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Segmented Control Tab Bar */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-100/80 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setActiveSubTab('single-tabulation')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'single-tabulation'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Single-Term Tabulation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('combined-tabulation')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'combined-tabulation'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Combined Tabulation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('merit-list')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'merit-list'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Merit List</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('marksheet-generator')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'marksheet-generator'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Individual Marksheet Cards</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="res-class-select"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
              >
                শ্রেণি ও শাখা:
              </label>
              <select
                id="res-class-select"
                value={selectedClassSectionId}
                onChange={(e) => setSelectedClassSectionId(e.target.value)}
                className="text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
              >
                {yearSections.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.className} - শাখা {cs.section}
                  </option>
                ))}
              </select>
            </div>

            {activeSubTab !== 'combined-tabulation' && (
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="res-term-select"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                >
                  টার্ম:
                </label>
                <select
                  id="res-term-select"
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                >
                  {yearTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Live Result Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">মোট পরীক্ষার্থী</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {num(classStudents.length)} জন
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 px-3.5 py-2.5">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">উত্তীর্ণ (Passed)</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {num(
                activeSubTab === 'combined-tabulation'
                  ? combinedStats.passedCount
                  : singleStats.passedCount
              )}{' '}
              জন
            </div>
          </div>

          <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-3.5 py-2.5">
            <div className="text-[11px] text-rose-700 dark:text-rose-300">অকৃতকার্য (Failed)</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {num(
                activeSubTab === 'combined-tabulation'
                  ? combinedStats.failedCount
                  : singleStats.failedCount
              )}{' '}
              জন
            </div>
          </div>

          <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 px-3.5 py-2.5">
            <div className="text-[11px] text-teal-700 dark:text-teal-300">জিপিএ ৫.০০ (A+)</div>
            <div className="text-lg font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              {num(singleStats.aPlusCount)} জন
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">পাশের হার (Pass %)</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {classStudents.length > 0
                ? num(
                    Math.round(
                      ((activeSubTab === 'combined-tabulation'
                        ? combinedStats.passedCount
                        : singleStats.passedCount) /
                        classStudents.length) *
                        100
                    )
                  )
                : num(0)}
              %
            </div>
          </div>
        </div>

        {/* Search, Compact/Expanded Toggle, Zoom & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রোল বা নাম দিয়ে ফিল্টার..."
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-8 pr-3 py-1.5"
              />
            </div>

            {(activeSubTab === 'single-tabulation' || activeSubTab === 'combined-tabulation') && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCompact((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isCompact
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isCompact ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Expanded View</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Compact View</span>
                    </>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.max(75, z - 10))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 px-1 tabular-nums">
                    {num(zoomScale)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.min(125, z + 10))}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSubTab !== 'marksheet-generator' && (
              <button
                type="button"
                onClick={handleExportCurrentCsv}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save A4 PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: SINGLE-TERM TABULATION SHEET (with frozen/sticky Roll & Name column) */}
      {activeSubTab === 'single-tabulation' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ট্যাবুলেশন শিট (Single-Term Tabulation) — {activeSection?.className} (
                {activeSection?.section}) · {activeTerm?.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                রোল ও নাম বামপাশে স্থির (Sticky) থাকবে; ডানে-বামে স্ক্রল করে সকল বিষয়ের ফলাফল দেখুন।
              </p>
            </div>
          </div>

          <div
            className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
            style={{ fontSize: `${zoomScale}%` }}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                  <th
                    className={`sticky left-0 z-10 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 ${
                      isCompact ? 'py-2 px-2.5' : 'py-3 px-3.5'
                    }`}
                  >
                    রোল ও শিক্ষার্থী (Roll & Name)
                  </th>
                  {singleCompiled.subjects.map((sub) => (
                    <th
                      key={sub.id}
                      className={`text-center whitespace-nowrap border-r border-slate-200/60 dark:border-slate-800/60 ${
                        isCompact ? 'py-2 px-2' : 'py-3 px-3'
                      }`}
                    >
                      {sub.bengaliName || sub.name}
                    </th>
                  ))}
                  <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>মোট</th>
                  <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>জিপিএ</th>
                  <th className={`text-center ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>ফলাফল</th>
                  <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>মেধা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 tabular-nums">
                {filteredSingleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={singleCompiled.subjects.length + 5}
                      className="py-8 text-center text-slate-500"
                    >
                      কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredSingleRows.map((row: StudentResult) => {
                    const isPass = row.grandTotal > 0 && row.failedCount === 0;
                    const statusLabel = isPass ? 'PASSED' : `F${row.failedCount || 1}`;
                    return (
                      <tr
                        key={row.student.id}
                        className={
                          !isPass
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }
                      >
                        {/* Sticky Left Column: Roll & Name */}
                        <td
                          className={`sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white whitespace-nowrap ${
                            !isPass
                              ? 'bg-rose-50 dark:bg-slate-900'
                              : 'bg-white dark:bg-slate-900'
                          } ${isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3.5'}`}
                        >
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-400 mr-1.5">
                            #{num(String(row.student.roll).padStart(2, '0'))}
                          </span>
                          <span>{row.student.name}</span>
                        </td>

                        {singleCompiled.subjects.map((sub) => {
                          const sr = row.subjectResults.find((s) => s.subject.id === sub.id);
                          if (!sr || sr.letterGrade === '') {
                            return (
                              <td
                                key={sub.id}
                                className="py-2 px-2 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800/50"
                              >
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={sub.id}
                              className={`text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/50 ${
                                isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'
                              }`}
                            >
                              <div className="font-mono font-bold text-slate-900 dark:text-white">
                                {num(sr.total)}
                                <span
                                  className={`ml-1 text-[11px] font-bold ${
                                    sr.letterGrade === 'F'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : sr.letterGrade === 'A+'
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-teal-700 dark:text-teal-400'
                                  }`}
                                >
                                  ({sr.letterGrade})
                                </span>
                              </div>
                              {!isCompact && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {sr.writtenMarks !== null ? `CQ:${num(sr.writtenMarks)} ` : ''}
                                  {sr.mcqMarks !== null ? `M:${num(sr.mcqMarks)} ` : ''}
                                  {sr.practicalMarks !== null ? `P:${num(sr.practicalMarks)}` : ''}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td
                          className={`text-right font-mono font-bold text-slate-900 dark:text-white ${
                            isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'
                          }`}
                        >
                          {num(row.grandTotal)}
                        </td>
                        <td
                          className={`text-right font-mono font-bold text-teal-700 dark:text-teal-400 ${
                            isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'
                          }`}
                        >
                          {num((row.gpa ?? 0).toFixed(2))}
                        </td>
                        <td className={`text-center ${isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'}`}>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isPass
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {row.letterGrade || 'F'} ({statusLabel})
                          </span>
                        </td>
                        <td
                          className={`text-right font-mono font-bold text-slate-900 dark:text-white ${
                            isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'
                          }`}
                        >
                          {row.position ? `#${num(row.position)}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: COMBINED MULTI-TERM TABULATION SHEET */}
      {activeSubTab === 'combined-tabulation' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              সমন্বিত ট্যাবুলেশন শিট (Combined Multi-Term Tabulation) — {activeSection?.className} (
              {activeSection?.section})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              অর্ধ-বার্ষিক ও বার্ষিক পরীক্ষার গড় নম্বরের ভিত্তিতে চূড়ান্ত সমন্বিত ফলাফল।
            </p>
          </div>

          <div
            className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
            style={{ fontSize: `${zoomScale}%` }}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                  <th
                    className={`sticky left-0 z-10 bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 ${
                      isCompact ? 'py-2 px-2.5' : 'py-3 px-3.5'
                    }`}
                  >
                    রোল ও শিক্ষার্থী
                  </th>
                  {combinedSubjectHeaders.map((subName) => (
                    <th
                      key={subName}
                      className={`text-center whitespace-nowrap border-r border-slate-200/60 dark:border-slate-800/60 ${
                        isCompact ? 'py-2 px-2' : 'py-3 px-3'
                      }`}
                    >
                      {subName} (HY / AN / Avg)
                    </th>
                  ))}
                  <th className="py-2.5 px-2.5 text-right">চূড়ান্ত মোট</th>
                  <th className="py-2.5 px-2.5 text-right">চূড়ান্ত জিপিএ</th>
                  <th className="py-2.5 px-2.5 text-center">ফলাফল</th>
                  <th className="py-2.5 px-2.5 text-right">মেধা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 tabular-nums">
                {filteredCombinedRows.map((row: CombinedStudentResult) => {
                  const isPass = row.grandTotal > 0 && row.failedCount === 0;
                  const statusLabel = isPass ? 'PASSED' : `F${row.failedCount || 1}`;
                  return (
                    <tr
                      key={row.student.id}
                      className={
                        !isPass
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td
                        className={`sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white whitespace-nowrap ${
                          !isPass
                            ? 'bg-rose-50 dark:bg-slate-900'
                            : 'bg-white dark:bg-slate-900'
                        } ${isCompact ? 'py-1.5 px-2.5' : 'py-2.5 px-3.5'}`}
                      >
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400 mr-1.5">
                          #{num(String(row.student.roll).padStart(2, '0'))}
                        </span>
                        <span>{row.student.name}</span>
                      </td>

                      {combinedSubjectHeaders.map((subName) => {
                        const sub = row.subjectResults.find(
                          (s) => (s.bengaliName || s.subjectName) === subName
                        );
                        if (!sub) {
                          return (
                            <td key={subName} className="py-2 px-2 text-center text-slate-400">
                              —
                            </td>
                          );
                        }
                        return (
                          <td
                            key={subName}
                            className={`text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/50 ${
                              isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3'
                            }`}
                          >
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {num(TabulationDisplay.formatDouble(sub.total))} ({sub.letterGrade})
                            </div>
                            {!isCompact && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                HY:{sub.midTotal !== null ? num(sub.midTotal) : '-'} | AN:
                                {sub.annualTotal !== null ? num(sub.annualTotal) : '-'}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {num(TabulationDisplay.formatDouble(row.grandTotal))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        {num((row.gpa ?? 0).toFixed(2))}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isPass
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {row.letterGrade || 'F'} ({statusLabel})
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {row.position ? `#${num(row.position)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: AUTOMATED MERIT LIST */}
      {activeSubTab === 'merit-list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              স্বয়ংক্রিয় মেধা তালিকা (Automated Merit List) — {activeSection?.className} (
              {activeSection?.section}) · {activeTerm?.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ক্রম নির্ধারণ নীতি: উত্তীর্ণ শিক্ষার্থী অগ্রাধিকার → কম ফেলকৃত বিষয় → উচ্চতর জিপিএ → উচ্চতর
              মোট নম্বর → পূর্ববর্তী রোল।
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">মেধা স্থান (Merit Rank)</th>
                  <th className="py-2.5 px-3">পূর্ববর্তী রোল</th>
                  <th className="py-2.5 px-3">শিক্ষার্থীর নাম</th>
                  <th className="py-2.5 px-3">বিভাগ</th>
                  <th className="py-2.5 px-3 text-right">মোট নম্বর</th>
                  <th className="py-2.5 px-3 text-right">জিপিএ (GPA)</th>
                  <th className="py-2.5 px-3 text-center">লেটার গ্রেড</th>
                  <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 tabular-nums">
                {filteredMeritRows.map((row: MeritListEntry) => {
                  const isPass = row.failedCount === 0;
                  return (
                    <tr
                      key={row.studentId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold ${
                            row.rank <= 3 && isPass
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          #{num(row.rank)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        #{num(String(row.roll).padStart(2, '0'))}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {row.groupDisplay}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {num(row.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        {num((row.gpa ?? 0).toFixed(2))}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={
                            row.letterGrade === 'F'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {row.letterGrade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPass
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {isPass ? 'PASSED' : `FAILED (F${row.failedCount})`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: INDIVIDUAL STUDENT MARKSHEET & BATCH A4 PDF PRINT */}
      {activeSubTab === 'marksheet-generator' && (
        <div className="space-y-6">
          <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ট্রান্সক্রিপ্ট ধরন:
                </span>
                <button
                  type="button"
                  onClick={() => setMarksheetMode('single-term')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    marksheetMode === 'single-term'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Single-Term Marksheet
                </button>
                <button
                  type="button"
                  onClick={() => setMarksheetMode('combined')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    marksheetMode === 'combined'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Combined Annual Marksheet
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="marksheet-student-select"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  শিক্ষার্থী নির্বাচন:
                </label>
                <select
                  id="marksheet-student-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-1.5"
                >
                  <option value="ALL_BATCH">
                    সকল শিক্ষার্থী একসাথে প্রিন্ট ({num(classStudents.length)} জন)
                  </option>
                  {classStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      রোল #{num(stu.roll)} — {stu.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {selectedStudentId === 'ALL_BATCH'
                  ? `Batch Print All (${num(classStudents.length)}) Marksheets`
                  : 'Print Official A4 Marksheet'}
              </span>
            </button>
          </div>

          <div className="space-y-8">
            {(selectedStudentId === 'ALL_BATCH'
              ? classStudents
              : classStudents.filter((s) => s.id === selectedStudentId)
            ).map((stu) => {
              const singleRes = singleCompiled.results.find(
                (r: StudentResult) => r.student.id === stu.id
              );
              const combinedRes = combinedResults.find(
                (r: CombinedStudentResult) => r.student.id === stu.id
              );
              const attSummary = computeStudentAttendanceSummary(
                selectedClassSectionId,
                stu.roll,
                attendanceRecords
              );

              return (
                <div key={stu.id} className="break-after-page">
                  <MarksheetTranscriptView
                    mode={marksheetMode}
                    examTitle={
                      marksheetMode === 'single-term'
                        ? activeTerm?.name || 'Half-Yearly Examination'
                        : 'Combined Annual Examination Result'
                    }
                    academicYearLabel={`Session ${activeYear?.year || '2026'}`}
                    classNameLabel={activeSection?.className || 'Class 9'}
                    sectionLabel={activeSection?.section || 'A'}
                    singleResult={singleRes}
                    combinedResult={combinedRes}
                    attendance={attSummary}
                    num={num}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
