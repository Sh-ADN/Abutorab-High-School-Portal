import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  Lock,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  UserSquare2,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { AdminTeachersPanel } from './AdminTeachersPanel';
import { AdminMatrixPanel } from './AdminMatrixPanel';
import { AdminAcademicPanel } from './AdminAcademicPanel';
import { StudentRosterPanel } from './StudentRosterPanel';
import { NoticeRecord } from '../types/school';
import { buildWhatsAppUrl, PUBLIC_TEACHERS_DIRECTORY } from '../data/schoolWebsiteData';
import { isFullAdminUser } from '../utils/schoolLogic';

export type AdminTabId =
  | 'teachers-roles'
  | 'class-subject-matrix'
  | 'marks-progress'
  | 'student-roster'
  | 'result-lock-publish'
  | 'notice-management';

export const AdminControlCenter: React.FC<{
  initialTab?: AdminTabId;
}> = ({ initialTab = 'teachers-roles' }) => {
  const {
    currentUser,
    users,
    examTerms,
    classSections,
    selectedAcademicYearId,
    selectedTermId: globalTermId,
    subjectAssignments,
    subjectMarks,
    students,
    toggleExamTermLock,
    setActiveExamTerm,
    notices,
    saveNotice,
    deleteNotice,
    num,
  } = useSchool();

  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);

  // Sync activeTab if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Marks submission progress state
  const [progressTermId, setProgressTermId] = useState<string>(globalTermId || '');
  const [progressClassId, setProgressClassId] = useState<string>('ALL');
  const [progressSearch, setProgressSearch] = useState<string>('');

  // Notice editor state
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDate, setNoticeDate] = useState('২০২৬ শিক্ষাবর্ষ');
  const [noticeCategory, setNoticeCategory] = useState('প্রশাসনিক বিজ্ঞপ্তি');
  const [noticeIsImportant, setNoticeIsImportant] = useState(true);
  const [noticeSummary, setNoticeSummary] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeBanner, setNoticeBanner] = useState('');

  if (!isFullAdminUser(currentUser)) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
          শুধুমাত্র সুপার অ্যাডমিন (Super Admin) ও মেইন অ্যাডমিন (Main Admin) প্যানেলটি ব্যবহার করতে পারবেন।
        </p>
      </div>
    );
  }

  const yearTerms = examTerms.filter((t) => t.academicYearId === selectedAcademicYearId);
  const yearAssignments = subjectAssignments.filter(
    (a) => a.academicYearId === selectedAcademicYearId
  );

  const handleEditNotice = (n: NoticeRecord) => {
    setEditingNoticeId(n.id);
    setNoticeTitle(n.title);
    setNoticeDate(n.date);
    setNoticeCategory(n.category);
    setNoticeIsImportant(n.isImportant);
    setNoticeSummary(n.summary);
    setNoticeContent(n.content);
    setNoticeBanner('');
  };

  const handleResetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeTitle('');
    setNoticeDate('২০২৬ শিক্ষাবর্ষ');
    setNoticeCategory('প্রশাসনিক বিজ্ঞপ্তি');
    setNoticeIsImportant(true);
    setNoticeSummary('');
    setNoticeContent('');
  };

  const handleSaveNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;
    await saveNotice({
      id: editingNoticeId || undefined,
      title: noticeTitle,
      date: noticeDate,
      category: noticeCategory,
      isImportant: noticeIsImportant,
      summary: noticeSummary || noticeTitle,
      content: noticeContent || noticeSummary || noticeTitle,
      publishedBy: `${currentUser?.name || 'Admin'} (${currentUser?.designation || 'Admin'})`,
    });
    setNoticeBanner(
      editingNoticeId
        ? '✓ নোটিশটি সফলভাবে আপডেট করা হয়েছে এবং স্কুল ওয়েবসাইটে প্রকাশিত হয়েছে।'
        : '✓ নতুন নোটিশ সফলভাবে প্রকাশিত হয়েছে এবং স্কুল ওয়েবসাইটের নোটিশ বোর্ডে যুক্ত হয়েছে।'
    );
    handleResetNoticeForm();
  };

  const tabs: { id: AdminTabId; labelBn: string; icon: React.ReactNode }[] = [
    {
      id: 'teachers-roles',
      labelBn: 'শিক্ষক ও রোল অ্যাসাইনমেন্ট',
      icon: <UserSquare2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'class-subject-matrix',
      labelBn: 'শ্রেণি ও বিষয় বণ্টন',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'marks-progress',
      labelBn: 'নম্বর জমার অগ্রগতি ও তাগিদ',
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'student-roster',
      labelBn: 'শিক্ষার্থী তালিকা (CSV Bulk Import)',
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'result-lock-publish',
      labelBn: 'ফলাফল লক/পাবলিশ',
      icon: <Lock className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'notice-management',
      labelBn: 'নোটিশ ব্যবস্থাপনা',
      icon: <Bell className="w-4 h-4 shrink-0" />,
    },
  ];

  // Active selected term for progress
  const activeProgressTerm = useMemo(() => {
    return yearTerms.find((t) => t.id === progressTermId) || yearTerms[0];
  }, [yearTerms, progressTermId]);

  // Subject-wise marks completion records
  const marksProgressList = useMemo(() => {
    if (!activeProgressTerm) return [];

    let filtered = yearAssignments;
    if (progressClassId !== 'ALL') {
      filtered = filtered.filter((a) => a.classSectionId === progressClassId);
    }
    if (progressSearch.trim()) {
      const q = progressSearch.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.subjectName.toLowerCase().includes(q) ||
          a.teacherName.toLowerCase().includes(q) ||
          a.teacherCode.toLowerCase().includes(q) ||
          a.className.toLowerCase().includes(q)
      );
    }

    return filtered.map((asg) => {
      const classSec = classSections.find((cs) => cs.id === asg.classSectionId);
      const totalStudents = students.filter(
        (s) => s.classSectionId === asg.classSectionId && s.status === 'active'
      ).length;

      const enteredCount = subjectMarks.filter(
        (m) => m.assignmentId === asg.id && m.termId === activeProgressTerm.id
      ).length;

      const isCompleted = totalStudents > 0 && enteredCount >= totalStudents;
      const isNotStarted = enteredCount === 0;
      const isPartial = !isCompleted && !isNotStarted;

      // Find teacher contact
      const publicTeacher = PUBLIC_TEACHERS_DIRECTORY.find(
        (pt) =>
          pt.teacherCode.toLowerCase() === asg.teacherCode.toLowerCase() ||
          pt.name.toLowerCase().includes(asg.teacherName.toLowerCase())
      );
      const teacherPhone = publicTeacher?.phone || '';

      const reminderMessage = `আসসালামু আলাইকুম শ্রদ্ধেয় ${asg.teacherName} স্যার/ম্যাডাম। আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় থেকে জানানো যাচ্ছে যে, ২০২৬ শিক্ষাবর্ষের ${activeProgressTerm.name} পরীক্ষার "${asg.className} (${asg.section})" শাখার "${asg.subjectName}" বিষয়ের নম্বর এন্ট্রি এখনও বাকি রয়েছে (${num(enteredCount)}/${num(totalStudents)} জন এন্ট্রি হয়েছে)। অনুগ্রহ করে দ্রুত পোর্টাল থেকে নম্বর সাবমিট করার জন্য বিনীত অনুরোধ করা হলো। ধন্যবাদ।`;

      const whatsAppUrl = teacherPhone
        ? buildWhatsAppUrl(teacherPhone, reminderMessage)
        : buildWhatsAppUrl('01817264285', reminderMessage);

      return {
        asg,
        classSec,
        totalStudents,
        enteredCount,
        isCompleted,
        isNotStarted,
        isPartial,
        teacherPhone,
        whatsAppUrl,
        reminderMessage,
      };
    });
  }, [
    activeProgressTerm,
    yearAssignments,
    progressClassId,
    progressSearch,
    classSections,
    students,
    subjectMarks,
    users,
    num,
  ]);

  const totalProgressSubjects = marksProgressList.length;
  const completedProgressSubjects = marksProgressList.filter((p) => p.isCompleted).length;
  const pendingProgressSubjects = totalProgressSubjects - completedProgressSubjects;

  return (
    <div className="space-y-6 pb-20">
      {/* Top 6-Tab Admin Control Center Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-800 dark:hover:text-teal-300 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.labelBn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: শিক্ষক ও রোল অ্যাসাইনমেন্ট */}
      {activeTab === 'teachers-roles' && <AdminTeachersPanel />}

      {/* TAB 2: শ্রেণি ও বিষয় বণ্টন */}
      {activeTab === 'class-subject-matrix' && (
        <div className="space-y-8">
          <AdminMatrixPanel />
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <AdminAcademicPanel />
          </div>
        </div>
      )}

      {/* TAB 3: নম্বর জমার অগ্রগতি ও হোয়াটসঅ্যাপ তাগিদ (Marks Submission Progress & WhatsApp Nudge) */}
      {activeTab === 'marks-progress' && (
        <div className="space-y-5">
          {/* Header & Controls Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>বিষয়ভিত্তিক নম্বর জমার অগ্রগতি ও হোয়াটসঅ্যাপ রিমাইন্ডার</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  কোন বিষয়ের নম্বর শিক্ষক কর্তৃক জমা সম্পন্ন হয়েছে এবং কোনগুলো বাকি আছে তা রিয়েল-টাইম পর্যবেক্ষণ করুন।
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  মোট বিষয়: {num(totalProgressSubjects)}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  সম্পন্ন: {num(completedProgressSubjects)}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  বাকি: {num(pendingProgressSubjects)}
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="progress-term-select"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                >
                  পরীক্ষার টার্ম:
                </label>
                <select
                  id="progress-term-select"
                  value={progressTermId}
                  onChange={(e) => setProgressTermId(e.target.value)}
                  className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                >
                  {yearTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isLocked ? '(লকড)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="progress-class-select"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                >
                  শ্রেণি ফিল্টার:
                </label>
                <select
                  id="progress-class-select"
                  value={progressClassId}
                  onChange={(e) => setProgressClassId(e.target.value)}
                  className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="ALL">সকল শ্রেণি ও শাখা</option>
                  {classSections
                    .filter((cs) => cs.academicYearId === selectedAcademicYearId)
                    .map((cs) => (
                      <option key={cs.id} value={cs.id}>
                        {cs.className} ({cs.section})
                      </option>
                    ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={progressSearch}
                  onChange={(e) => setProgressSearch(e.target.value)}
                  placeholder="বিষয় বা শিক্ষকের নাম..."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-7 pr-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Marks Progress Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4">শ্রেণি ও শাখা</th>
                    <th className="py-3 px-4">বিষয় ও কোড</th>
                    <th className="py-3 px-4">নির্ধারিত বিষয় শিক্ষক</th>
                    <th className="py-3 px-4">অগ্রগতির অবস্থা</th>
                    <th className="py-3 px-4 text-center">শতাংশ</th>
                    <th className="py-3 px-4 text-right">তাগিদ / অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {marksProgressList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        কোনো বিষয় বা শিক্ষক পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    marksProgressList.map(({ asg, totalStudents, enteredCount, isCompleted, isNotStarted, isPartial, teacherPhone, whatsAppUrl }) => {
                      const pct = totalStudents > 0 ? Math.min(100, Math.round((enteredCount / totalStudents) * 100)) : 0;
                      return (
                        <tr key={asg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {asg.className} ({asg.section})
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {asg.subjectName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              কোড: {asg.subjectCode}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {asg.teacherName}
                            </span>
                            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-mono">
                              [{asg.teacherCode}] {teacherPhone ? `· ${teacherPhone}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 tabular-nums">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{num(enteredCount)}/{num(totalStudents)} সম্পন্ন</span>
                              </span>
                            ) : isNotStarted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 tabular-nums">
                                <Clock className="w-3.5 h-3.5" />
                                <span>০/{num(totalStudents)} বাকি (শুরু হয়নি)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 tabular-nums">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{num(enteredCount)}/{num(totalStudents)} আংশিক</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mx-auto overflow-hidden">
                              <div
                                className={`h-full ${
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : isPartial
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
                              {num(pct)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isCompleted ? (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                ✓ সম্পন্ন
                              </span>
                            ) : (
                              <a
                                href={whatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                                title="শিক্ষককে হোয়াটসঅ্যাপে রিমাইন্ডার মেসেজ পাঠান"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>হোয়াটসঅ্যাপ তাগিদ</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: শিক্ষার্থী তালিকা (CSV Bulk Import) */}
      {activeTab === 'student-roster' && <StudentRosterPanel />}

      {/* TAB 4: ফলাফল লক/পাবলিশ (Result Lock / Publish Management) */}
      {activeTab === 'result-lock-publish' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>পরীক্ষার টার্ম লক ও ফলাফল পাবলিশ নিয়ন্ত্রণ (Result Lock & Publish Control)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  টার্ম লক (Lock) করলে বিষয় শিক্ষকগণ আর নম্বর পরিবর্তন করতে পারবেন না এবং পাবলিক পোর্টালে
                  ফলাফল চূড়ান্ত থাকবে।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {yearTerms.map((term) => {
                const isLocked = Boolean(term.isLocked);
                const termMarksCount = subjectMarks.filter((m) => m.termId === term.id).length;
                const totalExpectedEntries = yearAssignments.reduce((acc, asg) => {
                  const classStuCount = students.filter(
                    (s) => s.classSectionId === asg.classSectionId && s.status === 'active'
                  ).length;
                  return acc + classStuCount;
                }, 0);
                const completionPct =
                  totalExpectedEntries > 0
                    ? Math.min(100, Math.round((termMarksCount / totalExpectedEntries) * 100))
                    : 0;

                return (
                  <div
                    key={term.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                      isLocked
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                        : term.isActive
                        ? 'border-teal-500/60 bg-teal-50/30 dark:bg-teal-950/25'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            term.isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {term.isActive ? 'সক্রিয় টার্ম (Active)' : 'Inactive Term'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isLocked
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Locked & Published</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Open for Entry</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {term.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        ধরন: {term.termType} · ডিফল্ট পূর্ণমান: {num(term.totalMarksDefault)}
                      </p>

                      {/* Grading Progress Bar */}
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="text-slate-600 dark:text-slate-300">
                            নম্বর এন্ট্রি সম্পন্ন: {num(termMarksCount)}/{num(totalExpectedEntries)}
                          </span>
                          <span className="font-bold text-teal-700 dark:text-teal-400">
                            {num(completionPct)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleExamTermLock(term.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLocked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>আনলক করুন (Unlock Marks)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>লক ও চূড়ান্ত করুন (Lock Term)</span>
                          </>
                        )}
                      </button>

                      {!term.isActive && (
                        <button
                          type="button"
                          onClick={() => setActiveExamTerm(term.id)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Make Active
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: নোটিশ ব্যবস্থাপনা (Notice Board Management) */}
      {activeTab === 'notice-management' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Create / Edit Notice Form (5 cols) */}
          <form
            onSubmit={handleSaveNoticeSubmit}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs self-start"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingNoticeId
                    ? 'নোটিশ সম্পাদনা করুন (Edit Notice)'
                    : 'নতুন নোটিশ প্রকাশ করুন (Publish Notice)'}
                </h3>
              </div>
              {editingNoticeId && (
                <button
                  type="button"
                  onClick={handleResetNoticeForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
              )}
            </div>

            {noticeBanner && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{noticeBanner}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নোটিশের শিরোনাম (Notice Title) *
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="যেমন: অর্ধ-বার্ষিক পরীক্ষা ২০২৬ এর সময়সূচি প্রকাশ"
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    তারিখ (Date Label)
                  </label>
                  <input
                    type="text"
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                    placeholder="১৫ মে ২০২৬"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                  >
                    <option value="পরীক্ষা সংক্রান্ত">পরীক্ষা সংক্রান্ত</option>
                    <option value="ভর্তি বিজ্ঞপ্তি">ভর্তি বিজ্ঞপ্তি</option>
                    <option value="প্রশাসনিক বিজ্ঞপ্তি">প্রশাসনিক বিজ্ঞপ্তি</option>
                    <option value="সহশিক্ষা কার্যক্রম">সহশিক্ষা কার্যক্রম</option>
                    <option value="সাধারণ বিজ্ঞপ্তি">সাধারণ বিজ্ঞপ্তি</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  সংক্ষিপ্ত সারসংক্ষেপ (Short Summary)
                </label>
                <input
                  type="text"
                  value={noticeSummary}
                  onChange={(e) => setNoticeSummary(e.target.value)}
                  placeholder="নোটিশ কার্ডে প্রদর্শনের জন্য ১-২ লাইনের সারসংক্ষেপ..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিস্তারিত বিবরণ (Full Notice Content) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="নোটিশের বিস্তারিত বিবরণ লিখুন..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticeIsImportant}
                  onChange={(e) => setNoticeIsImportant(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span>"গুরুত্বপূর্ণ" (Important Red Badge) হিসেবে চিহ্নিত করুন</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{editingNoticeId ? 'নোটিশ আপডেট করুন' : 'নোটিশ প্রকাশ করুন (Publish)'}</span>
              </button>
            </div>
          </form>

          {/* Right: Published Notices List (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  প্রকাশিত নোটিশসমূহ ({num(notices.length)}টি)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  এখানে প্রকাশিত প্রতিটি নোটিশ সাথে সাথে পাবলিক স্কুল ওয়েবসাইটে প্রদর্শিত হয়।
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-teal-500/50 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.isImportant && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          গুরুত্বপূর্ণ
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {notice.category}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {notice.date}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {notice.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {notice.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditNotice(notice)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit Notice"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotice(notice.id)}
                      className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
