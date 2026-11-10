package com.abutorab.teacher.hub.domain

data class PredefinedSubject(val id: String, val title: String, val bengaliTitle: String)

val PREDEFINED_SUBJECTS = listOf(
    PredefinedSubject("101", "Bangla 1st Paper", "বাংলা ১ম পত্র"),
    PredefinedSubject("102", "Bangla 2nd Paper", "বাংলা ২য় পত্র"),
    PredefinedSubject("107", "English 1st Paper", "ইংরেজি ১ম পত্র"),
    PredefinedSubject("108", "English 2nd Paper", "ইংরেজি ২য় পত্র"),
    PredefinedSubject("109", "Mathematics", "গণিত"),
    PredefinedSubject("111", "Religion", "ধর্ম ও নৈতিক শিক্ষা"),
    PredefinedSubject("150", "Bangladesh and Global Studies", "বাংলাদেশ ও বিশ্বপরিচয়"),
    PredefinedSubject("127", "Science", "বিজ্ঞান"),
    PredefinedSubject("154", "Information and Communication Technology", "তথ্য ও যোগাযোগ প্রযুক্তি")
)
