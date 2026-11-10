import React, { useState } from 'react';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { LoginScreen } from './components/LoginScreen';
import { PublicSchoolWebsite } from './components/PublicSchoolWebsite';
import { HeaderBar, MobileBottomNav, PortalSidebar } from './components/HeaderBar';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentRosterPanel } from './components/StudentRosterPanel';
import { StudentAttendanceModule } from './components/StudentAttendanceModule';
import { SubjectMarksModule } from './components/SubjectMarksModule';
import { ResultAndTabulationModule } from './components/ResultAndTabulationModule';
import { SchoolRoutineModule } from './components/SchoolRoutineModule';
import { AdminControlCenter } from './components/AdminControlCenter';

const PortalShell: React.FC = () => {
  const { currentUser, authLoading, activeView, showPublicWebsite, num } = useSchool();
  const [showDedicatedLoginScreen, setShowDedicatedLoginScreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-sm font-semibold text-teal-800 dark:text-teal-300">
            আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় পোর্টাল লোড হচ্ছে...
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Connecting to Firebase Authentication & Cloud Firestore
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (showDedicatedLoginScreen) {
      return <LoginScreen onBackToWebsite={() => setShowDedicatedLoginScreen(false)} />;
    }
    return <PublicSchoolWebsite />;
  }

  if (showPublicWebsite) {
    return <PublicSchoolWebsite />;
  }

  if (currentUser.status === 'inactive') {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col">
        <HeaderBar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-xl p-6 text-center space-y-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Account Currently Deactivated
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your teacher account ({currentUser.email}) has been marked inactive by a school
              administrator. Please contact the Headmaster or System Administrator (
              <span className="font-mono">ananneyadebnath@gmail.com</span>) to restore access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div id="top" className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex">
      {/* Desktop Collapsible Left Sidebar (md:flex) */}
      <PortalSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area + Sticky Top App Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-10">
          {activeView === 'teacher-dashboard' && <TeacherDashboard />}
          {activeView === 'student-attendance' && <StudentAttendanceModule />}
          {activeView === 'exam-marks' && <SubjectMarksModule />}
          {activeView === 'results-tabulation' && <ResultAndTabulationModule />}
          {activeView === 'school-routine' && <SchoolRoutineModule />}
          {activeView === 'admin-panel' && <AdminControlCenter initialTab="teachers-roles" />}
          {activeView === 'admin-teachers' && <AdminControlCenter initialTab="teachers-roles" />}
          {activeView === 'admin-academic' && (
            <AdminControlCenter initialTab="class-subject-matrix" />
          )}
          {activeView === 'admin-matrix' && (
            <AdminControlCenter initialTab="class-subject-matrix" />
          )}
          {activeView === 'student-roster' &&
            (isAdmin ? (
              <AdminControlCenter initialTab="student-roster" />
            ) : (
              <StudentRosterPanel />
            ))}
        </main>

        <footer className="no-print hidden md:block w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় (Abutorab High School) · স্থাপিতঃ {num(1914)} ইং · মীরসরাই,
              চট্টগ্রাম · EIIN: 104600
            </span>
            <span className="tabular-nums">
              Role: {currentUser.role.toUpperCase()} [{currentUser.teacherCode}] · Session{' '}
              {num(2026)}
            </span>
          </div>
        </footer>
      </div>

      {/* Mobile Fixed Glassmorphic Bottom Navigation Bar (< 768px) */}
      <MobileBottomNav />
    </div>
  );
};

export default function App() {
  return (
    <SchoolProvider>
      <PortalShell />
    </SchoolProvider>
  );
}
