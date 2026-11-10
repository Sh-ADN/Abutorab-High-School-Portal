package com.abutorab.marks9b.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.abutorab.marks9b.data.local.entity.SheetRole
import com.abutorab.marks9b.data.local.entity.SubjectEntity
import com.abutorab.marks9b.ui.MarksViewModel

private val FailRed = Color(0xFFE53935)

private data class ColumnSlot(val sheetRole: String, val applicabilityValue: String?, val label: String, val width: Dp)

private fun columnWidthFor(subjectsInGroup: List<SubjectEntity>): Dp {
    val maxParts = subjectsInGroup.maxOf { s -> listOfNotNull(s.mcqMax, s.writtenMax, s.practicalMax).size }
    return when {
        maxParts <= 1 -> 76.dp
        maxParts == 2 -> 112.dp
        else -> 152.dp
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TabulationScreen(termId: Int, viewModel: MarksViewModel, onNavigateToMarksheet: (Int) -> Unit, onBack: () -> Unit) {
    val term by viewModel.getTermById(termId).collectAsStateWithLifecycle(initialValue = null)
    val currentTerm = term ?: return
    val students by viewModel.getStudentsForYear(currentTerm.yearId).collectAsStateWithLifecycle(initialValue = emptyList())
    val subjects by viewModel.getSubjectsForTerm(termId).collectAsStateWithLifecycle(initialValue = emptyList())
    val marks by viewModel.getMarksForTerm(termId).collectAsStateWithLifecycle(initialValue = emptyList())

    val results = remember(students, subjects, marks) {
        TabulationEngine.compute(students, subjects, marks)
    }

    val columnSlots = remember(subjects) {
        subjects.filter { it.sheetRole != SheetRole.NONE.name }
            .groupBy { TabulationDisplay.columnGroupKey(it) }
            .map { (_, subjectsInGroup) ->
                val first = subjectsInGroup.first()
                ColumnSlot(
                    sheetRole = first.sheetRole,
                    applicabilityValue = first.applicabilityValue,
                    label = TabulationDisplay.bengaliLabel(first.sheetRole, first.applicabilityValue),
                    width = columnWidthFor(subjectsInGroup)
                )
            }
            .sortedBy { TabulationDisplay.canonicalOrder(it.sheetRole, it.applicabilityValue) }
    }

    val summaryColumns = remember { listOf("Total" to 64.dp, "Failed" to 52.dp, "GPA" to 56.dp, "Grade" to 56.dp, "Rank" to 48.dp) }
    val horizontalScrollState = rememberScrollState()
    val ZOOM_LEVELS = listOf(1.0f, 1.05f, 1.10f, 1.15f, 1.20f, 1.30f)
    var zoomIndex by rememberSaveable { mutableIntStateOf(0) }
    val zoom = ZOOM_LEVELS[zoomIndex]
    var selectedStudentId by remember { mutableStateOf<Int?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tabulation — ${currentTerm.label}", style = MaterialTheme.typography.titleMedium) },
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
        }
    ) { innerPadding ->
        if (results.isEmpty()) {
            Box(
                modifier = Modifier.padding(innerPadding).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.DateRange,
                        contentDescription = "No data",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Text("No students yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        "Add students to this year to see the tabulation",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
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
                        columnSlots.forEach { slot -> HeaderCell(slot.label, slot.width, zoom = zoom) }
                        summaryColumns.forEach { (label, width) -> HeaderCell(label, width, zoom = zoom) }
                    }
                }
                HorizontalDivider()
                val maxRoll = remember(students) { students.maxOfOrNull { it.roll } ?: 0 }
                val allRolls = remember(maxRoll) { if (maxRoll > 0) (1..maxRoll).toList() else emptyList() }

                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(allRolls, key = { it }) { roll ->
                        val result = results.find { it.student.roll == roll }
                        if (result != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(if (selectedStudentId == result.student.id) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent)
                                    .combinedClickable(
                                        onClick = { selectedStudentId = if (selectedStudentId == result.student.id) null else result.student.id },
                                        onDoubleClick = { onNavigateToMarksheet(result.student.id) }
                                    )
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                DataCell(result.student.roll.toString(), 44.dp, zoom = zoom)
                                DataCell(result.student.name, 120.dp, alignStart = true, zoom = zoom)
                                Row(modifier = Modifier.weight(1f).horizontalScroll(horizontalScrollState)) {
                                    columnSlots.forEach { slot ->
                                        val sr = result.subjectResults.find {
                                            it.subject.sheetRole == slot.sheetRole &&
                                                (it.subject.sheetRole != SheetRole.BGS_OR_SCIENCE.name || it.subject.applicabilityValue == slot.applicabilityValue)
                                        }
                                        val text = TabulationDisplay.formatBreakdown(sr?.mcqMarks, sr?.writtenMarks, sr?.practicalMarks, sr?.total ?: 0)
                                        val cellColor = if (sr?.letterGrade == "F") FailRed else MaterialTheme.colorScheme.onSurface
                                        DataCell(text, slot.width, color = cellColor, zoom = zoom)
                                    }
                                    DataCell(result.grandTotal.toString(), 64.dp, zoom = zoom)
                                    DataCell(if (result.failedCount > 0) result.failedCount.toString() else "-", 52.dp, color = if (result.failedCount > 0) FailRed else MaterialTheme.colorScheme.onSurface, localize = false, zoom = zoom)
                                    DataCell(result.gpa?.let { "%.2f".format(it) } ?: "-", 56.dp, color = MaterialTheme.colorScheme.tertiary, localize = false, zoom = zoom)
                                    DataCell(
                                        if (result.failedCount > 0) "${result.failedCount}F" else result.letterGrade.ifEmpty { "-" },
                                        56.dp,
                                        color = if (result.failedCount > 0) FailRed else MaterialTheme.colorScheme.onSurface,
                                        localize = false,
                                        zoom = zoom
                                    )
                                    DataCell(result.position?.toString() ?: "-", 48.dp, localize = false, zoom = zoom)
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
                                        DataCell("-", slot.width, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                    }
                                    summaryColumns.forEach { (_, width) ->
                                        DataCell("-", width, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f), zoom = zoom)
                                    }
                                }
                            }
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
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
private fun DataCell(text: String, width: Dp, alignStart: Boolean = false, color: Color = MaterialTheme.colorScheme.onSurface, fontWeight: FontWeight = FontWeight.Bold, localize: Boolean = true, zoom: Float = 1f) {
    Box(modifier = Modifier.width(width * zoom).padding(horizontal = 4.dp), contentAlignment = if (alignStart) Alignment.CenterStart else Alignment.Center) {
        Text(
            NumeralFormat.localize(text, localize),
            style = MaterialTheme.typography.bodyLarge,
            fontSize = MaterialTheme.typography.bodyLarge.fontSize * zoom,

            color = color,
            fontWeight = fontWeight,
            maxLines = 1,
            overflow = TextOverflow.Visible,
            textAlign = if (alignStart) TextAlign.Start else TextAlign.Center
        )
    }
}