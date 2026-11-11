import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  DAYS_CONFIG,
  expandRoutineRecordsToEntries,
  getRoutineDayForDate,
  normalizeTeacherCodeKey,
  PERIOD_SCHEDULE,
  resolveRoutineTeacherCodeForUser,
} from '../utils/routineAndStatsLogic';

export const TeacherDashboard: React.FC = () => {
  const {
    currentUser,
    academicYears,
    examTerms,
    classSections,
    subjectAssignments,
    students,
    attendanceRecords,
    subjectMarks,
    routineRecords,
    selectedAcademicYearId,
    selectedTermId,
    setSelectedAttendanceClassSectionId,
    setSelectedMarksAssignmentId,
    setActiveView,
    num,
  } = useSchool();

  const [selectedDay, setSelectedDay] = useState<number>(
    () => getRoutineDayForDate().dayNumber
  );

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const activeYear = academicYears.find((y) => y.id === selectedAcademicYearId);
  const activeTerm = examTerms.find((t) => t.id === selectedTermId);
  const todayIso = new Date().toISOString().slice(0, 10);

  const todayFormattedBn = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('bn-BD', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
    } catch {
      return todayIso;
    }
  }, [todayIso]);

  // Assigned Class Teacher sections (or all sections for Admin)
  const myClassTeacherSections = useMemo(
    () =>
      classSections.filter(
        (cs) =>
          cs.academicYearId === selectedAcademicYearId &&
          (cs.classTeacherUid === currentUser.uid || isAdmin)
      ),
    [classSections, selectedAcademicYearId, currentUser.uid, isAdmin]
  );

  const directClassTeacherSections = useMemo(
    () =>
      classSections.filter(
        (cs) =>
          cs.academicYearId === selectedAcademicYearId &&
          cs.classTeacherUid === currentUser.uid
      ),
    [classSections, selectedAcademicYearId, currentUser.uid]
  );

  const mySubjectAssignments = useMemo(
    () =>
      subjectAssignments.filter(
        (asg) =>
          asg.academicYearId === selectedAcademicYearId &&
          (asg.teacherUid === currentUser.uid || isAdmin)
      ),
    [subjectAssignments, selectedAcademicYearId, currentUser.uid, isAdmin]
  );

  // Expand routine records into daily entries
  const expandedEntries = useMemo(
    () => expandRoutineRecordsToEntries(routineRecords),
    [routineRecords]
  );

  const availableRoutineTeachers = useMemo(
    () => Array.from(new Set(routineRecords.map((r) => r.teacher.trim()))).filter(Boolean),
    [routineRecords]
  );

  const resolvedRoutineTeacherCode = useMemo(
    () => resolveRoutineTeacherCodeForUser(currentUser, availableRoutineTeachers),
    [currentUser, availableRoutineTeachers]
  );

  const myTeacherEntries = useMemo(() => {
    const targetKey = normalizeTeacherCodeKey(resolvedRoutineTeacherCode);
    return expandedEntries.filter((e) => normalizeTeacherCodeKey(e.teacher) === targetKey);
  }, [expandedEntries, resolvedRoutineTeacherCode]);

  const myClassesToday = useMemo(
    () =>
      myTeacherEntries
        .filter((e) => e.day === selectedDay)
        .sort((a, b) => a.period - b.period),
    [myTeacherEntries, selectedDay]
  );

  const myWeeklyPeriodCount = myTeacherEntries.length;

  const selectedDayCfg =
    DAYS_CONFIG.find((c) => c.day === selectedDay) || DAYS_CONFIG[0];

  const activePeriodNumber = useMemo(() => {
    return myClassesToday.length > 0 ? myClassesToday[0].period : 1;
  }, [myClassesToday]);

  // Overall completion stats for assigned subjects
  const subjectGradingStats = useMemo(() => {
    let totalExpected = 0;
    let totalGraded = 0;
    const cards = mySubjectAssignments.map((asg) => {
      const classStudentCount = students.filter(
        (s) => s.classSectionId === asg.classSectionId && s.status === 'active'
      ).length;
      const enteredCount = subjectMarks.filter(
        (m) => m.assignmentId === asg.id && m.termId === selectedTermId
      ).length;
      totalExpected += classStudentCount;
      totalGraded += Math.min(enteredCount, classStudentCount);
      const pct =
        classStudentCount > 0
          ? Math.min(100, Math.round((enteredCount / classStudentCount) * 100))
          : 0;
      return {
        assignment: asg,
        classStudentCount,
        enteredCount,
        pct,
      };
    });
    return { cards, totalExpected, totalGraded };
  }, [mySubjectAssignments, students, subjectMarks, selectedTermId]);

  const handleOpenAttendanceForClass = (classSectionId: string) => {
    setSelectedAttendanceClassSectionId(classSectionId);
    setActiveView('student-attendance');
  };

  const handleOpenMarksForSubject = (assignmentId: string) => {
    setSelectedMarksAssignmentId(assignmentId);
    setActiveView('exam-marks');
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcome Hero Banner (Gradient Teal/Emerald) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-[#0f766e] to-emerald-800 text-white p-6 sm:p-7 shadow-md border border-teal-600/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-teal-50 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{todayFormattedBn}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">সেশন {num(activeYear?.year || '2026')}</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              স্বাগতম, {currentUser.name}
            </h2>

            <p className="text-xs sm:text-sm text-teal-100/95 leading-relaxed">
              {currentUser.designation} · শিক্ষক কোড:{' '}
              <span className="font-mono font-bold text-amber-300">{currentUser.teacherCode}</span>
              {directClassTeacherSections.length > 0 && (
                <>
                  {' '}
                  · শ্রেণি শিক্ষক:{' '}
                  <span className="font-bold text-white">
                    {directClassTeacherSections
                      .map((c) => `${c.className} (${c.section})`)
                      .join(', ')}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Quick Duty Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="rounded-xl bg-white/12 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
              <div className="text-[11px] text-teal-100">আজকের ক্লাস</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">
                {num(myClassesToday.length)}টি
              </div>
              <div className="text-[10px] text-teal-200 tabular-nums">
                সাপ্তাহিক {num(myWeeklyPeriodCount)} পিরিয়ড
              </div>
            </div>

            <div className="rounded-xl bg-white/12 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
              <div className="text-[11px] text-teal-100">নির্ধারিত হাজিরা</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">
                {num(myClassTeacherSections.length)}টি
              </div>
              <div className="text-[10px] text-teal-200">
                {isAdmin ? 'সকল শাখা উন্মুক্ত' : 'শ্রেণি শিক্ষক'}
              </div>
            </div>

            <div className="rounded-xl bg-white/12 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
              <div className="text-[11px] text-teal-100">নির্ধারিত বিষয়</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">
                {num(mySubjectAssignments.length)}টি
              </div>
              <div className="text-[10px] text-teal-200 truncate">
                {activeTerm?.termType || 'Half-Yearly'}
              </div>
            </div>

            <div className="rounded-xl bg-white/12 backdrop-blur-xs border border-white/15 px-3.5 py-2.5">
              <div className="text-[11px] text-teal-100">নম্বর এন্ট্রি অগ্রগতি</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">
                {num(subjectGradingStats.totalGraded)}/{num(subjectGradingStats.totalExpected)}
              </div>
              <div className="text-[10px] text-emerald-200">শিক্ষার্থী মূল্যায়নকৃত</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Bento Grid: Left = "আজকের ক্লাস" (My Classes Today), Right = Quick Action Attendance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* "আজকের ক্লাস" (My Classes Today Widget) - 7 cols */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    আজকের ক্লাস
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {resolvedRoutineTeacherCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDayCfg.bengaliName} · মোট{' '}
                  <span className="font-semibold tabular-nums">{num(myClassesToday.length)}</span>টি
                  পিরিয়ড
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {DAYS_CONFIG.map((cfg) => (
                <button
                  key={cfg.day}
                  type="button"
                  onClick={() => setSelectedDay(cfg.day)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectedDay === cfg.day
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cfg.bengaliName}
                </button>
              ))}
            </div>
          </div>

          {myClassesToday.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedDayCfg.bengaliName}বারে আপনার কোড ({resolvedRoutineTeacherCode}) অনুযায়ী
                কোনো নির্ধারিত ক্লাস পাওয়া যায়নি।
              </p>
              <button
                type="button"
                onClick={() => setActiveView('school-routine')}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                <span>পূর্ণাঙ্গ স্কুল রুটিন দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myClassesToday.map((slot) => {
                const isActiveNow = slot.period === activePeriodNumber;
                const bellInfo = PERIOD_SCHEDULE.find((p) => p.period === slot.period);
                return (
                  <div
                    key={`${slot.recordId}_${slot.day}_${slot.period}`}
                    className={`relative rounded-xl border p-3.5 transition-all ${
                      isActiveNow
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-700 text-white tabular-nums">
                        পিরিয়ড {num(slot.period)}
                      </span>
                      {isActiveNow ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>চলমান পিরিয়ড</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          <Clock className="w-3 h-3" />
                          <span>{bellInfo?.timeRange || 'নির্ধারিত সময়'}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {slot.subject}
                        </div>
                        <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
                          শ্রেণি: {slot.className}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {slot.daysRaw}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              সাপ্তাহিক মোট ওয়ার্কলোড: <strong className="tabular-nums">{num(myWeeklyPeriodCount)}</strong> পিরিয়ড
            </span>
            <button
              type="button"
              onClick={() => setActiveView('school-routine')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              <span>পূর্ণাঙ্গ রুটিন ও পরিসংখ্যান</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Prominent "আজকের হাজিরা নিন (Take Attendance)" Card - 5 cols */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  আজকের হাজিরা
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  তারিখ: {num(todayIso)} · এক ট্যাপে দ্রুত উপস্থিতি গ্রহণ
                </p>
              </div>
            </div>
          </div>

          {myClassTeacherSections.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                আপনি বর্তমানে কোনো শাখার শ্রেণি শিক্ষক হিসেবে নিযুক্ত নন।
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-1">
              {myClassTeacherSections.map((cs) => {
                const classStudents = students.filter(
                  (s) => s.classSectionId === cs.id && s.status === 'active'
                );
                const todayRecord = attendanceRecords.find(
                  (r) => r.classSectionId === cs.id && r.date === todayIso
                );
                const isDirectMine = cs.classTeacherUid === currentUser.uid;

                return (
                  <div
                    key={cs.id}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      todayRecord
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : isDirectMine
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/25'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {cs.className} — শাখা {cs.section}
                        </span>
                        {todayRecord ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>সম্পন্ন</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                            বাকি আছে
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                        মোট শিক্ষার্থী: <strong>{num(classStudents.length)}</strong> জন · কক্ষ:{' '}
                        {num(cs.roomNumber)}
                        {todayRecord && (
                          <span className="ml-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                            (উপস্থিত: {num(todayRecord.presentCount)}, অনুপস্থিত:{' '}
                            {num(todayRecord.absentCount)})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendanceForClass(cs.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        todayRecord
                          ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50'
                          : 'bg-teal-700 hover:bg-[#0d5c56] text-white shadow-xs'
                      }`}
                    >
                      {todayRecord ? 'হাজিরা সম্পাদনা' : 'হাজিরা নিন →'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveView('student-roster')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>শিক্ষার্থী তালিকা</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('student-attendance')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
            >
              <span>হাজিরা ড্যাশবোর্ড ও রিপোর্ট</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* 3. Quick Action Cards: "নম্বর এন্ট্রি করুন (Enter Exam Marks)" with Completion Progress Bars */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                নম্বর এন্ট্রি
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                চলমান পরীক্ষা: <strong>{activeTerm?.name || 'Half-Yearly Exam'}</strong> · পূর্ণমান ও
                গ্রেড স্বয়ংক্রিয়ভাবে হিসাব হবে
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('results-tabulation')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>ট্যাবুলেশন ও মেধা তালিকা</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('admin-panel')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>অ্যাডমিন প্যানেল</span>
              </button>
            )}
          </div>
        </div>

        {subjectGradingStats.cards.length === 0 ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              আপনার জন্য এখনো কোনো বিষয় নির্ধারণ করা হয়নি।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjectGradingStats.cards.map(
              ({ assignment: asg, classStudentCount, enteredCount, pct }) => {
                const isComplete = classStudentCount > 0 && enteredCount >= classStudentCount;
                return (
                  <div
                    key={asg.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 flex flex-col justify-between gap-3.5 hover:border-teal-500/60 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-100/80 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                          {asg.className} · শাখা {asg.section}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                          কোড: {num(asg.subjectCode)} · পূর্ণমান: {num(asg.maxMarks)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {asg.subjectName}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        বিষয় শিক্ষক: {asg.teacherName} ({asg.teacherCode})
                      </p>
                    </div>

                    {/* Completion Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {num(enteredCount)}/{num(classStudentCount)} মূল্যায়নকৃত
                        </span>
                        <span
                          className={`font-bold tabular-nums ${
                            isComplete
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-teal-700 dark:text-teal-400'
                          }`}
                        >
                          {num(pct)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-emerald-500' : 'bg-teal-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenMarksForSubject(asg.id)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>নম্বর এন্ট্রি করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
};
