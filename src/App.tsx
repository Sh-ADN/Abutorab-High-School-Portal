import React, { useState } from 'react';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { LoginScreen } from './components/LoginScreen';
import { PublicSchoolWebsite } from './components/PublicSchoolWebsite';
import {
  DevRoleSwitcherPopover,
  HeaderBar,
  MobileBottomNav,
  PortalSidebar,
} from './components/HeaderBar';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentRosterPanel } from './components/StudentRosterPanel';
import { StudentAttendanceModule } from './components/StudentAttendanceModule';
import { SubjectMarksModule } from './components/SubjectMarksModule';
import { ResultAndTabulationModule } from './components/ResultAndTabulationModule';
import { SchoolRoutineModule } from './components/SchoolRoutineModule';
import { AdminControlCenter } from './components/AdminControlCenter';

const PortalShell: React.FC = () => {
  const { currentUser, activeView, showPublicWebsite, num } = useSchool();
  const [showDedicatedLoginScreen, setShowDedicatedLoginScreen] = useState(false);

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
    <div id="top" className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      {/* Desktop Fixed Left Sidebar (lg:flex, w-60) */}
      <PortalSidebar />

      {/* Main Content Area (lg:pl-60 to account for fixed sidebar) */}
      <div className="lg:pl-60 flex flex-col min-h-screen min-w-0 transition-all">
        <HeaderBar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-10">
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

        <footer className="no-print hidden lg:block w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <span>
              আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় (Abutorab High School) · স্থাপিতঃ {num(1914)} ইং · মীরসরাই,
              চট্টগ্রাম · EIIN: 104600
            </span>
            <span className="tabular-nums font-mono">
              Role: {currentUser.role.toUpperCase()} [{currentUser.teacherCode}] · Session{' '}
              {num(2026)}
            </span>
          </div>
        </footer>
      </div>

      {/* Mobile Fixed 5-Tab Bottom Navigation Bar (< 1024px, lg:hidden) */}
      <MobileBottomNav />

      {/* Floating Developer Role Switcher (Super Admin only, bottom-left) */}
      <DevRoleSwitcherPopover />
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
