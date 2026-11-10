package com.abutorab.teacher.hub.data

import kotlin.math.roundToInt

object CalculationUtils {
    fun getSomonnitoMarks(
        year: Int,
        rollNumber: Int,
        subjectId: String,
        ardhoPercent: Int,
        ardhoMarks: List<MarkEntity>,
        barshikMarks: List<MarkEntity>
    ): MarkEntity? {
        val ardho = ardhoMarks.find { it.rollNumber == rollNumber && it.subjectId == subjectId && it.year == year && it.term == "ARDHOBARSHIK" }
        val barshik = barshikMarks.find { it.rollNumber == rollNumber && it.subjectId == subjectId && it.year == year && it.term == "BARSHIK" }

        if (ardho == null && barshik == null) return null

        val mcq = calculateCombined(ardho?.mcq, barshik?.mcq, ardhoPercent)
        val written = calculateCombined(ardho?.written, barshik?.written, ardhoPercent)
        val practical = calculateCombined(ardho?.practical, barshik?.practical, ardhoPercent)

        return MarkEntity(
            rollNumber = rollNumber,
            subjectId = subjectId,
            year = year,
            term = "SOMONNITO",
            mcq = mcq,
            written = written,
            practical = practical
        )
    }

    private fun calculateCombined(ardhoVal: Int?, barshikVal: Int?, ardhoPercent: Int): Int? {
        if (ardhoVal == null && barshikVal == null) return null
        val ardhoScore = ardhoVal ?: 0
        val barshikScore = barshikVal ?: 0
        return ((ardhoScore * ardhoPercent / 100.0) + (barshikScore * (100 - ardhoPercent) / 100.0)).roundToInt()
    }
}
