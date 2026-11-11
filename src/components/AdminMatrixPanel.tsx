import React, { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle, BookOpen, UserCheck, RefreshCw } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { SUBJECT_CATALOG } from '../utils/marksCatalogAndLogic';
import { isFullAdminUser } from '../utils/schoolLogic';

const NCTB_CODE_MAP: Record<string, string> = {
  'Bangla 1st Paper': '101',
  'Bangla 2nd Paper': '102',
  'English 1st Paper': '107',
  'English 2nd Paper': '108',
  Mathematics: '109',
  'Higher Math': '126',
  Science: '127',
  Physics: '136',
  Chemistry: '137',
  Biology: '138',
  BGS: '150',
  ICT: '154',
  Islam: '111',
  Hindu: '112',
  Buddhism: '113',
  Christianity: '114',
  Agriculture: '134',
  'Home Science': '151',
  'Finance & Banking': '152',
  Accounting: '146',
  'Business Ent.': '143',
  'History of BD': '153',
  'Civics & Citizenship': '140',
  'Geography & Env.': '110',
  Economics: '141',
  'Physical Education': '147',
  'Career Education': '156',
  'Arts & Crafts': '148',
  'Work & Life': '155',
};

const NCTB_SUBJECT_PRESETS = SUBJECT_CATALOG.map((spec, idx) => ({
  code: NCTB_CODE_MAP[spec.name] || String(160 + idx),
  name: spec.name,
  maxMarks: spec.fullMarks,
}));

export const AdminMatrixPanel: React.FC = () => {
  const {
    currentUser,
    users,
    classSections,
    selectedAcademicYearId,
    assignClassTeacher,
    subjectAssignments,
    createOrUpdateSubjectAssignment,
    deleteSubjectAssignment,
    syncAssignmentsFromRoutineNow,
    num,
  } = useSchool();

  const classesForYear = useMemo(
    () => classSections.filter((c) => c.academicYearId === selectedAcademicYearId),
    [classSections, selectedAcademicYearId]
  );

  const [selectedClassSectionId, setSelectedClassSectionId] = useState<string>(
    classesForYear[0]?.id || ''
  );
  const [subjectCode, setSubjectCode] = useState('109');
  const [subjectName, setSubjectName] = useState('General Mathematics (সাধারণ গণিত)');
  const [maxMarks, setMaxMarks] = useState(100);
  const [assignedTeacherUid, setAssignedTeacherUid] = useState<string>(
    users.find((u) => u.status === 'active')?.uid || ''
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isFullAdminUser(currentUser)) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Administrator privileges are required to modify the Class Teacher & Subject Assignment
          Matrix.
        </p>
      </div>
    );
  }

  const activeTeachers = users.filter(
    (u) => u.status === 'active' && (u.staffType || 'teacher') === 'teacher'
  );
  const effectiveClassSectionId =
    classesForYear.some((c) => c.id === selectedClassSectionId)
      ? selectedClassSectionId
      : classesForYear[0]?.id || '';

  const filteredAssignments = subjectAssignments.filter(
    (a) =>
      a.academicYearId === selectedAcademicYearId &&
      (!effectiveClassSectionId || a.classSectionId === effectiveClassSectionId)
  );

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveClassSectionId || !subjectCode.trim() || !subjectName.trim() || !assignedTeacherUid) {
      return;
    }
    await createOrUpdateSubjectAssignment({
      academicYearId: selectedAcademicYearId,
      classSectionId: effectiveClassSectionId,
      subjectCode,
      subjectName,
      teacherUid: assignedTeacherUid,
      maxMarks,
      isManualOverride: true,
    });
    const t = users.find((u) => u.uid === assignedTeacherUid);
    showToast(
      `Assigned "${subjectName}" (${subjectCode}) to ${t?.name || 'Teacher'} [${t?.teacherCode || ''}] (Manual Override saved).`
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ১০টি শ্রেণি-শাখার শ্রেণি শিক্ষক ও বিষয় বণ্টন ম্যাট্রিক্স
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            রুটিনের ১ম পিরিয়ড অনুযায়ী ১০টি শাখার (৬ষ্ঠ–১০ম × ক/খ) শ্রেণি শিক্ষক এবং সর্বাধিক দিন পাঠদানকারী শিক্ষক অনুযায়ী বিষয় শিক্ষক স্বয়ংক্রিয়ভাবে নির্ধারিত হয়। অ্যাডমিন যেকোনো সময় ম্যানুয়াল ওভাররাইড (Manual Override) করতে পারবেন।
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const res = await syncAssignmentsFromRoutineNow();
            showToast(
              `✓ লাইভ রুটিন থেকে ${num(res.updatedSectionsCount)}টি শাখার শ্রেণি শিক্ষক ও ${num(res.updatedSubjectsCount)}টি বিষয়ের শিক্ষক স্বয়ংক্রিয়ভাবে আপডেট করা হয়েছে!`
            );
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>রুটিন থেকে অটো-সিঙ্ক করুন</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Part A: Class Teacher Assignment Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Part A: Class Teacher Assignment Matrix (Attendance & Roster Permission)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Selecting a teacher here immediately grants them Class Attendance & Student Roster
              management rights for that Class & Section.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Current Class Teacher</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4 text-right">Assign / Change Class Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {classesForYear.map((cs) => (
                <tr key={cs.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {cs.className} · {cs.section}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    Room {num(cs.roomNumber)}
                  </td>
                  <td className="py-3.5 px-4">
                    {cs.classTeacherUid ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {cs.classTeacherName}
                        </span>
                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                          [{cs.classTeacherCode}]
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            cs.isManualOverride
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              : 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {cs.isManualOverride ? 'Manual Override' : 'Auto: 1st Period'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        Not Assigned
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                    Attendance Entry · Consolidated Result Submit
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      aria-label={`Assign Class Teacher for ${cs.className} ${cs.section}`}
                      value={cs.classTeacherUid}
                      onChange={async (e) => {
                        const nextUid = e.target.value;
                        await assignClassTeacher(cs.id, nextUid, true);
                        const t = users.find((u) => u.uid === nextUid);
                        showToast(
                          t
                            ? `${t.name} [${t.teacherCode}] assigned as Class Teacher for ${cs.className} (${cs.section}).`
                            : `Cleared Class Teacher for ${cs.className} (${cs.section}).`
                        );
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Unassigned --</option>
                      {activeTeachers.map((t) => (
                        <option key={t.uid} value={t.uid}>
                          {t.nameBn || t.name} [{t.teacherCode}]
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part B: Subject Assignment Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Part B: Subject Assignment Matrix (Exam Marks Entry Permission)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign specific subjects for a Class & Section to a teacher to grant Exam Marks Entry
              permission.
            </p>
          </div>

          {/* Class Section Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="matrix-class-filter"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
            >
              Target Class & Section:
            </label>
            <select
              id="matrix-class-filter"
              value={effectiveClassSectionId}
              onChange={(e) => setSelectedClassSectionId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {classesForYear.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.className} - {cs.section}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Subject Assignment Form */}
        <form
          onSubmit={handleAssignSubject}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 items-end"
        >
          <div>
            <label
              htmlFor="preset-subject-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              NCTB Subject Preset
            </label>
            <select
              id="preset-subject-select"
              value={subjectCode}
              onChange={(e) => {
                const chosen = NCTB_SUBJECT_PRESETS.find((p) => p.code === e.target.value);
                if (chosen) {
                  setSubjectCode(chosen.code);
                  setSubjectName(chosen.name);
                  setMaxMarks(chosen.maxMarks);
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {NCTB_SUBJECT_PRESETS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="subject-name-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Subject Title *
            </label>
            <input
              id="subject-name-input"
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="subject-code-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Subject Code & Max Marks
            </label>
            <div className="flex items-center gap-2">
              <input
                id="subject-code-input"
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="109"
                className="w-20 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
              />
              <input
                type="number"
                aria-label="Subject Maximum Marks"
                min={10}
                max={200}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="subject-teacher-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Assign Subject Teacher *
            </label>
            <select
              id="subject-teacher-select"
              value={assignedTeacherUid}
              onChange={(e) => setAssignedTeacherUid(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
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
              <span>Assign Subject</span>
            </button>
          </div>
        </form>

        {/* Subject Assignments Table */}
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Max Marks</th>
                <th className="py-3 px-4">Assigned Subject Teacher</th>
                <th className="py-3 px-4 text-right">Reassign / Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredAssignments.map((asg) => (
                <tr key={asg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {num(asg.subjectCode)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {asg.subjectName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {asg.className} · {asg.section}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    {num(asg.maxMarks)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {asg.teacherName}
                      </span>
                      <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                        [{asg.teacherCode}]
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          asg.isManualOverride
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300'
                        }`}
                      >
                        {asg.isManualOverride
                          ? 'Manual Override'
                          : asg.assignedDaysCount
                          ? `Auto (${asg.assignedDaysCount}d/wk)`
                          : 'Routine Sync'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        aria-label={`Reassign teacher for ${asg.subjectName}`}
                        value={asg.teacherUid}
                        onChange={(e) =>
                          createOrUpdateSubjectAssignment({
                            id: asg.id,
                            academicYearId: asg.academicYearId,
                            classSectionId: asg.classSectionId,
                            subjectCode: asg.subjectCode,
                            subjectName: asg.subjectName,
                            teacherUid: e.target.value,
                            maxMarks: asg.maxMarks,
                            isManualOverride: true,
                          })
                        }
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        {activeTeachers.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.nameBn || t.name} [{t.teacherCode}]
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        aria-label={`Remove subject assignment ${asg.subjectName}`}
                        onClick={() => deleteSubjectAssignment(asg.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAssignments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No subjects assigned to this Class & Section yet. Use the form above to assign a
                    subject teacher.
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
