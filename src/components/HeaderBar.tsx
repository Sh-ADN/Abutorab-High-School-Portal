import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useSchool, WorkspaceView } from '../context/SchoolContext';
import { SCHOOL_BRAND_INFO } from '../data/schoolWebsiteData';

const VIEW_METADATA: Record<
  WorkspaceView,
  { titleBn: string; titleEn: string; subtitle: string }
> = {
  'teacher-dashboard': {
    titleBn: 'ড্যাশবোর্ড (Teacher Dashboard)',
    titleEn: 'At-a-Glance Command Center',
    subtitle: 'আজকের ক্লাস, উপস্থিতি ও নম্বর এন্ট্রির সারসংক্ষেপ',
  },
  'student-attendance': {
    titleBn: 'উপস্থিতি (Student Attendance)',
    titleEn: 'ClassRoll Daily Attendance & Analytics',
    subtitle: 'দ্রুত হাজিরা গ্রহণ ও মাসিক উপস্থিতির হিসাব',
  },
  'exam-marks': {
    titleBn: 'নম্বর এন্ট্রি (Exam Marks Entry)',
    titleEn: 'NCTB Subject Marks & AI Scanner',
    subtitle: 'লিখিত (CQ), বহুনির্বাচনি (MCQ) ও ব্যবহারিক নম্বর এন্ট্রি',
  },
  'results-tabulation': {
    titleBn: 'ট্যাবুলেশন ও ফলাফল (Tabulation & Results)',
    titleEn: 'Automated Tabulation, Merit List & A4 Marksheets',
    subtitle: 'স্বয়ংক্রিয় ফলাফল, মেধা তালিকা ও প্রিন্টেবল মার্কশিট',
  },
  'school-routine': {
    titleBn: 'ক্লাস রুটিন (School Routine & Workload)',
    titleEn: 'Live Routine & Teacher Statistics',
    subtitle: 'শ্রেণি ও শিক্ষকভিত্তিক রুটিন এবং পিরিয়ড পরিসংখ্যান',
  },
  'admin-panel': {
    titleBn: 'অ্যাডমিন প্যানেল (Admin Control Center)',
    titleEn: 'School Administration & Academic Governance',
    subtitle: 'শিক্ষক, শ্রেণি, বিষয় বণ্টন, শিক্ষার্থী তালিকা, ফলাফল লক ও নোটিশ ব্যবস্থাপনা',
  },
  'admin-teachers': {
    titleBn: 'শিক্ষক ও রোল অ্যাসাইনমেন্ট',
    titleEn: 'Faculty & Role Administration',
    subtitle: 'শিক্ষক প্রোফাইল, সংক্ষিপ্ত কোড ও অ্যাডমিন রোল ব্যবস্থাপনা',
  },
  'admin-academic': {
    titleBn: 'শিক্ষাবর্ষ ও শ্রেণি ব্যবস্থাপনা',
    titleEn: 'Academic Years, Terms & Classes',
    subtitle: 'সেশন, পরীক্ষার টার্ম ও শাখা কনফিগারেশন',
  },
  'admin-matrix': {
    titleBn: 'শ্রেণি ও বিষয় বণ্টন ম্যাট্রিক্স',
    titleEn: 'Class Teacher & Subject Assignment Matrix',
    subtitle: 'শ্রেণি শিক্ষক ও বিষয়ভিত্তিক শিক্ষক নির্ধারণ',
  },
  'student-roster': {
    titleBn: 'শিক্ষার্থী তালিকা (Student Roster)',
    titleEn: 'Master Student Roster & CSV Bulk Import',
    subtitle: 'শ্রেণিভিত্তিক শিক্ষার্থী ভর্তি ও সিএসভি ইমপোর্ট',
  },
};

export function useResolvedRoleBadge(): {
  labelBn: string;
  labelEn: 'Super Admin' | 'Class Teacher' | 'Subject Teacher';
  badgeTone: string;
} {
  const { currentUser, classSections, selectedAcademicYearId } = useSchool();
  if (!currentUser) {
    return {
      labelBn: 'বিষয় শিক্ষক',
      labelEn: 'Subject Teacher',
      badgeTone:
        'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
    };
  }

  if (currentUser.role === 'admin') {
    return {
      labelBn: 'সুপার অ্যাডমিন',
      labelEn: 'Super Admin',
      badgeTone:
        'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    };
  }

  const isClassTeacher = classSections.some(
    (cs) =>
      cs.academicYearId === selectedAcademicYearId && cs.classTeacherUid === currentUser.uid
  );

  if (isClassTeacher) {
    return {
      labelBn: 'শ্রেণি শিক্ষক',
      labelEn: 'Class Teacher',
      badgeTone:
        'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    };
  }

  return {
    labelBn: 'বিষয় শিক্ষক',
    labelEn: 'Subject Teacher',
    badgeTone:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
  };
}

export const PortalSidebar: React.FC<{
  collapsed: boolean;
  onToggleCollapse: () => void;
}> = ({ collapsed, onToggleCollapse }) => {
  const {
    currentUser,
    activeView,
    setActiveView,
    setShowPublicWebsite,
    logout,
    classSections,
    selectedAcademicYearId,
  } = useSchool();
  const [logoError, setLogoError] = useState(false);
  const roleBadge = useResolvedRoleBadge();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const assignedClassSection = classSections.find(
    (cs) =>
      cs.academicYearId === selectedAcademicYearId && cs.classTeacherUid === currentUser.uid
  );

  const isAdminViewActive =
    activeView === 'admin-panel' ||
    activeView === 'admin-teachers' ||
    activeView === 'admin-academic' ||
    activeView === 'admin-matrix' ||
    activeView === 'student-roster';

  const sidebarItems: {
    id: string;
    labelBn: string;
    labelEn: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    badge?: string;
  }[] = [
    {
      id: 'teacher-dashboard',
      labelBn: 'ড্যাশবোর্ড',
      labelEn: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'teacher-dashboard',
      onClick: () => setActiveView('teacher-dashboard'),
    },
    {
      id: 'student-attendance',
      labelBn: 'উপস্থিতি (Attendance)',
      labelEn: 'Attendance',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'student-attendance',
      onClick: () => setActiveView('student-attendance'),
      badge: assignedClassSection
        ? `${assignedClassSection.className}-${assignedClassSection.section}`
        : undefined,
    },
    {
      id: 'exam-marks',
      labelBn: 'নম্বর এন্ট্রি (Marks)',
      labelEn: 'Marks Entry',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'exam-marks',
      onClick: () => setActiveView('exam-marks'),
    },
    {
      id: 'results-tabulation',
      labelBn: 'ট্যাবুলেশন ও ফলাফল',
      labelEn: 'Tabulation & Merit',
      icon: <Award className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'results-tabulation',
      onClick: () => setActiveView('results-tabulation'),
    },
    {
      id: 'school-routine',
      labelBn: 'ক্লাস রুটিন',
      labelEn: 'Class Routine',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'school-routine',
      onClick: () => setActiveView('school-routine'),
    },
    ...(isAdmin
      ? [
          {
            id: 'admin-panel',
            labelBn: 'অ্যাডমিন প্যানেল',
            labelEn: 'Admin Control',
            icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
            isActive: isAdminViewActive,
            onClick: () => setActiveView('admin-panel'),
            badge: 'Admin',
          },
        ]
      : [
          {
            id: 'student-roster',
            labelBn: 'শিক্ষার্থী তালিকা',
            labelEn: 'Student Roster',
            icon: <Users className="w-4 h-4 shrink-0" />,
            isActive: activeView === 'student-roster',
            onClick: () => setActiveView('student-roster'),
          },
        ]),
    {
      id: 'school-website',
      labelBn: 'স্কুল ওয়েবসাইট',
      labelEn: 'School Website',
      icon: <Globe className="w-4 h-4 shrink-0" />,
      isActive: false,
      onClick: () => setShowPublicWebsite(true),
    },
  ];

  return (
    <aside
      data-testid="portal-desktop-sidebar"
      aria-label="Desktop Portal Sidebar"
      className={`no-print hidden md:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 transition-all duration-200 sticky top-0 h-screen z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* School Crest & Collapse Toggle */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-4 border-b border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveView('teacher-dashboard')}
          className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
        >
          <img
            src={
              !logoError
                ? '/assets/aistudio/school_logo_large_f25747b9.png'
                : SCHOOL_BRAND_INFO.logoUrl
            }
            alt="School Emblem"
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-10 h-10 rounded-full object-contain bg-white p-0.5 border border-teal-600/30 shadow-xs shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                আবুতোরাব উচ্চ বিদ্যালয়
              </div>
              <div className="text-[11px] font-medium text-teal-700 dark:text-teal-400 truncate">
                স্থাপিত: ১৯১৪ · EIIN: 104600
              </div>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'সাইডবার বড় করুন (Expand Sidebar)' : 'সাইডবার ছোট করুন (Collapse Sidebar)'}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Teacher Profile Card & Role Badge */}
      <div className="px-3 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-teal-600/40 shrink-0 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-700 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser.teacherCode}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                কোড: <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">{currentUser.teacherCode}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.badgeTone}`}
                >
                  {roleBadge.labelEn}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Sidebar Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      >
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            data-testid={`sidebar-nav-${item.id}`}
            type="button"
            onClick={item.onClick}
            title={collapsed ? `${item.labelBn} (${item.labelEn})` : undefined}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              item.isActive
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-teal-50/80 dark:hover:bg-slate-800/80 hover:text-teal-800 dark:hover:text-teal-300'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              {item.icon}
              {!collapsed && <span className="truncate">{item.labelBn}</span>}
            </span>
            {!collapsed && item.badge && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  item.isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Sign Out Button */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'লগআউট (Sign Out)' : undefined}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-2 py-2.5' : 'justify-center gap-2 px-3 py-2.5'
          } rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 transition-colors cursor-pointer`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>লগআউট (Sign Out)</span>}
        </button>
      </div>
    </aside>
  );
};

export const HeaderBar: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    setShowPublicWebsite,
    logout,
    theme,
    toggleTheme,
    numeralLocale,
    toggleNumeralLocale,
    num,
    users,
    enterSandboxAs,
    isFirebaseAuthenticated,
    academicYears,
    selectedAcademicYearId,
    setSelectedAcademicYearId,
    examTerms,
    selectedTermId,
    setSelectedTermId,
  } = useSchool();

  const roleBadge = useResolvedRoleBadge();

  if (!currentUser) return null;

  const meta = VIEW_METADATA[activeView] || VIEW_METADATA['teacher-dashboard'];
  const termsForYear = examTerms.filter((t) => t.academicYearId === selectedAcademicYearId);

  return (
    <header className="no-print sticky top-0 z-30 w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/90 dark:border-slate-800">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Current Module Title & Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="md:hidden shrink-0">
            <img
              src="/assets/aistudio/school_logo_large_f25747b9.png"
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-contain bg-white border border-teal-600/30 p-0.5"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {meta.titleBn}
              </h1>
              <span
                className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.badgeTone}`}
              >
                {roleBadge.labelEn}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Context Selectors, Theme Toggle & User Avatar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year Selector */}
          <div className="hidden lg:flex items-center gap-1.5">
            <label
              htmlFor="global-year-select"
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              সেশন:
            </label>
            <select
              id="global-year-select"
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 tabular-nums font-medium"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {num(y.year)} {y.isActive ? '(সক্রিয়)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Term Selector */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="global-term-select"
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline"
            >
              টার্ম:
            </label>
            <select
              id="global-term-select"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              aria-label="Exam Term Selector"
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 font-medium max-w-[165px] sm:max-w-none truncate"
            >
              {termsForYear.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.termType} ({num(t.totalMarksDefault)}){t.isLocked ? ' · Locked' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sandbox Role Switcher for Demo / Testing */}
          {!isFirebaseAuthenticated && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="sandbox-user-select"
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden xl:inline"
              >
                Preview As:
              </label>
              <select
                id="sandbox-user-select"
                value={currentUser.uid}
                onChange={(e) => {
                  const nextUid = e.target.value;
                  const nextUser = users.find((u) => u.uid === nextUid);
                  enterSandboxAs(nextUid);
                  if (
                    nextUser &&
                    nextUser.role !== 'admin' &&
                    (activeView === 'admin-panel' || activeView.startsWith('admin-'))
                  ) {
                    setActiveView('teacher-dashboard');
                  }
                }}
                aria-label="Preview As User"
                className="text-xs rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 px-2.5 py-1.5 font-medium max-w-[150px] sm:max-w-[210px] truncate"
              >
                {users
                  .filter((u) => u.status === 'active')
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} [{u.teacherCode}] ({u.role.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Bengali / English Numeral Toggle */}
          <button
            type="button"
            onClick={toggleNumeralLocale}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
          >
            {numeralLocale === 'bn' ? 'বাংলা (১২৩)' : 'EN (123)'}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Public Website Quick Button */}
          <button
            type="button"
            onClick={() => setShowPublicWebsite(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>স্কুল ওয়েবসাইট</span>
          </button>

          {/* User Avatar Chip */}
          <div className="flex items-center gap-2 pl-1.5 border-l border-slate-200 dark:border-slate-800">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-teal-600/40 bg-white"
              />
            ) : (
              <div
                title={`${currentUser.name} (${currentUser.teacherCode})`}
                className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs"
              >
                {currentUser.teacherCode}
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              title="লগআউট (Sign Out)"
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC = () => {
  const { currentUser, activeView, setActiveView, setShowPublicWebsite, logout } = useSchool();
  const [menuOpen, setMenuOpen] = useState(false);
  const roleBadge = useResolvedRoleBadge();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isAdminOrMenuActive =
    activeView === 'admin-panel' ||
    activeView === 'admin-teachers' ||
    activeView === 'admin-academic' ||
    activeView === 'admin-matrix' ||
    activeView === 'student-roster' ||
    activeView === 'results-tabulation';

  return (
    <>
      {/* Mobile Quick Drawer when "মেনু/অ্যাডমিন" is tapped or when user wants extra modules */}
      {menuOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.teacherCode}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.badgeTone}`}
                    >
                      {roleBadge.labelEn}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('admin-panel');
                    setMenuOpen(false);
                  }}
                  className="col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-teal-700 text-white font-semibold text-xs shadow-xs"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>অ্যাডমিন কন্ট্রোল সেন্টার (Admin Panel)</span>
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">5 Tabs</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveView('results-tabulation');
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
                <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>ট্যাবুলেশন ও ফলাফল</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('student-roster');
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>শিক্ষার্থী তালিকা</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPublicWebsite(true);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold text-xs"
              >
                <Globe className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <span>স্কুল ওয়েবসাইট</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>লগআউট (Sign Out)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Glassmorphic Bottom Navigation Bar (5 clear icon+label tabs) */}
      <nav
        data-testid="portal-mobile-bottom-nav"
        aria-label="Mobile Bottom Navigation"
        className="no-print md:hidden h-16 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-t border-slate-200/90 dark:border-slate-800 px-2 flex items-center justify-around shadow-lg"
      >
        <button
          data-testid="mobile-nav-home"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveView('teacher-dashboard');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
            activeView === 'teacher-dashboard' && !menuOpen
              ? 'text-teal-700 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] leading-none">হোম</span>
        </button>

        <button
          data-testid="mobile-nav-student-attendance"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveView('student-attendance');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
            activeView === 'student-attendance' && !menuOpen
              ? 'text-teal-700 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[11px] leading-none">হাজিরা</span>
        </button>

        <button
          data-testid="mobile-nav-exam-marks"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveView('exam-marks');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
            activeView === 'exam-marks' && !menuOpen
              ? 'text-teal-700 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] leading-none">নম্বর</span>
        </button>

        <button
          data-testid="mobile-nav-school-routine"
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveView('school-routine');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
            activeView === 'school-routine' && !menuOpen
              ? 'text-teal-700 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] leading-none">রুটিন</span>
        </button>

        <button
          data-testid="mobile-nav-menu-admin"
          type="button"
          onClick={() => {
            if (isAdmin && activeView !== 'admin-panel') {
              setActiveView('admin-panel');
              setMenuOpen(false);
            } else {
              setMenuOpen((prev) => !prev);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
            isAdminOrMenuActive || menuOpen
              ? 'text-teal-700 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[11px] leading-none">মেনু/অ্যাডমিন</span>
        </button>
      </nav>
    </>
  );
};
