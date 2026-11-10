package com.abutorab.marks9b.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.abutorab.marks9b.R
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.abutorab.marks9b.data.local.entity.SheetRole
import com.abutorab.marks9b.ui.MarksViewModel

private data class MarksheetRowSpec(val displayName: String, val subjectResult: SubjectResult?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarksheetScreen(termId: Int, studentId: Int, viewModel: MarksViewModel, onBack: () -> Unit) {
    val term by viewModel.getTermById(termId).collectAsStateWithLifecycle(initialValue = null)
    val currentTerm = term ?: return
    val students by viewModel.getStudentsForYear(currentTerm.yearId).collectAsStateWithLifecycle(initialValue = emptyList())
    val subjects by viewModel.getSubjectsForTerm(termId).collectAsStateWithLifecycle(initialValue = emptyList())
    val marks by viewModel.getMarksForTerm(termId).collectAsStateWithLifecycle(initialValue = emptyList())

    val allResults = remember(students, subjects, marks) {
        TabulationEngine.compute(students, subjects, marks)
    }
    val result = allResults.find { it.student.id == studentId } ?: return

    val marksheetRows = remember(subjects, result) {
        val religionRepresentative = subjects.firstOrNull { it.sheetRole == SheetRole.RELIGION.name }
        val nonReligionSubjects = subjects.filter { it.sheetRole != SheetRole.RELIGION.name }
        val rowSubjects = (religionRepresentative?.let { listOf(it) } ?: emptyList()) + nonReligionSubjects

        val realRows: List<Pair<Int, MarksheetRowSpec>> = rowSubjects.map { subject ->
            val sr = if (subject.sheetRole == SheetRole.RELIGION.name) {
                result.subjectResults.find { it.subject.sheetRole == SheetRole.RELIGION.name }
            } else {
                result.subjectResults.find { it.subject.id == subject.id }
            }
            TabulationDisplay.marksheetSubjectOrder(subject) to MarksheetRowSpec(TabulationDisplay.bengaliSubjectName(subject), sr)
        }

        val placeholderRows: List<Pair<Int, MarksheetRowSpec>> = listOf(
            7 to MarksheetRowSpec("শরীর চর্চা ও চারুকারু", null),
            13 to MarksheetRowSpec("কম্পিউটার", null),
            22 to MarksheetRowSpec("কর্ম ও জীবন মুখী শিক্ষা", null)
        )

        (realRows + placeholderRows).sortedBy { it.first }.map { it.second }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Marksheet", style = MaterialTheme.typography.titleMedium) },
                actions = { com.abutorab.marks9b.ui.components.ThemeToggleButton() },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Abutorab M.L. High School", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("Mirsarai, Chattogram", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    HorizontalDivider()
                    Spacer(Modifier.height(12.dp))
                    Text(result.student.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    Text("Roll ${result.student.roll} · ${currentTerm.label}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        SummaryStat("Total", result.grandTotal.toString())
                        SummaryStat("GPA", result.gpa?.let { "%.2f".format(it) } ?: "-", localize = false)
                        SummaryStat(
                            "Grade",
                            if (result.failedCount > 0) "${result.failedCount}F" else result.letterGrade.ifEmpty { "-" },
                            valueColor = if (result.failedCount > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                            localize = false
                        )
                        SummaryStat("Rank", result.position?.toString() ?: "-", localize = false)
                    }
                }
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp)
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(top = 8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
                            LedgerHeaderCell("বিষয়", Modifier.weight(1f), TextAlign.Start)
                            LedgerHeaderCell("নৈর্ব্যঃ", Modifier.width(42.dp))
                            LedgerHeaderCell("রচনা", Modifier.width(42.dp))
                            LedgerHeaderCell("ব্যঃ", Modifier.width(42.dp))
                            LedgerHeaderCell("মোট", Modifier.width(46.dp))
                            LedgerHeaderCell("গ্রেড", Modifier.width(44.dp))
                        }
                        HorizontalDivider()
                        Column(
                            modifier = Modifier
                                .weight(1f, fill = false)
                                .verticalScroll(rememberScrollState())
                        ) {
                            marksheetRows.forEachIndexed { index, rowSpec ->
                            val sr = rowSpec.subjectResult
                            val isFailed = sr?.letterGrade == "F"
                            val componentCount = sr?.subject?.let { listOfNotNull(it.mcqMax, it.writtenMax, it.practicalMax).size } ?: 0
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    rowSpec.displayName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (sr == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f)
                                )
                                LedgerValueCell(
                                    formatMark(sr?.mcqMarks), Modifier.width(42.dp),
                                    color = if (isComponentFailed(sr?.mcqMarks, sr?.subject?.mcqMax, componentCount, isFailed)) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                )
                                LedgerValueCell(
                                    formatMark(sr?.writtenMarks), Modifier.width(42.dp),
                                    color = if (isComponentFailed(sr?.writtenMarks, sr?.subject?.writtenMax, componentCount, isFailed)) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                )
                                LedgerValueCell(
                                    formatMark(sr?.practicalMarks), Modifier.width(42.dp),
                                    color = if (isComponentFailed(sr?.practicalMarks, sr?.subject?.practicalMax, componentCount, isFailed)) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                )
                                LedgerValueCell(
                                    if (sr == null || sr.total == 0) "-" else formatMark(sr.total),
                                    Modifier.width(46.dp),
                                    color = if (isFailed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                                    bold = sr != null
                                )
                                LedgerValueCell(
                                    sr?.letterGrade?.ifEmpty { "-" } ?: "-",
                                    Modifier.width(44.dp),
                                    color = if (isFailed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                                    bold = sr != null
                                )
                            }
                            if (index < marksheetRows.lastIndex) HorizontalDivider(modifier = Modifier.padding(horizontal = 12.dp))
                        }
                        HorizontalDivider(thickness = 2.dp)
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "মোট নম্বর-",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f),
                                textAlign = TextAlign.End
                            )
                            LedgerValueCell("", Modifier.width(42.dp))
                            LedgerValueCell("", Modifier.width(42.dp))
                            LedgerValueCell("", Modifier.width(42.dp))
                            LedgerValueCell("${result.grandTotal}", Modifier.width(46.dp), bold = true)
                            LedgerValueCell("", Modifier.width(44.dp))
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun SummaryStat(label: String, value: String, valueColor: Color = MaterialTheme.colorScheme.tertiary, localize: Boolean = true) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            NumeralFormat.localize(value, localize),
            style = MaterialTheme.typography.headlineSmall,
            
            color = valueColor
        )
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun LedgerHeaderCell(text: String, modifier: Modifier = Modifier, align: TextAlign = TextAlign.Center) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        textAlign = align,
        modifier = modifier
    )
}

@Composable
private fun LedgerValueCell(text: String, modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.onSurface, bold: Boolean = false) {
    Text(
        NumeralFormat.localize(text, true),
        style = MaterialTheme.typography.bodyLarge,
        
        color = color,
        textAlign = TextAlign.Center,
        modifier = modifier
    )
}

private fun formatMark(mark: Int?): String {
    if (mark == null) return "-"
    return mark.toString().padStart(2, '0')
}

private fun isComponentFailed(mark: Int?, max: Int?, componentCount: Int, subjectFailed: Boolean): Boolean {
    if (max == null) return false
    if (componentCount <= 1) return subjectFailed
    val threshold = kotlin.math.round(max / 3.0).toInt()
    return (mark ?: 0) < threshold
}
