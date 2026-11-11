import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useSchool, WorkspaceView } from '../context/SchoolContext';
import { SCHOOL_BRAND_INFO } from '../data/schoolWebsiteData';
import { usePWAInstall } from '../utils/usePWAInstall';

export const VIEW_METADATA: Record<
  WorkspaceView,
  { titleBn: string; titleEn: string; subtitleBn: string; subtitleEn: string }
> = {
  'teacher-dashboard': {
    titleBn: 'ড্যাশবোর্ড',
    titleEn: 'Teacher Dashboard',
    subtitleBn: 'আজকের ক্লাস, উপস্থিতি ও নম্বর এন্ট্রির সারসংক্ষেপ',
    subtitleEn: 'Today classes, daily attendance & marks overview',
  },
  'student-attendance': {
    titleBn: 'হাজিরা',
    titleEn: 'Student Attendance',
    subtitleBn: 'দৈনিক উপস্থিতি গ্রহণ ও মাসিক উপস্থিতির হিসাব',
    subtitleEn: 'Daily roll call & monthly attendance analytics',
  },
  'exam-marks': {
    titleBn: 'নম্বর এন্ট্রি',
    titleEn: 'Marks Entry',
    subtitleBn: 'লিখিত, বহুনির্বাচনি ও ব্যবহারিক পরীক্ষার মূল্যায়ন',
    subtitleEn: 'CQ, MCQ & Practical exam evaluation',
  },
  'results-tabulation': {
    titleBn: 'ফলাফল ও ট্যাবুলেশন',
    titleEn: 'Results & Tabulation',
    subtitleBn: 'স্বয়ংক্রিয় ফলাফল, মেধা তালিকা ও প্রিন্টযোগ্য মার্কশিট',
    subtitleEn: 'Automated compilation, merit ranking & transcripts',
  },
  'school-routine': {
    titleBn: 'ক্লাস রুটিন',
    titleEn: 'Class Routine',
    subtitleBn: 'শ্রেণি ও শিক্ষকভিত্তিক রুটিন এবং পিরিয়ড পরিসংখ্যান',
    subtitleEn: 'Class & teacher timetable with workload stats',
  },
  'admin-panel': {
    titleBn: 'অ্যাডমিন প্যানেল',
    titleEn: 'Admin Control',
    subtitleBn: 'শিক্ষক, শ্রেণি, বিষয় বণ্টন, নম্বর অগ্রগতি ও নোটিশ',
    subtitleEn: 'Faculty, matrix, marks submission status & notices',
  },
  'admin-teachers': {
    titleBn: 'শিক্ষক ও রোল',
    titleEn: 'Teachers & Roles',
    subtitleBn: 'শিক্ষক প্রোফাইল, কোড ও অ্যাডমিন রোল ব্যবস্থাপনা',
    subtitleEn: 'Teacher profiles, initials & admin permissions',
  },
  'admin-academic': {
    titleBn: 'শিক্ষাবর্ষ ও শ্রেণি',
    titleEn: 'Academic & Classes',
    subtitleBn: 'সেশন, পরীক্ষার টার্ম ও শাখা কনফিগারেশন',
    subtitleEn: 'Session, exam terms & section setup',
  },
  'admin-matrix': {
    titleBn: 'বিষয় বণ্টন ম্যাট্রিক্স',
    titleEn: 'Subject Matrix',
    subtitleBn: 'শ্রেণি শিক্ষক ও বিষয়ভিত্তিক শিক্ষক নির্ধারণ',
    subtitleEn: 'Class teacher & subject allocations',
  },
  'student-roster': {
    titleBn: 'শিক্ষার্থী তালিকা',
    titleEn: 'Student Roster',
    subtitleBn: 'শ্রেণিভিত্তিক শিক্ষার্থী ভর্তি ও সিএসভি ইমপোর্ট',
    subtitleEn: 'Class student records & CSV bulk import',
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

/**
 * Desktop Clean Fixed Left Sidebar (w-60 bg-slate-900 text-slate-100)
 */
export const PortalSidebar: React.FC<{
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}> = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    setShowPublicWebsite,
    logout,
    classSections,
    selectedAcademicYearId,
    numeralLocale,
  } = useSchool();
  const [logoError, setLogoError] = useState(false);
  const roleBadge = useResolvedRoleBadge();
  const isEn = numeralLocale === 'en';

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

  const navItems: {
    id: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    badge?: string;
  }[] = [
    {
      id: 'teacher-dashboard',
      label: isEn ? 'Dashboard' : 'ড্যাশবোর্ড',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'teacher-dashboard',
      onClick: () => setActiveView('teacher-dashboard'),
    },
    {
      id: 'student-attendance',
      label: isEn ? 'Attendance' : 'হাজিরা',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'student-attendance',
      onClick: () => setActiveView('student-attendance'),
      badge: assignedClassSection
        ? `${assignedClassSection.className}-${assignedClassSection.section}`
        : undefined,
    },
    {
      id: 'exam-marks',
      label: isEn ? 'Marks Entry' : 'নম্বর এন্ট্রি',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'exam-marks',
      onClick: () => setActiveView('exam-marks'),
    },
    {
      id: 'results-tabulation',
      label: isEn ? 'Results' : 'ফলাফল ও ট্যাবুলেশন',
      icon: <Award className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'results-tabulation',
      onClick: () => setActiveView('results-tabulation'),
    },
    {
      id: 'school-routine',
      label: isEn ? 'Class Routine' : 'ক্লাস রুটিন',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      isActive: activeView === 'school-routine',
      onClick: () => setActiveView('school-routine'),
    },
    ...(isAdmin
      ? [
          {
            id: 'admin-panel',
            label: isEn ? 'Admin Panel' : 'অ্যাডমিন প্যানেল',
            icon: <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />,
            isActive: isAdminViewActive,
            onClick: () => setActiveView('admin-panel'),
            badge: 'Admin',
          },
        ]
      : [
          {
            id: 'student-roster',
            label: isEn ? 'Student Roster' : 'শিক্ষার্থী তালিকা',
            icon: <Users className="w-4 h-4 shrink-0" />,
            isActive: activeView === 'student-roster',
            onClick: () => setActiveView('student-roster'),
          },
        ]),
    {
      id: 'school-website',
      label: isEn ? 'School Website' : 'স্কুল ওয়েবসাইট',
      icon: <Globe className="w-4 h-4 shrink-0 text-teal-400" />,
      isActive: false,
      onClick: () => setShowPublicWebsite(true),
    },
  ];

  return (
    <aside
      data-testid="portal-desktop-sidebar"
      aria-label="Desktop Portal Sidebar"
      className="no-print hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-60 bg-slate-900 text-slate-100 border-r border-slate-800 z-40 select-none"
    >
      {/* Top: School Brand Crest & EIIN */}
      <div className="p-4 border-b border-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveView('teacher-dashboard')}
          className="flex items-center gap-3 text-left w-full cursor-pointer group"
        >
          <img
            src={
              !logoError
                ? '/assets/aistudio/school_logo_large_f25747b9.png'
                : SCHOOL_BRAND_INFO.logoUrl
            }
            alt="School Crest"
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-10 h-10 rounded-full object-contain bg-white p-0.5 border border-teal-500/40 shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate group-hover:text-teal-400 transition-colors">
              {isEn ? 'Abutorab High School' : 'আবুতোরাব উচ্চ বিদ্যালয়'}
            </div>
            <div className="text-[11px] font-medium text-teal-400 truncate">
              {isEn ? 'Est. 1914 · EIIN: 104600' : 'স্থাপিত ১৯১৪ · EIIN: 104600'}
            </div>
          </div>
        </button>
      </div>

      {/* Middle: Clean Grouped Navigation */}
      <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isEn ? 'Portal Menu' : 'পোর্টাল মেনু'}
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            data-testid={`sidebar-nav-${item.id}`}
            type="button"
            onClick={item.onClick}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              item.isActive
                ? 'bg-teal-700 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            {item.badge && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                  item.isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-teal-400 border border-slate-700'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: User Profile Card & Sign Out */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-teal-500/40 bg-white shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.teacherCode}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono font-semibold text-teal-400">
                [{currentUser.teacherCode}]
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleBadge.badgeTone}`}
              >
                {isEn ? roleBadge.labelEn : roleBadge.labelBn}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title={isEn ? 'Sign Out' : 'লগআউট'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

/**
 * Slim Single-Line Sticky Top Bar (h-14)
 */
export const HeaderBar: React.FC = () => {
  const {
    currentUser,
    activeView,
    setShowPublicWebsite,
    logout,
    theme,
    toggleTheme,
    numeralLocale,
    toggleNumeralLocale,
    num,
    academicYears,
    selectedAcademicYearId,
    examTerms,
    selectedTermId,
  } = useSchool();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isEn = numeralLocale === 'en';

  if (!currentUser) return null;

  const meta = VIEW_METADATA[activeView] || VIEW_METADATA['teacher-dashboard'];
  const activeYear = academicYears.find((y) => y.id === selectedAcademicYearId);
  const activeTerm = examTerms.find((t) => t.id === selectedTermId);

  return (
    <header className="no-print sticky top-0 z-30 w-full h-14 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/90 dark:border-slate-800 flex items-center px-4 sm:px-6">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Mobile School Crest + Active Screen Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="lg:hidden shrink-0">
            <img
              src="/assets/aistudio/school_logo_large_f25747b9.png"
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-contain bg-white border border-teal-600/30 p-0.5"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {isEn ? meta.titleEn : meta.titleBn}
              </h1>
              {activeTerm && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tabular-nums">
                  {activeTerm.termType} · {num(activeYear?.year || '2026')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls (BN/EN toggle, Theme toggle, Install, Avatar) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA App Install */}
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white bg-teal-700 hover:bg-[#0d5c56] rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? 'Install App' : 'অ্যাপ ইনস্টল'}</span>
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iOS</span>
            </button>
          )}

          {/* Bengali / English Numeral & UI Toggle */}
          <button
            type="button"
            onClick={toggleNumeralLocale}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap tabular-nums cursor-pointer"
          >
            {isEn ? 'BN (১২৩)' : 'EN (123)'}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* School Website Quick Link (Desktop) */}
          <button
            type="button"
            onClick={() => setShowPublicWebsite(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>{isEn ? 'Website' : 'স্কুল ওয়েবসাইট'}</span>
          </button>

          {/* User Avatar Chip */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-teal-600/40 bg-white"
              />
            ) : (
              <div
                title={`${currentUser.name} (${currentUser.teacherCode})`}
                className="w-7 h-7 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center shadow-2xs"
              >
                {currentUser.teacherCode}
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              title={isEn ? 'Sign Out' : 'লগআউট'}
              className="lg:hidden p-1 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              iPhone / iPad হোম স্ক্রিনে ইনস্টল করুন
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ১. Safari ব্রাউজারের নিচে <strong>Share</strong> বাটনে চাপুন।
              <br />
              ২. স্ক্রল করে <strong>Add to Home Screen</strong> চাপুন।
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-teal-700 text-white py-2 text-xs font-bold cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

/**
 * Mobile Fixed 5-Tab Bottom Navigation Bar (< 1024px, lg:hidden)
 * Tabs: হোম, হাজিরা, নম্বর, ফলাফল, মেনু
 */
export const MobileBottomNav: React.FC = () => {
  const { currentUser, activeView, setActiveView, setShowPublicWebsite, logout, numeralLocale } =
    useSchool();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roleBadge = useResolvedRoleBadge();
  const isEn = numeralLocale === 'en';

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isMenuTabActive =
    activeView === 'school-routine' ||
    activeView === 'admin-panel' ||
    activeView === 'admin-teachers' ||
    activeView === 'admin-academic' ||
    activeView === 'admin-matrix' ||
    activeView === 'student-roster';

  const bottomTabs = [
    {
      id: 'teacher-dashboard',
      label: isEn ? 'Home' : 'হোম',
      icon: <LayoutDashboard className="w-5 h-5" />,
      isActive: activeView === 'teacher-dashboard',
      onClick: () => {
        setDrawerOpen(false);
        setActiveView('teacher-dashboard');
      },
    },
    {
      id: 'student-attendance',
      label: isEn ? 'Attendance' : 'হাজিরা',
      icon: <CheckSquare className="w-5 h-5" />,
      isActive: activeView === 'student-attendance',
      onClick: () => {
        setDrawerOpen(false);
        setActiveView('student-attendance');
      },
    },
    {
      id: 'exam-marks',
      label: isEn ? 'Marks' : 'নম্বর',
      icon: <BookOpen className="w-5 h-5" />,
      isActive: activeView === 'exam-marks',
      onClick: () => {
        setDrawerOpen(false);
        setActiveView('exam-marks');
      },
    },
    {
      id: 'results-tabulation',
      label: isEn ? 'Results' : 'ফলাফল',
      icon: <Award className="w-5 h-5" />,
      isActive: activeView === 'results-tabulation',
      onClick: () => {
        setDrawerOpen(false);
        setActiveView('results-tabulation');
      },
    },
    {
      id: 'menu-more',
      label: isEn ? 'Menu' : 'মেনু',
      icon: <Menu className="w-5 h-5" />,
      isActive: isMenuTabActive || drawerOpen,
      onClick: () => setDrawerOpen((prev) => !prev),
    },
  ];

  return (
    <>
      {/* Mobile Drawer Sheet when "মেনু" is tapped */}
      {drawerOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.teacherCode}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleBadge.badgeTone}`}
                    >
                      {isEn ? roleBadge.labelEn : roleBadge.labelBn}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
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
                    setDrawerOpen(false);
                  }}
                  className="col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-teal-700 text-white font-semibold text-xs shadow-xs"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isEn ? 'Admin Control Center' : 'অ্যাডমিন প্যানেল'}</span>
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveView('school-routine');
                  setDrawerOpen(false);
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{isEn ? 'Class Routine' : 'ক্লাস রুটিন'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('student-roster');
                  setDrawerOpen(false);
                }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{isEn ? 'Student Roster' : 'শিক্ষার্থী তালিকা'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPublicWebsite(true);
                  setDrawerOpen(false);
                }}
                className="col-span-2 flex items-center gap-2.5 p-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold text-xs"
              >
                <Globe className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <span>{isEn ? 'Public School Website' : 'স্কুল ওয়েবসাইট'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60"
              >
                <LogOut className="w-4 h-4" />
                <span>{isEn ? 'Sign Out' : 'লগআউট'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed 5-Tab Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-around px-2"
      >
        {bottomTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
              tab.isActive
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span className="text-[11px] mt-0.5 leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

/**
 * Collapsible Floating Developer Role Switcher
 * Placed neatly in the corner for Super Admin sandbox testing, without cluttering the main header!
 */
export const DevRoleSwitcherPopover: React.FC = () => {
  const {
    currentUser,
    users,
    enterSandboxAs,
    activeView,
    setActiveView,
    isFirebaseAuthenticated,
    isSuperAdminSession,
  } = useSchool();
  const [open, setOpen] = useState(false);

  if (!isSuperAdminSession || isFirebaseAuthenticated || !currentUser) return null;

  return (
    <div className="no-print fixed bottom-20 lg:bottom-4 left-4 z-40">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-teal-400 border border-slate-700 text-xs font-semibold shadow-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview User:</span>
          <span className="font-mono text-white font-bold">{currentUser.teacherCode}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {open && (
          <div className="absolute bottom-10 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xl space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              Role Switcher (Super Admin)
            </div>
            <select
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
                setOpen(false);
              }}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-2"
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
      </div>
    </div>
  );
};
