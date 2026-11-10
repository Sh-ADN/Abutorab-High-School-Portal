package com.abutorab.marks9b.ui.screens

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material.icons.filled.ZoomOut
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.abutorab.marks9b.data.local.entity.ExamPeriod
import com.abutorab.marks9b.data.local.entity.SheetRole
import com.abutorab.marks9b.data.local.entity.SubjectEntity
import com.abutorab.marks9b.ui.MarksViewModel
import kotlinx.coroutines.flow.flowOf

private val DarkRed = Color(0xFFB71C1C)

private data class CombinedColumnSlot(val sheetRole: String, val applicabilityValue: String?, val label: String, val width: Dp)

private fun columnWidthFor(subjectsInGroup: List<SubjectEntity>): Dp {
    val maxParts = subjectsInGroup.maxOf { s -> listOfNotNull(s.mcqMax, s.writtenMax, s.practicalMax).size }
    return when {
        maxParts <= 1 -> 76.dp
        maxParts == 2 -> 112.dp
        else -> 152.dp
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CombinedTabulationScreen(yearId: Int, viewModel: MarksViewModel, onBack: () -> Unit) {
    val terms by viewModel.getTermsForYear(yearId).collectAsStateWithLifecycle(initialValue = emptyList())
    val midTerm = terms.find { it.examPeriod == ExamPeriod.MID_TERM.name }
    val annualTerm = terms.find { it.examPeriod == ExamPeriod.ANNUAL.name }

    val students by viewModel.getStudentsForYear(yearId).collectAsStateWithLifecycle(initialValue = emptyList())

    val midSubjects by (midTerm?.id?.let { viewModel.getSubjectsForTerm(it) } ?: flowOf(emptyList())).collectAsStateWithLifecycle(initialValue = emptyList())
    val midMarks by (midTerm?.id?.let { viewModel.getMarksForTerm(it) } ?: flowOf(emptyList())).collectAsStateWithLifecycle(initialValue = emptyList())
    val annualSubjects by (annualTerm?.id?.let { viewModel.getSubjectsForTerm(it) } ?: flowOf(emptyList())).collectAsStateWithLifecycle(initialValue = emptyList())
    val annualMarks by (annualTerm?.id?.let { viewModel.getMarksForTerm(it) } ?: flowOf(emptyList())).collectAsStateWithLifecycle(initialValue = emptyList())

    val midResults = remember(students, midSubjects, midMarks) { TabulationEngine.compute(students, midSubjects, midMarks) }
    val annualResults = remember(students, annualSubjects, annualMarks) { TabulationEngine.compute(students, annualSubjects, annualMarks) }

    var showMerged by remember { mutableStateOf(false) }
    val canMerge = midTerm != null && annualTerm != null
    val mergedResults = remember(students, midSubjects, midMarks, annualSubjects, annualMarks) {
        if (canMerge) TabulationEngine.computeCombined(students, midSubjects, midMarks, annualSubjects, annualMarks) else emptyList()
    }

    val referenceSubjects = if (midSubjects.isNotEmpty()) midSubjects else annualSubjects
    val columnSlots = remember(referenceSubjects) {
        referenceSubjects.filter { it.sheetRole != SheetRole.NONE.name }
            .groupBy { TabulationDisplay.columnGroupKey(it) }
            .map { (_, subjectsInGroup) ->
                val first = subjectsInGroup.first()
                CombinedColumnSlot(
                    sheetRole = first.sheetRole,
                    applicabilityValue = first.applicabilityValue,
                    label = TabulationDisplay.bengaliLabel(first.sheetRole, first.applicabilityValue),
                    width = columnWidthFor(subjectsInGroup)
                )
            }
            .sortedBy { TabulationDisplay.canonicalOrder(it.sheetRole, it.applicabilityValue) }
    }

    val horizontalScrollState = rememberScrollState()
    val ZOOM_LEVELS = listOf(1.0f, 1.05f, 1.10f, 1.15f, 1.20f, 1.30f)
    var zoomIndex by rememberSaveable { mutableIntStateOf(0) }
    val zoom = ZOOM_LEVELS[zoomIndex]

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("সমন্বিত", style = MaterialTheme.typography.titleMedium) },
                    actions = {
                    IconButton(onClick = { if (zoomIndex > 0) zoomIndex-- }, enabled = zoomIndex > 0) {
                        Icon(Icons.Default.ZoomOut, contentDescription = "Zoom out")
                    }
                    Text(
                        "${(zoom * 100).toInt()}%",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.width(36.dp),
                        textAlign = TextAlign.Center
                    )
                    IconButton(onClick = { if (zoomIndex < ZOOM_LEVELS.lastIndex) zoomIndex++ }, enabled = zoomIndex < ZOOM_LEVELS.lastIndex) {
                        Icon(Icons.Default.ZoomIn, contentDescription = "Zoom in")
                    }
                    com.abutorab.marks9b.ui.components.ThemeToggleButton()
                },
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
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        if (showMerged) "Merged (Mid + Annual averaged)" else "Stacked (Mid Term, then Annual)",
                        style = MaterialTheme.typography.bodyMedium,
            fontSize = MaterialTheme.typography.bodyMedium.fontSize * zoom,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(checked = showMerged, onCheckedChange = { showMerged = it }, enabled = canMerge)
                }
                if (!canMerge) {
                    Text(
                        "Add both অর্ধবার্ষিক and বার্ষিক to unlock the merged view",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 8.dp)
                    )
                }
            }
        }
    ) { innerPadding ->
        if (students.isEmpty()) {
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.DateRange, contentDescription = "No data", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("No students yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        } else {
            Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceContainerHigh).padding(vertical = 10.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    HeaderCell("Roll", 44.dp, zoom = zoom)
                    HeaderCell("Name", 120.dp, alignStart = true, zoom = zoom)
                    Row(modifier = Modifier.weight(1f).horizontalScroll(horizontalScrollState)) {
                        columnSlots.forEach { slot -> HeaderCell(slot.label, if (showMerged) maxOf(slot.width, 108.dp) else slot.width, zoom = zoom) }
                        HeaderCell("Total", 64.dp, zoom = zoom)
                        HeaderCell("Failed", 52.dp, zoom = zoom)
                        HeaderCell("GPA", 56.dp, zoom = zoom)
                        HeaderCell("Grade", 56.dp, zoom = zoom)
                        HeaderCell("Rank", 48.dp, zoom = zoom)
                    }
                }
                HorizontalDivider()
                val maxRoll = remember(students) { students.maxOfOrNull { it.roll } ?: 0 }
                val allRolls = remember(maxRoll) { if (maxRoll > 0) (1..maxRoll).toList() else emptyList() }

                if (showMerged) {
                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(allRolls, key = { it }) { roll ->
                            val result = mergedResults.find { it.student.roll == roll }
                            if (result != null) {
                                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    DataCell(result.student.roll.toString(), 44.dp, zoom = zoom)
                                    DataCell(result.student.name, 120.dp, alignStart = true, zoom = zoom)
                                    Row(modifier = Modifier.weight(1f).horizontalScroll(horizontalScrollState)) {
                                        columnSlots.forEach { slot ->
                                            val slotWidth = if (showMerged) maxOf(slot.width, 108.dp) else slot.width
                                            val sr = result.subjectResults.find { it.sheetRole == slot.sheetRole && it.applicabilityValue == slot.applicabilityValue }
                                            CombinedDataCell(sr, slotWidth, zoom = zoom)
                                        }
                                        DataCell(formatDouble(result.grandTotal), 64.dp, fontWeight = FontWeight.Bold, zoom = zoom)
                                        DataCell(if (result.failedCount > 0) result.failedCount.toString() else "-", 52.dp, color = if (result.failedCount > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface, localize = false, zoom = zoom)
                                        DataCell(result.gpa?.let { "%.2f".format(it) } ?: "-", 56.dp, color = MaterialTheme.colorScheme.tertiary, zoom = zoom, localize = false)
                                        DataCell(
                                            if (result.failedCount > 0) "${result.failedCount}F" else result.letterGrade.ifEmpty { "-" }, 56.dp,
                                            color = if (result.failedCount > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                                            fontWeight = FontWeight.Bold,
                                            zoom = zoom,
                                            localize = false
                                        )
                                        DataCell(result.position?.toString() ?: "-", 48.dp, zoom = zoom, localize = false)
                                    }
                                }
                            } else {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    DataCell(roll.toString(), 44.dp, zoom = zoom)
                                    DataCell("-", 120.dp, alignStart = true, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                    Row(modifier = Modifier.weight(1f).horizontalScroll(horizontalScrollState)) {
                                        columnSlots.forEach { slot ->
                                            val slotWidth = if (showMerged) maxOf(slot.width, 108.dp) else slot.width
                                            DataCell("-", slotWidth, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        }
                                        DataCell("-", 64.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        DataCell("-", 52.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        DataCell("-", 56.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        DataCell("-", 56.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        DataCell("-", 48.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                    }
                                }
                            }
                            HorizontalDivider()
                        }
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(allRolls, key = { it }) { roll ->
                            val student = students.find { it.roll == roll }
                            if (student != null) {
                                val midResult = midResults.find { it.student.id == student.id }
                                val annualResult = annualResults.find { it.student.id == student.id }
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    StackedRow("অর্ধ", student.roll, student.name, midResult, columnSlots, horizontalScrollState)
                                    StackedRow("বার্ষিক", student.roll, student.name, annualResult, columnSlots, horizontalScrollState)
                                }
                            } else {
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    StackedRow("অর্ধ", roll, "-", null, columnSlots, horizontalScrollState, isMissing = true, zoom = zoom)
                                    StackedRow("বার্ষিক", roll, "-", null, columnSlots, horizontalScrollState, isMissing = true, zoom = zoom)
                                }
                            }
                            HorizontalDivider(thickness = 2.dp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StackedRow(
    periodLabel: String,
    roll: Int,
    name: String,
    result: StudentResult?,
    columnSlots: List<CombinedColumnSlot>,
    horizontalScrollState: ScrollState,
    isMissing: Boolean = false,
    zoom: Float = 1f
) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        DataCell(roll.toString(), 44.dp, zoom = zoom)
        Column(modifier = Modifier.width(120.dp).padding(horizontal = 4.dp)) {
            Text(name, style = MaterialTheme.typography.bodyMedium,
            fontSize = MaterialTheme.typography.bodyMedium.fontSize * zoom, maxLines = 1, overflow = TextOverflow.Ellipsis, color = if (isMissing) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface)
            Text(periodLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Row(modifier = Modifier.weight(1f).horizontalScroll(horizontalScrollState)) {
            if (isMissing) {
                columnSlots.forEach { slot ->
                    DataCell("-", slot.width, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                }
                DataCell("-", 64.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                        DataCell("-", 52.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                DataCell("-", 56.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                DataCell("-", 56.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                DataCell("-", 48.dp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
            } else {
                columnSlots.forEach { slot ->
                    val sr = result?.subjectResults?.find { it.subject.sheetRole == slot.sheetRole && it.subject.applicabilityValue == slot.applicabilityValue }
                    val text = TabulationDisplay.formatBreakdown(sr?.mcqMarks, sr?.writtenMarks, sr?.practicalMarks, sr?.total ?: 0)
                    val cellColor = if (sr?.letterGrade == "F") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                    DataCell(text, slot.width, color = cellColor, zoom = zoom)
                }
                DataCell(result?.grandTotal?.toString() ?: "-", 64.dp, fontWeight = FontWeight.Bold, zoom = zoom)
                DataCell(if ((result?.failedCount ?: 0) > 0) result?.failedCount.toString() else "-", 52.dp, color = if ((result?.failedCount ?: 0) > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface, localize = false, zoom = zoom)
                DataCell(result?.gpa?.let { "%.2f".format(it) } ?: "-", 56.dp, color = MaterialTheme.colorScheme.tertiary, zoom = zoom, localize = false)
                DataCell(
                    if ((result?.failedCount ?: 0) > 0) "${result?.failedCount}F" else result?.letterGrade?.ifEmpty { "-" } ?: "-", 56.dp,
                    color = if ((result?.failedCount ?: 0) > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold, localize = false, zoom = zoom
                )
                DataCell(result?.position?.toString() ?: "-", 48.dp, localize = false, zoom = zoom)
            }
        }
    }
}

private fun formatCombinedBreakdown(sr: CombinedSubjectResult?): String {
    if (sr == null) return "-"
    val parts = listOfNotNull(sr.mcqMarks, sr.writtenMarks, sr.practicalMarks)
    if (parts.isEmpty() || sr.total == 0.0) return "-"
    return if (parts.size <= 1) formatDouble(sr.total) else parts.joinToString("+") { formatDouble(it) } + "=" + formatDouble(sr.total)
}

private fun formatDouble(value: Double): String {
    return if (value == value.toLong().toDouble()) value.toLong().toString() else "%.1f".format(value)
}

@Composable
private fun HeaderCell(text: String, width: Dp, alignStart: Boolean = false, zoom: Float = 1f) {
    Box(modifier = Modifier.width(width * zoom).padding(horizontal = 3.dp), contentAlignment = if (alignStart) Alignment.CenterStart else Alignment.Center) {
        Text(
            text,
            style = MaterialTheme.typography.titleSmall,
            fontSize = MaterialTheme.typography.titleSmall.fontSize * zoom,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = if (alignStart) TextAlign.Start else TextAlign.Center
        )
    }
}

@Composable
private fun CombinedDataCell(
    sr: CombinedSubjectResult?,
    width: Dp,
    zoom: Float = 1f
) {
    Box(
        modifier = Modifier.width(width * zoom).padding(horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        if (sr == null || (sr.midTotal == null && sr.annualTotal == null)) {
            Text(
                "-",
                style = MaterialTheme.typography.bodyMedium,
                fontSize = MaterialTheme.typography.bodyMedium.fontSize * zoom,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                textAlign = TextAlign.Center
            )
        } else {
            val midVal = sr.midTotal ?: 0
            val annVal = sr.annualTotal ?: 0
            val sum = midVal + annVal
            val avg = sr.total
            val isFailed = sr.letterGrade == "F"

            val prefix = NumeralFormat.localize("${sum}÷2=", true)
            val exactAvg = NumeralFormat.localize(formatDouble(avg), true)

            val annotatedString = buildAnnotatedString {
                append(prefix)
                if (isFailed) {
                    withStyle(
                        style = SpanStyle(
                            color = DarkRed,
                            textDecoration = TextDecoration.Underline,
                            fontWeight = FontWeight.Bold
                        )
                    ) {
                        append(exactAvg)
                    }
                } else {
                    append(exactAvg)
                }
            }

            Text(
                text = annotatedString,
                style = MaterialTheme.typography.bodyMedium,
                fontSize = MaterialTheme.typography.bodyMedium.fontSize * zoom,
                color = if (isFailed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Visible,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun DataCell(text: String, width: Dp, alignStart: Boolean = false, color: Color = MaterialTheme.colorScheme.onSurface, fontWeight: FontWeight = FontWeight.Normal, localize: Boolean = true, zoom: Float = 1f) {
    Box(modifier = Modifier.width(width * zoom).padding(horizontal = 4.dp), contentAlignment = if (alignStart) Alignment.CenterStart else Alignment.Center) {
        Text(
            NumeralFormat.localize(text, localize),
            style = MaterialTheme.typography.bodyMedium,
            fontSize = MaterialTheme.typography.bodyMedium.fontSize * zoom,
            
            color = color,
            fontWeight = fontWeight,
            maxLines = 1,
            overflow = TextOverflow.Visible,
            textAlign = if (alignStart) TextAlign.Start else TextAlign.Center
        )
    }
}
