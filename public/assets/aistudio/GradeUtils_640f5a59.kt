package com.abutorab.teacher.hub.domain

data class Grade(val letter: String, val point: Double)

fun calculateGrade(total: Int, outOf: Int = 100): Grade {
    val percentage = (total.toDouble() / outOf) * 100

    return when {
        percentage >= 80 -> Grade("A+", 5.0)
        percentage >= 70 -> Grade("A", 4.0)
        percentage >= 60 -> Grade("A-", 3.5)
        percentage >= 50 -> Grade("B", 3.0)
        percentage >= 40 -> Grade("C", 2.0)
        percentage >= 33 -> Grade("D", 1.0)
        else -> Grade("F", 0.0)
    }
}
