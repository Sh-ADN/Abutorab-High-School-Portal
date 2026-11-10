package com.abutorab.marks9b.ui.screens

/**
 * Configurable criteria for generating a merit list. Any null field means
 * "don't filter on this". Rank is always recomputed within the resulting
 * filtered set (e.g. "Top 10 in Science" ranks 1..10 inside Science only,
 * not by slicing the whole class's global rank).
 */
data class MeritListFilter(
    val group: String? = null,          // StudentGroup code: "S" / "C" / "A"
    val religion: String? = null,       // Religion code: "I" / "H" / "B"
    val optionalType: String? = null,   // OptionalType code: "S" / "N"
    val excludeFailed: Boolean = true,
    val topN: Int? = null                // null = no limit
)

data class MeritListEntry(
    val rank: Int,
    val roll: Int,
    val name: String,
    val group: String,
    val religion: String,
    val optionalType: String,
    val grandTotal: Int,
    val gpa: Double?,
    val letterGrade: String,
    val failedCount: Int
)

data class SubjectTopperEntry(
    val rank: Int,
    val roll: Int,
    val name: String,
    val total: Int,
    val letterGrade: String,
    val breakdown: String
)

data class SubjectTopperGroup(
    val sheetRole: String,
    val applicabilityValue: String?,
    val subjectName: String,
    val fullMarks: Int,
    val toppers: List<SubjectTopperEntry>
)

object MeritListEngine {

    /**
     * Builds a ranked merit list out of already-computed [results], applying
     * the given [filter]. Students with no marks entered (grandTotal == 0,
     * i.e. gpa == null) are always excluded since they can't be meaningfully
     * ranked.
     */
    fun generateMeritList(results: List<StudentResult>, filter: MeritListFilter): List<MeritListEntry> {
        val eligible = results
            .filter { it.gpa != null }
            .filter { filter.group == null || it.student.group == filter.group }
            .filter { filter.religion == null || it.student.religion == filter.religion }
            .filter { filter.optionalType == null || it.student.optionalType == filter.optionalType }
            .filter { !filter.excludeFailed || it.failedCount == 0 }

        val ranked = eligible
            .map { result ->
                val betterCount = eligible.count {
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
                }
                MeritListEntry(
                    rank = betterCount + 1,
                    roll = result.student.roll,
                    name = result.student.name,
                    group = result.student.group,
                    religion = result.student.religion,
                    optionalType = result.student.optionalType,
                    grandTotal = result.grandTotal,
                    gpa = result.gpa,
                    letterGrade = result.letterGrade,
                    failedCount = result.failedCount
                )
            }
            .sortedWith(compareBy({ it.rank }, { -it.grandTotal }))

        return if (filter.topN != null) ranked.take(filter.topN) else ranked
    }

    /**
     * For every subject slot (e.g. Physics, Bangla 1st Paper, Islam Religion),
     * ranks all students who have a grade in that subject and returns the
     * top [topN] per subject (competition ranking: ties share a rank, and the
     * next distinct score skips accordingly).
     */
    fun generateSubjectToppers(results: List<StudentResult>, topN: Int = 3): List<SubjectTopperGroup> {
        val entries = results.flatMap { result ->
            result.subjectResults
                .filter { it.letterGrade.isNotEmpty() }
                .map { sr -> result.student to sr }
        }

        return entries
            .groupBy { (_, sr) -> sr.subject.sheetRole to sr.subject.applicabilityValue }
            .map { (key, group) ->
                val (sheetRole, applicabilityValue) = key
                val first = group.first().second
                val sorted = group.sortedByDescending { it.second.total }

                val toppers = mutableListOf<SubjectTopperEntry>()
                var rank = 0
                var prevTotal: Int? = null
                sorted.forEachIndexed { index, (student, sr) ->
                    if (prevTotal == null || sr.total != prevTotal) {
                        rank = index + 1
                        prevTotal = sr.total
                    }
                    if (rank <= topN) {
                        toppers.add(
                            SubjectTopperEntry(
                                rank = rank,
                                roll = student.roll,
                                name = student.name,
                                total = sr.total,
                                letterGrade = sr.letterGrade,
                                breakdown = TabulationDisplay.formatBreakdown(sr.mcqMarks, sr.writtenMarks, sr.practicalMarks, sr.total)
                            )
                        )
                    }
                }

                SubjectTopperGroup(
                    sheetRole = sheetRole,
                    applicabilityValue = applicabilityValue,
                    subjectName = first.subject.name,
                    fullMarks = first.subject.fullMarks,
                    toppers = toppers
                )
            }
            .sortedBy { TabulationDisplay.canonicalOrder(it.sheetRole, it.applicabilityValue) }
    }
}
