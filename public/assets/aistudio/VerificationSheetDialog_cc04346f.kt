package com.abutorab.marks9b.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.abutorab.marks9b.data.local.entity.MarkEntity
import com.abutorab.marks9b.data.local.entity.StudentEntity
import com.abutorab.marks9b.data.local.entity.SubjectEntity
import com.abutorab.marks9b.data.local.entity.TermEntity
import com.abutorab.marks9b.data.local.entity.YearEntity
import com.abutorab.marks9b.data.local.entity.examPeriodLabel

private const val SCHOOL_NAME = "আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়"
private const val ROWS_PER_COLUMN = 50

// Zoom is done by scaling font size + column width together (real relayout,
// not a GPU stretch of a rasterized layer) — text stays crisp at every step,
// and since width scales in lockstep with font size, whatever fits on one
// line at 1x fits on one line at every step. maxLines = 1 is still kept as a
// hard backstop in LedgerCell so a row can never silently wrap and throw the
// grid's row heights out of alignment.
private val ZOOM_LEVELS = listOf(0.8f, 1f, 1.2f, 1.4f)
private const val BASE_ROLL_COL_WIDTH = 62
private const val BASE_MARKS_COL_WIDTH = 190
private const val BASE_HEADER_SP = 13
private const val BASE_BODY_SP = 16

private data class LedgerZoom(val rollWidth: Dp, val marksWidth: Dp, val headerSize: TextUnit, val bodySize: TextUnit)

private fun ledgerZoomFor(step: Float) = LedgerZoom(
    rollWidth = (BASE_ROLL_COL_WIDTH * step).dp,
    marksWidth = (BASE_MARKS_COL_WIDTH * step).dp,
    headerSize = (BASE_HEADER_SP * step).sp,
    bodySize = (BASE_BODY_SP * step).sp
)

/**
 * Full-screen look-alike of the paper "নম্বর ফর্দ" (marks ledger) teachers write
 * marks on by hand, so a teacher can flip back and forth between the physical
 * sheet and this view to catch data-entry mistakes. Opened as a Dialog (not a
 * nav route) so it's a quick glance-and-dismiss rather than a deep navigation.
 */
@Composable
fun VerificationSheetDialog(
    year: YearEntity,
    term: TermEntity,
    subject: SubjectEntity,
    students: List<StudentEntity>,
    marks: List<MarkEntity>,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            VerificationSheetContent(year, term, subject, students, marks, onDismiss)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VerificationSheetContent(
    year: YearEntity,
    term: TermEntity,
    subject: SubjectEntity,
    students: List<StudentEntity>,
    marks: List<MarkEntity>,
    onDismiss: () -> Unit
) {
    // Bengali by default since that's how the physical sheet itself is printed.
    var useBengali by remember { mutableStateOf(true) }
    var showTotal by remember { mutableStateOf(true) }
    var zoomIndex by rememberSaveable { mutableIntStateOf(1) } // index 1 == 1f, the base size

    val studentByRoll = remember(students) { students.associateBy { it.roll } }
    val marksByStudent = remember(marks) { marks.associateBy { it.studentId } }
    // Derived from the actual roster instead of a hardcoded 150 — a class
    // under 150 doesn't render a wall of pointless blank rows, and a class
    // over 150 doesn't silently lose students off the bottom of the sheet.
    val maxRoll = remember(students) { students.maxOfOrNull { it.roll } ?: 0 }
    val allRolls = remember(maxRoll) { if (maxRoll <= 0) emptyList() else (1..maxRoll).toList() }
    val enteredCount = remember(students, marksByStudent) {
        students.count { s ->
            marksByStudent[s.id]?.let { it.mcqMarks != null || it.writtenMarks != null || it.practicalMarks != null } == true
        }
    }
    val zoom = remember(zoomIndex) { ledgerZoomFor(ZOOM_LEVELS[zoomIndex]) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Verify Marks", style = MaterialTheme.typography.titleMedium) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
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
            SheetHeader(year, term, subject, useBengali)
            Text(
                text = "${NumeralFormat.localize(enteredCount.toString(), useBengali)}/${NumeralFormat.localize(students.size.toString(), useBengali)} entered",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 4.dp, bottom = 8.dp)
            )
            ControlStrip(
                useBengali = useBengali,
                onBengaliChange = { useBengali = it },
                showTotal = showTotal,
                onShowTotalChange = { showTotal = it },
                zoomIndex = zoomIndex,
                onZoomOut = { if (zoomIndex > 0) zoomIndex-- },
                onZoomIn = { if (zoomIndex < ZOOM_LEVELS.lastIndex) zoomIndex++ }
            )
            HorizontalDivider()
            // Plain 2-axis scrolling — no custom gesture detectors, so nothing
            // to conflict or race. Zoom is handled separately by the buttons
            // above, which change actual layout size rather than a draw-time
            // transform, so scrolling and zoom never fight each other.
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .background(Color(0xFFFFFDF7)) // fixed "paper" tone so black ink text/borders stay visible regardless of app theme
                    .horizontalScroll(rememberScrollState())
                    .verticalScroll(rememberScrollState())
            ) {
                LedgerGrid(allRolls, studentByRoll, marksByStudent, useBengali, showTotal, zoom)
            }
        }
    }
}

@Composable
private fun ControlStrip(
    useBengali: Boolean,
    onBengaliChange: (Boolean) -> Unit,
    showTotal: Boolean,
    onShowTotalChange: (Boolean) -> Unit,
    zoomIndex: Int,
    onZoomOut: () -> Unit,
    onZoomIn: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        NumeralToggle(useBengali, onBengaliChange)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Total", style = MaterialTheme.typography.labelMedium)
            Switch(checked = showTotal, onCheckedChange = onShowTotalChange, modifier = Modifier.padding(start = 6.dp))
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onZoomOut, enabled = zoomIndex > 0, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.ZoomOut, contentDescription = "Zoom out")
            }
            Text(
                "${(ZOOM_LEVELS[zoomIndex] * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.width(36.dp),
                textAlign = TextAlign.Center
            )
            IconButton(onClick = onZoomIn, enabled = zoomIndex < ZOOM_LEVELS.lastIndex, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.ZoomIn, contentDescription = "Zoom in")
            }
        }
    }
}

@Composable
private fun NumeralToggle(useBengali: Boolean, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            "বাং",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = if (useBengali) FontWeight.Bold else FontWeight.Normal,
            color = if (useBengali) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
        Switch(checked = !useBengali, onCheckedChange = { onChange(!it) }, modifier = Modifier.padding(horizontal = 6.dp))
        Text(
            "EN",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = if (!useBengali) FontWeight.Bold else FontWeight.Normal,
            color = if (!useBengali) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun paperLabel(subjectName: String): String = when {
    subjectName.contains("1st Paper") -> "১ম পত্র"
    subjectName.contains("2nd Paper") -> "২য় পত্র"
    else -> "-"
}

@Composable
private fun SheetHeader(year: YearEntity, term: TermEntity, subject: SubjectEntity, useBengali: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(SCHOOL_NAME, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("পরীক্ষা: ${examPeriodLabel(term.examPeriod)}, ${year.label}", style = MaterialTheme.typography.bodySmall)
            Text("শ্রেণি: নবম, শাখা: খ", style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("বিষয়: ${TabulationDisplay.bengaliSubjectName(subject)}", style = MaterialTheme.typography.bodySmall)
            Text("পত্র: ${paperLabel(subject.name)}", style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(10.dp))
        Surface(
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            shape = RoundedCornerShape(4.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh
        ) {
            Text(
                "নম্বর ফর্দ  (পূর্ণমান: ${NumeralFormat.localize(subject.fullMarks.toString(), useBengali)})",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }
    }
}

@Composable
private fun LedgerGrid(
    rolls: List<Int>,
    studentByRoll: Map<Int, StudentEntity>,
    marksByStudent: Map<Int, MarkEntity>,
    useBengali: Boolean,
    showTotal: Boolean,
    zoom: LedgerZoom
) {
    if (rolls.isEmpty()) {
        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
            Text("No students to verify yet", color = Color.DarkGray)
        }
        return
    }
    val columns = rolls.chunked(ROWS_PER_COLUMN)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(16.dp)) {
        columns.forEach { columnRolls ->
            LedgerColumn(columnRolls, studentByRoll, marksByStudent, useBengali, showTotal, zoom)
        }
    }
}

@Composable
private fun LedgerColumn(
    rolls: List<Int>,
    studentByRoll: Map<Int, StudentEntity>,
    marksByStudent: Map<Int, MarkEntity>,
    useBengali: Boolean,
    showTotal: Boolean,
    zoom: LedgerZoom
) {
    val outline = Color.Black
    val colWidth = zoom.rollWidth + zoom.marksWidth + 1.dp
    Column(modifier = Modifier.width(colWidth).border(1.dp, outline)) {
        Row(
            modifier = Modifier.height(IntrinsicSize.Min).background(Color(0xFFF2EEE3)),
            verticalAlignment = Alignment.CenterVertically
        ) {
            LedgerCell("রোল\nনং", zoom.rollWidth, zoom.headerSize, header = true)
            VDivider(outline)
            LedgerCell("প্রাপ্ত নম্বর\nনৈঃ+রঃ+ব্যবঃ = মোট", zoom.marksWidth, zoom.headerSize, header = true)
        }
        HorizontalDivider(color = outline, thickness = 1.dp)
        rolls.forEachIndexed { idx, roll ->
            val student = studentByRoll[roll]
            val mark = student?.let { marksByStudent[it.id] }
            val total = (mark?.mcqMarks ?: 0) + (mark?.writtenMarks ?: 0) + (mark?.practicalMarks ?: 0)
            val rawBreakdown = TabulationDisplay.formatBreakdown(mark?.mcqMarks, mark?.writtenMarks, mark?.practicalMarks, total)
            var breakdown = if (rawBreakdown == "-") "" else rawBreakdown
            if (!showTotal && breakdown.contains("=")) {
                breakdown = breakdown.substringBefore("=").trim()
            }

            Row(modifier = Modifier.height(IntrinsicSize.Min), verticalAlignment = Alignment.CenterVertically) {
                LedgerCell(NumeralFormat.localize(roll.toString(), true), zoom.rollWidth, zoom.bodySize)
                VDivider(outline)
                LedgerCell(NumeralFormat.localize(breakdown, useBengali), zoom.marksWidth, zoom.bodySize, alignStart = true)
            }
            if (idx < rolls.lastIndex) HorizontalDivider(color = outline, thickness = 1.dp)
        }
    }
}

@Composable
private fun VDivider(color: Color) {
    Box(modifier = Modifier.width(1.dp).fillMaxHeight().background(color))
}

@Composable
private fun LedgerCell(text: String, width: Dp, fontSize: TextUnit, header: Boolean = false, alignStart: Boolean = false) {
    Box(
        modifier = Modifier.width(width).padding(horizontal = 8.dp, vertical = 2.dp),
        contentAlignment = if (alignStart) Alignment.CenterStart else Alignment.Center
    ) {
        Text(
            text = text,
            fontSize = fontSize,
            fontWeight = FontWeight.Bold,
            // Header keeps its intentional 2-line "রোল\nনং" split; data rows
            // are hard-capped at 1 line so a long value can never wrap and
            // throw this row's height out of sync with its neighbors — the
            // actual cause of the misaligned-looking borders.
            maxLines = if (header) 2 else 1,
            textAlign = if (alignStart) TextAlign.Start else TextAlign.Center,
            color = Color.Black
        )
    }
}
