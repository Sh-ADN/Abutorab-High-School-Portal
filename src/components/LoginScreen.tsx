import React, { useState } from 'react';
import { LogIn, Moon, Sun, ShieldCheck, UserCheck, ArrowRight, Globe } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';

interface LoginScreenProps {
  onBackToWebsite?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onBackToWebsite }) => {
  const {
    signInWithGoogle,
    enterSandboxAs,
    authError,
    theme,
    toggleTheme,
    numeralLocale,
    toggleNumeralLocale,
    num,
    users,
  } = useSchool();
  const [logoError, setLogoError] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Minimal Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            {!logoError ? (
              <img
                src="/assets/aistudio/school_logo_large_f25747b9.png"
                alt="Abu Torab High School Emblem"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-10 h-10 object-contain rounded-full bg-white p-0.5 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                ATHS
              </div>
            )}
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onBackToWebsite && (
              <button
                type="button"
                onClick={onBackToWebsite}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>স্কুল ওয়েবসাইট</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleNumeralLocale}
              aria-label="Toggle Bengali or English Numerals"
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              {numeralLocale === 'bn' ? 'সংখ্যা: বাংলা (১২৩)' : 'Numerals: EN (123)'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Portal Sign-In */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Column: Institutional Identity & Architecture */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <div>
              <div className="flex items-center gap-4 mb-6">
                {!logoError ? (
                  <img
                    src="/assets/aistudio/school_logo_large_f25747b9.png"
                    alt="Abu Torab High School Official Logo"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="w-20 h-20 object-contain rounded-full bg-white p-1 border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xl shrink-0">
                    ATHS
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    আবুতোরাব উচ্চ বিদ্যালয় · স্থাপিত: {num(1914)} · মিরসরাই, চট্টগ্রাম
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    Academic & Examination Management Portal
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Mirsarai, Chattogram · Academic Session {num(2026)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                Unified faculty and administration platform for Abu Torab High School. Manage teacher
                roles, Class {num(6)} to Class {num(10)} sections, Class Teacher attendance
                permissions, Subject Marks entry matrices, and the Master Student Roster.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    01. Role-Based Governance
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Automatic Admin provisioning for{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      ananneyadebnath@gmail.com
                    </span>
                    . New faculty accounts default to active Teacher profiles with short initials.
                  </p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    02. Class & Subject Matrix
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Class Teachers receive Attendance & Student Roster rights for their section;
                    Subject Teachers receive Exam Marks Entry permissions.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Classes {num(6)}–{num(10)} · Sections A/B & Ka/Kha</span>
              <span>·</span>
              <span>Cloud Firestore & Google Sign-In</span>
            </div>
          </div>

          {/* Right Column: Authentication & Role Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Faculty & Admin Sign-In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sign in with your Google account to sync your profile in Firestore{' '}
                <code className="font-mono">users/&#123;uid&#125;</code>.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200"
                >
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="mt-6 w-full py-3 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Or Instant Role Preview
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Evaluate the Admin Control Panel or Teacher Dashboard directly with pre-loaded Abu
                  Torab High School records:
                </p>

                {users.slice(0, 3).map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => enterSandboxAs(u.uid)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {u.role === 'admin' ? (
                          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {u.name}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          [{u.teacherCode}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {u.role === 'admin' ? 'Admin' : 'Teacher'} · {u.email}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              Motto: জ্ঞানই শক্তি (Knowledge is Power) · Established {num(1914)}
            </p>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Abu Torab High School (আবুতোরাব উচ্চ বিদ্যালয়), Mirsarai, Chattogram</span>
          <span className="tabular-nums">EIIN: {num(104652)} · Academic Portal {num(2026)}</span>
        </div>
      </footer>
    </div>
  );
};
