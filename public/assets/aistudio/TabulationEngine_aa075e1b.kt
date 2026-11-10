package com.abutorab.marks9b.ui.screens

import com.abutorab.marks9b.data.local.entity.ApplicabilityType
import com.abutorab.marks9b.data.local.entity.MarkEntity
import com.abutorab.marks9b.data.local.entity.SheetRole
import com.abutorab.marks9b.data.local.entity.StudentEntity
import com.abutorab.marks9b.data.local.entity.SubjectEntity
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

data class SubjectResult(
    val subject: SubjectEntity,
    val mcqMarks: Int?,
    val writtenMarks: Int?,
    val practicalMarks: Int?,
    val total: Int,
    val letterGrade: String,
    val gradePoint: Double
)

data class StudentResult(
    val student: StudentEntity,
    val subjectResults: List<SubjectResult>,
    val grandTotal: Int,
    val failedCount: Int,
    val gpa: Double?,
    val letterGrade: String,
    val position: Int?
)

data class CombinedSubjectResult(
    val sheetRole: String,
    val applicabilityValue: String?,
    val subjectName: String,
    val fullMarks: Int,
    val mcqMarks: Double?,
    val writtenMarks: Double?,
    val practicalMarks: Double?,
    val total: Double,
    val letterGrade: String,
    val gradePoint: Double,
    val midTotal: Int? = null,
    val annualTotal: Int? = null
)

data class CombinedStudentResult(
    val student: StudentEntity,
    val subjectResults: List<CombinedSubjectResult>,
    val grandTotal: Double,
    val failedCount: Int,
    val gpa: Double?,
    val letterGrade: String,
    val position: Int?
)

object TabulationEngine {

    fun letterGrade(total: Int, fullMarks: Int, sheetRole: SheetRole, hasMarksForSubject: Boolean = false): String {
        if (total == 0 && !hasMarksForSubject) return ""
        if (sheetRole == SheetRole.ICT || fullMarks == 50) {
            return when {
                total >= 40 -> "A+"
                total >= 35 -> "A"
                total >= 30 -> "A-"
                total >= 25 -> "B"
                total >= 20 -> "C"
                total >= 16 -> "D"
                else -> "F"
            }
        } else {
            return when {
                total >= 80 -> "A+"
                total >= 70 -> "A"
                total >= 60 -> "A-"
                total >= 50 -> "B"
                total >= 40 -> "C"
                total >= 33 -> "D"
                else -> "F"
            }
        }
    }

    fun gradePointFromLetter(lg: String): Double {
        return when (lg) {
            "A+" -> 5.0
            "A" -> 4.0
            "A-" -> 3.5
            "B" -> 3.0
            "C" -> 2.0
            "D" -> 1.0
            "F" -> 0.0
            "" -> 0.0
            else -> 0.0
        }
    }

    fun combinedGP(combined: Int, outOf: Int): Double {
        return when {
            combined >= 160 -> 5.0
            combined >= 140 -> 4.0
            combined >= 120 -> 3.5
            combined >= 100 -> 3.0
            combined >= 80 -> 2.0
            combined >= 66 -> 1.0
            combined == 0 -> 0.0
            else -> 0.0
        }
    }

    fun optionalBonus(gp: Double): Double {
        return max(0.0, gp - 2.0)
    }

    fun compute(students: List<StudentEntity>, subjects: List<SubjectEntity>, marks: List<MarkEntity>): List<StudentResult> {
        val subjectsWithMarks = marks.map { it.subjectId }.toSet()
        val studentResults = mutableListOf<StudentResult>()

        for (student in students) {
            val applicableSubjects = subjects.filter { subject ->
                when (subject.applicabilityType) {
                    ApplicabilityType.ALL.name -> true
                    ApplicabilityType.RELIGION.name -> subject.applicabilityValue == student.religion
                    ApplicabilityType.GROUP.name -> subject.applicabilityValue == student.group
                    ApplicabilityType.OPTIONAL_TYPE.name -> subject.applicabilityValue == student.optionalType
                    else -> false
                }
            }

            val subjectResults = mutableListOf<SubjectResult>()
            var grandTotal = 0
            var failedCount = 0

            var bangla1Total = 0
            var bangla2Total = 0
            var eng1Total = 0
            var eng2Total = 0

            val individualGPs = mutableListOf<Double>()
            var optionalBonusGP = 0.0

            var bangla1Result: SubjectResult? = null
            var bangla2Result: SubjectResult? = null
            var eng1Result: SubjectResult? = null
            var eng2Result: SubjectResult? = null

            for (subject in applicableSubjects) {
                val mark = marks.find { it.studentId == student.id && it.subjectId == subject.id }
                val total = (mark?.mcqMarks ?: 0) + (mark?.writtenMarks ?: 0) + (mark?.practicalMarks ?: 0)
                grandTotal += total

                val sheetRole = try {
                    SheetRole.valueOf(subject.sheetRole)
                } catch (e: Exception) {
                    SheetRole.NONE
                }

                val hasMarksForSubject = subjectsWithMarks.contains(subject.id)
                val rawLg = letterGrade(total, subject.fullMarks, sheetRole, hasMarksForSubject)
                val lg = if (rawLg.isNotEmpty() && !passesComponentMinimums(mark?.mcqMarks, mark?.writtenMarks, mark?.practicalMarks, subject.mcqMax, subject.writtenMax, subject.practicalMax)) "F" else rawLg
                val gp = gradePointFromLetter(lg)

                if (lg == "F" && sheetRole != SheetRole.OPTIONAL) {
                    if (sheetRole != SheetRole.BANGLA1 && sheetRole != SheetRole.BANGLA2 && 
                        sheetRole != SheetRole.ENG1 && sheetRole != SheetRole.ENG2) {
                        failedCount++
                    }
                }

                val res = SubjectResult(subject, mark?.mcqMarks, mark?.writtenMarks, mark?.practicalMarks, total, lg, gp)
                subjectResults.add(res)

                when (sheetRole) {
                    SheetRole.BANGLA1 -> { bangla1Total = total; bangla1Result = res }
                    SheetRole.BANGLA2 -> { bangla2Total = total; bangla2Result = res }
                    SheetRole.ENG1 -> { eng1Total = total; eng1Result = res }
                    SheetRole.ENG2 -> { eng2Total = total; eng2Result = res }
                    SheetRole.MATH,
                    SheetRole.RELIGION,
                    SheetRole.BGS_OR_SCIENCE,
                    SheetRole.ELECTIVE1,
                    SheetRole.ELECTIVE2,
                    SheetRole.ELECTIVE3,
                    SheetRole.ICT -> {
                        individualGPs.add(gp)
                    }
                    SheetRole.OPTIONAL -> {
                        optionalBonusGP = optionalBonus(gp)
                    }
                    else -> {}
                }
            }

            var banglaGP = 0.0
            val hasBangla = bangla1Result != null || bangla2Result != null
            if (hasBangla) {
                val totalMcq = (bangla1Result?.mcqMarks ?: 0) + (bangla2Result?.mcqMarks ?: 0)
                val totalWritten = (bangla1Result?.writtenMarks ?: 0) + (bangla2Result?.writtenMarks ?: 0)
                val totalPractical = (bangla1Result?.practicalMarks ?: 0) + (bangla2Result?.practicalMarks ?: 0)
                
                val clearsComponents = passesCombinedMinimums(
                    totalMcq, totalWritten, totalPractical,
                    bangla1Result?.subject?.mcqMax ?: 0, bangla2Result?.subject?.mcqMax ?: 0,
                    bangla1Result?.subject?.writtenMax ?: 0, bangla2Result?.subject?.writtenMax ?: 0,
                    bangla1Result?.subject?.practicalMax ?: 0, bangla2Result?.subject?.practicalMax ?: 0
                )
                
                val rawGP = combinedGP(bangla1Total + bangla2Total, 200)
                if (clearsComponents && rawGP > 0.0) {
                    banglaGP = rawGP
                }
                
                if (banglaGP == 0.0) {
                    failedCount++
                }
            }

            var engGP = 0.0
            val hasEng = eng1Result != null || eng2Result != null
            if (hasEng) {
                val totalMcq = (eng1Result?.mcqMarks ?: 0) + (eng2Result?.mcqMarks ?: 0)
                val totalWritten = (eng1Result?.writtenMarks ?: 0) + (eng2Result?.writtenMarks ?: 0)
                val totalPractical = (eng1Result?.practicalMarks ?: 0) + (eng2Result?.practicalMarks ?: 0)
                
                val clearsComponents = passesCombinedMinimums(
                    totalMcq, totalWritten, totalPractical,
                    eng1Result?.subject?.mcqMax ?: 0, eng2Result?.subject?.mcqMax ?: 0,
                    eng1Result?.subject?.writtenMax ?: 0, eng2Result?.subject?.writtenMax ?: 0,
                    eng1Result?.subject?.practicalMax ?: 0, eng2Result?.subject?.practicalMax ?: 0
                )
                
                val rawGP = combinedGP(eng1Total + eng2Total, 200)
                if (clearsComponents && rawGP > 0.0) {
                    engGP = rawGP
                }
                
                if (engGP == 0.0) {
                    failedCount++
                }
            }

            val gpSum = individualGPs.sum() + banglaGP + engGP + optionalBonusGP

            val gpa: Double? = if (grandTotal == 0) null else {
                val raw = if (failedCount > 0) 0.0 else min(5.0, gpSum / 9.0)
                round(raw * 100.0) / 100.0
            }

            val overallLg = when {
                gpa == null -> ""
                failedCount > 0 -> "F"
                gpa >= 5.0 -> "A+"
                gpa >= 4.0 -> "A"
                gpa >= 3.5 -> "A-"
                gpa >= 3.0 -> "B"
                gpa >= 2.0 -> "C"
                gpa >= 1.0 -> "D"
                else -> "F"
            }

            studentResults.add(
                StudentResult(
                    student = student,
                    subjectResults = subjectResults,
                    grandTotal = grandTotal,
                    failedCount = failedCount,
                    gpa = gpa,
                    letterGrade = overallLg,
                    position = null
                )
            )
        }

        val rankedResults = studentResults.map { result ->
            if (result.grandTotal == 0) {
                result.copy(position = null)
            } else {
                val rank = studentResults.count {
                    if (it.failedCount < result.failedCount) {
                        true
                    } else if (it.failedCount == result.failedCount) {
                        if (result.failedCount == 0) {
                            val itGpa = it.gpa ?: 0.0
                            val resultGpa = result.gpa ?: 0.0
                            if (itGpa > resultGpa) true
                            else if (itGpa == resultGpa && it.grandTotal > result.grandTotal) true
                            else if (itGpa == resultGpa && it.grandTotal == result.grandTotal) it.student.roll < result.student.roll
                            else false
                        } else {
                            if (it.grandTotal > result.grandTotal) true
                            else if (it.grandTotal == result.grandTotal) it.student.roll < result.student.roll
                            else false
                        }
                    } else {
                        false
                    }
                } + 1
                result.copy(position = rank)
            }
        }

        return rankedResults
    }

    fun letterGradeDouble(total: Double, fullMarks: Int, sheetRole: SheetRole, hasMarksForSubject: Boolean = false): String {
        if (total <= 0.0 && !hasMarksForSubject) return ""
        if (sheetRole == SheetRole.ICT || fullMarks == 50) {
            return when {
                total >= 40 -> "A+"
                total >= 35 -> "A"
                total >= 30 -> "A-"
                total >= 25 -> "B"
                total >= 20 -> "C"
                total >= 16 -> "D"
                else -> "F"
            }
        } else {
            return when {
                total >= 80 -> "A+"
                total >= 70 -> "A"
                total >= 60 -> "A-"
                total >= 50 -> "B"
                total >= 40 -> "C"
                total >= 33 -> "D"
                else -> "F"
            }
        }
    }

    fun passesComponentMinimums(
        mcqMarks: Int?, writtenMarks: Int?, practicalMarks: Int?,
        mcqMax: Int?, writtenMax: Int?, practicalMax: Int?
    ): Boolean {
        val componentCount = listOfNotNull(mcqMax, writtenMax, practicalMax).size
        if (componentCount <= 1) return true

        fun clears(mark: Int?, max: Int?): Boolean {
            if (max == null) return true
            val threshold = round(max / 3.0).toInt()
            return (mark ?: 0) >= threshold
        }

        return clears(mcqMarks, mcqMax) && clears(writtenMarks, writtenMax) && clears(practicalMarks, practicalMax)
    }

    fun passesComponentMinimumsDouble(
        mcqMarks: Double?, writtenMarks: Double?, practicalMarks: Double?,
        mcqMax: Int?, writtenMax: Int?, practicalMax: Int?
    ): Boolean {
        val componentCount = listOfNotNull(mcqMax, writtenMax, practicalMax).size
        if (componentCount <= 1) return true

        fun clears(mark: Double?, max: Int?): Boolean {
            if (max == null) return true
            val threshold = round(max / 3.0).toInt()
            return (mark ?: 0.0) >= threshold
        }

        return clears(mcqMarks, mcqMax) && clears(writtenMarks, writtenMax) && clears(practicalMarks, practicalMax)
    }

    fun passesCombinedMinimums(
        totalMcq: Int, totalWritten: Int, totalPractical: Int,
        mcqMax1: Int, mcqMax2: Int, writtenMax1: Int, writtenMax2: Int, practicalMax1: Int, practicalMax2: Int
    ): Boolean {
        val hasMultipleComponents = listOf(mcqMax1 + mcqMax2, writtenMax1 + writtenMax2, practicalMax1 + practicalMax2).count { it > 0 } > 1
        if (!hasMultipleComponents) return true

        fun threshold(max1: Int, max2: Int): Int {
            val t1 = if (max1 > 0) round(max1 / 3.0).toInt() else 0
            val t2 = if (max2 > 0) round(max2 / 3.0).toInt() else 0
            return t1 + t2
        }

        return totalMcq >= threshold(mcqMax1, mcqMax2) &&
               totalWritten >= threshold(writtenMax1, writtenMax2) &&
               totalPractical >= threshold(practicalMax1, practicalMax2)
    }

    fun passesCombinedMinimumsDouble(
        totalMcq: Double, totalWritten: Double, totalPractical: Double,
        mcqMax1: Int, mcqMax2: Int, writtenMax1: Int, writtenMax2: Int, practicalMax1: Int, practicalMax2: Int
    ): Boolean {
        val hasMultipleComponents = listOf(mcqMax1 + mcqMax2, writtenMax1 + writtenMax2, practicalMax1 + practicalMax2).count { it > 0 } > 1
        if (!hasMultipleComponents) return true

        fun threshold(max1: Int, max2: Int): Int {
            val t1 = if (max1 > 0) round(max1 / 3.0).toInt() else 0
            val t2 = if (max2 > 0) round(max2 / 3.0).toInt() else 0
            return t1 + t2
        }

        return totalMcq >= threshold(mcqMax1, mcqMax2) &&
               totalWritten >= threshold(writtenMax1, writtenMax2) &&
               totalPractical >= threshold(practicalMax1, practicalMax2)
    }

    fun combinedGPDouble(combined: Double, outOf: Int): Double {
        return when {
            combined >= 160 -> 5.0
            combined >= 140 -> 4.0
            combined >= 120 -> 3.5
            combined >= 100 -> 3.0
            combined >= 80 -> 2.0
            combined >= 66 -> 1.0
            else -> 0.0
        }
    }

    fun computeCombined(
        students: List<StudentEntity>,
        midSubjects: List<SubjectEntity>,
        midMarks: List<MarkEntity>,
        annualSubjects: List<SubjectEntity>,
        annualMarks: List<MarkEntity>
    ): List<CombinedStudentResult> {
        val midSubjectsWithMarks = midMarks.map { it.subjectId }.toSet()
        val annualSubjectsWithMarks = annualMarks.map { it.subjectId }.toSet()
        val midResults = compute(students, midSubjects, midMarks).associateBy { it.student.id }
        val annualResults = compute(students, annualSubjects, annualMarks).associateBy { it.student.id }

        val studentResults = mutableListOf<CombinedStudentResult>()

        for (student in students) {
            val midSr = midResults[student.id]?.subjectResults ?: emptyList()
            val annSr = annualResults[student.id]?.subjectResults ?: emptyList()

            val slotKeys = (midSr.map { it.subject.sheetRole to it.subject.applicabilityValue } +
                    annSr.map { it.subject.sheetRole to it.subject.applicabilityValue }).distinct()

            val combinedSubjects = mutableListOf<CombinedSubjectResult>()
            var grandTotal = 0.0
            var failedCount = 0

            var bangla1Total = 0.0
            var bangla2Total = 0.0
            var eng1Total = 0.0
            var eng2Total = 0.0

            val individualGPs = mutableListOf<Double>()
            var optionalBonusGP = 0.0
            
            var bangla1Result: CombinedSubjectResult? = null
            var bangla2Result: CombinedSubjectResult? = null
            var eng1Result: CombinedSubjectResult? = null
            var eng2Result: CombinedSubjectResult? = null

            for ((role, value) in slotKeys) {
                val m = midSr.find { it.subject.sheetRole == role && it.subject.applicabilityValue == value }
                val a = annSr.find { it.subject.sheetRole == role && it.subject.applicabilityValue == value }
                val referenceSubject = m?.subject ?: a?.subject ?: continue

                fun combineComponent(midVal: Int?, annVal: Int?): Double? {
                    if (midVal == null && annVal == null) return null
                    return ((midVal ?: 0) + (annVal ?: 0)) / 2.0
                }

                val cMcq = combineComponent(m?.mcqMarks, a?.mcqMarks)
                val cWritten = combineComponent(m?.writtenMarks, a?.writtenMarks)
                val cPractical = combineComponent(m?.practicalMarks, a?.practicalMarks)
                val cTotal = (cMcq ?: 0.0) + (cWritten ?: 0.0) + (cPractical ?: 0.0)

                val sheetRole = try { SheetRole.valueOf(role) } catch (e: Exception) { SheetRole.NONE }
                val hasMarksForMidSubject = m?.subject?.id?.let { midSubjectsWithMarks.contains(it) } ?: false
                val hasMarksForAnnSubject = a?.subject?.id?.let { annualSubjectsWithMarks.contains(it) } ?: false
                val hasMarksForSubject = hasMarksForMidSubject || hasMarksForAnnSubject
                val rawLg = letterGradeDouble(cTotal, referenceSubject.fullMarks, sheetRole, hasMarksForSubject)
                val lg = if (rawLg.isNotEmpty() && !passesComponentMinimumsDouble(cMcq, cWritten, cPractical, referenceSubject.mcqMax, referenceSubject.writtenMax, referenceSubject.practicalMax)) "F" else rawLg
                val gp = gradePointFromLetter(lg)

                if (lg == "F" && sheetRole != SheetRole.OPTIONAL) {
                    if (sheetRole != SheetRole.BANGLA1 && sheetRole != SheetRole.BANGLA2 && 
                        sheetRole != SheetRole.ENG1 && sheetRole != SheetRole.ENG2) {
                        failedCount++
                    }
                }

                val midTotal = m?.total
                val annualTotal = a?.total

                val res = CombinedSubjectResult(
                    sheetRole = role,
                    applicabilityValue = value,
                    subjectName = referenceSubject.name,
                    fullMarks = referenceSubject.fullMarks,
                    mcqMarks = cMcq,
                    writtenMarks = cWritten,
                    practicalMarks = cPractical,
                    total = cTotal,
                    letterGrade = lg,
                    gradePoint = gp,
                    midTotal = midTotal,
                    annualTotal = annualTotal
                )
                combinedSubjects.add(res)
                grandTotal += cTotal

                when (sheetRole) {
                    SheetRole.BANGLA1 -> { bangla1Total = cTotal; bangla1Result = res }
                    SheetRole.BANGLA2 -> { bangla2Total = cTotal; bangla2Result = res }
                    SheetRole.ENG1 -> { eng1Total = cTotal; eng1Result = res }
                    SheetRole.ENG2 -> { eng2Total = cTotal; eng2Result = res }
                    SheetRole.MATH,
                    SheetRole.RELIGION,
                    SheetRole.BGS_OR_SCIENCE,
                    SheetRole.ELECTIVE1,
                    SheetRole.ELECTIVE2,
                    SheetRole.ELECTIVE3,
                    SheetRole.ICT -> individualGPs.add(gp)
                    SheetRole.OPTIONAL -> optionalBonusGP = optionalBonus(gp)
                    else -> {}
                }
            }

            var banglaGP = 0.0
            val hasBangla = bangla1Result != null || bangla2Result != null
            if (hasBangla) {
                val b1Ref = midSr.find { it.subject.sheetRole == SheetRole.BANGLA1.name }?.subject ?: annSr.find { it.subject.sheetRole == SheetRole.BANGLA1.name }?.subject
                val b2Ref = midSr.find { it.subject.sheetRole == SheetRole.BANGLA2.name }?.subject ?: annSr.find { it.subject.sheetRole == SheetRole.BANGLA2.name }?.subject
                
                val totalMcq = (bangla1Result?.mcqMarks ?: 0.0) + (bangla2Result?.mcqMarks ?: 0.0)
                val totalWritten = (bangla1Result?.writtenMarks ?: 0.0) + (bangla2Result?.writtenMarks ?: 0.0)
                val totalPractical = (bangla1Result?.practicalMarks ?: 0.0) + (bangla2Result?.practicalMarks ?: 0.0)
                
                val clearsComponents = passesCombinedMinimumsDouble(
                    totalMcq, totalWritten, totalPractical,
                    b1Ref?.mcqMax ?: 0, b2Ref?.mcqMax ?: 0,
                    b1Ref?.writtenMax ?: 0, b2Ref?.writtenMax ?: 0,
                    b1Ref?.practicalMax ?: 0, b2Ref?.practicalMax ?: 0
                )
                
                val rawGP = combinedGPDouble(bangla1Total + bangla2Total, 200)
                if (clearsComponents && rawGP > 0.0) {
                    banglaGP = rawGP
                }
                
                if (banglaGP == 0.0) {
                    failedCount++
                    bangla1Result?.let { b1 ->
                        val idx = combinedSubjects.indexOf(b1)
                        if (idx >= 0) combinedSubjects[idx] = b1.copy(letterGrade = "F")
                    }
                    bangla2Result?.let { b2 ->
                        val idx = combinedSubjects.indexOf(b2)
                        if (idx >= 0) combinedSubjects[idx] = b2.copy(letterGrade = "F")
                    }
                }
            }

            var engGP = 0.0
            val hasEng = eng1Result != null || eng2Result != null
            if (hasEng) {
                val e1Ref = midSr.find { it.subject.sheetRole == SheetRole.ENG1.name }?.subject ?: annSr.find { it.subject.sheetRole == SheetRole.ENG1.name }?.subject
                val e2Ref = midSr.find { it.subject.sheetRole == SheetRole.ENG2.name }?.subject ?: annSr.find { it.subject.sheetRole == SheetRole.ENG2.name }?.subject
                
                val totalMcq = (eng1Result?.mcqMarks ?: 0.0) + (eng2Result?.mcqMarks ?: 0.0)
                val totalWritten = (eng1Result?.writtenMarks ?: 0.0) + (eng2Result?.writtenMarks ?: 0.0)
                val totalPractical = (eng1Result?.practicalMarks ?: 0.0) + (eng2Result?.practicalMarks ?: 0.0)
                
                val clearsComponents = passesCombinedMinimumsDouble(
                    totalMcq, totalWritten, totalPractical,
                    e1Ref?.mcqMax ?: 0, e2Ref?.mcqMax ?: 0,
                    e1Ref?.writtenMax ?: 0, e2Ref?.writtenMax ?: 0,
                    e1Ref?.practicalMax ?: 0, e2Ref?.practicalMax ?: 0
                )
                
                val rawGP = combinedGPDouble(eng1Total + eng2Total, 200)
                if (clearsComponents && rawGP > 0.0) {
                    engGP = rawGP
                }
                
                if (engGP == 0.0) {
                    failedCount++
                    eng1Result?.let { e1 ->
                        val idx = combinedSubjects.indexOf(e1)
                        if (idx >= 0) combinedSubjects[idx] = e1.copy(letterGrade = "F")
                    }
                    eng2Result?.let { e2 ->
                        val idx = combinedSubjects.indexOf(e2)
                        if (idx >= 0) combinedSubjects[idx] = e2.copy(letterGrade = "F")
                    }
                }
            }

            val gpSum = individualGPs.sum() + banglaGP + engGP + optionalBonusGP

            val gpa: Double? = if (grandTotal == 0.0) null else {
                if (failedCount > 0) 0.0 else min(5.0, gpSum / 9.0)
            }

            val overallLg = when {
                gpa == null -> ""
                failedCount > 0 -> "F"
                gpa >= 5.0 -> "A+"
                gpa >= 4.0 -> "A"
                gpa >= 3.5 -> "A-"
                gpa >= 3.0 -> "B"
                gpa >= 2.0 -> "C"
                gpa >= 1.0 -> "D"
                else -> "F"
            }

            studentResults.add(
                CombinedStudentResult(student, combinedSubjects, grandTotal, failedCount, gpa, overallLg, null)
            )
        }

        return studentResults.map { result ->
            if (result.grandTotal == 0.0) {
                result.copy(position = null)
            } else {
                val rank = studentResults.count {
                    if (it.failedCount < result.failedCount) {
                        true
                    } else if (it.failedCount == result.failedCount) {
                        if (result.failedCount == 0) {
                            val itGpa = it.gpa ?: 0.0
                            val resultGpa = result.gpa ?: 0.0
                            if (itGpa > resultGpa) true
                            else if (itGpa == resultGpa && it.grandTotal > result.grandTotal) true
                            else if (itGpa == resultGpa && it.grandTotal == result.grandTotal) it.student.roll < result.student.roll
                            else false
                        } else {
                            if (it.grandTotal > result.grandTotal) true
                            else if (it.grandTotal == result.grandTotal) it.student.roll < result.student.roll
                            else false
                        }
                    } else {
                        false
                    }
                } + 1
                result.copy(position = rank)
            }
        }
    }
}