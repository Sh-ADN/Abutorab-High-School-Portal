import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LogIn,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  CLASS_FILTER_OPTIONS,
  HERO_CAROUSEL_SLIDES,
  LEADERSHIP_PROFILES,
  LeadershipProfile,
  MOTIVATIONAL_TICKER_ITEMS,
  PUBLIC_STAFF_DIRECTORY,
  PUBLIC_TEACHERS_DIRECTORY,
  PublicTeacherDirectoryItem,
  SCHOOL_BRAND_INFO,
  SCHOOL_FACILITIES,
  buildWhatsAppUrl,
  computeLiveExamSummaryForClassAndTerm,
  formatBengaliLiveDate,
} from '../data/schoolWebsiteData';
import { NoticeRecord } from '../types/school';
import { formatNumeral } from '../utils/schoolLogic';
import { MarksheetTranscriptView } from './MarksheetTranscriptView';
import {
  compileClassTabulationFromFirestore,
  computeStudentAttendanceSummary,
  StudentResult,
} from '../utils/tabulationAndMeritEngine';

interface PublicSchoolWebsiteProps {
  onOpenLoginModal?: () => void;
}

const TeacherAvatar: React.FC<{
  teacher: PublicTeacherDirectoryItem;
  sizeClass?: string;
}> = ({ teacher, sizeClass = 'w-16 h-16' }) => {
  const [imgErr, setImgErr] = useState(false);

  if (teacher.photoUrl && !imgErr) {
    return (
      <img
        src={teacher.photoUrl}
        alt={teacher.name}
        referrerPolicy="no-referrer"
        onError={() => setImgErr(true)}
        className={`${sizeClass} rounded-2xl object-cover border-2 ${
          teacher.isSenior
            ? 'border-teal-600 dark:border-teal-400'
            : 'border-slate-200 dark:border-slate-700'
        } bg-slate-100 dark:bg-slate-800 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
        teacher.isSenior
          ? 'bg-teal-700 text-white border-teal-600'
          : 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
      }`}
    >
      {teacher.teacherCode}
    </div>
  );
};

export const PublicSchoolWebsite: React.FC<PublicSchoolWebsiteProps> = ({
  onOpenLoginModal,
}) => {
  const {
    currentUser,
    setShowPublicWebsite,
    theme,
    toggleTheme,
    students,
    examTerms,
    classSections,
    subjectAssignments,
    subjectMarks,
    attendanceRecords,
    academicYears,
    notices,
    saveNotice,
    deleteNotice,
    signInWithGoogle,
    enterSandboxAs,
    authError,
    users,
  } = useSchool();

  const num = (val: number | string | undefined | null) => formatNumeral(val, 'bn');

  const [logoFallbackStage, setLogoFallbackStage] = useState<0 | 1 | 2>(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideImgErrors, setSlideImgErrors] = useState<Record<string, boolean>>({});
  const [leaderImgErrors, setLeaderImgErrors] = useState<Record<string, boolean>>({});

  // Interactive Exam & Result Summary state
  const [selectedSessionYear, setSelectedSessionYear] = useState<string>('2026');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedExamCardTermId, setSelectedExamCardTermId] = useState<string>(
    () => examTerms.find((t) => t.isActive)?.id || examTerms[0]?.id || 'term_2026_half'
  );

  // Public Student Result Lookup State
  const [lookupTermId, setLookupTermId] = useState<string>(
    () => examTerms[0]?.id || 'term_2026_half'
  );
  const [lookupClassSectionId, setLookupClassSectionId] = useState<string>('');
  const [lookupRoll, setLookupRoll] = useState<string>('');
  const [lookupSearched, setLookupSearched] = useState(false);
  const [lookupResult, setLookupResult] = useState<StudentResult | null>(null);
  const [lookupAttendance, setLookupAttendance] = useState<{
    workingDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercent: number;
  } | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  // Initialize lookupClassSectionId if not set
  useEffect(() => {
    if (!lookupClassSectionId && classSections.length > 0) {
      setLookupClassSectionId(classSections[0].id);
    }
  }, [classSections, lookupClassSectionId]);

  const selectedLookupTerm = useMemo(() => {
    return examTerms.find((t) => t.id === lookupTermId) || examTerms[0];
  }, [examTerms, lookupTermId]);

  const selectedLookupClass = useMemo(() => {
    return classSections.find((c) => c.id === lookupClassSectionId) || classSections[0];
  }, [classSections, lookupClassSectionId]);

  const handleSearchStudentResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupClassSectionId || !lookupTermId || !lookupRoll.trim()) return;

    const rollNum = Number(lookupRoll.trim());
    if (Number.isNaN(rollNum)) return;

    const compiled = compileClassTabulationFromFirestore({
      classSectionId: lookupClassSectionId,
      termId: lookupTermId,
      students,
      subjectAssignments,
      subjectMarks,
    });

    const found = compiled.results.find((r) => r.student.roll === rollNum);
    setLookupResult(found || null);
    if (found) {
      const att = computeStudentAttendanceSummary(lookupClassSectionId, rollNum, attendanceRecords);
      setLookupAttendance(att);
    } else {
      setLookupAttendance(null);
    }
    setLookupSearched(true);
  };

  // Modals state
  const [activeNoticeModal, setActiveNoticeModal] = useState<NoticeRecord | null>(null);
  const [activeLeaderModal, setActiveLeaderModal] = useState<LeadershipProfile | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Admin Notice Editor Modal state
  const [noticeEditorOpen, setNoticeEditorOpen] = useState(false);
  const [noticeFormTitle, setNoticeFormTitle] = useState('');
  const [noticeFormDate, setNoticeFormDate] = useState('২০ মে, ২০২৬');
  const [noticeFormCategory, setNoticeFormCategory] = useState('পরীক্ষা ও মূল্যায়ন');
  const [noticeFormImportant, setNoticeFormImportant] = useState(true);
  const [noticeFormSummary, setNoticeFormSummary] = useState('');
  const [noticeFormContent, setNoticeFormContent] = useState('');
  const [noticeFormError, setNoticeFormError] = useState('');

  // Teacher filter state
  const [teacherFilterMode, setTeacherFilterMode] = useState<'ALL' | 'SENIOR' | 'ASSISTANT'>(
    'ALL'
  );

  // Auto-play 6-slide Hero Carousel every 4.5s
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % HERO_CAROUSEL_SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const liveBengaliDate = useMemo(() => formatBengaliLiveDate(new Date()), []);

  const totalActiveStudentsCount = useMemo(
    () => students.filter((s) => s.status === 'active').length,
    [students]
  );

  // Exam cards to display for the selected session
  const examCardsList = useMemo(() => {
    const matchedYear = academicYears.find((y) => y.year === selectedSessionYear);
    const filtered = matchedYear
      ? examTerms.filter((t) => t.academicYearId === matchedYear.id)
      : examTerms;
    if (filtered.length > 0) return filtered;
    return examTerms;
  }, [academicYears, examTerms, selectedSessionYear]);

  const activeExamTerm = useMemo(
    () =>
      examCardsList.find((t) => t.id === selectedExamCardTermId) ||
      examCardsList[0] || {
        id: 'term_2026_half',
        name: 'Half-Yearly Examination 2026 (অর্ধবার্ষিক পরীক্ষা)',
        termType: 'Half-Yearly',
        totalMarksDefault: 100,
        isActive: true,
      },
    [examCardsList, selectedExamCardTermId]
  );

  const liveExamSummary = useMemo(
    () =>
      computeLiveExamSummaryForClassAndTerm({
        students,
        subjectMarks,
        classNameFilter: selectedClassFilter,
        termId: activeExamTerm.id,
        termName: activeExamTerm.name,
        sessionYear: selectedSessionYear === '2026' ? '২০২৬' : selectedSessionYear,
      }),
    [students, subjectMarks, selectedClassFilter, activeExamTerm, selectedSessionYear]
  );

  const filteredTeachers = useMemo(() => {
    if (teacherFilterMode === 'SENIOR') {
      return PUBLIC_TEACHERS_DIRECTORY.filter((t) => t.isSenior);
    }
    if (teacherFilterMode === 'ASSISTANT') {
      return PUBLIC_TEACHERS_DIRECTORY.filter((t) => !t.isSenior);
    }
    return PUBLIC_TEACHERS_DIRECTORY;
  }, [teacherFilterMode]);

  const handlePortalAction = () => {
    if (currentUser) {
      setShowPublicWebsite(false);
    } else if (onOpenLoginModal) {
      onOpenLoginModal();
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleGoogleSignInClick = async () => {
    setIsGoogleSigningIn(true);
    try {
      await signInWithGoogle();
      setLoginModalOpen(false);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleCreateNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeFormTitle.trim() || !noticeFormSummary.trim()) {
      setNoticeFormError('অনুগ্রহ করে নোটিশের শিরোনাম এবং সংক্ষিপ্ত বিবরণ পূরণ করুন।');
      return;
    }
    setNoticeFormError('');
    await saveNotice({
      title: noticeFormTitle,
      date: noticeFormDate,
      category: noticeFormCategory,
      isImportant: noticeFormImportant,
      summary: noticeFormSummary,
      content: noticeFormContent || noticeFormSummary,
    });
    setNoticeFormTitle('');
    setNoticeFormSummary('');
    setNoticeFormContent('');
    setNoticeEditorOpen(false);
  };

  const resolvedLogoSrc =
    logoFallbackStage === 0
      ? SCHOOL_BRAND_INFO.logoUrl
      : logoFallbackStage === 1
      ? SCHOOL_BRAND_INFO.fallbackLogoUrl
      : '';

  const navLinks = [
    { href: '#home', label: 'হোম' },
    { href: '#leadership', label: 'নেতৃত্ব' },
    { href: '#exams-results', label: 'পরীক্ষা ও ফলাফল' },
    { href: '#notices', label: 'নোটিশ' },
    { href: '#teachers', label: 'শিক্ষক' },
    { href: '#staff', label: 'স্টাফ' },
    { href: '#contact', label: 'যোগাযোগ' },
  ];

  const activeSlide = HERO_CAROUSEL_SLIDES[currentSlideIndex] || HERO_CAROUSEL_SLIDES[0];

  return (
    <div
      id="home"
      className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-teal-700 selection:text-white"
    >
      {/* 1. Top Motivational Ribbon */}
      <div className="w-full bg-[#0d5c56] text-teal-50 border-b border-teal-800/60 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-medium tracking-wide">
            {MOTIVATIONAL_TICKER_ITEMS.slice(0, 4).map((quote) => (
              <span key={quote} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-amber-400">{quote.slice(0, 1)}</span>
                <span>{quote.slice(2)}</span>
              </span>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-teal-100/90 tabular-nums">
            <span>EIIN: 104600</span>
            <span>·</span>
            <span>MPO: 207121301</span>
            <span>·</span>
            <span>স্থাপিতঃ ১৯১৪ ইং</span>
          </div>
        </div>
      </div>

      {/* 2. Sticky Glassmorphic Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* School Logo + Title & Subtitle */}
          <a
            href="#home"
            className="flex items-center gap-3 min-w-0 group focus:outline-none"
          >
            {resolvedLogoSrc ? (
              <img
                src={resolvedLogoSrc}
                alt={SCHOOL_BRAND_INFO.titleBn}
                referrerPolicy="no-referrer"
                onError={() =>
                  setLogoFallbackStage((prev) => (prev === 0 ? 1 : 2))
                }
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-contain bg-white p-0.5 border-2 border-teal-700/30 dark:border-teal-500/40 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                ATHS
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {SCHOOL_BRAND_INFO.titleBn}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
                {SCHOOL_BRAND_INFO.subtitleBn}
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="প্রধান নেভিগেশন"
            className="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-400 transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Controls: Theme Toggle + Login / Go to Portal + Mobile Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-teal-600 dark:hover:border-teal-400 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePortalAction}
              aria-label={
                currentUser
                  ? `পোর্টালে ফিরুন (${currentUser.teacherCode})`
                  : 'শিক্ষক / অ্যাডমিন লগইন'
              }
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {currentUser ? (
                <>
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">পোর্টালে ফিরুন ({currentUser.teacherCode})</span>
                  <span className="sm:hidden">পোর্টাল</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">শিক্ষক / অ্যাডমিন লগইন</span>
                  <span className="sm:hidden">লগইন</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="মোবাইল মেনু খুলুন"
              className="xl:hidden p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Menu */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden flex justify-end bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="মোবাইল নেভিগেশন মেনু"
        >
          <div className="w-80 max-w-full bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="font-bold text-base text-teal-700 dark:text-teal-400">
                  {SCHOOL_BRAND_INFO.titleBn}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="মোবাইল মেনু বন্ধ করুন"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-5 flex flex-col gap-1.5">
                {navLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handlePortalAction();
                }}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {currentUser ? 'একাডেমিক পোর্টালে ফিরুন' : 'শিক্ষক / অ্যাডমিন লগইন'}
                </span>
              </button>
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                EIIN: 104600 · MPO: 207121301 · স্থাপিতঃ ১৯১৪ ইং
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Hero Section with Auto-Slider */}
      <section className="relative bg-gradient-to-br from-teal-900 via-[#0d5c56] to-slate-900 text-white pt-10 pb-24 sm:pt-14 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Badges, Headline, Subtitle, CTAs */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/80 border border-teal-500/40 text-teal-100 text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{liveBengaliDate}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{SCHOOL_BRAND_INFO.heritageBadgeBn}</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.2] text-white">
                {SCHOOL_BRAND_INFO.heroHeadingBn}
              </h1>

              <p className="text-base sm:text-lg text-teal-100/95 leading-relaxed max-w-2xl">
                {SCHOOL_BRAND_INFO.heroSubtitleBn}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#vision-facilities"
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>প্রতিষ্ঠানের সারাংশ</span>
                </a>

                <a
                  href={SCHOOL_BRAND_INFO.boardResultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>বোর্ড ফলাফল</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handlePortalAction}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>{currentUser ? 'পোর্টালে প্রবেশ করুন' : 'পোর্টাল লগইন'}</span>
                </button>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-teal-200/90 border-t border-teal-700/60">
                <span>অবস্থানঃ আবুতোরাব, মীরসরাই, চট্টগ্রাম</span>
                <span>·</span>
                <span>বিভাগঃ বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা</span>
              </div>
            </div>

            {/* Right Column: 6-Photo Auto-Playing Carousel (4.5s interval) */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border-2 border-teal-400/30 bg-slate-900 shadow-2xl aspect-16/10">
                {!slideImgErrors[activeSlide.id] ? (
                  <img
                    key={activeSlide.id}
                    src={activeSlide.imageUrl}
                    alt={activeSlide.caption}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setSlideImgErrors((prev) => ({ ...prev, [activeSlide.id]: true }))
                    }
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center">
                    <GraduationCap className="w-14 h-14 text-teal-300 mb-3" />
                    <div className="text-lg font-bold text-white">
                      {SCHOOL_BRAND_INFO.titleBn}
                    </div>
                    <div className="text-xs text-teal-200 mt-1">
                      {activeSlide.caption}
                    </div>
                  </div>
                )}

                {/* Gradient Overlay & Caption */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-4 sm:p-5 flex items-end justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-teal-600/90 text-[11px] font-semibold text-white mb-1">
                      ক্যাম্পাস অ্যালবাম ({num(currentSlideIndex + 1)}/{num(HERO_CAROUSEL_SLIDES.length)})
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      {activeSlide.caption}
                    </h2>
                    <p className="text-xs text-slate-300">{activeSlide.subCaption}</p>
                  </div>

                  {/* Prev / Next Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentSlideIndex(
                          (prev) =>
                            (prev - 1 + HERO_CAROUSEL_SLIDES.length) %
                            HERO_CAROUSEL_SLIDES.length
                        )
                      }
                      aria-label="পূর্ববর্তী ছবি"
                      className="p-2 rounded-lg bg-slate-900/75 hover:bg-teal-700 text-white border border-white/15 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentSlideIndex(
                          (prev) => (prev + 1) % HERO_CAROUSEL_SLIDES.length
                        )
                      }
                      aria-label="পরবর্তী ছবি"
                      className="p-2 rounded-lg bg-slate-900/75 hover:bg-teal-700 text-white border border-white/15 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Slide Indicator Dots */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-xs px-2.5 py-1.5 rounded-full">
                  {HERO_CAROUSEL_SLIDES.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      aria-label={`স্লাইড ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentSlideIndex
                          ? 'w-6 bg-amber-400'
                          : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Floating KPI Stats Band (4 Elevated Cards Overlapping Hero Bottom) */}
      <section aria-label="বিদ্যালয়ের মূল পরিসংখ্যান" className="relative z-20 -mt-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-teal-600/20 dark:border-teal-500/30 p-5 shadow-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                মোট শিক্ষার্থী (লাইভ ডাটাবেস)
              </p>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {num(totalActiveStudentsCount)} জন
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ৬ষ্ঠ থেকে ১০ম শ্রেণি · সক্রিয় রোস্টার
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-emerald-600/20 dark:border-emerald-500/30 p-5 shadow-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                অভিজ্ঞ শিক্ষক
              </p>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                ১৫ জন
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                প্রধান শিক্ষক, সিনিয়র ও সহকারী শিক্ষকবৃন্দ
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-amber-500/25 dark:border-amber-500/30 p-5 shadow-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                নন-টিচিং স্টাফ
              </p>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                ৭ জন
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                কম্পিউটার ল্যাব, অফিস ও নিরাপত্তা কর্মী
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="rounded-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-teal-600/20 dark:border-teal-500/30 p-5 shadow-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                প্রতিষ্ঠাকাল / ঐতিহ্য
              </p>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                ১৯১৪ · ১১২+ বছর
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                মীরসরাই, চট্টগ্রামের শতবর্ষী বিদ্যাপীঠ
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Exam Cards & Live Result Summary (পরীক্ষা কার্ড ও ফলাফল সামারি) */}
      <section id="exams-results" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Academic Evaluation & Live Firestore Sync
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              পরীক্ষা কার্ড ও ফলাফল সামারি
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              শ্রেণি (৬ষ্ঠ–১০ম) এবং শিক্ষাবর্ষ অনুযায়ী চলমান ও সম্পন্ন পরীক্ষার লাইভ পরিসংখ্যান দেখুন
            </p>
          </div>

          {/* Session & Class Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="public-session-select" className="sr-only">
              শিক্ষাবর্ষ নির্বাচন করুন
            </label>
            <select
              id="public-session-select"
              value={selectedSessionYear}
              onChange={(e) => setSelectedSessionYear(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="2026">শিক্ষাবর্ষঃ ২০২৬ (সক্রিয়)</option>
              {academicYears
                .filter((y) => y.year !== '2026')
                .map((y) => (
                  <option key={y.id} value={y.year}>
                    শিক্ষাবর্ষঃ {y.year}
                  </option>
                ))}
            </select>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
              {CLASS_FILTER_OPTIONS.map((opt) => {
                const active = selectedClassFilter === opt.className;
                return (
                  <button
                    key={opt.className}
                    type="button"
                    onClick={() => setSelectedClassFilter(opt.className)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {opt.shortBn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Clickable Exam Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {examCardsList.map((term) => {
              const isSelected = term.id === activeExamTerm.id;
              const cardStats = computeLiveExamSummaryForClassAndTerm({
                students,
                subjectMarks,
                classNameFilter: selectedClassFilter,
                termId: term.id,
                termName: term.name,
                sessionYear: '২০২৬',
              });

              return (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => setSelectedExamCardTermId(term.id)}
                  className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-600 shadow-lg ring-2 ring-teal-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-600 dark:hover:border-teal-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300'
                        }`}
                      >
                        {term.termType}
                      </span>
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        পূর্ণমানঃ {num(term.totalMarksDefault)}
                      </span>
                    </div>

                    <h3
                      className={`text-base font-bold mt-3 ${
                        isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {term.name}
                    </h3>
                    <p
                      className={`text-xs mt-1 ${
                        isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {cardStats.bengaliClassLabel} · শিক্ষাবর্ষ ২০২৬
                    </p>
                  </div>

                  <div
                    className={`pt-3 border-t flex items-center justify-between text-xs tabular-nums ${
                      isSelected
                        ? 'border-teal-500/50 text-teal-50'
                        : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>মোটঃ {num(cardStats.totalStudents)} জন</span>
                    <span>পরীক্ষার্থীঃ {num(cardStats.examinedCount)} জন</span>
                    <span className="font-semibold">বিস্তারিত →</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Live Result Summary Panel */}
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>লাইভ ফলাফল সামারি প্যানেল</span>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeExamTerm.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  নির্বাচিত শ্রেণিঃ {liveExamSummary.bengaliClassLabel} · শিক্ষাবর্ষঃ{' '}
                  {liveExamSummary.sessionYear}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-xs font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                {num(liveExamSummary.participationRate)}% অংশগ্রহণ
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-center">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Students (মোট শিক্ষার্থী)
                </div>
                <div
                  data-testid="live-summary-total"
                  className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums"
                >
                  {num(liveExamSummary.totalStudents)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-center">
                <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                  Examined (পরীক্ষায় অংশগ্রহণ)
                </div>
                <div
                  data-testid="live-summary-examined"
                  className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums"
                >
                  {num(liveExamSummary.examinedCount)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-center">
                <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  Absent / Pending (অনুপস্থিত/বাকি)
                </div>
                <div
                  data-testid="live-summary-absent"
                  className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums"
                >
                  {num(liveExamSummary.absentCount)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>ফলাফল এন্ট্রি ও মূল্যায়ন অগ্রগতি</span>
                <span className="font-mono font-semibold tabular-nums">
                  {num(liveExamSummary.examinedCount)} / {num(liveExamSummary.totalStudents)} জন
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(6, liveExamSummary.participationRate))}%` }}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                পূর্ণাঙ্গ ট্যাবুলেশন শিট, মেধা তালিকা ও মার্কশিট পোর্টালে সংরক্ষিত
              </span>
              <button
                type="button"
                onClick={handlePortalAction}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                {currentUser ? 'রেজাল্ট মডিউল খুলুন' : 'লগইন করে ফলাফল দেখুন'}
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Student Result Lookup Card */}
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl mx-auto text-center space-y-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <Award className="w-3.5 h-3.5" />
              <span>অনলাইন শিক্ষার্থী ফলাফল ও মার্কশিট অনুসন্ধান</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              আপনার ফলাফল ও অফিসিয়াল মার্কশিট খুঁজুন
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              পরীক্ষার টার্ম, শ্রেণি ও রোল নম্বর নির্বাচন করে তাৎক্ষণিকভাবে ব্যক্তিগত ফলাফল ও ট্রান্সক্রিপ্ট দেখুন
            </p>
          </div>

          <form
            onSubmit={handleSearchStudentResult}
            className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
          >
            <div>
              <label
                htmlFor="lookup-term-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                পরীক্ষার টার্ম
              </label>
              <select
                id="lookup-term-select"
                value={lookupTermId}
                onChange={(e) => {
                  setLookupTermId(e.target.value);
                  setLookupSearched(false);
                }}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 focus:ring-1 focus:ring-teal-500"
              >
                {examTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="lookup-class-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                শ্রেণি ও শাখা
              </label>
              <select
                id="lookup-class-select"
                value={lookupClassSectionId}
                onChange={(e) => {
                  setLookupClassSectionId(e.target.value);
                  setLookupSearched(false);
                }}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 focus:ring-1 focus:ring-teal-500"
              >
                {classSections.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.className} - শাখা {cs.section}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="lookup-roll-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                রোল নম্বর
              </label>
              <input
                id="lookup-roll-input"
                type="number"
                min="1"
                placeholder="যেমন: ১"
                value={lookupRoll}
                onChange={(e) => {
                  setLookupRoll(e.target.value);
                  setLookupSearched(false);
                }}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ফলাফল খুঁজুন</span>
              </button>
            </div>
          </form>

          {/* Search Result Display */}
          {lookupSearched && (
            <div className="max-w-3xl mx-auto mt-6">
              {lookupResult ? (
                <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-200/60 dark:border-teal-900/40 pb-4">
                    <div>
                      <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                        শিক্ষার্থী পরিচিতি
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {lookupResult.student.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        শ্রেণি: <strong>{selectedLookupClass?.className}</strong> · শাখা: <strong>{selectedLookupClass?.section}</strong> · রোল: <strong>#{num(lookupResult.student.roll)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTranscriptModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>অফিসিয়াল মার্কশিট দেখুন</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center tabular-nums">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">মোট প্রাপ্ত নম্বর</span>
                      <strong className="text-lg font-bold text-slate-900 dark:text-white">
                        {num(lookupResult.grandTotal)}
                      </strong>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">লেটার গ্রেড</span>
                      <strong
                        className={`text-lg font-bold ${
                          lookupResult.letterGrade === 'F'
                            ? 'text-rose-600'
                            : lookupResult.letterGrade === 'A+'
                            ? 'text-emerald-600'
                            : 'text-teal-700 dark:text-teal-400'
                        }`}
                      >
                        {lookupResult.letterGrade}
                      </strong>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">জিপিএ (GPA)</span>
                      <strong className="text-lg font-bold text-slate-900 dark:text-white">
                        {lookupResult.gpa !== null ? num(lookupResult.gpa.toFixed(2)) : num('0.00')}
                      </strong>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ফলাফল স্ট্যাটাস</span>
                      <strong
                        className={`text-lg font-bold ${
                          lookupResult.letterGrade === 'F'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {lookupResult.letterGrade === 'F' ? 'অকৃতকার্য' : 'উত্তীর্ণ'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-5 text-center text-xs text-rose-800 dark:text-rose-300">
                  <p className="font-bold">উক্ত রোল নম্বরের কোনো ফলাফল পাওয়া যায়নি।</p>
                  <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-400">
                    অনুগ্রহ করে টার্ম, শ্রেণি ও শাখা এবং রোল নম্বর সঠিক আছে কিনা পুনরায় পরীক্ষা করুন।
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. Notice Board (নোটিশ বোর্ড) & Leadership Messages (বাণী) */}
      <section className="py-16 bg-slate-100/80 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left 5 Cols: Timeline Notice Board */}
          <div id="notices" className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Official Announcements
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span>নোটিশ বোর্ড</span>
                </h2>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setNoticeEditorOpen(true)}
                  className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন নোটিশ</span>
                </button>
              )}
            </div>

            <div className="relative pl-5 border-l-2 border-teal-600/40 dark:border-teal-500/40 space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:border-teal-600 dark:hover:border-teal-500 transition-colors"
                >
                  {/* Timeline Dot */}
                  <span
                    className={`absolute -left-[27px] top-5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      notice.isImportant ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {notice.date}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                        {notice.category}
                      </span>
                    </div>

                    {notice.isImportant && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                        গুরুত্বপূর্ণ
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                    {notice.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {notice.summary}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveNoticeModal(notice)}
                      className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>পূর্ণাঙ্গ নোটিশ পড়ুন →</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => deleteNotice(notice.id)}
                        aria-label={`মুছে ফেলুন ${notice.title}`}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 7 Cols: Leadership Messages (বাণী) */}
          <div id="leadership" className="lg:col-span-7 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Institutional Leadership
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                নেতৃত্ব ও বাণী
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                বিদ্যালয় পরিচালনা পর্ষদ ও প্রধান শিক্ষকের দিকনির্দেশনামূলক বাণী
              </p>
            </div>

            <div className="space-y-4">
              {LEADERSHIP_PROFILES.map((leader) => {
                const showPhoto = leader.photoUrl && !leaderImgErrors[leader.id];
                return (
                  <div
                    key={leader.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start gap-5"
                  >
                    {showPhoto ? (
                      <img
                        src={leader.photoUrl}
                        alt={leader.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setLeaderImgErrors((prev) => ({ ...prev, [leader.id]: true }))
                        }
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-teal-600 dark:border-teal-400 shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-teal-700 to-[#0d5c56] text-white flex flex-col items-center justify-center font-bold shrink-0 border-2 border-teal-500/30">
                        <GraduationCap className="w-8 h-8 text-amber-300 mb-1" />
                        <span className="text-[11px]">{leader.roleTitle.split(' ')[0]}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
                          {leader.roleTitle}
                        </span>
                        {leader.qualification && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            · {leader.qualification}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        {leader.name}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        “{leader.shortQuote}”
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveLeaderModal(leader)}
                          className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          বিস্তারিত বাণী পড়ুন →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Complete Teachers Directory (আমাদের শিক্ষকমণ্ডলী - 15 Teachers) */}
      <section id="teachers" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Faculty Directory · 15 Dedicated Educators
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              আমাদের শিক্ষকমণ্ডলী (১৫ জন)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক, সিনিয়র শিক্ষক ও সহকারী শিক্ষকবৃন্দের তালিকা ও সরাসরি যোগাযোগের মাধ্যম
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setTeacherFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                teacherFilterMode === 'ALL'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              সকল শিক্ষক ({num(15)})
            </button>
            <button
              type="button"
              onClick={() => setTeacherFilterMode('SENIOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                teacherFilterMode === 'SENIOR'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              প্রধান ও সিনিয়র শিক্ষক ({num(7)})
            </button>
            <button
              type="button"
              onClick={() => setTeacherFilterMode('ASSISTANT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                teacherFilterMode === 'ASSISTANT'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              সহকারী শিক্ষক ({num(8)})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const waUrl = buildWhatsAppUrl(teacher.phone);
            return (
              <div
                key={teacher.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border p-5 flex flex-col justify-between gap-4 transition-all ${
                  teacher.isSenior
                    ? 'border-teal-600/35 dark:border-teal-500/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <TeacherAvatar teacher={teacher} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          teacher.isSenior
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {teacher.designation}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        #{num(teacher.serial)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 truncate">
                      {teacher.name}
                    </h3>

                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200/70 dark:border-teal-800/70 text-xs font-medium text-teal-800 dark:text-teal-300">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{teacher.subject}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Details & One-Tap Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                    {teacher.phone ? (
                      <span className="font-mono tabular-nums flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span>{teacher.phone}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        ফোনঃ কার্যালয়ের মাধ্যমে যোগাযোগযোগ্য
                      </span>
                    )}
                    {teacher.email && (
                      <span className="font-mono truncate flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {teacher.phone && (
                      <a
                        href={`tel:${teacher.phone}`}
                        aria-label={`কল করুন ${teacher.name}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-700 hover:text-white text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`হোয়াটসঅ্যাপ ${teacher.name}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {teacher.email && (
                      <a
                        href={`mailto:${teacher.email}`}
                        aria-label={`ইমেইল করুন ${teacher.name}`}
                        className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Non-Teaching Staff Directory (নন-টিচিং স্টাফ - 7 Staff) */}
      <section
        id="staff"
        className="py-16 bg-slate-100/80 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Administrative & Support Staff
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              নন-টিচিং স্টাফ (৭ জন)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              বিদ্যালয়ের প্রশাসনিক, কম্পিউটার ল্যাব, নিরাপত্তা ও সেবা কার্যক্রমে নিয়োজিত কর্মচারীবৃন্দ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PUBLIC_STAFF_DIRECTORY.map((staff) => {
              const waUrl = buildWhatsAppUrl(staff.phone);
              return (
                <div
                  key={staff.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                        {staff.designation}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Index: {staff.indexNo}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2.5">
                      {staff.name}
                    </h3>

                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                      মোবাইলঃ {staff.phone}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <a
                      href={`tel:${staff.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-700 hover:text-white text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Vision, Mission & 4 Facilities Section */}
      <section id="vision-facilities" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-12">
        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-teal-800 to-[#0d5c56] text-white p-6 sm:p-8 shadow-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-teal-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>আমাদের দৃষ্টিভঙ্গি (Our Vision)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mt-3">
              শতবর্ষী ঐতিহ্যের আলোকে আধুনিক, মানবিক ও প্রযুক্তিনির্ভর প্রজন্ম গঠন
            </h3>
            <p className="text-sm text-teal-100/95 mt-3 leading-relaxed">
              ১৯১৪ সাল থেকে আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় মীরসরাই অঞ্চলে শিক্ষার আলোকবর্তিকা বহন করে চলেছে। আমাদের দৃষ্টিভঙ্গি হলো প্রতিটি শিক্ষার্থীকে নৈতিক চরিত্র, বিজ্ঞানমনস্ক চিন্তা ও আধুনিক তথ্যপ্রযুক্তির সমন্বয়ে একবিংশ শতাব্দীর যোগ্য নাগরিক হিসেবে গড়ে তোলা।
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>আমাদের মিশন (Our Mission)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-3">
              শৃঙ্খলাপূর্ণ পাঠদান, শতভাগ উপস্থিতি ও স্বচ্ছ একাডেমিক মূল্যায়ন
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              শ্রেণিকক্ষে নিয়মিত ও আনন্দময় পাঠদান, ডিজিটাল হাজিরা ট্র্যাকিং, এনসিটিবি কারিকুলাম অনুযায়ী নির্ভুল পরীক্ষা মূল্যায়ন এবং সহশিক্ষা কার্যক্রমের মাধ্যমে শিক্ষার্থীদের সুপ্ত প্রতিভার সর্বোচ্চ বিকাশ নিশ্চিত করা।
            </p>
          </div>
        </div>

        {/* 4 Facility Cards */}
        <div>
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Why Choose Abutorab High School
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              বিদ্যালয়ের বিশেষ সুবিধাসমূহ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SCHOOL_FACILITIES.map((fac) => (
              <div
                key={fac.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      বৈশিষ্ট্য {fac.number}
                    </span>
                    <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-3">
                    {fac.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {fac.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                  {fac.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Contact Cards & Embedded Google Map Footer */}
      <section
        id="contact"
        className="py-16 bg-slate-900 text-slate-100 border-t border-slate-800 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Contact Info Cards */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Contact & Location
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  যোগাযোগ ও অবস্থান
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় · আবুতোরাব, মীরসরাই, চট্টগ্রাম
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3.5">
                  <MapPin className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400">ঠিকানা</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      আবুতোরাব বাজার সংলগ্ন, মীরসরাই, চট্টগ্রাম, বাংলাদেশ
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      EIIN: 104600 · MPO Code: 207121301 · স্থাপিতঃ ১৯১৪ ইং
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3.5">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400">
                      প্রধান শিক্ষক ও অফিস মোবাইল
                    </div>
                    <a
                      href={`tel:${SCHOOL_BRAND_INFO.officialPhone}`}
                      className="text-sm font-bold text-white hover:text-teal-300 mt-0.5 block font-mono"
                    >
                      {SCHOOL_BRAND_INFO.officialPhone} (জনাব মর্জিনা আক্তার - প্রধান শিক্ষক)
                    </a>
                    <a
                      href={`mailto:${SCHOOL_BRAND_INFO.officialEmail}`}
                      className="text-xs text-teal-300 hover:underline font-mono mt-0.5 block"
                    >
                      {SCHOOL_BRAND_INFO.officialEmail}
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3.5">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-400">অফিস ও ক্লাস সময়সূচি</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      রবিবার – বৃহস্পতিবারঃ সকাল ৯:৩০ ঘটিকা হতে বিকাল ৪:১৫ ঘটিকা
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      শুক্রবার ও শনিবার সাপ্তাহিক ছুটি
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded Google Map for Abutorab High School */}
            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 min-h-[320px] flex flex-col">
              <iframe
                title="আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় মানচিত্র"
                src="https://www.google.com/maps?q=Abu+Torab+High+School+Mirsarai+Chattogram&output=embed"
                className="w-full flex-1 min-h-[320px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              © {num(2026)} {SCHOOL_BRAND_INFO.titleBn} ({SCHOOL_BRAND_INFO.titleEn}) · সর্বস্বত্ব সংরক্ষিত।
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={SCHOOL_BRAND_INFO.boardResultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-300 transition-colors"
              >
                বোর্ড ফলাফল
              </a>
              <span>·</span>
              <button
                type="button"
                onClick={handlePortalAction}
                className="text-teal-300 hover:underline font-semibold cursor-pointer"
              >
                {currentUser ? 'একাডেমিক পোর্টালে ফিরুন' : 'শিক্ষক / অ্যাডমিন লগইন'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Notice Reader Modal */}
      {activeNoticeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-modal-title"
        >
          <div className="max-w-xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold">
                    {activeNoticeModal.category}
                  </span>
                  <span className="text-slate-500">{activeNoticeModal.date}</span>
                  {activeNoticeModal.isImportant && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                      গুরুত্বপূর্ণ
                    </span>
                  )}
                </div>
                <h3
                  id="notice-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white mt-2"
                >
                  {activeNoticeModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoticeModal(null)}
                aria-label="নোটিশ মডাল বন্ধ করুন"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-[60vh] overflow-y-auto">
              {activeNoticeModal.content}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>প্রকাশনায়ঃ {activeNoticeModal.publishedBy}</span>
              <button
                type="button"
                onClick={() => setActiveNoticeModal(null)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-semibold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leadership Full Message Modal */}
      {activeLeaderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leader-modal-title"
        >
          <div className="max-w-xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold">
                  {activeLeaderModal.roleTitle} · বাণী
                </span>
                <h3
                  id="leader-modal-title"
                  className="text-xl font-bold text-slate-900 dark:text-white mt-1.5"
                >
                  {activeLeaderModal.name}
                </h3>
                {activeLeaderModal.qualification && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeLeaderModal.qualification} · আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveLeaderModal(null)}
                aria-label="বাণী মডাল বন্ধ করুন"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed max-h-[60vh] overflow-y-auto">
              {activeLeaderModal.fullMessage.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় · স্থাপিতঃ ১৯১৪ ইং</span>
              <button
                type="button"
                onClick={() => setActiveLeaderModal(null)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white font-semibold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Notice Editor Modal */}
      {noticeEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-editor-title"
        >
          <form
            onSubmit={handleCreateNoticeSubmit}
            className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 id="notice-editor-title" className="text-lg font-bold text-slate-900 dark:text-white">
                নতুন নোটিশ প্রকাশ করুন
              </h3>
              <button
                type="button"
                onClick={() => setNoticeEditorOpen(false)}
                aria-label="নোটিশ ফর্ম বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {noticeFormError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-200"
              >
                {noticeFormError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="notice-title-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  নোটিশের শিরোনাম
                </label>
                <input
                  id="notice-title-input"
                  type="text"
                  value={noticeFormTitle}
                  onChange={(e) => setNoticeFormTitle(e.target.value)}
                  placeholder="যেমনঃ বার্ষিক ক্রীড়া প্রতিযোগিতা ২০২৬"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="notice-date-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    তারিখ
                  </label>
                  <input
                    id="notice-date-input"
                    type="text"
                    value={noticeFormDate}
                    onChange={(e) => setNoticeFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="notice-category-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    বিভাগ
                  </label>
                  <input
                    id="notice-category-input"
                    type="text"
                    value={noticeFormCategory}
                    onChange={(e) => setNoticeFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="notice-summary-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  সংক্ষিপ্ত সারাংশ
                </label>
                <textarea
                  id="notice-summary-input"
                  rows={2}
                  value={noticeFormSummary}
                  onChange={(e) => setNoticeFormSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="notice-content-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  বিস্তারিত বিবরণ
                </label>
                <textarea
                  id="notice-content-input"
                  rows={4}
                  value={noticeFormContent}
                  onChange={(e) => setNoticeFormContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticeFormImportant}
                  onChange={(e) => setNoticeFormImportant(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span>“গুরুত্বপূর্ণ” ব্যাজসহ প্রকাশ করুন</span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoticeEditorOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-semibold cursor-pointer"
              >
                নোটিশ সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teacher / Admin Portal Login Modal */}
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-login-modal-title"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  {SCHOOL_BRAND_INFO.titleBn}
                </span>
                <h3
                  id="portal-login-modal-title"
                  className="text-xl font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  শিক্ষক ও অ্যাডমিন পোর্টাল লগইন
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  বিদ্যালয়ের নিবন্ধিত শিক্ষক ও অ্যাডমিনগণ অফিসিয়াল Google অ্যাকাউন্ট দিয়ে লগইন করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                aria-label="লগইন মডাল বন্ধ করুন"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200"
              >
                {authError}
              </div>
            )}

            <button
              data-testid="btn-official-google-signin"
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isGoogleSigningIn}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-[#0d5c56] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>
                {isGoogleSigningIn
                  ? 'Google-এর সাথে সংযুক্ত হচ্ছে...'
                  : 'Sign in with Google (গুগল লগইন)'}
              </span>
            </button>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>স্বয়ংক্রিয় প্রোফাইল ও ইমেইল ম্যাচিং</span>
              </div>
              <p className="leading-relaxed text-[11px] text-slate-500 dark:text-slate-400">
                আপনার নিবন্ধিত <span className="font-mono">@gmail.com</span> দিয়ে সাইন-ইন করলে স্বয়ংক্রিয়ভাবে আপনার শিক্ষক কোড, শ্রেণি শিক্ষক রোল ও বিষয় বণ্টন যুক্ত হবে। সুপার অ্যাডমিন (<span className="font-mono">ananneyadebnath@gmail.com</span>) পূর্ণ নিয়ন্ত্রণ সংরক্ষণ করেন।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Official Marksheet Transcript Modal */}
      {showTranscriptModal && lookupResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 no-print">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>অফিসিয়াল মার্কশিট ও গ্রেড ট্রান্সক্রিপ্ট</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranscriptModal(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <MarksheetTranscriptView
              mode="single-term"
              examTitle={selectedLookupTerm?.name || 'Half-Yearly Examination'}
              academicYearLabel="Session 2026"
              classNameLabel={selectedLookupClass?.className || 'Class'}
              sectionLabel={selectedLookupClass?.section || 'A'}
              singleResult={lookupResult}
              attendance={lookupAttendance || undefined}
              num={num}
            />
          </div>
        </div>
      )}
    </div>
  );
};
