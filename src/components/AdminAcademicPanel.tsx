import React, { useState } from 'react';
import { Calendar, Plus, Trash2, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { ExamTermType, SchoolClassName } from '../types/school';

const CLASS_OPTIONS: SchoolClassName[] = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
];

const SECTION_PRESETS = ['Ka (ক)', 'Kha (খ)', 'Section A', 'Section B'];

const TERM_TYPES: ExamTermType[] = [
  'Half-Yearly',
  'Annual Exam',
  'Class Test',
  'Pre-Test',
  'Test Exam',
];

export const AdminAcademicPanel: React.FC = () => {
  const {
    currentUser,
    academicYears,
    selectedAcademicYearId,
    createAcademicYear,
    setActiveAcademicYear,
    examTerms,
    createExamTerm,
    setActiveExamTerm,
    toggleExamTermLock,
    deleteExamTerm,
    classSections,
    createClassSection,
    deleteClassSection,
    users,
    num,
  } = useSchool();

  // New Academic Year Form
  const [newYearStr, setNewYearStr] = useState('2027');
  const [newYearLabel, setNewYearLabel] = useState('Academic Session 2027 (শিক্ষাবর্ষ ২০২৭)');
  const [makeNewYearActive, setMakeNewYearActive] = useState(false);

  // New Exam Term Form
  const [termName, setTermName] = useState('');
  const [termType, setTermType] = useState<ExamTermType>('Half-Yearly');
  const [termMaxMarks, setTermMaxMarks] = useState(100);
  const [makeTermActive, setMakeTermActive] = useState(false);

  // New Class/Section Form
  const [className, setClassName] = useState<SchoolClassName>('Class 6');
  const [sectionName, setSectionName] = useState('Ka (ক)');
  const [roomNumber, setRoomNumber] = useState('103');
  const [initialTeacherUid, setInitialTeacherUid] = useState('');

  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Administrator privileges are required to configure Academic Years, Exam Terms, and Classes.
        </p>
      </div>
    );
  }

  const notify = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearStr.trim()) return;
    await createAcademicYear(newYearStr, newYearLabel, makeNewYearActive);
    notify(`Academic Year ${newYearStr} saved.`);
    setNewYearStr('');
    setNewYearLabel('');
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = termName.trim() || `${termType} Examination`;
    await createExamTerm({
      academicYearId: selectedAcademicYearId,
      name: finalName,
      termType,
      totalMarksDefault: termMaxMarks,
      isActive: makeTermActive,
    });
    notify(`Exam Term "${finalName}" created.`);
    setTermName('');
  };

  const handleAddClassSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim()) return;
    await createClassSection({
      academicYearId: selectedAcademicYearId,
      className,
      section: sectionName,
      roomNumber,
      classTeacherUid: initialTeacherUid || undefined,
    });
    notify(`Created ${className} - ${sectionName}.`);
  };

  const activeTeachers = users.filter((u) => u.status === 'active');
  const termsInSelectedYear = examTerms.filter((t) => t.academicYearId === selectedAcademicYearId);
  const classesInSelectedYear = classSections.filter(
    (c) => c.academicYearId === selectedAcademicYearId
  );

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Manage Academic Years, Terms & Classes
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure academic sessions (e.g., {num(2026)}), examination terms (Half-Yearly, Annual
          Exam, Class Test), and Class {num(6)} to Class {num(10)} sections (A/B or Ka/Kha).
        </p>
      </div>

      {statusBanner && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200"
        >
          {statusBanner}
        </div>
      )}

      {/* Grid Section 1: Academic Years & Exam Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Academic Years Column */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              01. Academic Years
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Define academic sessions and set the default active year.
            </p>
          </div>

          <form onSubmit={handleAddYear} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="academic-year-code"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Year (e.g. 2026) *
                </label>
                <input
                  id="academic-year-code"
                  type="text"
                  required
                  value={newYearStr}
                  onChange={(e) => {
                    setNewYearStr(e.target.value);
                    setNewYearLabel(`Academic Session ${e.target.value}`);
                  }}
                  placeholder="2026"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="academic-year-label"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Session Title
                </label>
                <input
                  id="academic-year-label"
                  type="text"
                  value={newYearLabel}
                  onChange={(e) => setNewYearLabel(e.target.value)}
                  placeholder="Academic Session 2026"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeNewYearActive}
                  onChange={(e) => setMakeNewYearActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Set as active session immediately</span>
              </label>

              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Year</span>
              </button>
            </div>
          </form>

          {/* List of Years */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {academicYears.map((y) => (
              <div
                key={y.id}
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {num(y.year)} · {y.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {y.isActive ? 'Current Active Academic Year' : 'Archived / Upcoming Session'}
                  </div>
                </div>

                {y.isActive ? (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveAcademicYear(y.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Set Active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Exam Terms Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              02. Examination Terms
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create Half-Yearly, Annual Exam, or Class Test terms for the selected academic year.
            </p>
          </div>

          <form onSubmit={handleAddTerm} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="exam-term-type"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Term Category
                </label>
                <select
                  id="exam-term-type"
                  value={termType}
                  onChange={(e) => setTermType(e.target.value as ExamTermType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {TERM_TYPES.map((tt) => (
                    <option key={tt} value={tt}>
                      {tt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="exam-term-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Custom Display Title
                </label>
                <input
                  id="exam-term-name"
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder={`${termType} Examination 2026`}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="exam-term-marks"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Default Max Marks
                </label>
                <input
                  id="exam-term-marks"
                  type="number"
                  min={10}
                  max={200}
                  value={termMaxMarks}
                  onChange={(e) => setTermMaxMarks(Number(e.target.value) || 100)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeTermActive}
                  onChange={(e) => setMakeTermActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Set as active examination term for marks entry</span>
              </label>

              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Exam Term</span>
              </button>
            </div>
          </form>

          {/* List of Terms */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {termsInSelectedYear.map((t) => (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{t.name}</span>
                    {t.isLocked && (
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        · Marks Locked
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Type: {t.termType} · Default Marks: {num(t.totalMarksDefault)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleExamTermLock(t.id);
                      notify(
                        t.isLocked
                          ? `Unlocked marks entry for "${t.name}".`
                          : `Locked marks entry for "${t.name}" (teachers cannot modify marks).`
                      );
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1 cursor-pointer ${
                      t.isLocked
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock Marks</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Marks</span>
                      </>
                    )}
                  </button>

                  {t.isActive ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Term</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveExamTerm(t.id)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Set Active
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`Delete exam term ${t.name}`}
                    onClick={() => deleteExamTerm(t.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {termsInSelectedYear.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                No exam terms configured for this academic year yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Classes & Sections (Class 6 to Class 10, Sections A/B or Ka/Kha) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              03. Classes & Sections (Class {num(6)} to Class {num(10)})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create class sections (e.g., Ka/Kha or Section A/B) and optionally assign a Class
              Teacher.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Quick Section Presets:</span>
            {SECTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSectionName(preset)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleAddClassSection}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 items-end"
        >
          <div>
            <label
              htmlFor="class-level-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Class Level *
            </label>
            <select
              id="class-level-select"
              value={className}
              onChange={(e) => setClassName(e.target.value as SchoolClassName)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {CLASS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="section-name-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Section (A/B or Ka/Kha) *
            </label>
            <input
              id="section-name-input"
              type="text"
              required
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g. Ka (ক) or Section A"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="room-number-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Room Number
            </label>
            <input
              id="room-number-input"
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 202"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
            />
          </div>

          <div>
            <label
              htmlFor="initial-class-teacher-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Class Teacher (Optional)
            </label>
            <select
              id="initial-class-teacher-select"
              value={initialTeacherUid}
              onChange={(e) => setInitialTeacherUid(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">-- Assign Later --</option>
              {activeTeachers.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.name} [{t.teacherCode}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class Section</span>
            </button>
          </div>
        </form>

        {/* Class Sections Table */}
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Assigned Class Teacher</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {classesInSelectedYear.map((cs) => (
                <tr key={cs.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {cs.className}
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{cs.section}</td>
                  <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    Room {num(cs.roomNumber)}
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    {cs.classTeacherUid ? (
                      <span>
                        {cs.classTeacherName}{' '}
                        <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
                          [{cs.classTeacherCode}]
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      aria-label={`Delete ${cs.className} ${cs.section}`}
                      onClick={() => deleteClassSection(cs.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
