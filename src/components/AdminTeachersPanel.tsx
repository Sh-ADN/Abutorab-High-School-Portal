import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Edit3,
  Eye,
  Link2,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { StaffType, UserProfile, UserRole } from '../types/school';
import {
  canEditTargetTeacherProfile,
  isFullAdminUser,
  isPlaceholderTeacherEmail,
  isSuperAdminUser,
  normalizeAbbr,
  sortTeachersByHierarchy,
} from '../utils/schoolLogic';
import { extractRoutineAbbreviations } from '../utils/routineAndStatsLogic';

export const AdminTeachersPanel: React.FC = () => {
  const {
    currentUser,
    realAuthUser,
    users,
    routineRecords,
    updateUserRoleAndStatus,
    linkUserToTeacherProfile,
    createTeacherAccount,
    deleteTeacherAccount,
    seedDirectoryTeachers,
    seedFirestoreDefaults,
    syncAssignmentsFromRoutineNow,
    setViewAsTeacherUid,
    isFirebaseAuthenticated,
    num,
  } = useSchool();

  const actingAdmin = realAuthUser || currentUser;
  const isSuperAdmin = isSuperAdminUser(actingAdmin);

  // Add New Teacher/Staff Form State
  const [newNameBn, setNewNameBn] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newStaffType, setNewStaffType] = useState<StaffType>('teacher');
  const [newDesignation, setNewDesignation] = useState('সহকারী শিক্ষক');
  const [newSubject, setNewSubject] = useState('সাধারণ শিক্ষা');
  const [newQualification, setNewQualification] = useState('B.A., B.Ed.');
  const [newIndexNo, setNewIndexNo] = useState('');
  const [newJoiningDate, setNewJoiningDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhotoURL, setNewPhotoURL] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newRoutineAbbr, setNewRoutineAbbr] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('subject_teacher');
  const [newIsSenior, setNewIsSenior] = useState(false);

  // Edit Modal State
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Quick Inline Edit Maps
  const [editingCodeMap, setEditingCodeMap] = useState<Record<string, string>>({});
  const [editingEmailMap, setEditingEmailMap] = useState<Record<string, string>>({});

  // Link Google UID State
  const [linkSourceTeacherUid, setLinkSourceTeacherUid] = useState<string>('');
  const [linkTargetGoogleUid, setLinkTargetGoogleUid] = useState<string>('');

  // Filters & Feedback
  const [searchFilter, setSearchFilter] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'ALL' | 'teacher' | 'staff'>('ALL');
  const [syncMessage, setSyncMessage] = useState('');

  const detectedRoutineAbbrs = useMemo(
    () => extractRoutineAbbreviations(routineRecords),
    [routineRecords]
  );

  if (!isFullAdminUser(currentUser)) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Access Restricted: Only Super Admin or Main Admin can manage teacher & staff profiles.
        </p>
      </div>
    );
  }

  const handleAddTeacherOrStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveNameEn = newNameEn.trim() || newNameBn.trim();
    const effectiveNameBn = newNameBn.trim() || newNameEn.trim();
    if (!effectiveNameEn) return;

    const abbr = (newRoutineAbbr || newCode || effectiveNameEn.slice(0, 3)).trim().toUpperCase();
    await createTeacherAccount({
      name: effectiveNameEn,
      nameBn: effectiveNameBn,
      email: newEmail.trim(), // Completely optional!
      teacherCode: newCode.trim() || abbr,
      routineAbbreviation: newRoutineAbbr.trim() || newCode.trim() || abbr,
      designation: newDesignation.trim() || (newStaffType === 'staff' ? 'অফিস সহায়ক' : 'সহকারী শিক্ষক'),
      role: newRole,
      staffType: newStaffType,
      subject: newStaffType === 'staff' ? 'প্রশাসন ও সেবা' : newSubject.trim() || 'সাধারণ শিক্ষা',
      qualification: newQualification.trim(),
      indexNo: newIndexNo.trim(),
      joiningDate: newJoiningDate.trim(),
      phone: newPhone.trim(),
      photoURL: newPhotoURL.trim(),
      isSenior: newIsSenior,
    });

    setNewNameBn('');
    setNewNameEn('');
    setNewEmail('');
    setNewCode('');
    setNewRoutineAbbr('');
    setNewDesignation(newStaffType === 'staff' ? 'অফিস সহায়ক' : 'সহকারী শিক্ষক');
    setNewSubject('সাধারণ শিক্ষা');
    setNewIndexNo('');
    setNewJoiningDate('');
    setNewPhone('');
    setNewPhotoURL('');
    setNewRole('subject_teacher');
    setNewIsSenior(false);
    setSyncMessage(
      `✓ নতুন ${newStaffType === 'staff' ? 'স্টাফ' : 'শিক্ষক'} প্রোফাইল ("${effectiveNameBn}") সফলভাবে যুক্ত হয়েছে এবং পাবলিক স্কুল ওয়েবসাইটে লাইভ আপডেট হয়েছে!`
    );
  };

  const handleSaveEditedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    if (!canEditTargetTeacherProfile(actingAdmin, editingProfile)) {
      setSyncMessage('⚠️ Main Admin cannot modify the Super Admin profile.');
      return;
    }

    await updateUserRoleAndStatus(editingProfile.uid, {
      name: editingProfile.name.trim() || editingProfile.nameBn || 'Teacher',
      nameBn: editingProfile.nameBn?.trim() || editingProfile.name.trim(),
      email: (editingProfile.email || '').trim().toLowerCase(),
      teacherCode: (editingProfile.teacherCode || '').trim().toUpperCase(),
      routineAbbreviation:
        (editingProfile.routineAbbreviation || editingProfile.teacherCode || '')
          .trim()
          .toUpperCase(),
      designation: editingProfile.designation,
      staffType: editingProfile.staffType || 'teacher',
      subject: editingProfile.subject || '',
      qualification: editingProfile.qualification || '',
      indexNo: editingProfile.indexNo || '',
      joiningDate: editingProfile.joiningDate || '',
      phone: editingProfile.phone || '',
      photoURL: editingProfile.photoURL || '',
      role: editingProfile.role,
      status: editingProfile.status,
      isSenior: Boolean(editingProfile.isSenior),
    });

    setSyncMessage(
      `✓ "${editingProfile.nameBn || editingProfile.name}"-এর প্রোফাইল সফলভাবে আপডেট হয়েছে এবং পাবলিক ওয়েবসাইট ও রুটিন ইঞ্জিনে সিঙ্ক হয়েছে।`
    );
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (target: UserProfile) => {
    if (!canEditTargetTeacherProfile(actingAdmin, target)) return;
    await deleteTeacherAccount(target.uid);
    setSyncMessage(
      `✓ "${target.nameBn || target.name}" প্রোফাইলটি ডিরেক্টরি ও পাবলিক ওয়েবসাইট থেকে মুছে ফেলা হয়েছে।`
    );
  };

  const handleImportDirectory = async () => {
    const count = await seedDirectoryTeachers();
    setSyncMessage(
      `✓ বিদ্যালয়ের ডিরেক্টরি থেকে ${num(count)} জন শিক্ষক ও স্টাফের প্রোফাইল, সংক্ষিপ্ত কোড এবং রুটিন অ্যাসাইনমেন্ট সফলভাবে সিঙ্ক করা হয়েছে!`
    );
  };

  const handleRoutineAutoSync = async () => {
    const res = await syncAssignmentsFromRoutineNow();
    setSyncMessage(
      `✓ লাইভ রুটিন থেকে ১০টি শ্রেণি-শাখার ১ম পিরিয়ড অনুযায়ী ${num(res.updatedSectionsCount)} জন শ্রেণি শিক্ষক এবং সংখ্যাগরিষ্ঠ দিন অনুযায়ী ${num(res.updatedSubjectsCount)}টি বিষয়ের শিক্ষক স্বয়ংক্রিয়ভাবে নির্ধারণ করা হয়েছে!`
    );
  };

  const handleCodeSave = async (uid: string, fallbackCode: string) => {
    const draft = editingCodeMap[uid];
    if (draft === undefined) return;
    const cleaned = draft.trim().toUpperCase() || fallbackCode;
    await updateUserRoleAndStatus(uid, {
      teacherCode: cleaned,
      routineAbbreviation: cleaned,
    });
    setEditingCodeMap((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setSyncMessage(
      `✓ রুটিন সংক্ষিপ্ত কোড (${cleaned} → Normalized: ${normalizeAbbr(cleaned)}) আপডেট ও রুটিনের সাথে লিংক করা হয়েছে।`
    );
  };

  const handleEmailSave = async (uid: string) => {
    const draft = editingEmailMap[uid];
    if (draft === undefined) return;
    const cleaned = draft.trim().toLowerCase();
    await updateUserRoleAndStatus(uid, { email: cleaned });
    setEditingEmailMap((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setSyncMessage(
      cleaned
        ? `✓ শিক্ষকের ইমেইল (${cleaned}) সফলভাবে আপডেট করা হয়েছে।`
        : '✓ ইমেইল খালি (Optional) রাখা হয়েছে।'
    );
  };

  const handleLinkProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !linkSourceTeacherUid ||
      !linkTargetGoogleUid ||
      linkSourceTeacherUid === linkTargetGoogleUid
    ) {
      return;
    }
    const sourceTeacher = users.find((u) => u.uid === linkSourceTeacherUid);
    const targetGoogle = users.find((u) => u.uid === linkTargetGoogleUid);
    await linkUserToTeacherProfile(linkSourceTeacherUid, linkTargetGoogleUid);
    setLinkSourceTeacherUid('');
    setLinkTargetGoogleUid('');
    setSyncMessage(
      `✓ "${sourceTeacher?.name || ''}" [${sourceTeacher?.teacherCode || ''}]-এর প্রোফাইল, শ্রেণি শিক্ষক রোল ও বিষয় বণ্টন সফলভাবে "${targetGoogle?.email || linkTargetGoogleUid}" UID-তে লিংক করা হয়েছে!`
    );
  };

  const teachersCount = users.filter((u) => (u.staffType || 'teacher') === 'teacher').length;
  const staffCount = users.filter((u) => u.staffType === 'staff').length;

  const filteredUsers = useMemo(() => {
    const list = users.filter((u) => {
      const uType = u.staffType || 'teacher';
      if (staffTypeFilter !== 'ALL' && uType !== staffTypeFilter) return false;
      const q = searchFilter.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.nameBn || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.teacherCode || '').toLowerCase().includes(q) ||
        (u.routineAbbreviation || '').toLowerCase().includes(q) ||
        (u.designation || '').toLowerCase().includes(q) ||
        (u.subject || '').toLowerCase().includes(q)
      );
    });
    return sortTeachersByHierarchy(list);
  }, [users, staffTypeFilter, searchFilter]);

  const getRoleBadgeLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin (ADN)';
      case 'main_admin':
        return 'Main Admin (SH)';
      case 'head_teacher':
        return 'Head Teacher (HM)';
      case 'asst_head_teacher':
        return 'Asst. Head Teacher';
      case 'class_teacher':
        return 'Class Teacher';
      case 'subject_teacher':
        return 'Subject Teacher';
      case 'admin':
        return 'Admin';
      default:
        return 'Teacher / Staff';
    }
  };

  return (
    <div className="space-y-6">
      {/* Datalist for Routine Abbreviations */}
      <datalist id="routine-abbr-suggestions">
        {detectedRoutineAbbrs.map((abbr) => (
          <option key={abbr} value={abbr}>
            Normalized: {normalizeAbbr(abbr)}
          </option>
        ))}
      </datalist>

      {/* Header + 1-Click Sync & Routine Auto-Assignment Buttons */}
      <div className="bg-gradient-to-r from-teal-900 via-[#0f766e] to-emerald-900 text-white rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Single Source of Truth · Admin & Public Website Live Sync</span>
          </div>
          <h2 className="text-lg font-bold">
            শিক্ষক ও স্টাফ ডাটাবেস এবং রোল ম্যানেজমেন্ট (মোট {num(users.length)} জন — শিক্ষক {num(teachersCount)}, স্টাফ {num(staffCount)})
          </h2>
          <p className="text-xs text-teal-100 leading-relaxed">
            এখানে কোনো শিক্ষক বা স্টাফ যোগ, সম্পাদনা বা মুছে ফেললে তা তাৎক্ষণিকভাবে পাবলিক স্কুল ওয়েবসাইটের হোমপেজে এবং রুটিন ইঞ্জিনে (Dot-Insensitive Abbreviation যেমন A.D.N. = ADN) আপডেট হয়। ইমেইল সম্পূর্ণ ঐচ্ছিক (Optional)।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            data-testid="btn-sync-routine-assignments"
            type="button"
            onClick={handleRoutineAutoSync}
            className="px-3.5 py-2.5 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>রুটিন থেকে ১০ শ্রেণি শিক্ষক ও বিষয় অটো-সিঙ্ক</span>
          </button>

          <button
            data-testid="btn-seed-15-teachers"
            type="button"
            onClick={handleImportDirectory}
            className="px-3.5 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>ডিরেক্টরি রিসেট/ইমপোর্ট ({num(22)} জন)</span>
          </button>

          {isFirebaseAuthenticated && (
            <button
              type="button"
              onClick={seedFirestoreDefaults}
              className="px-3 py-2.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sync Firestore</span>
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          data-testid="teacher-sync-banner"
          className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-4 py-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncMessage('')}
            className="text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Add New Teacher / Staff Full CRUD Form (Email Optional) */}
      <form
        onSubmit={handleAddTeacherOrStaff}
        data-testid="add-teacher-staff-form"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <UserPlus className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>নতুন শিক্ষক বা স্টাফ যুক্ত করুন (Add Teacher / Staff — Email Optional)</span>
          </div>
          <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
            শনাক্তকৃত রুটিন সংক্ষিপ্ত নামঃ {detectedRoutineAbbrs.join(', ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ধরন (Staff Type) *
            </label>
            <select
              data-testid="input-new-staff-type"
              value={newStaffType}
              onChange={(e) => {
                const nextType = e.target.value as StaffType;
                setNewStaffType(nextType);
                if (nextType === 'staff') {
                  setNewDesignation('অফিস সহায়ক');
                  setNewSubject('প্রশাসন ও সেবা');
                } else {
                  setNewDesignation('সহকারী শিক্ষক');
                  setNewSubject('সাধারণ শিক্ষা');
                }
              }}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            >
              <option value="teacher">শিক্ষক (Teacher)</option>
              <option value="staff">নন-টিচিং স্টাফ (Staff)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              নাম (বাংলায় / Bengali Name) *
            </label>
            <input
              data-testid="input-new-name-bn"
              type="text"
              required={!newNameEn.trim()}
              value={newNameBn}
              onChange={(e) => setNewNameBn(e.target.value)}
              placeholder="যেমন: রতন দাশ"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              নাম (ইংরেজিতে / English Name)
            </label>
            <input
              data-testid="input-new-name-en"
              type="text"
              value={newNameEn}
              onChange={(e) => setNewNameEn(e.target.value)}
              placeholder="e.g., Ratan Das"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              পদবি (Designation) *
            </label>
            <input
              data-testid="input-new-designation"
              type="text"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              placeholder="যেমন: সহকারী শিক্ষক / অফিস সহায়ক"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              রুটিন সংক্ষিপ্ত কোড (Routine Abbreviation)
            </label>
            <input
              data-testid="input-new-routine-abbr"
              type="text"
              list="routine-abbr-suggestions"
              maxLength={14}
              value={newRoutineAbbr}
              onChange={(e) => {
                setNewRoutineAbbr(e.target.value.toUpperCase());
                if (!newCode) setNewCode(e.target.value.toUpperCase());
              }}
              placeholder="e.g., A.D.N. or JUC"
              className="w-full text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              বিষয় / বিভাগ (Subject)
            </label>
            <input
              data-testid="input-new-subject"
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="যেমন: গণিত ও বিজ্ঞান"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              মোবাইল নম্বর (Mobile)
            </label>
            <input
              data-testid="input-new-phone"
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="018XXXXXXXX"
              className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ইমেইল (Google Email — সম্পূর্ণ ঐচ্ছিক / Optional)
            </label>
            <input
              data-testid="input-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ঐচ্ছিক (teacher@gmail.com)"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              শিক্ষাগত যোগ্যতা (Qualification)
            </label>
            <input
              type="text"
              value={newQualification}
              onChange={(e) => setNewQualification(e.target.value)}
              placeholder="B.Sc., B.Ed. / M.A."
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ইনডেক্স নম্বর ও যোগদানের তারিখ (Index No & Joining)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIndexNo}
                onChange={(e) => setNewIndexNo(e.target.value)}
                placeholder="Index No (e.g. N213654)"
                className="w-1/2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-2"
              />
              <input
                type="text"
                value={newJoiningDate}
                onChange={(e) => setNewJoiningDate(e.target.value)}
                placeholder="Joining Date"
                className="w-1/2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ছবির লিংক (Photo URL — Optional)
            </label>
            <input
              type="url"
              value={newPhotoURL}
              onChange={(e) => setNewPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              পোর্টাল রোল (Portal Role)
            </label>
            <div className="flex items-center gap-2">
              <select
                data-testid="input-new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-2"
              >
                <option value="subject_teacher">Subject Teacher (বিষয় শিক্ষক)</option>
                <option value="class_teacher">Class Teacher (শ্রেণি শিক্ষক)</option>
                <option value="head_teacher">Head Teacher (প্রধান শিক্ষক)</option>
                <option value="asst_head_teacher">Asst. Head Teacher (সহকারী প্রধান শিক্ষক)</option>
                {isSuperAdmin && <option value="main_admin">Main Admin (SH)</option>}
                {isSuperAdmin && <option value="super_admin">Super Admin (ADN)</option>}
              </select>
              <button
                data-testid="btn-add-teacher-staff"
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-[#0d5c56] rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                যুক্ত করুন
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsSenior}
              onChange={(e) => setNewIsSenior(e.target.checked)}
              className="rounded border-slate-300 text-teal-700"
            />
            <span>সিনিয়র শিক্ষক (Senior Teacher Filter Badge on Public Website)</span>
          </label>
        </div>
      </form>

      {/* Link Newly Signed-In Google User UID to Seeded Teacher Profile */}
      <form
        onSubmit={handleLinkProfileSubmit}
        className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/70 rounded-2xl p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200">
            <Link2 className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>
              প্রোফাইল ও UID লিংকিং (Link Signed-In Google User UID to Seeded Teacher Profile)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            শিক্ষক কোড, শ্রেণি শিক্ষক রোল ও বিষয় বণ্টন অক্ষুণ্ণ রেখে সাইন-ইনকৃত Google UID লিংক করুন
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="link-source-teacher-select"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              ১. পূর্বনির্ধারিত শিক্ষক প্রোফাইল (Seeded / Directory Teacher Profile)
            </label>
            <select
              id="link-source-teacher-select"
              value={linkSourceTeacherUid}
              onChange={(e) => setLinkSourceTeacherUid(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            >
              <option value="">— শিক্ষক প্রোফাইল নির্বাচন করুন —</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.nameBn || u.name} [{u.teacherCode}] — {u.email || 'No Email'}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="link-target-google-select"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              ২. সাইন-ইনকৃত Google ইউজার (Signed-In Google Account / UID)
            </label>
            <select
              id="link-target-google-select"
              value={linkTargetGoogleUid}
              onChange={(e) => setLinkTargetGoogleUid(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            >
              <option value="">— Google সাইন-ইনকৃত অ্যাকাউন্ট নির্বাচন করুন —</option>
              {users
                .filter((u) => u.uid !== linkSourceTeacherUid)
                .map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.email || 'No Email'} ({u.name} · UID: {u.uid.slice(0, 14)})
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={
                !linkSourceTeacherUid ||
                !linkTargetGoogleUid ||
                linkSourceTeacherUid === linkTargetGoogleUid
              }
              className="w-full px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-[#0d5c56] disabled:opacity-40 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link UID</span>
            </button>
          </div>
        </div>
      </form>

      {/* Filter Bar for Directory Table */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStaffTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              staffTypeFilter === 'ALL'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            সকল ({num(users.length)})
          </button>
          <button
            type="button"
            onClick={() => setStaffTypeFilter('teacher')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              staffTypeFilter === 'teacher'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            শিক্ষকমণ্ডলী ({num(teachersCount)})
          </button>
          <button
            type="button"
            onClick={() => setStaffTypeFilter('staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              staffTypeFilter === 'staff'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            নন-টিচিং স্টাফ ({num(staffCount)})
          </button>
        </div>

        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="নাম, পদবি, সংক্ষিপ্ত কোড বা ইমেইল খুঁজুন..."
          className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 w-full sm:w-72"
        />
      </div>

      {/* Registered Teachers & Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">নাম, পদবি ও ধরন</th>
                <th className="py-3 px-4">মোবাইল ও ইমেইল (Optional)</th>
                <th className="py-3 px-4">Routine Code (Dot-Insensitive)</th>
                <th className="py-3 px-4">রোল (Portal Role)</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন (Edit / View As / Delete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredUsers.map((u) => {
                const isTargetSuperAdmin = isSuperAdminUser(u);
                const canModifyThisRow = canEditTargetTeacherProfile(actingAdmin, u);
                const draftCode =
                  editingCodeMap[u.uid] !== undefined
                    ? editingCodeMap[u.uid]
                    : u.routineAbbreviation || u.teacherCode;
                const draftEmail =
                  editingEmailMap[u.uid] !== undefined ? editingEmailMap[u.uid] : u.email || '';
                const isPlaceholderEmail = isPlaceholderTeacherEmail(u.email);

                return (
                  <tr
                    key={u.uid}
                    data-testid={`teacher-row-${normalizeAbbr(u.teacherCode || u.uid)}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-teal-600/30 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-teal-700 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                            {u.teacherCode}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                            <span>{u.nameBn || u.name}</span>
                            {u.nameBn && u.name && u.nameBn !== u.name && (
                              <span className="text-[11px] font-normal text-slate-500">
                                ({u.name})
                              </span>
                            )}
                            {isTargetSuperAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Super Admin (Protected)
                              </span>
                            )}
                            {u.staffType === 'staff' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                                Staff
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {u.designation} {u.subject ? `· ${u.subject}` : ''}{' '}
                            {u.indexNo ? `· Index: ${u.indexNo}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 min-w-[220px]">
                        {u.phone && (
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-teal-600" />
                            <span>{u.phone}</span>
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              disabled={!canModifyThisRow}
                              value={draftEmail}
                              placeholder="Optional (@gmail.com)"
                              aria-label={`Google email for ${u.name}`}
                              onChange={(e) =>
                                setEditingEmailMap((prev) => ({
                                  ...prev,
                                  [u.uid]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleEmailSave(u.uid);
                                }
                              }}
                              className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 pl-7 pr-2 py-1 disabled:opacity-50"
                            />
                          </div>
                          {editingEmailMap[u.uid] !== undefined &&
                            editingEmailMap[u.uid].trim().toLowerCase() !==
                              (u.email || '').toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => handleEmailSave(u.uid)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-teal-700 text-white rounded-lg hover:bg-[#0d5c56] shrink-0 cursor-pointer"
                              >
                                Save
                              </button>
                            )}
                        </div>
                        {isPlaceholderEmail && (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            Placeholder ইমেইল — আসল @gmail.com দিন অথবা খালি রাখুন
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            list="routine-abbr-suggestions"
                            maxLength={14}
                            disabled={!canModifyThisRow}
                            value={draftCode}
                            aria-label={`Routine code for ${u.name}`}
                            onChange={(e) =>
                              setEditingCodeMap((prev) => ({
                                ...prev,
                                [u.uid]: e.target.value.toUpperCase(),
                              }))
                            }
                            className="w-20 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-teal-700 dark:text-teal-400 px-2 py-1 disabled:opacity-50"
                          />
                          {editingCodeMap[u.uid] !== undefined &&
                            editingCodeMap[u.uid] !== (u.routineAbbreviation || u.teacherCode) && (
                              <button
                                type="button"
                                onClick={() => handleCodeSave(u.uid, u.teacherCode)}
                                className="px-2 py-1 text-[11px] font-semibold bg-teal-700 text-white rounded-lg hover:bg-[#0d5c56] cursor-pointer"
                              >
                                Save
                              </button>
                            )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Key: {normalizeAbbr(draftCode)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        aria-label={`Role for ${u.name}`}
                        disabled={!canModifyThisRow || (isTargetSuperAdmin && !isSuperAdmin)}
                        value={u.role}
                        onChange={(e) =>
                          updateUserRoleAndStatus(u.uid, { role: e.target.value as UserRole })
                        }
                        className="text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 px-2 py-1 disabled:opacity-50"
                      >
                        <option value="subject_teacher">Subject Teacher</option>
                        <option value="class_teacher">Class Teacher</option>
                        <option value="head_teacher">Head Teacher</option>
                        <option value="asst_head_teacher">Asst. Head Teacher</option>
                        <option value="teacher">Teacher / Staff</option>
                        {(isSuperAdmin || u.role === 'main_admin') && (
                          <option value="main_admin">Main Admin (SH)</option>
                        )}
                        {(isSuperAdmin || u.role === 'super_admin') && (
                          <option value="super_admin">Super Admin (ADN)</option>
                        )}
                      </select>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                          {isFullAdminUser(u) ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          <span>{getRoleBadgeLabel(u.role)}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                            : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60'
                        }`}
                      >
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewAsTeacherUid(u.uid)}
                          title={`View portal as ${u.nameBn || u.name}`}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-400 hover:text-slate-950 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View As</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canModifyThisRow}
                          onClick={() => setEditingProfile({ ...u })}
                          data-testid={`btn-edit-teacher-${normalizeAbbr(u.teacherCode || u.uid)}`}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canModifyThisRow || isTargetSuperAdmin}
                          onClick={() =>
                            updateUserRoleAndStatus(u.uid, {
                              status: u.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer ${
                            u.status === 'active'
                              ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <UserX className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!canModifyThisRow || isTargetSuperAdmin}
                          onClick={() => handleDeleteProfile(u)}
                          title="Delete Teacher/Staff"
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Edit Profile Modal */}
      {editingProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="শিক্ষক/স্টাফ প্রোফাইল সম্পাদনা"
        >
          <form
            onSubmit={handleSaveEditedProfile}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  প্রোফাইল সম্পাদনা করুন (Edit Teacher / Staff Profile)
                </h3>
                <p className="text-xs text-slate-500">
                  পরিবর্তনসমূহ অ্যাডমিন প্যানেল ও পাবলিক স্কুল ওয়েবসাইটে তাৎক্ষণিকভাবে সিঙ্ক হবে
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বাংলা নাম (Bengali Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editingProfile.nameBn || editingProfile.name}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, nameBn: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইংরেজি নাম (English Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editingProfile.name}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ধরন (Staff Type)
                </label>
                <select
                  value={editingProfile.staffType || 'teacher'}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      staffType: e.target.value as StaffType,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="teacher">শিক্ষক (Teacher)</option>
                  <option value="staff">নন-টিচিং স্টাফ (Staff)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পদবি (Designation)
                </label>
                <input
                  type="text"
                  value={editingProfile.designation}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, designation: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রুটিন সংক্ষিপ্ত কোড (Routine Abbreviation)
                </label>
                <input
                  type="text"
                  list="routine-abbr-suggestions"
                  value={editingProfile.routineAbbreviation || editingProfile.teacherCode}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      routineAbbreviation: e.target.value.toUpperCase(),
                      teacherCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিষয় (Subject)
                </label>
                <input
                  type="text"
                  value={editingProfile.subject || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, subject: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মোবাইল নম্বর (Mobile)
                </label>
                <input
                  type="text"
                  value={editingProfile.phone || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, phone: e.target.value })
                  }
                  className="w-full font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইমেইল (Optional Email)
                </label>
                <input
                  type="email"
                  value={editingProfile.email || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, email: e.target.value })
                  }
                  placeholder="Optional (@gmail.com)"
                  className="w-full font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  শিক্ষাগত যোগ্যতা (Qualification)
                </label>
                <input
                  type="text"
                  value={editingProfile.qualification || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, qualification: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইনডেক্স নম্বর ও যোগদানের তারিখ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingProfile.indexNo || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, indexNo: e.target.value })
                    }
                    placeholder="Index No"
                    className="w-1/2 font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={editingProfile.joiningDate || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, joiningDate: e.target.value })
                    }
                    placeholder="Joining Date"
                    className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ছবির লিংক (Photo URL)
                </label>
                <input
                  type="text"
                  value={editingProfile.photoURL || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, photoURL: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পোর্টাল রোল (Portal Role)
                </label>
                <select
                  value={editingProfile.role}
                  disabled={isSuperAdminUser(editingProfile) && !isSuperAdmin}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="subject_teacher">Subject Teacher (বিষয় শিক্ষক)</option>
                  <option value="class_teacher">Class Teacher (শ্রেণি শিক্ষক)</option>
                  <option value="head_teacher">Head Teacher (প্রধান শিক্ষক)</option>
                  <option value="asst_head_teacher">Asst. Head Teacher (সহকারী প্রধান শিক্ষক)</option>
                  <option value="teacher">Teacher / Staff</option>
                  {isSuperAdmin && <option value="main_admin">Main Admin (SH)</option>}
                  {isSuperAdmin && <option value="super_admin">Super Admin (ADN)</option>}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingProfile.isSenior)}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, isSenior: e.target.checked })
                  }
                  className="rounded border-slate-300 text-teal-700"
                />
                <span>সিনিয়র শিক্ষক (Senior Filter on Public Website)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-[#0d5c56] text-white text-xs font-bold cursor-pointer"
                >
                  সংরক্ষণ করুন (Save Changes)
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
