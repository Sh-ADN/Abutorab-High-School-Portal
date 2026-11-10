package com.abutorab.marks9b.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Visibility
import kotlinx.coroutines.delay
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import com.abutorab.marks9b.data.local.entity.StudentEntity
import com.abutorab.marks9b.data.local.entity.SubjectEntity
import com.abutorab.marks9b.data.local.entity.MarkEntity
import com.abutorab.marks9b.data.local.entity.ApplicabilityType
import com.abutorab.marks9b.ui.MarksViewModel

import com.abutorab.marks9b.data.remote.SheetsSyncService
import kotlinx.coroutines.launch

private val FailRed = Color(0xFFE53935)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarksEntryScreen(termId: Int, subjectId: Int, viewModel: MarksViewModel) {
    val term by viewModel.getTermById(termId).collectAsStateWithLifecycle(initialValue = null)
    val currentTerm = term ?: return
    val yearId = currentTerm.yearId

    val year by viewModel.getYearById(yearId).collectAsStateWithLifecycle(initialValue = null)
    val currentYear = year ?: return

    val subjects by viewModel.getSubjectsForTerm(termId).collectAsStateWithLifecycle(initialValue = emptyList())
    val subject = subjects.find { it.id == subjectId } ?: return
    val allStudents by viewModel.getStudentsForYear(yearId).collectAsStateWithLifecycle(initialValue = emptyList())
    val marks by viewModel.getMarksForSubject(subjectId).collectAsStateWithLifecycle(initialValue = emptyList())

    val filteredStudents = remember(allStudents, subject) {
        allStudents.filter { student ->
            when (subject.applicabilityType) {
                ApplicabilityType.ALL.name -> true
                ApplicabilityType.RELIGION.name -> student.religion == subject.applicabilityValue
                ApplicabilityType.GROUP.name -> student.group == subject.applicabilityValue
                ApplicabilityType.OPTIONAL_TYPE.name -> student.optionalType == subject.applicabilityValue
                else -> true
            }
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    var isExporting by remember { mutableStateOf(false) }
    var exportProgress by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var isImporting by remember { mutableStateOf(false) }
    var showClearConfirmDialog by remember { mutableStateOf(false) }
    var showVerificationSheet by remember { mutableStateOf(false) }
    var previousMarksSnapshot by remember { mutableStateOf<List<MarkEntity>?>(null) }

    fun performImport(showFeedback: Boolean) {
        val sheetId = currentYear.sheetId ?: return
        isImporting = true
        coroutineScope.launch {
            val componentCount = listOf(subject.mcqMax, subject.writtenMax, subject.practicalMax).count { it != null }
            val startColumn = if (currentTerm.examPeriod == com.abutorab.marks9b.data.local.entity.ExamPeriod.MID_TERM.name) {
                3
            } else {
                3 + componentCount
            }
            val result = SheetsSyncService.importSubjectMarks(sheetId, subject.sheetTabName, startColumn, componentCount)
            isImporting = false
            if (result.isSuccess) {
                var updatedCount = 0
                result.getOrNull()?.forEach { entry ->
                    val student = filteredStudents.find { it.roll == entry.roll }
                    if (student != null) {
                        val existingMark = marks.find { it.studentId == student.id }
                        var newMcq = existingMark?.mcqMarks
                        var newWritten = existingMark?.writtenMarks
                        var newPractical = existingMark?.practicalMarks
                        var changed = false
                        var idx = 0
                        if (subject.mcqMax != null) {
                            entry.values.getOrNull(idx)?.let { newMcq = it; changed = true }
                            idx++
                        }
                        if (subject.writtenMax != null) {
                            entry.values.getOrNull(idx)?.let { newWritten = it; changed = true }
                            idx++
                        }
                        if (subject.practicalMax != null) {
                            entry.values.getOrNull(idx)?.let { newPractical = it; changed = true }
                            idx++
                        }
                        if (changed) {
                            viewModel.saveMark(
                                MarkEntity(
                                    id = existingMark?.id ?: 0,
                                    studentId = student.id,
                                    subjectId = subjectId,
                                    mcqMarks = newMcq,
                                    writtenMarks = newWritten,
                                    practicalMarks = newPractical,
                                    isSynced = true
                                )
                            )
                            updatedCount++
                        }
                    }
                }
                if (showFeedback) {
                    snackbarHostState.showSnackbar("Imported $updatedCount marks")
                }
            } else if (showFeedback) {
                snackbarHostState.showSnackbar(result.exceptionOrNull()?.message ?: "Import failed")
            }
        }
    }

    if (showClearConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showClearConfirmDialog = false },
            title = { Text("Clear All Marks") },
            text = { Text("Are you sure you want to clear all marks for this subject? This will also remove the marks from the linked Google Sheet on next export.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showClearConfirmDialog = false
                        previousMarksSnapshot = marks.map { it.copy() }
                        val clearedMarks = marks.map { it.copy(mcqMarks = null, writtenMarks = null, practicalMarks = null, isSynced = false) }
                        viewModel.saveMarks(clearedMarks)
                        
                        coroutineScope.launch {
                            val snackbarJob = launch {
                                val result = snackbarHostState.showSnackbar(
                                    message = "All marks cleared.",
                                    actionLabel = "Undo",
                                    duration = SnackbarDuration.Indefinite
                                )
                                if (result == SnackbarResult.ActionPerformed) {
                                    previousMarksSnapshot?.let { 
                                        viewModel.saveMarks(it) 
                                    }
                                }
                                previousMarksSnapshot = null
                            }
                            delay(8000)
                            snackbarJob.cancel()
                            snackbarHostState.currentSnackbarData?.dismiss()
                        }
                    }
                ) {
                    Text("Clear")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showVerificationSheet) {
        VerificationSheetDialog(
            year = currentYear,
            term = currentTerm,
            subject = subject,
            students = filteredStudents,
            marks = marks,
            onDismiss = { showVerificationSheet = false }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(subject.name) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                actions = {
                    IconButton(onClick = { showVerificationSheet = true }) {
                        Icon(Icons.Default.Visibility, contentDescription = "Verify Against Paper Sheet")
                    }
                    IconButton(
                        onClick = { showClearConfirmDialog = true },
                        enabled = filteredStudents.isNotEmpty()
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Clear All Marks")
                    }
                    com.abutorab.marks9b.ui.components.ThemeToggleButton()
                    val sheetId = currentYear.sheetId
                    if (isImporting) {
                        CircularProgressIndicator(modifier = Modifier.padding(16.dp).size(24.dp), strokeWidth = 2.dp)
                    } else {
                        IconButton(
                            onClick = { performImport(showFeedback = true) },
                            enabled = sheetId != null
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "Import from Sheet")
                        }
                    }
                    if (isExporting) {
                        val progress = exportProgress
                        if (progress != null) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically, 
                                modifier = Modifier.padding(end = 16.dp)
                            ) {
                                CircularProgressIndicator(
                                    progress = if (progress.second > 0) progress.first.toFloat() / progress.second.toFloat() else 0f,
                                    modifier = Modifier.size(24.dp),
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${progress.first}/${progress.second}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        } else {
                            CircularProgressIndicator(modifier = Modifier.padding(16.dp).size(24.dp), strokeWidth = 2.dp)
                        }
                    } else {
                        Button(
                            onClick = {
                                if (sheetId != null) {
                                    coroutineScope.launch {
                                        val unsyncedMarks = marks.filter { !it.isSynced }
                                        if (unsyncedMarks.isEmpty()) {
                                            snackbarHostState.showSnackbar("No new changes to export.")
                                            return@launch
                                        }

                                        isExporting = true

                                        val entries = filteredStudents.mapNotNull { student ->
                                            val mark = unsyncedMarks.find { it.studentId == student.id }
                                            if (mark == null) null
                                            else {
                                                val values = mutableListOf<Any>()
                                                if (subject.mcqMax != null) values.add(mark.mcqMarks ?: "")
                                                if (subject.writtenMax != null) values.add(mark.writtenMarks ?: "")
                                                if (subject.practicalMax != null) values.add(mark.practicalMarks ?: "")
                                                SheetsSyncService.ExportEntry(student.roll, student.name, values)
                                            }
                                        }
                                        
                                        var componentCount = 0
                                        if (subject.mcqMax != null) componentCount++
                                        if (subject.writtenMax != null) componentCount++
                                        if (subject.practicalMax != null) componentCount++
                                        
                                        val startColumn = if (currentTerm.examPeriod == com.abutorab.marks9b.data.local.entity.ExamPeriod.MID_TERM.name) {
                                            3
                                        } else {
                                            3 + componentCount
                                        }
                                        
                                        exportProgress = Pair(0, entries.size)
                                        val result = SheetsSyncService.exportSubjectMarks(sheetId, subject.sheetTabName, startColumn, entries) { current, total ->
                                            exportProgress = Pair(current, total)
                                        }
                                        isExporting = false
                                        exportProgress = null
                                        if (result.isSuccess) {
                                            unsyncedMarks.forEach { mark ->
                                                viewModel.saveMark(mark.copy(isSynced = true))
                                            }
                                            snackbarHostState.showSnackbar("Exported ${result.getOrNull()} students successfully")
                                        } else {
                                            snackbarHostState.showSnackbar(result.exceptionOrNull()?.message ?: "Export failed")
                                        }
                                    }
                                }
                            },
                            enabled = sheetId != null,
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text("Export to Sheet")
                        }
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            if (currentYear.sheetId == null) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth()
                ) {
                    Text(
                        text = "Link a Google Sheet to this year first (edit the year to add one).",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
            if (filteredStudents.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "No students",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(16.dp))
                        Text(
                            text = "No students yet",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "No students match this subject's applicability rules",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f).imePadding(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredStudents, key = { it.id }) { student ->
                        val mark = marks.find { it.studentId == student.id }
                        MarkEntryRow(
                            student = student,
                            subject = subject,
                            existingMark = mark,
                            onSaveMark = { mcq, written, practical ->
                                viewModel.saveMark(
                                    MarkEntity(
                                        id = mark?.id ?: 0,
                                        studentId = student.id,
                                        subjectId = subjectId,
                                        mcqMarks = mcq,
                                        writtenMarks = written,
                                        practicalMarks = practical,
                                        isSynced = false
                                    )
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MarkEntryRow(
    student: StudentEntity,
    subject: SubjectEntity,
    existingMark: MarkEntity?,
    onSaveMark: (mcq: Int?, written: Int?, practical: Int?) -> Unit
) {
    var flashTrigger by remember { mutableStateOf(0) }
    var isInitialLoad by remember { mutableStateOf(true) }
    
    LaunchedEffect(existingMark) {
        if (!isInitialLoad) {
            flashTrigger++
        }
        isInitialLoad = false
    }

    val defaultColor = MaterialTheme.colorScheme.surfaceContainer
    val highlightColor = MaterialTheme.colorScheme.primaryContainer
    var isHighlight by remember { mutableStateOf(false) }

    LaunchedEffect(flashTrigger) {
        if (flashTrigger > 0) {
            isHighlight = true
            kotlinx.coroutines.delay(700)
            isHighlight = false
        }
    }

    val targetColor = if (isHighlight) highlightColor else defaultColor
    val animatedColor by androidx.compose.animation.animateColorAsState(
        targetValue = targetColor,
        animationSpec = androidx.compose.animation.core.tween(durationMillis = 300)
    )
    val animatedPrimaryContainer by androidx.compose.animation.animateColorAsState(targetValue = MaterialTheme.colorScheme.primaryContainer, animationSpec = androidx.compose.animation.core.tween(300))
    val animatedOnPrimaryContainer by androidx.compose.animation.animateColorAsState(targetValue = MaterialTheme.colorScheme.onPrimaryContainer, animationSpec = androidx.compose.animation.core.tween(300))
    val animatedOnSurface by androidx.compose.animation.animateColorAsState(targetValue = MaterialTheme.colorScheme.onSurface, animationSpec = androidx.compose.animation.core.tween(300))
    val animatedOnSurfaceVariant by androidx.compose.animation.animateColorAsState(targetValue = MaterialTheme.colorScheme.onSurfaceVariant, animationSpec = androidx.compose.animation.core.tween(300))
    val animatedPrimary by androidx.compose.animation.animateColorAsState(targetValue = MaterialTheme.colorScheme.primary, animationSpec = androidx.compose.animation.core.tween(300))

    var mcqText by remember(existingMark?.mcqMarks) { mutableStateOf(existingMark?.mcqMarks?.toString() ?: "") }
    var writtenText by remember(existingMark?.writtenMarks) { mutableStateOf(existingMark?.writtenMarks?.toString() ?: "") }
    var practicalText by remember(existingMark?.practicalMarks) { mutableStateOf(existingMark?.practicalMarks?.toString() ?: "") }

    val componentCount = remember(subject) { listOfNotNull(subject.mcqMax, subject.writtenMax, subject.practicalMax).size }

    fun belowPass(text: String, max: Int?): Boolean {
        if (componentCount <= 1 || max == null) return false
        val parsed = text.toIntOrNull() ?: return false
        val threshold = kotlin.math.round(max / 3.0).toInt()
        return parsed < threshold
    }

    val mcqBelowPass = belowPass(mcqText, subject.mcqMax)
    val writtenBelowPass = belowPass(writtenText, subject.writtenMax)
    val practicalBelowPass = belowPass(practicalText, subject.practicalMax)

    fun trySave() {
        val mcqParsed = mcqText.toIntOrNull()
        val writtenParsed = writtenText.toIntOrNull()
        val practicalParsed = practicalText.toIntOrNull()

        val finalMcq = if (mcqText.isEmpty()) existingMark?.mcqMarks else mcqParsed
        val finalWritten = if (writtenText.isEmpty()) existingMark?.writtenMarks else writtenParsed
        val finalPractical = if (practicalText.isEmpty()) existingMark?.practicalMarks else practicalParsed

        onSaveMark(finalMcq, finalWritten, finalPractical)
    }

    val total = (mcqText.toIntOrNull() ?: 0) + (writtenText.toIntOrNull() ?: 0) + (practicalText.toIntOrNull() ?: 0)

    val rowBringIntoViewRequester = remember { BringIntoViewRequester() }
    var mcqFocused by remember { mutableStateOf(false) }
    var writtenFocused by remember { mutableStateOf(false) }
    var practicalFocused by remember { mutableStateOf(false) }

    LaunchedEffect(mcqFocused, writtenFocused, practicalFocused) {
        if (mcqFocused || writtenFocused || practicalFocused) {
            rowBringIntoViewRequester.bringIntoView()
        }
    }

    val baseFieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = animatedOnSurface,
        unfocusedTextColor = animatedOnSurface,
        focusedBorderColor = animatedPrimary,
        unfocusedBorderColor = animatedOnSurfaceVariant,
        focusedLabelColor = animatedPrimary,
        unfocusedLabelColor = animatedOnSurfaceVariant
    )

    val errorFieldColors = OutlinedTextFieldDefaults.colors(
        errorBorderColor = FailRed,
        errorLabelColor = FailRed,
        errorCursorColor = FailRed,
        focusedTextColor = animatedOnSurface,
        unfocusedTextColor = animatedOnSurface,
        focusedLabelColor = animatedPrimary,
        unfocusedLabelColor = animatedOnSurfaceVariant
    )

    Card(
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = animatedColor),
        modifier = Modifier.fillMaxWidth().bringIntoViewRequester(rowBringIntoViewRequester)
    ) {
        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(animatedPrimaryContainer, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = student.roll.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = animatedOnPrimaryContainer
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text("${student.roll} - ${student.name}", style = MaterialTheme.typography.bodyLarge, color = animatedOnSurface, modifier = Modifier.weight(1f))
                Text("Total: $total", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary)
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (subject.mcqMax != null) {
                    OutlinedTextField(
                        value = mcqText,
                        onValueChange = { newValue ->
                            val parsed = newValue.toIntOrNull()
                            if (newValue.isEmpty() || (parsed != null && subject.mcqMax != null && parsed in 0..subject.mcqMax)) {
                                mcqText = newValue
                                trySave()
                            }
                        },
                        modifier = Modifier.weight(1f).onFocusEvent { mcqFocused = it.isFocused },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        isError = mcqBelowPass,
                        colors = if (mcqBelowPass) errorFieldColors else baseFieldColors,
                        label = { Text("MCQ / ${subject.mcqMax}") },
                        singleLine = true
                    )
                }
                if (subject.writtenMax != null) {
                    OutlinedTextField(
                        value = writtenText,
                        onValueChange = { newValue ->
                            val parsed = newValue.toIntOrNull()
                            if (newValue.isEmpty() || (parsed != null && subject.writtenMax != null && parsed in 0..subject.writtenMax)) {
                                writtenText = newValue
                                trySave()
                            }
                        },
                        modifier = Modifier.weight(1f).onFocusEvent { writtenFocused = it.isFocused },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        isError = writtenBelowPass,
                        colors = if (writtenBelowPass) errorFieldColors else baseFieldColors,
                        label = { Text("CQ / ${subject.writtenMax}") },
                        singleLine = true
                    )
                }
                if (subject.practicalMax != null) {
                    OutlinedTextField(
                        value = practicalText,
                        onValueChange = { newValue ->
                            val parsed = newValue.toIntOrNull()
                            if (newValue.isEmpty() || (parsed != null && subject.practicalMax != null && parsed in 0..subject.practicalMax)) {
                                practicalText = newValue
                                trySave()
                            }
                        },
                        modifier = Modifier.weight(1f).onFocusEvent { practicalFocused = it.isFocused },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        isError = practicalBelowPass,
                        colors = if (practicalBelowPass) errorFieldColors else baseFieldColors,
                        label = { Text("Prac / ${subject.practicalMax}") },
                        singleLine = true
                    )
                }
            }
        }
    }
}
