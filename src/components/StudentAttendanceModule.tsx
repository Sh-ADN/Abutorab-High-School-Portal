import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Printer,
  RotateCcw,
  Save,
  Search,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  canManageClassRosterAndAttendance,
  isPrivilegedReviewerUser,
} from '../utils/schoolLogic';
import {
  computeClassAttendanceAnalytics,
  formatCutoffDisplay,
  formatShortMonth,
  generateAttendanceReportCsv,
  isWeekendDate,
  parseAbsentRollsSet,
  serializeAbsentRolls,
  StudentAttendanceStat,
} from '../utils/attendanceAnalytics';

export const StudentAttendanceModule: React.FC = () => {
  const {
    currentUser,
    academicYears,
    classSections,
    students,
    attendanceRecords,
    selectedAcademicYearId,
    selectedAttendanceClassSectionId,
    setSelectedAttendanceClassSectionId,
    saveAttendanceRecord,
    clearAttendanceForDate,
    toggleStudentAttendanceOnDate,
    finePerAbsentDay,
    setFinePerAbsentDay,
    holidays,
    toggleHolidayDate,
    num,
  } = useSchool();

  const [activeSubTab, setActiveSubTab] = useState<'take-attendance' | 'summary-dashboard'>(
    'take-attendance'
  );
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [absentRollSet, setAbsentRollSet] = useState<Set<number>>(new Set());
  const [lateRollSet, setLateRollSet] = useState<Set<number>>(new Set());
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedAbsentees, setCopiedAbsentees] = useState(false);

  // Summary Dashboard state
  const [cutoffDate, setCutoffDate] = useState<string>('2026-12-31');
  const [summarySearchQuery, setSummarySearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'LOW'>('ALL');
  const [selectedStudentDetail, setSelectedStudentDetail] =
    useState<StudentAttendanceStat | null>(null);
  const [showHolidayCalendarModal, setShowHolidayCalendarModal] = useState<boolean>(false);

  if (!currentUser) return null;

  const isReviewer = isPrivilegedReviewerUser(currentUser);
  const activeYear = academicYears.find((y) => y.id === selectedAcademicYearId);

  // Sections in active academic year
  const yearSections = useMemo(
    () => classSections.filter((cs) => cs.academicYearId === selectedAcademicYearId),
    [classSections, selectedAcademicYearId]
  );

  // Strict Attendance Access: Only the assigned Class Teacher of a specific class-section
  // (plus super_admin, main_admin, head_teacher, and asst_head_teacher) can view, take, and submit attendance for that section.
  const permittedSections = useMemo(
    () =>
      yearSections.filter((cs) => canManageClassRosterAndAttendance(currentUser, cs)),
    [yearSections, currentUser]
  );

  useEffect(() => {
    if (
      permittedSections.length > 0 &&
      (!selectedAttendanceClassSectionId ||
        !permittedSections.some((cs) => cs.id === selectedAttendanceClassSectionId))
    ) {
      setSelectedAttendanceClassSectionId(permittedSections[0].id);
    }
  }, [
    selectedAttendanceClassSectionId,
    permittedSections,
    setSelectedAttendanceClassSectionId,
  ]);

  const activeSection = useMemo(
    () => permittedSections.find((cs) => cs.id === selectedAttendanceClassSectionId) || null,
    [permittedSections, selectedAttendanceClassSectionId]
  );

  const canEditSelectedClass = useMemo(
    () => canManageClassRosterAndAttendance(currentUser, activeSection),
    [currentUser, activeSection]
  );

  // Students for active class section sorted by roll
  const classStudents = useMemo(
    () =>
      students
        .filter(
          (s) =>
            s.classSectionId === selectedAttendanceClassSectionId && s.status === 'active'
        )
        .sort((a, b) => a.roll - b.roll),
    [students, selectedAttendanceClassSectionId]
  );

  const existingRecordForDate = useMemo(
    () =>
      attendanceRecords.find(
        (r) =>
          r.classSectionId === selectedAttendanceClassSectionId && r.date === selectedDate
      ) || null,
    [attendanceRecords, selectedAttendanceClassSectionId, selectedDate]
  );

  useEffect(() => {
    if (existingRecordForDate) {
      setAbsentRollSet(parseAbsentRollsSet(existingRecordForDate.absentRolls));
    } else {
      setAbsentRollSet(new Set());
    }
    setLateRollSet(new Set());
    setSaveMessage('');
  }, [existingRecordForDate, selectedDate, selectedAttendanceClassSectionId]);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.roll).includes(q)
    );
  }, [classStudents, searchQuery]);

  const setStudentStatus = (roll: number, status: 'P' | 'A' | 'L') => {
    if (!canEditSelectedClass) return;
    if (status === 'P') {
      setAbsentRollSet((prev) => {
        const next = new Set(prev);
        next.delete(roll);
        return next;
      });
      setLateRollSet((prev) => {
        const next = new Set(prev);
        next.delete(roll);
        return next;
      });
    } else if (status === 'A') {
      setAbsentRollSet((prev) => {
        const next = new Set(prev);
        next.add(roll);
        return next;
      });
      setLateRollSet((prev) => {
        const next = new Set(prev);
        next.delete(roll);
        return next;
      });
    } else {
      setAbsentRollSet((prev) => {
        const next = new Set(prev);
        next.delete(roll);
        return next;
      });
      setLateRollSet((prev) => {
        const next = new Set(prev);
        if (next.has(roll)) next.delete(roll);
        else next.add(roll);
        return next;
      });
    }
    setSaveMessage('');
  };

  const handleMarkAllPresent = () => {
    if (!canEditSelectedClass) return;
    setAbsentRollSet(new Set());
    setLateRollSet(new Set());
    setSaveMessage(
      'সবাইকে উপস্থিত (Present) হিসেবে চিহ্নিত করা হয়েছে। সংরক্ষণ করতে Save বাটনে চাপুন।'
    );
  };

  const handleMarkAllAbsent = () => {
    if (!canEditSelectedClass) return;
    setAbsentRollSet(new Set(classStudents.map((s) => s.roll)));
    setLateRollSet(new Set());
    setSaveMessage('');
  };

  const totalStudentsCount = classStudents.length;
  const absentCount = useMemo(
    () => classStudents.filter((s) => absentRollSet.has(s.roll)).length,
    [classStudents, absentRollSet]
  );
  const presentCount = Math.max(0, totalStudentsCount - absentCount);
  const dailyPercentage =
    totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0;

  const handleSaveAndSync = async () => {
    if (!activeSection || !canEditSelectedClass) return;
    const serialized = serializeAbsentRolls(absentRollSet);
    await saveAttendanceRecord({
      classSectionId: activeSection.id,
      date: selectedDate,
      presentCount,
      absentCount,
      absentRolls: serialized,
    });
    setSaveMessage(
      `✓ হাজিরা সফলভাবে সংরক্ষিত হয়েছে (${activeSection.className}-${activeSection.section}, তারিখ: ${selectedDate}) — উপস্থিত: ${presentCount}, অনুপস্থিত: ${absentCount}`
    );
  };

  const handleResetDayRecord = async () => {
    if (!activeSection || !canEditSelectedClass) return;
    await clearAttendanceForDate(activeSection.id, selectedDate);
    setAbsentRollSet(new Set());
    setLateRollSet(new Set());
    setSaveMessage(`রিসেট সম্পন্ন হয়েছে (${selectedDate})।`);
  };

  const classAttendanceRecords = useMemo(
    () =>
      attendanceRecords.filter(
        (r) => r.classSectionId === selectedAttendanceClassSectionId
      ),
    [attendanceRecords, selectedAttendanceClassSectionId]
  );

  const monthlyAnalytics = useMemo(
    () =>
      computeClassAttendanceAnalytics({
        students: classStudents,
        classRecords: classAttendanceRecords,
        cutoffDate,
        holidays,
        finePerAbsentDay,
      }),
    [classStudents, classAttendanceRecords, cutoffDate, holidays, finePerAbsentDay]
  );

  const filteredMonthlyStudentStats = useMemo(() => {
    return monthlyAnalytics.studentStats.filter((st: StudentAttendanceStat) => {
      if (statusFilter === 'LOW' && !st.isLowAttendance) return false;
      if (statusFilter === 'OK' && st.isLowAttendance) return false;
      const q = summarySearchQuery.trim().toLowerCase();
      if (!q) return true;
      return st.name.toLowerCase().includes(q) || String(st.roll).includes(q);
    });
  }, [monthlyAnalytics.studentStats, statusFilter, summarySearchQuery]);

  const activeModalStudentStat = useMemo(() => {
    if (!selectedStudentDetail) return null;
    return (
      monthlyAnalytics.studentStats.find(
        (s: StudentAttendanceStat) => s.studentId === selectedStudentDetail.studentId
      ) || null
    );
  }, [selectedStudentDetail, monthlyAnalytics.studentStats]);

  const recordedDatesForHolidayModal = useMemo(() => {
    const dates = Array.from(new Set(classAttendanceRecords.map((r) => r.date))).sort();
    return dates;
  }, [classAttendanceRecords]);

  const handleExportCsv = () => {
    if (!activeSection) return;
    const csvContent = generateAttendanceReportCsv({
      classSection: activeSection,
      academicYearLabel: activeYear?.label || 'Session 2026',
      cutoffDate,
      finePerAbsentDay,
      analytics: monthlyAnalytics,
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Attendance_${activeSection.className}_${activeSection.section}_${cutoffDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyAbsentees = async () => {
    if (!activeSection) return;
    const absentStudentsList = classStudents
      .filter((s) => absentRollSet.has(s.roll))
      .map((s) => `• রোল ${num(s.roll)}: ${s.name}`)
      .join('\n');

    const summaryText = [
      `🏫 আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়`,
      `📅 তারিখ: ${selectedDate}`,
      `📌 শ্রেণি: ${activeSection.className} — শাখা: ${activeSection.section}`,
      `👥 মোট শিক্ষার্থী: ${num(totalStudentsCount)} জন`,
      `✅ উপস্থিত: ${num(presentCount)} জন (${num(dailyPercentage)}%)`,
      `❌ অনুপস্থিত: ${num(absentCount)} জন`,
      absentCount > 0
        ? `\n📋 অনুপস্থিত শিক্ষার্থীদের তালিকা:\n${absentStudentsList}`
        : '\n🎉 আলহামদুলিল্লাহ, আজ ক্লাসে সবাই উপস্থিত!',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedAbsentees(true);
      setTimeout(() => setCopiedAbsentees(false), 3000);
    } catch {
      // ignore
    }
  };

  if (permittedSections.length === 0) {
    return (
      <div
        data-testid="attendance-strict-lock-card"
        className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-8 text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
          <UserX className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          হাজিরা গ্রহণ ও পরিদর্শন শুধুমাত্র নির্ধারিত শ্রেণি শিক্ষকের জন্য সংরক্ষিত
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          বিদ্যালয়ের নিয়ম অনুযায়ী শুধুমাত্র সংশ্লিষ্ট শাখার নির্ধারিত শ্রেণি শিক্ষক (১ম পিরিয়ডের শিক্ষক), প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক এবং অ্যাডমিন হাজিরা গ্রহণ ও জমা দিতে পারবেন। আপনার প্রোফাইল ({currentUser.nameBn || currentUser.name} [{currentUser.teacherCode}]) বর্তমানে কোনো শাখার শ্রেণি শিক্ষক হিসেবে নিযুক্ত নয়।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Single Compact Sticky Toolbar */}
      <div className="sticky top-14 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Sub-tabs & Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sub-tab Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setActiveSubTab('take-attendance')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeSubTab === 'take-attendance'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                দৈনিক হাজিরা
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('summary-dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeSubTab === 'summary-dashboard'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                মাসিক রিপোর্ট
              </button>
            </div>

            {/* Class / Section Pill (Strictly filtered to permittedSections) */}
            <select
              id="att-class-select"
              value={selectedAttendanceClassSectionId}
              onChange={(e) => setSelectedAttendanceClassSectionId(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
            >
              {permittedSections.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.className} ({cs.section}) — {isReviewer ? `CT: ${cs.classTeacherCode}` : 'শ্রেণি শিক্ষক ✓'}
                </option>
              ))}
            </select>

            {/* Date Picker Pill */}
            {activeSubTab === 'take-attendance' ? (
              <input
                id="att-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            ) : (
              <input
                id="att-cutoff-input"
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                title="হিসাবের শেষ তারিখ"
                className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            )}

            {!canEditSelectedClass && (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md">
                রিড-অনলি
              </span>
            )}
          </div>

          {/* Right: Quick Counters, Search & Mark All */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSubTab === 'take-attendance' && (
              <>
                <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    মোট: {num(totalStudentsCount)}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
                    উপস্থিত: {num(presentCount)} ({num(dailyPercentage)}%)
                  </span>
                  <span className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80">
                    অনুপস্থিত: {num(absentCount)}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="রোল বা নাম..."
                    className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-7 pr-2.5 py-1.5 w-32 sm:w-40 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={!canEditSelectedClass}
                  onClick={handleMarkAllPresent}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                  title="সবাই উপস্থিত চিহ্নিত করুন"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">সবাই উপস্থিত</span>
                </button>

                {existingRecordForDate && canEditSelectedClass && (
                  <button
                    type="button"
                    onClick={handleResetDayRecord}
                    title="রিসেট"
                    className="p-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DAILY ATTENDANCE TAKING UI */}
      {activeSubTab === 'take-attendance' && (
        <div className="space-y-4">
          {saveMessage && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-4 py-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* MOBILE CARD VIEW (< 768px, md:hidden) — 60px x 60px touch targets */}
          <div className="md:hidden space-y-2.5">
            {filteredRoster.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
                কোনো শিক্ষার্থী পাওয়া যায়নি।
              </div>
            ) : (
              filteredRoster.map((student) => {
                const isAbsent = absentRollSet.has(student.roll);
                const isLate = lateRollSet.has(student.roll);
                const isPresent = !isAbsent && !isLate;

                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isAbsent
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
                        : isLate
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-bold tabular-nums shrink-0 border ${
                          isAbsent
                            ? 'bg-rose-600 text-white border-rose-700'
                            : isLate
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                        }`}
                      >
                        <span className="text-[9px] uppercase leading-none opacity-80">Roll</span>
                        <span className="text-sm leading-tight">
                          {num(String(student.roll).padStart(2, '0'))}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{student.group}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              isAbsent
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLate
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isAbsent
                              ? 'অনুপস্থিত (Absent)'
                              : isLate
                              ? 'বিলম্ব (Late)'
                              : 'উপস্থিত (Present)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Large Pill Buttons (P, A — minimum 60px x 60px tap target) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={!canEditSelectedClass}
                        onClick={() => setStudentStatus(student.roll, 'P')}
                        aria-label={`Mark Roll ${student.roll} Present`}
                        className={`min-w-[60px] min-h-[60px] rounded-xl font-bold text-sm flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className="text-base font-extrabold leading-none">P</span>
                        <span className="text-[10px] mt-1 font-medium">উপস্থিত</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canEditSelectedClass}
                        onClick={() => setStudentStatus(student.roll, 'A')}
                        aria-label={`Mark Roll ${student.roll} Absent`}
                        className={`min-w-[60px] min-h-[60px] rounded-xl font-bold text-sm flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                          isAbsent
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className="text-base font-extrabold leading-none">A</span>
                        <span className="text-[10px] mt-1 font-medium">অনুপস্থিত</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (>= 768px, hidden md:block) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 w-24">রোল (Roll)</th>
                    <th className="py-3.5 px-4">শিক্ষার্থীর নাম (Student Name)</th>
                    <th className="py-3.5 px-4">বিভাগ (Group)</th>
                    <th className="py-3.5 px-4">অভিভাবকের মোবাইল</th>
                    <th className="py-3.5 px-4 text-center">বর্তমান অবস্থা</th>
                    <th className="py-3.5 px-4 text-right">দ্রুত টগল (P / A / Late)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        এই শাখায় কোনো শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((student) => {
                      const isAbsent = absentRollSet.has(student.roll);
                      const isLate = lateRollSet.has(student.roll);
                      const isPresent = !isAbsent && !isLate;
                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            isAbsent
                              ? 'bg-rose-50/60 dark:bg-rose-950/25'
                              : isLate
                              ? 'bg-amber-50/50 dark:bg-amber-950/20'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                            #{num(String(student.roll).padStart(2, '0'))}
                          </td>
                          <td className="py-3 px-4 font-bold text-sm text-slate-900 dark:text-white">
                            {student.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {student.group}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                            {student.guardianPhone || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAbsent ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                অনুপস্থিত (Absent)
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                বিলম্ব (Late)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                উপস্থিত (Present)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={!canEditSelectedClass}
                                onClick={() => setStudentStatus(student.roll, 'P')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                P (উপস্থিত)
                              </button>
                              <button
                                type="button"
                                disabled={!canEditSelectedClass}
                                onClick={() => setStudentStatus(student.roll, 'A')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                A (অনুপস্থিত)
                              </button>
                              <button
                                type="button"
                                disabled={!canEditSelectedClass}
                                onClick={() => setStudentStatus(student.roll, 'L')}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                                  isLate
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Floating Action Bar */}
          <div className="no-print fixed bottom-20 lg:bottom-4 left-0 right-0 lg:left-60 z-30 px-4 pointer-events-none">
            <div className="max-w-4xl mx-auto backdrop-blur-md bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-xl border border-teal-500/40 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
              <div className="text-xs sm:text-sm flex items-center gap-2 sm:gap-3 tabular-nums">
                <span className="font-bold text-teal-300">
                  {activeSection?.className} ({activeSection?.section})
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  উপস্থিত: <strong className="text-emerald-400">{num(presentCount)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  অনুপস্থিত: <strong className="text-rose-400">{num(absentCount)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAbsentees}
                  disabled={totalStudentsCount === 0}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                  title="হোয়াটসঅ্যাপ বা মেসেঞ্জার গ্রুপের জন্য অনুপস্থিত তালিকা কপি করুন"
                >
                  {copiedAbsentees ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-teal-400" />
                      <span>অনুপস্থিত তালিকা কপি</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!canEditSelectedClass || totalStudentsCount === 0}
                  onClick={handleSaveAndSync}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>হাজিরা সংরক্ষণ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ATTENDANCE SUMMARY DASHBOARD & EXPORT */}
      {activeSubTab === 'summary-dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">মোট কার্যদিবস</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {num(monthlyAnalytics.totalSchoolDaysCounted)} দিন
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Cutoff: {formatCutoffDisplay(cutoffDate)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">শ্রেণির গড় উপস্থিতি</div>
              <div className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
                {num(monthlyAnalytics.classAvgPct.toFixed(1))}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                মোট শিক্ষার্থী: {num(monthlyAnalytics.totalStudents)} জন
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">মোট উপস্থিত / অনুপস্থিত</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {num(monthlyAnalytics.totalClassPresent)}{' '}
                <span className="text-sm font-normal text-rose-600 dark:text-rose-400">
                  / {num(monthlyAnalytics.totalClassAbsent)} A
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                সর্বমোট হাজিরা গণনা
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                কম উপস্থিতি (&lt; ৭৫%)
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {num(monthlyAnalytics.lowAttendanceCount)} জন
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ধারাবাহিক অনুপস্থিত: {num(monthlyAnalytics.consecutiveAbsenceCount)} জন
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">মোট জরিমানা হিসাব</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                ৳{num(monthlyAnalytics.totalClassDueFine)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                হার: ৳{num(finePerAbsentDay)} / অনুপস্থিত দিন
              </div>
            </div>
          </div>

          {monthlyAnalytics.lowAttendanceCount > 0 && (
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                  <div className="font-bold">
                    সতর্কবার্তা: {num(monthlyAnalytics.lowAttendanceCount)} জন শিক্ষার্থীর উপস্থিতি
                    ৭৫% এর নিচে রয়েছে
                  </div>
                  <div>
                    নিম্নলিখিত রোল নম্বরগুলোর উপস্থিতি কম:{' '}
                    <span className="font-mono font-semibold">
                      {monthlyAnalytics.studentStats
                        .filter((s: StudentAttendanceStat) => s.isLowAttendance)
                        .map((s: StudentAttendanceStat) => `#${s.roll} (${s.name})`)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 hover:bg-amber-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {statusFilter === 'LOW' ? 'সকল শিক্ষার্থী দেখুন' : 'শুধু কম উপস্থিতি দেখুন'}
              </button>
            </div>
          )}

          {/* Monthly Student Attendance Percentage Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  মাসিক শিক্ষার্থী হাজিরা শতকরা টেবিল — {activeSection?.className} (
                  {activeSection?.section})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  যেকোনো শিক্ষার্থীর রো-তে ক্লিক করে দিনভিত্তিক হাজিরা দেখুন ও সম্পাদনা করুন।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="fine-rate-input"
                    className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
                  >
                    Fine/Day (৳):
                  </label>
                  <input
                    id="fine-rate-input"
                    type="number"
                    min={0}
                    max={5000}
                    value={finePerAbsentDay}
                    onChange={(e) => setFinePerAbsentDay(Number(e.target.value))}
                    className="w-16 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2 py-1.5 tabular-nums"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowHolidayCalendarModal(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>ছুটির দিন ({num(holidays.length)})</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-[#0d5c56] text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'OK', 'LOW'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st === 'ALL'
                      ? `সকল (${num(monthlyAnalytics.studentStats.length)})`
                      : st === 'OK'
                      ? `স্বাভাবিক ≥ ৭৫% (${num(
                          monthlyAnalytics.studentStats.length - monthlyAnalytics.lowAttendanceCount
                        )})`
                      : `কম উপস্থিতি < ৭৫% (${num(monthlyAnalytics.lowAttendanceCount)})`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={summarySearchQuery}
                  onChange={(e) => setSummarySearchQuery(e.target.value)}
                  placeholder="রোল বা নাম দিয়ে ফিল্টার..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-8 pr-3 py-1.5"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">রোল</th>
                    <th className="py-2.5 px-3">শিক্ষার্থীর নাম</th>
                    {monthlyAnalytics.activeMonths.map((ym) => (
                      <th key={ym} className="py-2.5 px-2.5 text-right">
                        {formatShortMonth(ym)} (A)
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right">উপস্থিত (P)</th>
                    <th className="py-2.5 px-3 text-right">অনুপস্থিত (A)</th>
                    <th className="py-2.5 px-3 text-right">উপস্থিতির হার</th>
                    <th className="py-2.5 px-3 text-right">জরিমানা (৳)</th>
                    <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                  {filteredMonthlyStudentStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7 + monthlyAnalytics.activeMonths.length}
                        className="py-6 text-center text-slate-500 dark:text-slate-400"
                      >
                        কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyStudentStats.map((stat: StudentAttendanceStat) => (
                      <tr
                        key={stat.studentId}
                        onClick={() => setSelectedStudentDetail(stat)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          #{num(String(stat.roll).padStart(2, '0'))}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {stat.name}
                        </td>
                        {monthlyAnalytics.activeMonths.map((ym) => (
                          <td
                            key={ym}
                            className="py-2.5 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums"
                          >
                            {num(stat.monthlyAbsent[ym] || 0)}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {num(stat.presentCount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                          {num(stat.absentCount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                          <span
                            className={
                              stat.isLowAttendance
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-teal-700 dark:text-teal-400'
                            }
                          >
                            {num(stat.percentage.toFixed(1))}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          ৳{num(stat.dueFine)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {stat.isLowAttendance ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                              {stat.statusText}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              {stat.statusText}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student Monthly Drill-Down Modal */}
      {activeModalStudentStat && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  #{num(activeModalStudentStat.roll)} · {activeModalStudentStat.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  উপস্থিতির হার:{' '}
                  <strong className="text-teal-700 dark:text-teal-400 tabular-nums">
                    {num(activeModalStudentStat.percentage.toFixed(1))}%
                  </strong>{' '}
                  (উপস্থিত: {num(activeModalStudentStat.presentCount)}, অনুপস্থিত:{' '}
                  {num(activeModalStudentStat.absentCount)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeModalStudentStat.records.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  কোনো হাজিরার রেকর্ড নেই।
                </p>
              ) : (
                activeModalStudentStat.records.map((log) => (
                  <div
                    key={log.date}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs"
                  >
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                      {log.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          log.status === 'P'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {log.status === 'P' ? 'Present' : 'Absent'}
                      </span>
                      {canEditSelectedClass && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleStudentAttendanceOnDate(
                              selectedAttendanceClassSectionId,
                              log.date,
                              activeModalStudentStat.roll
                            )
                          }
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Toggle P/A
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Holiday Calendar Modal */}
      {showHolidayCalendarModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  ছুটির ক্যালেন্ডার (Holiday Exclusions)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  শুক্র ও শনিবার সাপ্তাহিক ছুটি। যেকোনো তারিখকে ছুটির দিন হিসেবে বাদ দিতে টগল করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHolidayCalendarModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {recordedDatesForHolidayModal.map((dateStr) => {
                const isWknd = isWeekendDate(dateStr);
                const isHoliday = holidays.includes(dateStr);
                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isWknd}
                    onClick={() => toggleHolidayDate(dateStr)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      isWknd || isHoliday
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-mono font-bold tabular-nums">{dateStr}</div>
                    <div className="text-[11px] opacity-80">
                      {isWknd ? 'Weekend' : isHoliday ? 'Holiday (Excluded)' : 'Working Day'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
