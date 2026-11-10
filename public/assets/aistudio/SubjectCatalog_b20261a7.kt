package com.abutorab.marks9b.data.local.entity

object SubjectCatalog {
    val subjects = listOf(
        SubjectData("Bangla 1st Paper", "Ben1_Input", SheetRole.BANGLA1.name, ApplicabilityType.ALL.name, null, 30, 70, null, 100),
        SubjectData("Bangla 2nd Paper", "Ben2_Input", SheetRole.BANGLA2.name, ApplicabilityType.ALL.name, null, 30, 70, null, 100),
        SubjectData("English 1st Paper", "Eng1_Input", SheetRole.ENG1.name, ApplicabilityType.ALL.name, null, null, 100, null, 100),
        SubjectData("English 2nd Paper", "Eng2_Input", SheetRole.ENG2.name, ApplicabilityType.ALL.name, null, null, 100, null, 100),
        SubjectData("Mathematics", "Math_Input", SheetRole.MATH.name, ApplicabilityType.ALL.name, null, 30, 70, null, 100),
        SubjectData("Information & Communication Technology", "ICT_Input", SheetRole.ICT.name, ApplicabilityType.ALL.name, null, 25, null, 25, 50),
        SubjectData("Islam Religion and Moral Education", "Islam_Input", SheetRole.RELIGION.name, ApplicabilityType.RELIGION.name, "I", 30, 70, null, 100),
        SubjectData("Hindu Religion and Moral Education", "Hindu_Input", SheetRole.RELIGION.name, ApplicabilityType.RELIGION.name, "H", 30, 70, null, 100),
        SubjectData("Buddhist Religion and Moral Education", "Buddha_Input", SheetRole.RELIGION.name, ApplicabilityType.RELIGION.name, "B", 30, 70, null, 100),
        SubjectData("Bangladesh & Global Studies", "BGS_Input", SheetRole.BGS_OR_SCIENCE.name, ApplicabilityType.OPTIONAL_TYPE.name, "S", 30, 70, null, 100),
        SubjectData("General Science", "Science_Input", SheetRole.BGS_OR_SCIENCE.name, ApplicabilityType.OPTIONAL_TYPE.name, "N", 30, 70, null, 100),
        SubjectData("Physics", "Phy_Input", SheetRole.ELECTIVE1.name, ApplicabilityType.GROUP.name, "S", 25, 50, 25, 100),
        SubjectData("Chemistry", "Chem_Input", SheetRole.ELECTIVE2.name, ApplicabilityType.GROUP.name, "S", 25, 50, 25, 100),
        SubjectData("Biology", "Bio_Input", SheetRole.ELECTIVE3.name, ApplicabilityType.GROUP.name, "S", 25, 50, 25, 100),
        SubjectData("Accounting", "Acc_Input", SheetRole.ELECTIVE1.name, ApplicabilityType.GROUP.name, "C", 30, 70, null, 100),
        SubjectData("Finance", "Fin_Input", SheetRole.ELECTIVE2.name, ApplicabilityType.GROUP.name, "C", 30, 70, null, 100),
        SubjectData("B. Entrepreneurship", "B.Entre_Input", SheetRole.ELECTIVE3.name, ApplicabilityType.GROUP.name, "C", 30, 70, null, 100),
        SubjectData("History", "History_Input", SheetRole.ELECTIVE1.name, ApplicabilityType.GROUP.name, "A", 30, 70, null, 100),
        SubjectData("Geography", "Geo_Input", SheetRole.ELECTIVE2.name, ApplicabilityType.GROUP.name, "A", 30, 70, null, 100),
        SubjectData("Civics", "Civics_Input", SheetRole.ELECTIVE3.name, ApplicabilityType.GROUP.name, "A", 30, 70, null, 100),
        SubjectData("Higher Mathematics", "HM_Input", SheetRole.OPTIONAL.name, ApplicabilityType.OPTIONAL_TYPE.name, "S", 25, 50, 25, 100),
        SubjectData("Agriculture Studies", "Agri_Input", SheetRole.OPTIONAL.name, ApplicabilityType.OPTIONAL_TYPE.name, "N", 25, 50, 25, 100)
    )
}

data class SubjectData(
    val name: String,
    val sheetTabName: String,
    val sheetRole: String,
    val applicabilityType: String,
    val applicabilityValue: String?,
    val mcqMax: Int?,
    val writtenMax: Int?,
    val practicalMax: Int?,
    val fullMarks: Int
)
