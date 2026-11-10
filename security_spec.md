# Abu Torab High School Portal - Firestore Security Specification

## 1. Data Invariants & Role Model
1. **Admin Role Definition (`isAdmin()`)**:
   - A user is an Admin if and only if they are a verified user (`request.auth.token.email_verified == true`) AND either:
     - Their `/users/$(request.auth.uid)` document exists with `role == 'admin'` and `status == 'active'`, OR
     - Their verified email is the bootstrapped Super Admin email (`ananneyadebnath@gmail.com`).
2. **Users Collection (`/users/{userId}`)**:
   - **First Sign-In Creation**: A verified user may create their own initial profile at `/users/$(request.auth.uid)` with `status == 'active'` and `role == 'teacher'` (or `role == 'admin'` exclusively for `ananneyadebnath@gmail.com`), or an Admin (`role == 'admin'`) may create any user profile.
   - **Modification & Deletion (`update`, `delete`)**: Strictly restricted to users with `role == 'admin'` (`isAdmin()`). Standard teachers cannot modify or delete user documents.
3. **Classes & Subject Assignments (`/classSections/{classSectionId}`, `/classes/{classId}`, `/subjectAssignments/{assignmentId}`, `/academicYears/{yearId}`, `/examTerms/{termId}`, `/routineEntries/{entryId}`)**:
   - **Modification (`create`, `update`, `delete`)**: Strictly restricted to users with `role == 'admin'` (`isAdmin()`).
   - **Read (`get`, `list`)**: Accessible to active authenticated teachers and admins.
4. **Attendance (`/attendanceRecords/{recordId}` and `/attendance/{recordId}`)**:
   - **Write (`create`, `update`, `delete`)**: Strictly restricted to users with `role == 'admin'` (`isAdmin()`) OR the assigned Class Teacher (`classTeacherUid == request.auth.uid`) of the target class (`/classSections/$(classSectionId)` or `/classes/$(classSectionId)`).
   - On `update`, `classSectionId` and `date` are immutable for non-admins.
5. **Subject Marks (`/subjectMarks/{markId}` and `/marks/{markId}`)**:
   - **Write (`create`, `update`, `delete`)**: Strictly restricted to users with `role == 'admin'` (`isAdmin()`) OR the assigned Subject Teacher (`teacherUid == request.auth.uid`) of the target subject assignment (`/subjectAssignments/$(assignmentId)`), provided the exam term is unlocked.
   - On `update`, `assignmentId`, `termId`, `classSectionId`, and `studentId` are immutable for non-admins.
6. **Master Student Roster (`/students/{studentId}`)**:
   - **Write (`create`, `update`, `delete`)**: Restricted to `isAdmin()` OR the assigned Class Teacher (`classTeacherUid == request.auth.uid`) of the student's class.

## 2. The "Dirty Dozen" Payloads (Adversarial Test Cases)
1. **Privilege Escalation on Registration**: A non-admin (`teacher@example.com`) creates `/users/uid123` with `"role": "admin"`. -> `PERMISSION_DENIED`
2. **Unverified Admin Email Spoof**: A user with `email == "ananneyadebnath@gmail.com"` but `email_verified == false` attempts to write to `/academicYears/2026`. -> `PERMISSION_DENIED`
3. **Shadow Field Injection on User Profile**: A user sends `"isSuperAdmin": true` in `/users/uid123`. -> `PERMISSION_DENIED` (`hasOnly` check)
4. **Non-Admin User Modification**: A teacher (`role == 'teacher'`) attempts to update their own or another user's `/users/{userId}` document. -> `PERMISSION_DENIED` (only `role == 'admin'` can modify `users`)
5. **ID Poisoning Attack**: Creating a document with a 300-character ID or special characters outside `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`
6. **Oversized String Denial-of-Wallet**: Sending a 5,000-character `name` on `/students/st1`. -> `PERMISSION_DENIED` (`name.size() <= 120`)
7. **Non-Admin Class or SubjectAssignment Modification**: A teacher (`role == 'teacher'`) attempts to create, update, or delete a document in `/classSections`, `/classes`, or `/subjectAssignments`. -> `PERMISSION_DENIED`
8. **Unauthorized Attendance Write**: Teacher B (not the assigned `classTeacherUid` for `cs_6_a`) attempts to create, update, or delete an attendance record for `cs_6_a`. -> `PERMISSION_DENIED`
9. **Unauthorized Subject Marks Write**: Teacher B (not the assigned `teacherUid` for `asg_math_6a`) attempts to create, update, or delete a mark record for `asg_math_6a`. -> `PERMISSION_DENIED`
10. **Cross-Class Attendance Reassignment on Update**: Assigned Class Teacher for `cs_6_a` attempts to update an attendance record's `classSectionId` to another class. -> `PERMISSION_DENIED`
11. **Invalid Enum Value in Student Group**: Creating a student with `"group": "Astrology"`. -> `PERMISSION_DENIED`
12. **Negative or Out-of-Bounds Exam Marks**: Entering `"totalMarks": 999` or `"writtenMarks": -10`. -> `PERMISSION_DENIED`
