import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Link2,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { UserRole } from '../types/school';
import { isPlaceholderTeacherEmail } from '../utils/schoolLogic';

export const AdminTeachersPanel: React.FC = () => {
  const {
    currentUser,
    users,
    updateUserRoleAndStatus,
    linkUserToTeacherProfile,
    createTeacherAccount,
    seedDirectoryTeachers,
    seedFirestoreDefaults,
    isFirebaseAuthenticated,
    num,
  } = useSchool();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesignation, setNewDesignation] = useState('Assistant Teacher');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  const [editingCodeMap, setEditingCodeMap] = useState<Record<string, string>>({});
  const [editingEmailMap, setEditingEmailMap] = useState<Record<string, string>>({});
  const [linkSourceTeacherUid, setLinkSourceTeacherUid] = useState<string>('');
  const [linkTargetGoogleUid, setLinkTargetGoogleUid] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Access Restricted: Only Administrators can manage teacher profiles and roles.
        </p>
      </div>
    );
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    await createTeacherAccount({
      name: newName,
      email: newEmail,
      teacherCode: newCode,
      designation: newDesignation,
      role: newRole,
    });
    setNewName('');
    setNewEmail('');
    setNewCode('');
    setNewDesignation('Assistant Teacher');
    setNewRole('teacher');
    setSyncMessage('✓ নতুন শিক্ষক প্রোফাইল সফলভাবে যুক্ত হয়েছে।');
  };

  const handleImport15Teachers = async () => {
    const count = await seedDirectoryTeachers();
    setSyncMessage(
      `✓ বিদ্যালয়ের ডিরেক্টরি থেকে ${num(count)} জন শিক্ষকের প্রোফাইল, Gmail ও সংক্ষিপ্ত কোড (Teacher Code) সফলভাবে সিঙ্ক ও লিংক করা হয়েছে!`
    );
  };

  const handleCodeSave = async (uid: string, fallbackCode: string) => {
    const draft = editingCodeMap[uid];
    if (draft === undefined) return;
    await updateUserRoleAndStatus(uid, { teacherCode: draft || fallbackCode });
    setEditingCodeMap((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setSyncMessage('✓ শিক্ষক কোড আপডেট করা হয়েছে।');
  };

  const handleEmailSave = async (uid: string, fallbackEmail: string) => {
    const draft = editingEmailMap[uid];
    if (draft === undefined) return;
    const cleaned = draft.trim().toLowerCase() || fallbackEmail;
    await updateUserRoleAndStatus(uid, { email: cleaned });
    setEditingEmailMap((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
    setSyncMessage(
      `✓ শিক্ষকের ইমেইল (${cleaned}) সফলভাবে আপডেট ও লিংক করা হয়েছে। এই Gmail দিয়ে সাইন-ইন করলে স্বয়ংক্রিয়ভাবে প্রোফাইল ও ক্লাস/বিষয় অ্যাসাইনমেন্ট যুক্ত হবে।`
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

  const filteredUsers = users.filter((u) => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.teacherCode.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header + 1-Click Import 15 Directory Teachers Button */}
      <div className="bg-gradient-to-r from-teal-900 via-[#0f766e] to-emerald-900 text-white rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Faculty & Role Directory Sync</span>
          </div>
          <h2 className="text-lg font-bold">
            শিক্ষক ও রোল অ্যাসাইনমেন্ট (Manage Teachers & Admins — {num(users.length)})
          </h2>
          <p className="text-xs text-teal-100 leading-relaxed">
            বিদ্যালয়ের ১৫ জন শিক্ষকের অফিসিয়াল ডিরেক্টরি (Gmail ও সংক্ষিপ্ত কোড HM, R.D., A.D. ইত্যাদি) এক
            ক্লিকে ইমপোর্ট করুন, যেকোনো শিক্ষকের আসল @gmail.com আপডেট করুন অথবা সাইন-ইনকৃত Google UID লিংক করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            data-testid="btn-seed-15-teachers"
            type="button"
            onClick={handleImport15Teachers}
            className="px-4 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>১৫ জন শিক্ষক ডিরেক্টরি থেকে ইমপোর্ট ও লিংক করুন</span>
          </button>

          {isFirebaseAuthenticated && (
            <button
              type="button"
              onClick={seedFirestoreDefaults}
              className="px-3.5 py-2.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sync Seed Data</span>
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          data-testid="teacher-sync-banner"
          className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-4 py-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Pre-register / Add New Teacher Form */}
      <form
        onSubmit={handleAddTeacher}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <UserPlus className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>নতুন শিক্ষক প্রোফাইল যুক্ত করুন (Pre-Register Teacher or Admin)</span>
          </div>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="নাম, ইমেইল বা কোড খুঁজুন..."
            className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-1.5 w-48 sm:w-60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              শিক্ষকের নাম (Full Name) *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Ratan Das (রতন দাশ)"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              গুগল ইমেইল (Google Email) *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="teacher@gmail.com"
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              সংক্ষিপ্ত কোড (Code)
            </label>
            <input
              type="text"
              maxLength={12}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g., R.D."
              className="w-full text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              রোল (Role)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-2"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-[#0d5c56] rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
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
                  {u.name} [{u.teacherCode}] — {u.email}
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
                    {u.email} ({u.name} · UID: {u.uid.slice(0, 14)})
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

      {/* Registered Teachers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">শিক্ষকের নাম ও পদবি</th>
                <th className="py-3 px-4">Google Email (Editable @gmail.com)</th>
                <th className="py-3 px-4">Teacher Code</th>
                <th className="py-3 px-4">রোল (Role)</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredUsers.map((u) => {
                const codeUpper = (u.teacherCode || '').trim().toUpperCase();
                const isPrimarySuperAdmin =
                  u.email.toLowerCase() === 'ananneyadebnath@gmail.com' ||
                  codeUpper === 'SH' ||
                  codeUpper === 'ADN';
                const draftCode =
                  editingCodeMap[u.uid] !== undefined ? editingCodeMap[u.uid] : u.teacherCode;
                const draftEmail =
                  editingEmailMap[u.uid] !== undefined ? editingEmailMap[u.uid] : u.email;
                const isPlaceholderEmail = isPlaceholderTeacherEmail(u.email);

                return (
                  <tr
                    key={u.uid}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-teal-600/30 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                            {u.teacherCode}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isPrimarySuperAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Primary Admin
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {u.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 min-w-[230px]">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              disabled={isPrimarySuperAdmin}
                              value={draftEmail}
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
                                  handleEmailSave(u.uid, u.email);
                                }
                              }}
                              className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 pl-7 pr-2 py-1 disabled:opacity-70"
                            />
                          </div>
                          {editingEmailMap[u.uid] !== undefined &&
                            editingEmailMap[u.uid].trim().toLowerCase() !==
                              u.email.toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => handleEmailSave(u.uid, u.email)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-teal-700 text-white rounded-lg hover:bg-[#0d5c56] shrink-0 cursor-pointer"
                              >
                                Save Email
                              </button>
                            )}
                        </div>
                        {isPlaceholderEmail && (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            Placeholder ইমেইল — আসল @gmail.com লিখে Save Email চাপুন
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={12}
                          value={draftCode}
                          aria-label={`Teacher code for ${u.name}`}
                          onChange={(e) =>
                            setEditingCodeMap((prev) => ({
                              ...prev,
                              [u.uid]: e.target.value.toUpperCase(),
                            }))
                          }
                          className="w-18 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-teal-700 dark:text-teal-400 px-2 py-1"
                        />
                        {editingCodeMap[u.uid] !== undefined &&
                          editingCodeMap[u.uid] !== u.teacherCode && (
                            <button
                              type="button"
                              onClick={() => handleCodeSave(u.uid, u.teacherCode)}
                              className="px-2 py-1 text-[11px] font-semibold bg-teal-700 text-white rounded-lg hover:bg-[#0d5c56] cursor-pointer"
                            >
                              Save
                            </button>
                          )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-teal-100 dark:bg-teal-950/90 text-teal-800 dark:text-teal-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        <span className="capitalize">{u.role}</span>
                      </span>
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
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPrimarySuperAdmin}
                          onClick={() =>
                            updateUserRoleAndStatus(u.uid, {
                              role: u.role === 'admin' ? 'teacher' : 'admin',
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {u.role === 'admin' ? 'Demote to Teacher' : 'Promote to Admin'}
                        </button>

                        <button
                          type="button"
                          disabled={isPrimarySuperAdmin}
                          onClick={() =>
                            updateUserRoleAndStatus(u.uid, {
                              status: u.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer ${
                            u.status === 'active'
                              ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              <span>Activate</span>
                            </>
                          )}
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
    </div>
  );
};
