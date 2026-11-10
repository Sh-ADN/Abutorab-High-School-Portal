import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Globe,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  ALL_ROUTINE_CLASS_CODES,
  computeTeacherStatistics,
  DAYS_CONFIG,
  ExpandedRoutineEntry,
  expandRoutineRecordsToEntries,
  formatDaysExpressionLabel,
  getRoutineDayForDate,
  isClassMatch,
  LIVE_ROUTINE_APPS_SCRIPT_URL,
  normalizeTeacherCodeKey,
  parseLiveMasterGridToRoutineRecords,
  PERIOD_SCHEDULE,
  resolveRoutineTeacherCodeForUser,
  ROUTINE_TEACHER_DIRECTORY,
  SEED_ROUTINE_RECORDS,
} from '../utils/routineAndStatsLogic';

type RoutineSubTab = 'routine' | 'statistics' | 'live-sync';

export const SchoolRoutineModule: React.FC = () => {
  const {
    currentUser,
    routineRecords,
    replaceRoutineRecords,
    saveRoutineRecord,
    seedFirestoreDefaults,
    isFirebaseAuthenticated,
    num,
  } = useSchool();

  const [activeSubTab, setActiveSubTab] = useState<RoutineSubTab>('routine');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract distinct teacher codes from active routineRecords
  const availableTeachers = useMemo(() => {
    const set = new Set<string>();
    routineRecords.forEach((r) => {
      if (r.teacher.trim()) set.add(r.teacher.trim());
    });
    return Array.from(set);
  }, [routineRecords]);

  const myRoutineTeacherCode = useMemo(
    () => resolveRoutineTeacherCodeForUser(currentUser, availableTeachers),
    [currentUser, availableTeachers]
  );

  // Filters for Interactive Routine Viewer
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Teacher Workload Statistics State (Replicating TeacherStatistics.kt)
  const [statsTeacherCode, setStatsTeacherCode] = useState<string>(() => myRoutineTeacherCode);
  const [isStatsCardExpanded, setIsStatsCardExpanded] = useState<boolean>(true);

  // Admin Add Routine Entry Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDays, setNewDays] = useState<string>('(2-6)');
  const [newClassName, setNewClassName] = useState<string>('IX-A');
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [newSubject, setNewSubject] = useState<string>('Math');
  const [newTeacher, setNewTeacher] = useState<string>('A.D.N.');

  // Live Google Apps Script JSON & Web View State
  const [liveSyncLoading, setLiveSyncLoading] = useState<boolean>(false);
  const [liveSyncError, setLiveSyncError] = useState<string | null>(null);
  const [liveFetchedPayload, setLiveFetchedPayload] = useState<{
    teachers: string[];
    masterGrid: string[][];
    fetchedAt: string;
    parsedCount: number;
  } | null>(null);
  const [showEmbeddedWebView, setShowEmbeddedWebView] = useState<boolean>(true);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const todayInfo = useMemo(() => getRoutineDayForDate(new Date()), []);

  // Expand RoutineRecord[] into daily ExpandedRoutineEntry[]
  const allExpandedEntries = useMemo(
    () => expandRoutineRecordsToEntries(routineRecords),
    [routineRecords]
  );

  // Filtered daily entries for Interactive Routine Viewer
  const filteredExpandedEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allExpandedEntries.filter((entry) => {
      if (selectedClassFilter !== 'ALL' && !isClassMatch(entry.className, selectedClassFilter)) {
        return false;
      }
      if (
        selectedTeacherFilter !== 'ALL' &&
        normalizeTeacherCodeKey(entry.teacher) !== normalizeTeacherCodeKey(selectedTeacherFilter)
      ) {
        return false;
      }
      if (selectedDayFilter !== 'ALL' && entry.day !== selectedDayFilter) {
        return false;
      }
      if (selectedPeriodFilter !== 'ALL' && entry.period !== selectedPeriodFilter) {
        return false;
      }
      if (q) {
        const teacherLabel = ROUTINE_TEACHER_DIRECTORY[entry.teacher] || entry.teacher;
        const hay =
          `${entry.className} ${entry.subject} ${entry.teacher} ${teacherLabel} ${entry.dayName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allExpandedEntries,
    selectedClassFilter,
    selectedTeacherFilter,
    selectedDayFilter,
    selectedPeriodFilter,
    searchQuery,
  ]);

  // Filtered raw RoutineRecords for the compact schedule table
  const filteredRoutineRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routineRecords.filter((rec) => {
      if (selectedClassFilter !== 'ALL' && !isClassMatch(rec.className, selectedClassFilter)) {
        return false;
      }
      if (
        selectedTeacherFilter !== 'ALL' &&
        normalizeTeacherCodeKey(rec.teacher) !== normalizeTeacherCodeKey(selectedTeacherFilter)
      ) {
        return false;
      }
      if (selectedPeriodFilter !== 'ALL' && rec.period !== selectedPeriodFilter) {
        return false;
      }
      if (selectedDayFilter !== 'ALL') {
        const hasDay = allExpandedEntries.some(
          (e) => e.recordId === rec.id && e.day === selectedDayFilter
        );
        if (!hasDay) return false;
      }
      if (q) {
        const teacherLabel = ROUTINE_TEACHER_DIRECTORY[rec.teacher] || rec.teacher;
        const hay = `${rec.className} ${rec.subject} ${rec.teacher} ${teacherLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    routineRecords,
    allExpandedEntries,
    selectedClassFilter,
    selectedTeacherFilter,
    selectedDayFilter,
    selectedPeriodFilter,
    searchQuery,
  ]);

  // Selected Teacher Statistics (TeacherStatistics.kt)
  const effectiveStatsTeacher = useMemo(() => {
    if (
      statsTeacherCode &&
      availableTeachers.some(
        (t) => normalizeTeacherCodeKey(t) === normalizeTeacherCodeKey(statsTeacherCode)
      )
    ) {
      return (
        availableTeachers.find(
          (t) => normalizeTeacherCodeKey(t) === normalizeTeacherCodeKey(statsTeacherCode)
        ) || statsTeacherCode
      );
    }
    return myRoutineTeacherCode;
  }, [statsTeacherCode, availableTeachers, myRoutineTeacherCode]);

  const selectedTeacherStats = useMemo(() => {
    const entriesForTeacher = allExpandedEntries.filter(
      (e) => normalizeTeacherCodeKey(e.teacher) === normalizeTeacherCodeKey(effectiveStatsTeacher)
    );
    return computeTeacherStatistics(
      entriesForTeacher,
      effectiveStatsTeacher,
      ROUTINE_TEACHER_DIRECTORY[effectiveStatsTeacher] || effectiveStatsTeacher
    );
  }, [allExpandedEntries, effectiveStatsTeacher]);

  // All-Teachers Workload Ranking Matrix
  const allTeachersStatsList = useMemo(() => {
    return availableTeachers
      .map((code) => {
        const entries = allExpandedEntries.filter(
          (e) => normalizeTeacherCodeKey(e.teacher) === normalizeTeacherCodeKey(code)
        );
        return computeTeacherStatistics(
          entries,
          code,
          ROUTINE_TEACHER_DIRECTORY[code] || code
        );
      })
      .sort((a, b) => b.totalClasses - a.totalClasses);
  }, [availableTeachers, allExpandedEntries]);

  // Live Google Apps Script Fetch & Sync Handler
  const handleFetchAndSyncLiveRoutine = async () => {
    setLiveSyncLoading(true);
    setLiveSyncError(null);
    try {
      const res = await fetch('/api/routine/live');
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed with status ${res.status}`);
      }
      const parsedRecords = parseLiveMasterGridToRoutineRecords({
        teachers: data.teachers,
        masterGrid: data.masterGrid,
      });

      if (parsedRecords.length === 0) {
        throw new Error('Live endpoint returned an empty routine grid.');
      }

      setLiveFetchedPayload({
        teachers: data.teachers || [],
        masterGrid: data.masterGrid || [],
        fetchedAt: data.fetchedAt || new Date().toISOString(),
        parsedCount: parsedRecords.length,
      });

      await replaceRoutineRecords(parsedRecords);
      notify(
        `Synced ${parsedRecords.length} live routine records (${(data.teachers || []).length} teachers) from Google Apps Script to Firestore.`
      );
    } catch (err: any) {
      setLiveSyncError(err?.message || 'Unable to fetch live routine from Google Apps Script.');
    } finally {
      setLiveSyncLoading(false);
    }
  };

  const handleResetToAttachedRoutineJson = async () => {
    await replaceRoutineRecords(SEED_ROUTINE_RECORDS);
    notify(
      `Restored ${SEED_ROUTINE_RECORDS.length} routine records from attached routine.json into active workspace.`
    );
  };

  const handleAddRoutineRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newSubject.trim() || !newTeacher.trim()) return;
    await saveRoutineRecord({
      id: `rt_custom_${Date.now()}`,
      days: newDays.trim() || '(2-6)',
      className: newClassName.trim().toUpperCase(),
      period: newPeriod,
      subject: newSubject.trim(),
      teacher: newTeacher.trim(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddModal(false);
    notify(
      `Added routine entry: ${newClassName.toUpperCase()} · Period ${newPeriod} · ${newSubject} (${newTeacher})`
    );
  };

  const handleExportRoutineCsv = () => {
    const headers = ['ID', 'Days', 'Days_Label', 'Class_Section', 'Period', 'Time', 'Subject', 'Teacher'];
    const rows = filteredRoutineRecords.map((r) => {
      const pInfo = PERIOD_SCHEDULE.find((p) => p.period === r.period);
      return [
        r.id,
        `"${r.days}"`,
        `"${formatDaysExpressionLabel(r.days)}"`,
        `"${r.className}"`,
        r.period,
        `"${pInfo?.timeRange || ''}"`,
        `"${r.subject}"`,
        `"${r.teacher}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATHS_Routine_${selectedClassFilter}_${selectedTeacherFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported filtered routine CSV.');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2 print:hidden"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Module Header & Sub-Navigation Tabs */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Abu Torab High School · Academic Timetable & Workload Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              School Routine & Teacher Workload Statistics (ক্লাস রুটিন ও শিক্ষক পরিসংখ্যান)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Interactive routine viewer powered by <span className="font-mono">routine.json</span>,{' '}
              <span className="font-mono">ClassUtils.kt</span>,{' '}
              <span className="font-mono">TeacherStatistics.kt</span>, and live Google Apps Script
              sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedTeacherFilter(myRoutineTeacherCode);
                setSelectedClassFilter('ALL');
                setActiveSubTab('routine');
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Routine ({myRoutineTeacherCode})</span>
            </button>

            <button
              type="button"
              onClick={handleExportRoutineCsv}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Routine</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal((prev) => !prev)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-600 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs */}
        <div
          role="tablist"
          aria-label="Routine and Statistics Views"
          className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'routine'}
            onClick={() => setActiveSubTab('routine')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'routine'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Interactive Routine Viewer ({num(routineRecords.length)})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'statistics'}
            onClick={() => setActiveSubTab('statistics')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'statistics'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>2. Teacher Workload Statistics (TeacherStatistics.kt)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'live-sync'}
            onClick={() => setActiveSubTab('live-sync')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'live-sync'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3. Live Routine Update & Web View</span>
          </button>
        </div>

        {/* Optional Admin Add Routine Entry Form */}
        {showAddModal && isAdmin && (
          <form
            onSubmit={handleAddRoutineRecord}
            className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label
                htmlFor="new-rt-class"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Class / Section
              </label>
              <input
                id="new-rt-class"
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. IX-A or X"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="new-rt-days"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Days (2=Sun..6=Thu)
              </label>
              <input
                id="new-rt-days"
                type="text"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                placeholder="(2-6)"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="new-rt-period"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Period (1–7)
              </label>
              <select
                id="new-rt-period"
                value={newPeriod}
                onChange={(e) => setNewPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {PERIOD_SCHEDULE.map((p) => (
                  <option key={p.period} value={p.period}>
                    {p.label} ({p.timeRange})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="new-rt-subject"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Subject
              </label>
              <input
                id="new-rt-subject"
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Math, Eng-1"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="new-rt-teacher"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Teacher Code
              </label>
              <input
                id="new-rt-teacher"
                type="text"
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
                placeholder="e.g. A.D.N."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              >
                Save Entry
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* =====================================================================
          TAB 1: INTERACTIVE ROUTINE VIEWER
      ===================================================================== */}
      {activeSubTab === 'routine' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <section
            aria-label="Routine Filters"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 print:hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Filter className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>
                  Filter by Class/Section (ClassUtils.isClassMatch), Teacher Code, Day of Week &
                  Period
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayFilter(todayInfo.dayNumber);
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 cursor-pointer"
                >
                  Today ({todayInfo.dayConfig.name})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassFilter('ALL');
                    setSelectedTeacherFilter('ALL');
                    setSelectedDayFilter('ALL');
                    setSelectedPeriodFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. Class/Section Filter */}
              <div>
                <label
                  htmlFor="routine-class-filter"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Class / Section
                </label>
                <select
                  id="routine-class-filter"
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Classes (VI–X)</option>
                  {ALL_ROUTINE_CLASS_CODES.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls} (Includes shared {cls.split('-')[0]})
                    </option>
                  ))}
                  <option value="VI">Class VI (All)</option>
                  <option value="VII">Class VII (All)</option>
                  <option value="VIII">Class VIII (All)</option>
                  <option value="IX">Class IX (All)</option>
                  <option value="X">Class X (All)</option>
                </select>
              </div>

              {/* 2. Teacher Filter */}
              <div>
                <label
                  htmlFor="routine-teacher-filter"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Teacher (teacherCode)
                </label>
                <select
                  id="routine-teacher-filter"
                  value={selectedTeacherFilter}
                  onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Teachers ({num(availableTeachers.length)})</option>
                  {availableTeachers.map((code) => (
                    <option key={code} value={code}>
                      {code} — {ROUTINE_TEACHER_DIRECTORY[code] || code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Day of Week Filter */}
              <div>
                <label
                  htmlFor="routine-day-filter"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Day of Week
                </label>
                <select
                  id="routine-day-filter"
                  value={selectedDayFilter}
                  onChange={(e) =>
                    setSelectedDayFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Working Days (Sun–Thu)</option>
                  {DAYS_CONFIG.map((d) => (
                    <option key={d.day} value={d.day}>
                      {d.name} ({d.bengaliName}) [Day {d.day}]
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Period Filter */}
              <div>
                <label
                  htmlFor="routine-period-filter"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Period
                </label>
                <select
                  id="routine-period-filter"
                  value={selectedPeriodFilter}
                  onChange={(e) =>
                    setSelectedPeriodFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Periods (1st–7th)</option>
                  {PERIOD_SCHEDULE.map((p) => (
                    <option key={p.period} value={p.period}>
                      {p.label} ({p.timeRange})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Keyword Search */}
              <div>
                <label
                  htmlFor="routine-search-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Search Subject / Teacher
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="routine-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Math, Religion, A.D.N."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Weekly Timetable Matrix Grid (Days x Periods with Tiffin Break) */}
          <section
            aria-label="Weekly Timetable Grid"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Weekly Timetable Matrix —{' '}
                  {selectedClassFilter !== 'ALL' ? `Class ${selectedClassFilter}` : 'All Classes'} ·{' '}
                  {selectedTeacherFilter !== 'ALL'
                    ? `Teacher ${selectedTeacherFilter}`
                    : 'All Faculty'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  1st Period is {num(45)} mins (10:00–10:45); 2nd–7th Periods are {num(40)} mins
                  each with Tiffin Break after 4th Period.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                Matching Weekly Class Slots: {num(filteredExpandedEntries.length)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-3 w-32 border-r border-slate-200 dark:border-slate-800">
                      Day / Period
                    </th>
                    {PERIOD_SCHEDULE.slice(0, 4).map((p) => (
                      <th
                        key={p.period}
                        className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-800"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">{p.label}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                          {p.timeRange} ({num(p.durationMinutes)}m)
                        </div>
                      </th>
                    ))}
                    {/* Tiffin Break Column */}
                    <th className="py-2.5 px-2 w-20 text-center bg-amber-50/70 dark:bg-amber-950/30 border-r border-slate-200 dark:border-slate-800 text-amber-800 dark:text-amber-300">
                      <div className="font-bold">Tiffin</div>
                      <div className="text-[10px] font-mono">12:45–01:15</div>
                    </th>
                    {PERIOD_SCHEDULE.slice(4).map((p) => (
                      <th
                        key={p.period}
                        className="py-2.5 px-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">{p.label}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                          {p.timeRange} ({num(p.durationMinutes)}m)
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {DAYS_CONFIG.filter(
                    (d) => selectedDayFilter === 'ALL' || d.day === selectedDayFilter
                  ).map((dayCfg) => {
                    const isTodayRow = dayCfg.day === todayInfo.dayNumber;

                    const renderPeriodCell = (periodNum: number) => {
                      if (
                        selectedPeriodFilter !== 'ALL' &&
                        selectedPeriodFilter !== periodNum
                      ) {
                        return (
                          <td
                            key={periodNum}
                            className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 text-slate-400 text-center"
                          >
                            —
                          </td>
                        );
                      }

                      const cellEntries: ExpandedRoutineEntry[] = filteredExpandedEntries.filter(
                        (e) => e.day === dayCfg.day && e.period === periodNum
                      );

                      return (
                        <td
                          key={periodNum}
                          className="p-2 align-top border-r last:border-r-0 border-slate-200 dark:border-slate-800"
                        >
                          {cellEntries.length === 0 ? (
                            <div className="text-slate-400 dark:text-slate-600 text-center py-2 font-mono">
                              Free
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                              {cellEntries.map((item, idx) => {
                                const isMySlot =
                                  normalizeTeacherCodeKey(item.teacher) ===
                                  normalizeTeacherCodeKey(myRoutineTeacherCode);
                                return (
                                  <div
                                    key={`${item.recordId}_${idx}`}
                                    className={`p-1.5 rounded border text-[11px] leading-tight ${
                                      isMySlot
                                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/50'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 font-bold text-slate-900 dark:text-white">
                                      <span>{item.subject}</span>
                                      <span className="font-mono text-[10px] text-blue-700 dark:text-blue-400">
                                        {item.className}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                      <span>{item.teacher}</span>
                                      <span>{item.daysRaw}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    };

                    return (
                      <tr
                        key={dayCfg.day}
                        className={
                          isTodayRow
                            ? 'bg-blue-50/20 dark:bg-blue-950/15'
                            : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                        }
                      >
                        <td className="p-3 font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-top">
                          <div className="flex items-center gap-1.5">
                            <span>{dayCfg.name}</span>
                            {isTodayRow && (
                              <span className="text-[10px] font-mono uppercase text-blue-700 dark:text-blue-400">
                                (Today)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {dayCfg.bengaliName} · Day {num(dayCfg.day)}
                          </div>
                        </td>
                        {[1, 2, 3, 4].map(renderPeriodCell)}
                        <td className="p-2 text-center align-middle bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-800 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                          Break
                        </td>
                        {[5, 6, 7].map(renderPeriodCell)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Compact Schedule Ledger Table */}
          <section
            aria-label="Routine Schedule Ledger"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Routine Records Ledger ({num(filteredRoutineRecords.length)} Entries)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct view of <span className="font-mono">routine.json</span> / Firestore{' '}
                  <span className="font-mono">routineEntries</span> matching your active filters.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <th className="py-2.5 px-3">Period & Bell Time</th>
                    <th className="py-2.5 px-3">Class / Section</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Teacher (teacherCode)</th>
                    <th className="py-2.5 px-3">Active Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredRoutineRecords
                    .slice()
                    .sort(
                      (a, b) =>
                        a.period - b.period ||
                        a.className.localeCompare(b.className) ||
                        a.teacher.localeCompare(b.teacher)
                    )
                    .map((rec) => {
                      const periodCfg = PERIOD_SCHEDULE.find((p) => p.period === rec.period);
                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-2.5 px-3 font-mono tabular-nums">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Period {num(rec.period)}
                            </span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">
                              ({periodCfg?.timeRange || '40m'})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                            {rec.className}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {rec.subject}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setStatsTeacherCode(rec.teacher);
                                setActiveSubTab('statistics');
                              }}
                              className="font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 underline decoration-dotted cursor-pointer"
                            >
                              {rec.teacher}
                            </button>
                            <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                              ({ROUTINE_TEACHER_DIRECTORY[rec.teacher] || 'Faculty'})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {formatDaysExpressionLabel(rec.days)}{' '}
                            <span className="text-slate-400">{rec.days}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: TEACHER WORKLOAD STATISTICS (Replicating TeacherStatistics.kt)
      ===================================================================== */}
      {activeSubTab === 'statistics' && (
        <div className="space-y-6">
          {/* Teacher Selector & Collapsible TeacherStatistics.kt Card */}
          <section
            aria-label="Teacher Statistics Card"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Teacher Statistics (শিক্ষক কর্মভার ও পিরিয়ড পরিসংখ্যান)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exact calculation rules from <span className="font-mono">TeacherStatistics.kt</span>
                  : 1st Period = {num(45)}m, 2nd–7th Periods = {num(40)}m, combined{' '}
                  <span className="font-mono">-1 &amp; 2</span> paper split, and gap-aware weekday
                  tie-breaking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="stats-teacher-select"
                  className="text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Select Teacher:
                </label>
                <select
                  id="stats-teacher-select"
                  value={effectiveStatsTeacher}
                  onChange={(e) => setStatsTeacherCode(e.target.value)}
                  className="px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {availableTeachers.map((code) => (
                    <option key={code} value={code}>
                      {code} — {ROUTINE_TEACHER_DIRECTORY[code] || code}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsStatsCardExpanded((prev) => !prev)}
                  aria-expanded={isStatsCardExpanded}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isStatsCardExpanded ? 'Collapse Card' : 'Expand Card'}</span>
                  {isStatsCardExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {isStatsCardExpanded && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 5 Cols: Exact 7 StatItems from TeacherStatistics.kt */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">
                        [{selectedTeacherStats.teacherCode}]
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedTeacherStats.teacherDisplayName}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherFilter(selectedTeacherStats.teacherCode);
                        setSelectedClassFilter('ALL');
                        setActiveSubTab('routine');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                    >
                      View Timetable
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200/80 dark:divide-slate-800 text-sm tabular-nums">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Total Classes</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {num(selectedTeacherStats.totalClasses)}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Total Teaching Hours
                      </span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {num(selectedTeacherStats.totalTeachingHoursStr)} (
                        {num(selectedTeacherStats.totalMinutes)} mins)
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Unique Subjects</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {num(selectedTeacherStats.uniqueSubjects)}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Unique Classes</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {num(selectedTeacherStats.uniqueClasses)} (
                        {selectedTeacherStats.uniqueClassesList.join(', ')})
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Average Classes per Day
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {num(selectedTeacherStats.averageClasses)}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Busiest Weekday</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {num(selectedTeacherStats.busiestWeekdayStr)}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Least Busy Weekday</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {num(selectedTeacherStats.leastBusyWeekdayStr)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right 7 Cols: Daily Period Distribution & Gap Analysis */}
                <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daily Period Distribution & Gap Analysis (Sunday – Thursday)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Shows active periods, free-period gaps between first and last class, and daily
                      workload bar.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedTeacherStats.dayStatsList.map((daySt) => {
                      const widthPct = Math.min(100, Math.round((daySt.classCount / 7) * 100));
                      return (
                        <div
                          key={daySt.day}
                          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {daySt.dayName} ({daySt.bengaliName})
                            </div>
                            <div className="flex items-center gap-3 font-mono tabular-nums">
                              <span className="font-bold text-blue-700 dark:text-blue-400">
                                {num(daySt.classCount)} / {num(7)} Periods
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                Gaps: {num(daySt.gaps)}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>

                          {/* Period chips 1..7 */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {[1, 2, 3, 4, 5, 6, 7].map((pNum) => {
                              const isBusy = daySt.periods.includes(pNum);
                              return (
                                <span
                                  key={pNum}
                                  className={`px-2 py-0.5 text-[11px] font-mono rounded border ${
                                    isBusy
                                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold'
                                      : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                                  }`}
                                >
                                  P{num(pNum)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Subject & Class Breakdown for Selected Teacher */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Subject & Class Breakdown for [{selectedTeacherStats.teacherCode}] (
                {num(selectedTeacherStats.breakdownRows.length)} Assignments)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2 px-3">Period</th>
                      <th className="py-2 px-3">Class / Section</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3">Days Schedule</th>
                      <th className="py-2 px-3 text-right">Weekly Periods</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {selectedTeacherStats.breakdownRows.map((row, idx) => (
                      <tr
                        key={`${row.period}_${row.className}_${row.subject}_${idx}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          Period {num(row.period)}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {row.className}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.subject}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.daysLabel}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {num(row.weeklyPeriods)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* All-Teachers Workload Comparison Matrix */}
          <section
            aria-label="All Teachers Workload Comparison"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                All Faculty Weekly Workload Comparison ({num(allTeachersStatsList.length)} Teachers)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any teacher row to inspect their detailed daily period distribution and
                subject breakdown above.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <th className="py-2.5 px-3">Teacher Code</th>
                    <th className="py-2.5 px-3">Faculty Name</th>
                    <th className="py-2.5 px-3 text-right">Weekly Classes</th>
                    <th className="py-2.5 px-3 text-right">Teaching Hours</th>
                    <th className="py-2.5 px-3 text-right">Avg / Day</th>
                    <th className="py-2.5 px-3 text-right">Unique Subjects</th>
                    <th className="py-2.5 px-3 text-right">Unique Classes</th>
                    <th className="py-2.5 px-3">Busiest Weekday</th>
                    <th className="py-2.5 px-3">Least Busy Weekday</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs tabular-nums">
                  {allTeachersStatsList.map((st) => {
                    const isSelected =
                      normalizeTeacherCodeKey(st.teacherCode) ===
                      normalizeTeacherCodeKey(effectiveStatsTeacher);
                    return (
                      <tr
                        key={st.teacherCode}
                        onClick={() => setStatsTeacherCode(st.teacherCode)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 font-semibold'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                          {st.teacherCode}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                          {st.teacherDisplayName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {num(st.totalClasses)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {num(st.totalTeachingHoursStr)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {num(st.averageClasses)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {num(st.uniqueSubjects)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {num(st.uniqueClasses)} ({st.uniqueClassesList.join(', ')})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400">
                          {num(st.busiestWeekdayStr)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-700 dark:text-amber-400">
                          {num(st.leastBusyWeekdayStr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 3: LIVE ROUTINE UPDATE & GOOGLE APPS SCRIPT WEB VIEW
      ===================================================================== */}
      {activeSubTab === 'live-sync' && (
        <div className="space-y-6">
          <section
            aria-label="Live Google Apps Script Routine Sync"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Live Google Apps Script JSON & Web View Integration</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Update Latest Routine Data from Official Cloud Script
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-all font-mono">
                  Endpoint: {LIVE_ROUTINE_APPS_SCRIPT_URL}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={liveSyncLoading}
                  onClick={handleFetchAndSyncLiveRoutine}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${liveSyncLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {liveSyncLoading
                      ? 'Fetching Live Routine JSON...'
                      : 'Fetch & Sync Live Routine JSON'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToAttachedRoutineJson}
                  className="px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Attached routine.json ({num(SEED_ROUTINE_RECORDS.length)})</span>
                </button>

                {isFirebaseAuthenticated && isAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      await seedFirestoreDefaults();
                      notify('Seeded default school & routine data to Cloud Firestore.');
                    }}
                    className="px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Seed to Firestore
                  </button>
                )}

                <a
                  href={LIVE_ROUTINE_APPS_SCRIPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Apps Script URL</span>
                </a>
              </div>
            </div>

            {liveSyncError && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                Live Sync Error: {liveSyncError}
              </div>
            )}

            {/* Live JSON MasterGrid Preview when fetched */}
            {liveFetchedPayload && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Live JSON Payload Synced ({num(liveFetchedPayload.teachers.length)} Teachers ·{' '}
                      {num(liveFetchedPayload.parsedCount)} Routine Entries)
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    Fetched at: {liveFetchedPayload.fetchedAt}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                        <th className="py-1.5 px-2">Teacher</th>
                        <th className="py-1.5 px-2">1st</th>
                        <th className="py-1.5 px-2">2nd</th>
                        <th className="py-1.5 px-2">3rd</th>
                        <th className="py-1.5 px-2">4th</th>
                        <th className="py-1.5 px-2">Break</th>
                        <th className="py-1.5 px-2">5th</th>
                        <th className="py-1.5 px-2">6th</th>
                        <th className="py-1.5 px-2">7th</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {liveFetchedPayload.teachers.map((tCode, rIdx) => {
                        const row = liveFetchedPayload.masterGrid[rIdx] || [];
                        return (
                          <tr key={tCode}>
                            <td className="py-1.5 px-2 font-bold text-blue-700 dark:text-blue-400">
                              {tCode}
                            </td>
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((cIdx) => (
                              <td
                                key={cIdx}
                                className="py-1.5 px-2 text-slate-700 dark:text-slate-300 whitespace-pre-line"
                              >
                                {row[cIdx] || '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Embedded Live Web View */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Live Google Apps Script Web View (Interactive Routine Portal)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmbeddedWebView((prev) => !prev)}
                  className="px-3 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {showEmbeddedWebView ? 'Hide Web View' : 'Show Web View'}
                </button>
              </div>

              {showEmbeddedWebView && (
                <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
                  <iframe
                    title="Abu Torab High School Live Routine Web View"
                    src="/api/routine/webview"
                    className="w-full h-[520px] border-0"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
