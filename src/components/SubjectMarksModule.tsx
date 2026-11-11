import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Lock,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import {
  canManageSubjectMarks,
  getSubjectSubmissionStatus,
  isAssignedClassTeacherForSection,
  isAssignedSubjectTeacher,
  isFullAdminUser,
  isPrivilegedReviewerUser,
} from '../utils/schoolLogic';
import {
  evaluateSubjectMarkComponents,
  resolveSubjectSpec,
} from '../utils/marksCatalogAndLogic';
import { VerificationSheetDialogModal } from './VerificationSheetDialogModal';

interface SubjectComponentInput {
  mcq: number | null;
  written: number | null;
  practical: number | null;
}

function clampMark(val: number | null | undefined, max: number | null | undefined): number | null {
  if (max === null || max === undefined) return null;
  if (val === null || val === undefined || Number.isNaN(val)) return null;
  return Math.max(0, Math.min(max, Math.floor(val)));
}

export const SubjectMarksModule: React.FC = () => {
  const {
    currentUser,
    academicYears,
    examTerms,
    classSections,
    subjectAssignments,
    students,
    subjectMarks,
    selectedAcademicYearId,
    selectedTermId,
    setSelectedTermId,
    selectedMarksAssignmentId,
    setSelectedMarksAssignmentId,
    saveSubjectMarkRecord,
    clearSubjectMarksForAssignment,
    restoreSubjectMarksBatch,
    toggleExamTermLock,
    submitSubjectMarksToClassTeacher,
    unlockSubjectMarksToDraft,
    setActiveView,
    num,
  } = useSchool();

  const [draftByStudentId, setDraftByStudentId] = useState<Record<string, SubjectComponentInput>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveBanner, setSaveBanner] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [isScanningAi, setIsScanningAi] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [undoSnapshot, setUndoSnapshot] = useState<typeof subjectMarks>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!currentUser) return null;

  const isAdmin = isFullAdminUser(currentUser);
  const isReviewer = isPrivilegedReviewerUser(currentUser);
  const activeYear = academicYears.find((y) => y.id === selectedAcademicYearId);

  const yearTerms = useMemo(
    () => examTerms.filter((t) => t.academicYearId === selectedAcademicYearId),
    [examTerms, selectedAcademicYearId]
  );

  const activeTerm = useMemo(
    () => yearTerms.find((t) => t.id === selectedTermId) || yearTerms[0] || null,
    [yearTerms, selectedTermId]
  );

  const isTermLocked = Boolean(activeTerm?.isLocked);

  const visibleAssignments = useMemo(() => {
    const yearList = subjectAssignments.filter(
      (a) => a.academicYearId === selectedAcademicYearId
    );
    if (isReviewer) return yearList;
    return yearList.filter((a) => {
      if (isAssignedSubjectTeacher(currentUser, a)) return true;
      const cs = classSections.find((c) => c.id === a.classSectionId);
      return isAssignedClassTeacherForSection(currentUser, cs);
    });
  }, [subjectAssignments, selectedAcademicYearId, isReviewer, currentUser, classSections]);

  useEffect(() => {
    if (
      !selectedMarksAssignmentId ||
      !visibleAssignments.some((a) => a.id === selectedMarksAssignmentId)
    ) {
      const preferred =
        visibleAssignments.find((a) => a.id === 'asg_9_a_phy') ||
        visibleAssignments.find((a) => a.id === 'asg_9_a_bgs') ||
        visibleAssignments[0];
      const firstId = preferred?.id || '';
      if (firstId !== selectedMarksAssignmentId) {
        setSelectedMarksAssignmentId(firstId);
      }
    }
  }, [visibleAssignments, selectedMarksAssignmentId, setSelectedMarksAssignmentId]);

  const activeAssignment = useMemo(
    () => visibleAssignments.find((a) => a.id === selectedMarksAssignmentId) || null,
    [visibleAssignments, selectedMarksAssignmentId]
  );

  const activeClassSection = useMemo(
    () =>
      activeAssignment
        ? classSections.find((cs) => cs.id === activeAssignment.classSectionId) || undefined
        : undefined,
    [activeAssignment, classSections]
  );

  const subjectSpec = useMemo(
    () =>
      resolveSubjectSpec(
        activeAssignment?.subjectCode,
        activeAssignment?.subjectName,
        activeAssignment?.maxMarks || 100
      ),
    [activeAssignment]
  );

  const passMark = useMemo(() => Math.ceil(subjectSpec.fullMarks * 0.33), [subjectSpec.fullMarks]);

  const currentSubjectStatus = useMemo(
    () => getSubjectSubmissionStatus(activeAssignment, activeTerm?.id),
    [activeAssignment, activeTerm?.id]
  );

  const isSubjectSubmitted = currentSubjectStatus === 'submitted';

  const canEditMarks = useMemo(() => {
    if (!activeAssignment) return false;
    if (isTermLocked && !isReviewer) return false;
    return canManageSubjectMarks(currentUser, activeAssignment, activeTerm?.id);
  }, [activeAssignment, isTermLocked, isReviewer, currentUser, activeTerm?.id]);

  const classStudents = useMemo(() => {
    if (!activeAssignment) return [];
    return students
      .filter((s) => s.classSectionId === activeAssignment.classSectionId && s.status === 'active')
      .sort((a, b) => a.roll - b.roll);
  }, [students, activeAssignment]);

  const existingMarksMap = useMemo(() => {
    const map = new Map<string, (typeof subjectMarks)[number]>();
    if (!activeAssignment || !activeTerm) return map;
    subjectMarks
      .filter((m) => m.assignmentId === activeAssignment.id && m.termId === activeTerm.id)
      .forEach((m) => map.set(m.studentId, m));
    return map;
  }, [subjectMarks, activeAssignment, activeTerm]);

  useEffect(() => {
    const initialDraft: Record<string, SubjectComponentInput> = {};
    classStudents.forEach((stu) => {
      const saved = existingMarksMap.get(stu.id);
      if (saved) {
        initialDraft[stu.id] = {
          mcq: subjectSpec.mcqMax !== null ? saved.mcqMarks : null,
          written: subjectSpec.writtenMax !== null ? saved.writtenMarks : null,
          practical: subjectSpec.practicalMax !== null ? saved.practicalMarks : null,
        };
      } else {
        initialDraft[stu.id] = {
          mcq: null,
          written: null,
          practical: null,
        };
      }
    });
    setDraftByStudentId(initialDraft);
    setSaveBanner('');
    setErrorBanner('');
  }, [activeAssignment?.id, activeTerm?.id, classStudents, existingMarksMap, subjectSpec]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.roll).includes(q)
    );
  }, [classStudents, searchQuery]);

  const enabledComponentOrder = useMemo(() => {
    const cols: ('written' | 'mcq' | 'practical')[] = [];
    if (subjectSpec.writtenMax !== null) cols.push('written');
    if (subjectSpec.mcqMax !== null) cols.push('mcq');
    if (subjectSpec.practicalMax !== null) cols.push('practical');
    return cols;
  }, [subjectSpec]);

  const handleComponentChange = (
    studentId: string,
    field: 'mcq' | 'written' | 'practical',
    rawValue: string
  ) => {
    if (!canEditMarks) return;
    const trimmed = rawValue.trim();
    let parsed: number | null = null;
    if (trimmed !== '') {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) {
        parsed = Math.round(n * 100) / 100;
      }
    }

    setDraftByStudentId((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { mcq: null, written: null, practical: null }),
        [field]: parsed,
      },
    }));
    setSaveBanner('');
  };

  // Focus helper for Mobile "Enter / Next" -> focuses first input box of the next student roll
  const focusNextMobileStudentFirstInput = (currentStudentIndex: number) => {
    const nextIdx = currentStudentIndex + 1;
    const nextEl = document.querySelector<HTMLInputElement>(
      `[data-mobile-mark-input="${nextIdx}-0"]`
    );
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
    }
  };

  // Focus helper for Enter / ArrowDown / ArrowUp / ArrowLeft / ArrowRight navigation using data-row and data-col
  const handleDesktopKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    let targetRow = rowIdx;
    let targetCol = colIdx;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = rowIdx + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIdx - 1);
    } else if (e.key === 'ArrowRight') {
      if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
        e.preventDefault();
        if (colIdx + 1 < enabledComponentOrder.length) {
          targetCol = colIdx + 1;
        } else {
          targetRow = rowIdx + 1;
          targetCol = 0;
        }
      } else {
        return;
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.currentTarget.selectionStart === 0) {
        e.preventDefault();
        if (colIdx - 1 >= 0) {
          targetCol = colIdx - 1;
        } else if (rowIdx > 0) {
          targetRow = rowIdx - 1;
          targetCol = Math.max(0, enabledComponentOrder.length - 1);
        }
      } else {
        return;
      }
    } else {
      return;
    }

    const scopeContainer =
      e.currentTarget.closest('table') ||
      e.currentTarget.closest('[data-marks-mobile-list]') ||
      document;
    const nextEl =
      scopeContainer.querySelector<HTMLInputElement>(
        `input[data-row="${targetRow}"][data-col="${targetCol}"]`
      ) ||
      document.querySelector<HTMLInputElement>(
        `[data-desktop-mark-cell="${targetRow}-${targetCol}"]`
      );
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
    }
  };

  const evaluatedRows = useMemo(() => {
    return classStudents.map((stu) => {
      const draft = draftByStudentId[stu.id] || {
        mcq: null,
        written: null,
        practical: null,
      };
      const wrOut =
        subjectSpec.writtenMax !== null &&
        draft.written !== null &&
        (draft.written > subjectSpec.writtenMax || draft.written < 0);
      const mcqOut =
        subjectSpec.mcqMax !== null &&
        draft.mcq !== null &&
        (draft.mcq > subjectSpec.mcqMax || draft.mcq < 0);
      const pracOut =
        subjectSpec.practicalMax !== null &&
        draft.practical !== null &&
        (draft.practical > subjectSpec.practicalMax || draft.practical < 0);

      const hasOutOfRange = wrOut || mcqOut || pracOut;
      const hasAnyEntry =
        draft.written !== null || draft.mcq !== null || draft.practical !== null;
      const evaluated = evaluateSubjectMarkComponents(draft, subjectSpec);
      const isPass = hasAnyEntry && evaluated.letterGrade !== 'F';

      return {
        student: stu,
        draft,
        evaluated,
        hasAnyEntry,
        isPass,
        wrOut,
        mcqOut,
        pracOut,
        hasOutOfRange,
      };
    });
  }, [classStudents, draftByStudentId, subjectSpec]);

  // Build live marks array for VerificationSheetDialogModal
  const liveMarksForVerification = useMemo(() => {
    if (!activeAssignment || !activeTerm) return [];
    return evaluatedRows
      .filter((r) => r.hasAnyEntry)
      .map((r) => ({
        id: `mk_${activeAssignment.id}_${activeTerm.id}_${r.student.id}`,
        assignmentId: activeAssignment.id,
        termId: activeTerm.id,
        classSectionId: activeAssignment.classSectionId,
        studentId: r.student.id,
        roll: r.student.roll,
        studentName: r.student.name,
        writtenMarks: r.evaluated.written ?? 0,
        mcqMarks: r.evaluated.mcq ?? 0,
        practicalMarks: r.evaluated.practical ?? 0,
        totalMarks: r.evaluated.totalMarks,
        letterGrade: r.evaluated.letterGrade,
        gpa: r.evaluated.gpa,
        updatedByUid: currentUser.uid,
        updatedAt: new Date().toISOString(),
      }));
  }, [evaluatedRows, activeAssignment, activeTerm, currentUser.uid]);

  const summaryStats = useMemo(() => {
    const entered = evaluatedRows.filter((r) => r.hasAnyEntry);
    const passCount = entered.filter((r) => r.isPass).length;
    const failCount = entered.length - passCount;
    const aPlusCount = entered.filter((r) => r.evaluated.letterGrade === 'A+').length;
    const avgMarks =
      entered.length > 0
        ? Math.round(
            (entered.reduce((acc, r) => acc + r.evaluated.totalMarks, 0) / entered.length) * 10
          ) / 10
        : 0;
    const passRatePct =
      entered.length > 0 ? Math.round((passCount / entered.length) * 100) : 0;
    const outOfRangeCount = evaluatedRows.filter((r) => r.hasOutOfRange).length;
    return {
      totalStudents: classStudents.length,
      enteredCount: entered.length,
      passCount,
      failCount,
      aPlusCount,
      avgMarks,
      passRatePct,
      outOfRangeCount,
    };
  }, [evaluatedRows, classStudents.length]);

  const handleSaveSingleRow = async (studentId: string) => {
    if (!activeAssignment || !activeTerm || !canEditMarks) return;
    const row = evaluatedRows.find((r) => r.student.id === studentId);
    if (!row) return;
    if (row.hasOutOfRange) {
      setErrorBanner(
        `রোল #${row.student.roll} এর নম্বর নির্ধারিত পূর্ণমানের চেয়ে বেশি! অনুগ্রহ করে সঠিক নম্বর দিন।`
      );
      return;
    }

    await saveSubjectMarkRecord({
      assignmentId: activeAssignment.id,
      termId: activeTerm.id,
      classSectionId: activeAssignment.classSectionId,
      studentId: row.student.id,
      roll: row.student.roll,
      studentName: row.student.name,
      writtenMarks: clampMark(row.draft.written, subjectSpec.writtenMax) ?? 0,
      mcqMarks: clampMark(row.draft.mcq, subjectSpec.mcqMax) ?? 0,
      practicalMarks: clampMark(row.draft.practical, subjectSpec.practicalMax) ?? 0,
      maxMarks: subjectSpec.fullMarks,
    });
    setErrorBanner('');
    setSaveBanner(`✓ রোল #${row.student.roll} (${row.student.name}) এর নম্বর সংরক্ষিত হয়েছে।`);
  };

  const handleSaveAllMarks = async () => {
    if (!activeAssignment || !activeTerm || !canEditMarks) return;
    const invalidRow = evaluatedRows.find((r) => r.hasOutOfRange);
    if (invalidRow) {
      setErrorBanner(
        `সতর্কতা: রোল #${invalidRow.student.roll} (${invalidRow.student.name}) এর নম্বর পূর্ণমানের বাইরে রয়েছে। সংরক্ষণ করার আগে লাল চিহ্নিত ঘরটি সংশোধন করুন।`
      );
      return;
    }

    let savedCount = 0;
    for (const row of evaluatedRows) {
      if (!row.hasAnyEntry) continue;
      await saveSubjectMarkRecord({
        assignmentId: activeAssignment.id,
        termId: activeTerm.id,
        classSectionId: activeAssignment.classSectionId,
        studentId: row.student.id,
        roll: row.student.roll,
        studentName: row.student.name,
        writtenMarks: row.evaluated.written ?? 0,
        mcqMarks: row.evaluated.mcq ?? 0,
        practicalMarks: row.evaluated.practical ?? 0,
        maxMarks: subjectSpec.fullMarks,
      });
      savedCount++;
    }
    setErrorBanner('');
    setSaveBanner(
      `✓ ${savedCount} জন শিক্ষার্থীর নম্বর সফলভাবে সংরক্ষিত হয়েছে (${activeAssignment.subjectName} — ${activeTerm.termType})।`
    );
  };

  const handleFinalSubmitToClassTeacher = async () => {
    if (!activeAssignment || !activeTerm) return;
    if (canEditMarks) {
      await handleSaveAllMarks();
    }
    await submitSubjectMarksToClassTeacher(activeAssignment.id, activeTerm.id);
    setSaveBanner(
      `🔒 "${activeAssignment.subjectName}" বিষয়ের নম্বর শ্রেণি শিক্ষকের নিকট চূড়ান্তভাবে জমা দেওয়া হয়েছে এবং লক (Locked) করা হয়েছে।`
    );
  };

  const handleUnlockSubjectToDraft = async () => {
    if (!activeAssignment || !activeTerm || !isReviewer) return;
    await unlockSubjectMarksToDraft(activeAssignment.id, activeTerm.id);
    setSaveBanner(
      `🔓 "${activeAssignment.subjectName}" বিষয়ের নম্বর পুনরায় খসড়া (Draft) অবস্থায় আনলক করা হয়েছে।`
    );
  };

  const handleClearAllWithUndo = async () => {
    if (!activeAssignment || !activeTerm || !canEditMarks) return;
    const backup = await clearSubjectMarksForAssignment(activeAssignment.id, activeTerm.id);
    setUndoSnapshot(backup);
    setSaveBanner('সকল নম্বর মুছে ফেলা হয়েছে। প্রয়োজনে Undo বাটনে চাপুন।');
  };

  const handleUndoClear = async () => {
    if (undoSnapshot.length === 0) return;
    await restoreSubjectMarksBatch(undoSnapshot);
    setUndoSnapshot([]);
    setSaveBanner('পূর্ববর্তী নম্বরগুলো পুনরুদ্ধার (Restored) করা হয়েছে।');
  };

  const handleFileUploadForAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEditMarks) return;

    setIsScanningAi(true);
    setErrorBanner('');
    setSaveBanner('');

    try {
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/marks/scan-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType: file.type || 'image/jpeg',
          subjectName: activeAssignment?.subjectName || '',
          mcqMax: subjectSpec.mcqMax,
          writtenMax: subjectSpec.writtenMax,
          practicalMax: subjectSpec.practicalMax,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'AI Marksheet Scan failed.');
      }

      const rows: {
        roll: number;
        mcq?: number | null;
        written?: number | null;
        practical?: number | null;
      }[] = Array.isArray(data.rows) ? data.rows : [];

      if (rows.length === 0) {
        setErrorBanner('ছবি থেকে কোনো রোল ও নম্বর শনাক্ত করা যায়নি। স্পষ্ট ছবি ব্যবহার করুন।');
      } else {
        let matched = 0;
        setDraftByStudentId((prev) => {
          const next = { ...prev };
          rows.forEach((scanned) => {
            const targetStu = classStudents.find((s) => s.roll === Number(scanned.roll));
            if (targetStu) {
              matched++;
              next[targetStu.id] = {
                mcq:
                  subjectSpec.mcqMax !== null
                    ? clampMark(scanned.mcq, subjectSpec.mcqMax)
                    : null,
                written:
                  subjectSpec.writtenMax !== null
                    ? clampMark(scanned.written, subjectSpec.writtenMax)
                    : null,
                practical:
                  subjectSpec.practicalMax !== null
                    ? clampMark(scanned.practical, subjectSpec.practicalMax)
                    : null,
              };
            }
          });
          return next;
        });
        setSaveBanner(
          `AI স্ক্যানার সফলভাবে ${matched} জন শিক্ষার্থীর নম্বর পূরণ করেছে। যাচাই করে Save Marks বাটনে চাপুন।`
        );
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to scan marksheet image.');
    } finally {
      setIsScanningAi(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (visibleAssignments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
        <FileSpreadsheet className="w-8 h-8 text-teal-700 dark:text-teal-400 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          কোনো নির্ধারিত বিষয় পাওয়া যায়নি (No Assigned Subjects)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          আপনি শুধুমাত্র অ্যাডমিন কর্তৃক নির্ধারিত বিষয়ের নম্বর এন্ট্রি করতে পারবেন। বিষয় বণ্টনের জন্য
          অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Single Compact Sticky Toolbar */}
      <div className="sticky top-14 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Subject, Term & Lock status */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="marks-subject-select"
              value={selectedMarksAssignmentId}
              onChange={(e) => setSelectedMarksAssignmentId(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500 max-w-xs truncate"
            >
              {visibleAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.className} ({a.section}) — {a.subjectName}
                </option>
              ))}
            </select>

            <select
              id="marks-term-select"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
            >
              {yearTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isLocked ? '🔒' : ''}
                </option>
              ))}
            </select>

            {isSubjectSubmitted ? (
              <span
                data-testid="badge-subject-submitted-locked"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              >
                <Lock className="w-3 h-3" />
                <span>শ্রেণি শিক্ষকের নিকট জমাদানকৃত ও লকড</span>
              </span>
            ) : (
              <span
                data-testid="badge-subject-draft"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                <Unlock className="w-3 h-3" />
                <span>খসড়া (Draft — এন্ট্রি উন্মুক্ত)</span>
              </span>
            )}

            {isSubjectSubmitted && isReviewer && activeTerm && (
              <button
                data-testid="btn-unlock-subject-marks"
                type="button"
                onClick={handleUnlockSubjectToDraft}
                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-teal-700 hover:bg-[#0d5c56] text-white flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Unlock className="w-3 h-3" />
                <span>পুনরায় এডিটের জন্য আনলক করুন</span>
              </button>
            )}

            {isAdmin && activeTerm && (
              <button
                type="button"
                onClick={() => toggleExamTermLock(activeTerm.id)}
                className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                {isTermLocked ? 'টার্ম আনলক' : 'টার্ম লক'}
              </button>
            )}

            {/* Marks Distribution Pills */}
            <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                পূর্ণমান: {num(subjectSpec.fullMarks)}
              </span>
              {subjectSpec.writtenMax !== null && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  CQ: {num(subjectSpec.writtenMax)}
                </span>
              )}
              {subjectSpec.mcqMax !== null && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  MCQ: {num(subjectSpec.mcqMax)}
                </span>
              )}
              {subjectSpec.practicalMax !== null && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  ব্যবহারিক: {num(subjectSpec.practicalMax)}
                </span>
              )}
            </div>
          </div>

          {/* Right: Search, AI Scanner, Undo / Clear */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রোল বা নাম..."
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white pl-7 pr-2.5 py-1.5 w-32 sm:w-40 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUploadForAiScan}
              className="hidden"
            />
            <button
              type="button"
              disabled={!canEditMarks || isScanningAi}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-teal-300 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 hover:bg-teal-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              title="মার্কশিটের ছবি স্ক্যান করে স্বয়ংক্রিয় নম্বর এন্ট্রি"
            >
              <Camera className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">{isScanningAi ? 'স্ক্যান...' : 'AI স্ক্যান'}</span>
            </button>

            {undoSnapshot.length > 0 ? (
              <button
                type="button"
                onClick={handleUndoClear}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>আনডু</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!canEditMarks || summaryStats.enteredCount === 0}
                onClick={handleClearAllWithUndo}
                className="p-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                title="নম্বর মুছে ফেলুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Strict Submission Lock Notice Banner */}
      {isSubjectSubmitted && !isReviewer && (
        <div
          data-testid="strict-lock-warning-banner"
          className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-4 py-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              এই বিষয়ের নম্বর চূড়ান্তভাবে শ্রেণি শিক্ষকের নিকট জমা দেওয়া হয়েছে এবং লক (Strict Lock) করা হয়েছে। শুধুমাত্র প্রধান শিক্ষক, সহকারী প্রধান শিক্ষক অথবা অ্যাডমিন এটি আনলক বা সংশোধন করতে পারবেন।
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('results-tabulation')}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
          >
            সেকশন ফলাফল দেখুন →
          </button>
        </div>
      )}

      {/* Feedback Banners */}
      {saveBanner && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 px-4 py-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-4 py-3 text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* MOBILE STUDENT MARKS CARD LIST (< 768px, md:hidden) — ZERO HORIZONTAL SCROLL */}
      <div data-marks-mobile-list className="md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
            কোনো শিক্ষার্থী পাওয়া যায়নি।
          </div>
        ) : (
          filteredStudents.map((stu, stuIdx) => {
            const evalRow = evaluatedRows.find((r) => r.student.id === stu.id);
            const draft = evalRow?.draft || { mcq: null, written: null, practical: null };
            const evaluated = evalRow?.evaluated || evaluateSubjectMarkComponents(draft, subjectSpec);
            const hasAnyEntry = Boolean(evalRow?.hasAnyEntry);
            const isPass = Boolean(evalRow?.isPass);
            const wrOut = Boolean(evalRow?.wrOut);
            const mcqOut = Boolean(evalRow?.mcqOut);
            const pracOut = Boolean(evalRow?.pracOut);
            const hasOutOfRange = Boolean(evalRow?.hasOutOfRange);

            const wrColIdx = enabledComponentOrder.indexOf('written');
            const mcqColIdx = enabledComponentOrder.indexOf('mcq');
            const pracColIdx = enabledComponentOrder.indexOf('practical');

            return (
              <div
                key={stu.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all ${
                  hasOutOfRange
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700'
                    : !isPass && hasAnyEntry
                    ? 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-700 text-white font-mono font-bold text-xs tabular-nums shrink-0">
                      #{num(String(stu.roll).padStart(2, '0'))}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {stu.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {stu.group}
                      </div>
                    </div>
                  </div>

                  {/* Live Auto-Calculated Total | Grade | GPA Pill Badge */}
                  <div
                    className={`px-2.5 py-1 rounded-xl border text-xs font-bold tabular-nums shrink-0 flex items-center gap-1.5 ${
                      !hasAnyEntry
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        : isPass
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span>মোট: {hasAnyEntry ? num(evaluated.totalMarks) : '—'}</span>
                    <span aria-hidden="true">|</span>
                    <span>{hasAnyEntry ? evaluated.letterGrade : '—'}</span>
                    <span aria-hidden="true">|</span>
                    <span>{hasAnyEntry ? num(evaluated.gpa.toFixed(2)) : '0.00'}</span>
                  </div>
                </div>

                {/* Clean 3-Column Grid of Large Numeric Input Boxes (CQ, MCQ, Practical/CA) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                      CQ ({subjectSpec.writtenMax !== null ? num(subjectSpec.writtenMax) : 'N/A'})
                    </label>
                    {subjectSpec.writtenMax !== null ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        enterKeyHint="next"
                        data-row={stuIdx}
                        data-col={wrColIdx}
                        data-mobile-mark-input={`${stuIdx}-0`}
                        disabled={!canEditMarks}
                        min={0}
                        max={subjectSpec.writtenMax}
                        placeholder={`0-${subjectSpec.writtenMax}`}
                        value={draft.written ?? ''}
                        onChange={(e) => handleComponentChange(stu.id, 'written', e.target.value)}
                        onKeyDown={(e) => handleDesktopKeyDown(e, stuIdx, wrColIdx)}
                        className={`w-full text-center font-mono font-bold text-base rounded-xl border px-2 py-2.5 tabular-nums transition-colors ${
                          wrOut
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600 focus:bg-white'
                        }`}
                      />
                    ) : (
                      <div className="w-full text-center py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                      MCQ ({subjectSpec.mcqMax !== null ? num(subjectSpec.mcqMax) : 'N/A'})
                    </label>
                    {subjectSpec.mcqMax !== null ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        enterKeyHint="next"
                        data-row={stuIdx}
                        data-col={mcqColIdx}
                        data-mobile-mark-input={
                          subjectSpec.writtenMax === null ? `${stuIdx}-0` : `${stuIdx}-1`
                        }
                        disabled={!canEditMarks}
                        min={0}
                        max={subjectSpec.mcqMax}
                        placeholder={`0-${subjectSpec.mcqMax}`}
                        value={draft.mcq ?? ''}
                        onChange={(e) => handleComponentChange(stu.id, 'mcq', e.target.value)}
                        onKeyDown={(e) => handleDesktopKeyDown(e, stuIdx, mcqColIdx)}
                        className={`w-full text-center font-mono font-bold text-base rounded-xl border px-2 py-2.5 tabular-nums transition-colors ${
                          mcqOut
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600 focus:bg-white'
                        }`}
                      />
                    ) : (
                      <div className="w-full text-center py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 tabular-nums">
                      Prac ({subjectSpec.practicalMax !== null ? num(subjectSpec.practicalMax) : 'N/A'})
                    </label>
                    {subjectSpec.practicalMax !== null ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        enterKeyHint="next"
                        data-row={stuIdx}
                        data-col={pracColIdx}
                        data-mobile-mark-input={`${stuIdx}-2`}
                        disabled={!canEditMarks}
                        min={0}
                        max={subjectSpec.practicalMax}
                        placeholder={`0-${subjectSpec.practicalMax}`}
                        value={draft.practical ?? ''}
                        onChange={(e) =>
                          handleComponentChange(stu.id, 'practical', e.target.value)
                        }
                        onKeyDown={(e) => handleDesktopKeyDown(e, stuIdx, pracColIdx)}
                        className={`w-full text-center font-mono font-bold text-base rounded-xl border px-2 py-2.5 tabular-nums transition-colors ${
                          pracOut
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600 focus:bg-white'
                        }`}
                      />
                    ) : (
                      <div className="w-full text-center py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {hasOutOfRange ? (
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      ⚠ পূর্ণমানের চেয়ে বেশি নম্বর দেওয়া হয়েছে!
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Enter চাপলে পরবর্তী রোলে যাবে
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => focusNextMobileStudentFirstInput(stuIdx)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                    >
                      পরবর্তী (Next) ↵
                    </button>
                    <button
                      type="button"
                      disabled={!canEditMarks || hasOutOfRange}
                      onClick={() => handleSaveSingleRow(stu.id)}
                      className="px-3 py-1 rounded-lg bg-teal-700 text-white text-[11px] font-bold disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP STICKY-HEADER SPREADSHEET TABLE (>= 768px, hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 w-20">রোল (Roll)</th>
                <th className="py-3.5 px-4">শিক্ষার্থীর নাম (Student Name)</th>
                <th className="py-3.5 px-4 text-center w-36">
                  CQ / লিখিত{' '}
                  {subjectSpec.writtenMax !== null ? `(${num(subjectSpec.writtenMax)})` : '(N/A)'}
                </th>
                <th className="py-3.5 px-4 text-center w-36">
                  MCQ {subjectSpec.mcqMax !== null ? `(${num(subjectSpec.mcqMax)})` : '(N/A)'}
                </th>
                <th className="py-3.5 px-4 text-center w-36">
                  Practical/CA{' '}
                  {subjectSpec.practicalMax !== null
                    ? `(${num(subjectSpec.practicalMax)})`
                    : '(N/A)'}
                </th>
                <th className="py-3.5 px-4 text-right w-24">মোট ({num(subjectSpec.fullMarks)})</th>
                <th className="py-3.5 px-4 text-center w-24">গ্রেড</th>
                <th className="py-3.5 px-4 text-right w-24">জিপিএ (GPA)</th>
                <th className="py-3.5 px-4 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    কোনো শিক্ষার্থী পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, rowIdx) => {
                  const evalRow = evaluatedRows.find((r) => r.student.id === stu.id);
                  const draft = evalRow?.draft || { mcq: null, written: null, practical: null };
                  const evaluated =
                    evalRow?.evaluated || evaluateSubjectMarkComponents(draft, subjectSpec);
                  const hasAnyEntry = Boolean(evalRow?.hasAnyEntry);
                  const isPass = Boolean(evalRow?.isPass);
                  const wrOut = Boolean(evalRow?.wrOut);
                  const mcqOut = Boolean(evalRow?.mcqOut);
                  const pracOut = Boolean(evalRow?.pracOut);
                  const hasOutOfRange = Boolean(evalRow?.hasOutOfRange);

                  const wrColIdx = enabledComponentOrder.indexOf('written');
                  const mcqColIdx = enabledComponentOrder.indexOf('mcq');
                  const pracColIdx = enabledComponentOrder.indexOf('practical');

                  return (
                    <tr
                      key={stu.id}
                      className={`transition-colors ${
                        hasOutOfRange
                          ? 'bg-red-50/70 dark:bg-red-950/30'
                          : !isPass && hasAnyEntry
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        #{num(String(stu.roll).padStart(2, '0'))}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div>{stu.name}</div>
                        {hasOutOfRange && (
                          <div className="text-[10px] font-bold text-red-600 dark:text-red-400">
                            ⚠ পূর্ণমানের চেয়ে বেশি নম্বর!
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {subjectSpec.writtenMax !== null ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            data-row={rowIdx}
                            data-col={wrColIdx}
                            data-desktop-mark-cell={`${rowIdx}-${wrColIdx}`}
                            disabled={!canEditMarks}
                            min={0}
                            max={subjectSpec.writtenMax}
                            placeholder={`0 - ${subjectSpec.writtenMax}`}
                            value={draft.written ?? ''}
                            onChange={(e) =>
                              handleComponentChange(stu.id, 'written', e.target.value)
                            }
                            onKeyDown={(e) => handleDesktopKeyDown(e, rowIdx, wrColIdx)}
                            className={`w-24 text-center font-mono font-bold text-xs rounded-lg border px-2 py-1.5 tabular-nums transition-all ${
                              wrOut
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600'
                            }`}
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {subjectSpec.mcqMax !== null ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            data-row={rowIdx}
                            data-col={mcqColIdx}
                            data-desktop-mark-cell={`${rowIdx}-${mcqColIdx}`}
                            disabled={!canEditMarks}
                            min={0}
                            max={subjectSpec.mcqMax}
                            placeholder={`0 - ${subjectSpec.mcqMax}`}
                            value={draft.mcq ?? ''}
                            onChange={(e) => handleComponentChange(stu.id, 'mcq', e.target.value)}
                            onKeyDown={(e) => handleDesktopKeyDown(e, rowIdx, mcqColIdx)}
                            className={`w-24 text-center font-mono font-bold text-xs rounded-lg border px-2 py-1.5 tabular-nums transition-all ${
                              mcqOut
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600'
                            }`}
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {subjectSpec.practicalMax !== null ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            data-row={rowIdx}
                            data-col={pracColIdx}
                            data-desktop-mark-cell={`${rowIdx}-${pracColIdx}`}
                            disabled={!canEditMarks}
                            min={0}
                            max={subjectSpec.practicalMax}
                            placeholder={`0 - ${subjectSpec.practicalMax}`}
                            value={draft.practical ?? ''}
                            onChange={(e) =>
                              handleComponentChange(stu.id, 'practical', e.target.value)
                            }
                            onKeyDown={(e) => handleDesktopKeyDown(e, rowIdx, pracColIdx)}
                            className={`w-24 text-center font-mono font-bold text-xs rounded-lg border px-2 py-1.5 tabular-nums transition-all ${
                              pracOut
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 ring-2 ring-red-400/50'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-teal-600'
                            }`}
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                        {hasAnyEntry ? num(evaluated.totalMarks) : '—'}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {hasAnyEntry ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              evaluated.letterGrade === 'F'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                : evaluated.letterGrade === 'A+'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                            }`}
                          >
                            {evaluated.letterGrade}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {hasAnyEntry ? num(evaluated.gpa.toFixed(2)) : '—'}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={!canEditMarks || hasOutOfRange}
                          onClick={() => handleSaveSingleRow(stu.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-700 hover:text-white hover:border-teal-700 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Bar: Live Class Statistics + Save Marks & Verification Sheet */}
      <div className="no-print fixed bottom-20 lg:bottom-4 left-0 right-0 lg:left-60 z-30 px-4 pointer-events-none">
        <div className="max-w-5xl mx-auto backdrop-blur-md bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-xl border border-teal-500/40 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs tabular-nums">
            <span className="px-2 py-1 rounded-md bg-white/10 font-medium">
              গড় নম্বর: <strong className="text-teal-300">{num(summaryStats.avgMarks)}</strong>
            </span>
            <span className="px-2 py-1 rounded-md bg-white/10 font-medium">
              পাস: <strong className="text-emerald-400">{num(summaryStats.passRatePct)}%</strong>
            </span>
            <span className="px-2 py-1 rounded-md bg-white/10 font-medium">
              A+: <strong className="text-amber-300">{num(summaryStats.aPlusCount)}</strong>
            </span>
            <span className="px-2 py-1 rounded-md bg-white/10 font-medium">
              ফেল: <strong className="text-rose-400">{num(summaryStats.failCount)}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowVerificationModal(true)}
              className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>ভেরিফিকেশন শিট</span>
            </button>

            <button
              type="button"
              disabled={!canEditMarks || summaryStats.outOfRangeCount > 0}
              onClick={handleSaveAllMarks}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>খসড়া সংরক্ষণ (Save Draft)</span>
            </button>

            {!isSubjectSubmitted &&
              activeAssignment &&
              (isAssignedSubjectTeacher(currentUser, activeAssignment) || isReviewer) && (
                <button
                  data-testid="btn-final-submit-subject-marks"
                  type="button"
                  disabled={summaryStats.outOfRangeCount > 0}
                  onClick={handleFinalSubmitToClassTeacher}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>শ্রেণি শিক্ষকের নিকট চূড়ান্ত জমা দিন</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {showVerificationModal && activeAssignment && (
        <VerificationSheetDialogModal
          year={activeYear}
          term={activeTerm || undefined}
          classSection={activeClassSection}
          assignment={activeAssignment}
          subjectSpec={subjectSpec}
          students={classStudents}
          marks={liveMarksForVerification}
          onDismiss={() => setShowVerificationModal(false)}
        />
      )}
    </div>
  );
};
