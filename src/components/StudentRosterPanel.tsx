import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Upload,
  Search,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { Student, StudentGroup } from '../types/school';
import {
  canManageClassRosterAndAttendance,
  parseLocalizedInt,
  parseStudentRosterCsv,
} from '../utils/schoolLogic';

const GROUPS: StudentGroup[] = ['General', 'Science', 'Humanities', 'Business Studies'];

const SAMPLE_CSV_ROSTER = `Roll, Name, Group, Optional Subject, Guardian Phone
5, Rashedul Islam, Science, Higher Mathematics, 01819556677
6, Jannatul Ferdous, Science, Biology, 01716889900
7, Sourav Chakraborty, Business Studies, Agriculture Studies, 01813442211
8, Sabrina Sultana, Humanities, Civics & Citizenship, 01914778822`;

export const StudentRosterPanel: React.FC = () => {
  const {
    currentUser,
    classSections,
    selectedAcademicYearId,
    students,
    addSingleStudent,
    bulkImportStudents,
    updateStudentRecord,
    deleteStudentRecord,
    num,
  } = useSchool();

  const classesForYear = useMemo(
    () => classSections.filter((c) => c.academicYearId === selectedAcademicYearId),
    [classSections, selectedAcademicYearId]
  );

  // Default to the teacher's assigned class section if they are a Class Teacher, or the first class section
  const defaultCsId = useMemo(() => {
    if (currentUser) {
      const myCs = classesForYear.find((c) => c.classTeacherUid === currentUser.uid);
      if (myCs) return myCs.id;
    }
    return classesForYear[0]?.id || '';
  }, [classesForYear, currentUser]);

  const [selectedClassSectionId, setSelectedClassSectionId] = useState<string>(defaultCsId);
  const [groupFilter, setGroupFilter] = useState<'all' | StudentGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: 'none' | 'single' | 'bulk'
  const [entryMode, setEntryMode] = useState<'none' | 'single' | 'bulk'>('none');

  // Single Student Form State
  const [rollInput, setRollInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState<StudentGroup>('Science');
  const [optionalSubject, setOptionalSubject] = useState('Higher Mathematics');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [singleFormError, setSingleFormError] = useState<string | null>(null);

  // Bulk CSV / Paste State
  const [csvText, setCsvText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeClassSection =
    classesForYear.find((c) => c.id === selectedClassSectionId) || classesForYear[0] || null;

  const hasEditPermission = canManageClassRosterAndAttendance(currentUser, activeClassSection);

  const classStudents = useMemo(() => {
    if (!activeClassSection) return [];
    return students
      .filter((s) => s.classSectionId === activeClassSection.id)
      .sort((a, b) => a.roll - b.roll);
  }, [students, activeClassSection]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      if (groupFilter !== 'all' && s.group !== groupFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchRoll = String(s.roll).includes(q);
        const matchOpt = s.optionalSubject.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchOpt) return false;
      }
      return true;
    });
  }, [classStudents, groupFilter, searchQuery]);

  // Live CSV preview
  const csvPreview = useMemo(() => {
    return parseStudentRosterCsv(csvText, {
      className: activeClassSection?.className,
    });
  }, [csvText, activeClassSection]);

  const handleSingleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleFormError(null);
    if (!activeClassSection) return;

    const parsedRoll = parseLocalizedInt(rollInput);
    if (Number.isNaN(parsedRoll) || parsedRoll < 1 || parsedRoll > 9999) {
      setSingleFormError('Please enter a valid Roll number (1–9999).');
      return;
    }
    if (!studentName.trim()) {
      setSingleFormError('Student Name is required.');
      return;
    }
    if (classStudents.some((s) => s.roll === parsedRoll)) {
      setSingleFormError(
        `Roll ${parsedRoll} already exists in ${activeClassSection.className} (${activeClassSection.section}).`
      );
      return;
    }

    await addSingleStudent({
      academicYearId: selectedAcademicYearId,
      classSectionId: activeClassSection.id,
      roll: parsedRoll,
      name: studentName.trim(),
      group: studentGroup,
      optionalSubject: optionalSubject.trim() || 'None',
      guardianPhone: guardianPhone.trim(),
    });

    setStatusMessage(
      `Added Roll ${parsedRoll} (${studentName.trim()}) to ${activeClassSection.className} (${activeClassSection.section}).`
    );
    setRollInput(String(parsedRoll + 1));
    setStudentName('');
    setGuardianPhone('');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleBulkImportCommit = async () => {
    if (!activeClassSection || csvPreview.valid.length === 0) return;
    const count = await bulkImportStudents(
      selectedAcademicYearId,
      activeClassSection.id,
      csvPreview.valid
    );
    setStatusMessage(
      `Successfully imported ${count} student records into ${activeClassSection.className} (${activeClassSection.section}).`
    );
    setCsvText('');
    setEntryMode('none');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Master Student Roster Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Add students individually or bulk-import via CSV/paste (Roll, Name, Group, Optional
            Subject). Accessible to Admins and the assigned Class Teacher.
          </p>
        </div>

        {hasEditPermission ? (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEntryMode((prev) => (prev === 'single' ? 'none' : 'single'));
                const nextRoll =
                  classStudents.length > 0
                    ? Math.max(...classStudents.map((s) => s.roll)) + 1
                    : 1;
                setRollInput(String(nextRoll));
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>{entryMode === 'single' ? 'Close Form' : 'Add Individual Student'}</span>
            </button>

            <button
              type="button"
              onClick={() => setEntryMode((prev) => (prev === 'bulk' ? 'none' : 'bulk'))}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{entryMode === 'bulk' ? 'Close Bulk Import' : 'Bulk Import CSV / Paste'}</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
            Read-Only View · Assigned Class Teacher:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {activeClassSection?.classTeacherName || 'Unassigned'}
            </strong>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Individual Student Entry Form */}
      {entryMode === 'single' && hasEditPermission && activeClassSection && (
        <form
          onSubmit={handleSingleStudentSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Add Student to {activeClassSection.className} ({activeClassSection.section})
            </h2>
            <span className="text-xs text-slate-500">
              Supports English (1, 2) or Bengali (১, ২) Roll digits
            </span>
          </div>

          {singleFormError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300"
            >
              {singleFormError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label
                htmlFor="student-roll-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Roll Number *
              </label>
              <input
                id="student-roll-input"
                type="text"
                required
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                placeholder="e.g. 5 or ৫"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="student-name-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name *
              </label>
              <input
                id="student-name-input"
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Rashedul Islam"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="student-group-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Academic Group *
              </label>
              <select
                id="student-group-select"
                value={studentGroup}
                onChange={(e) => setStudentGroup(e.target.value as StudentGroup)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="student-optional-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Optional Subject (4th Subject)
              </label>
              <input
                id="student-optional-input"
                type="text"
                value={optionalSubject}
                onChange={(e) => setOptionalSubject(e.target.value)}
                placeholder="Higher Mathematics / None"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="student-phone-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Guardian Phone
              </label>
              <input
                id="student-phone-input"
                type="text"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="018XXXXXXXX"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEntryMode('none')}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
            >
              Save Student to Roster
            </button>
          </div>
        </form>
      )}

      {/* Bulk CSV / Paste Import Panel */}
      {entryMode === 'bulk' && hasEditPermission && activeClassSection && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>
                  Bulk Import Students into {activeClassSection.className} (
                  {activeClassSection.section})
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paste CSV or tab-separated rows:{' '}
                <code className="font-mono">Roll, Name, Group, Optional Subject, Guardian Phone</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV_ROSTER)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                Load Sample CSV Rows
              </button>
              <label className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer">
                <span>Upload .CSV File</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <textarea
            aria-label="Paste CSV student rows"
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Roll, Name, Group, Optional Subject\n1, Tanvir Hossain, Science, Higher Mathematics\n2, Arpita Rani Das, Science, Biology`}
            className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          />

          {/* Live Validation Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 text-xs tabular-nums">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Valid Rows Ready: {num(csvPreview.valid.length)}
              </span>
              {csvPreview.errors.length > 0 && (
                <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Errors: {num(csvPreview.errors.length)}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEntryMode('none')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvPreview.valid.length === 0}
                onClick={handleBulkImportCommit}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white cursor-pointer"
              >
                Import {num(csvPreview.valid.length)} Students Now
              </button>
            </div>
          </div>

          {csvPreview.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 space-y-1">
              {csvPreview.errors.map((err, idx) => (
                <div key={idx}>
                  Line {num(err.line)}: {err.reason} (<code className="font-mono">{err.raw}</code>)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Class Selector, Group Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="roster-class-select"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
            >
              Class & Section:
            </label>
            <select
              id="roster-class-select"
              value={activeClassSection?.id || ''}
              onChange={(e) => setSelectedClassSectionId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {classesForYear.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.className} - {cs.section} (Class Teacher: {cs.classTeacherCode})
                </option>
              ))}
            </select>
          </div>

          {/* Group Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(['all', ...GROUPS] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter(g)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  groupFilter === g
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {g === 'all' ? 'All Groups' : g}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search students by roll or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roll, student name, or optional subject..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing{' '}
            <strong className="text-slate-900 dark:text-white tabular-nums">
              {num(filteredStudents.length)}
            </strong>{' '}
            of{' '}
            <strong className="text-slate-900 dark:text-white tabular-nums">
              {num(classStudents.length)}
            </strong>{' '}
            enrolled students in{' '}
            <strong className="text-slate-900 dark:text-white">
              {num(activeClassSection?.className)} ({activeClassSection?.section})
            </strong>
          </div>
          <div>
            Assigned Class Teacher:{' '}
            <strong className="text-slate-900 dark:text-white">
              {activeClassSection?.classTeacherName || 'Unassigned'} [
              {activeClassSection?.classTeacherCode || '-'}]
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 w-24">Roll No.</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Optional Subject</th>
                <th className="py-3 px-4">Guardian Phone</th>
                {hasEditPermission && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredStudents.map((stu) => (
                <tr
                  key={stu.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {num(stu.roll)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {stu.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                    {num(stu.className)} · {stu.section}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {stu.group}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {stu.optionalSubject}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    {stu.guardianPhone ? num(stu.guardianPhone) : '—'}
                  </td>
                  {hasEditPermission && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Cycle group for ${stu.name}`}
                          onClick={() => {
                            const nextIdx = (GROUPS.indexOf(stu.group) + 1) % GROUPS.length;
                            updateStudentRecord(stu.id, { group: GROUPS[nextIdx] });
                          }}
                          title="Switch Student Group"
                          className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Change Group
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove student ${stu.name}`}
                          onClick={() => deleteStudentRecord(stu.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={hasEditPermission ? 7 : 6}
                    className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No students found in this section. Use &ldquo;Add Individual Student&rdquo; or
                    &ldquo;Bulk Import CSV / Paste&rdquo; above to populate the roster.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
