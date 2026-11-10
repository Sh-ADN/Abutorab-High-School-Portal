package com.abutorab.resultentry.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.abutorab.resultentry.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class CombinedResultViewModel(private val networkManager: NetworkManager) : ViewModel() {

    private val _summary = MutableStateFlow<SummaryResponse?>(null)
    val summary: StateFlow<SummaryResponse?> = _summary

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isCompiling = MutableStateFlow(false)
    val isCompiling: StateFlow<Boolean> = _isCompiling

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating

    private val _docUrl = MutableStateFlow<String?>(null)
    val docUrl: StateFlow<String?> = _docUrl

    private val _errorChannel = MutableStateFlow<String?>(null)
    val errorChannel: StateFlow<String?> = _errorChannel

    init {
        fetchSummary()
    }

    fun fetchSummary() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _summary.value = networkManager.getSummary()
            } catch (e: Exception) {
                _errorChannel.value = e.message ?: "Failed to fetch summary"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun compileResults() {
        viewModelScope.launch {
            _isCompiling.value = true
            try {
                networkManager.compileResults()
                fetchSummary()
            } catch (e: Exception) {
                _errorChannel.value = e.message ?: "Failed to compile results"
            } finally {
                _isCompiling.value = false
            }
        }
    }

    fun generateDoc() {
        viewModelScope.launch {
            _isGenerating.value = true
            try {
                networkManager.compileResults()
                val response = networkManager.generateDoc()
                _docUrl.value = response.docUrl
                fetchSummary()
            } catch (e: Exception) {
                _errorChannel.value = e.message ?: "Failed to generate document"
            } finally {
                _isGenerating.value = false
            }
        }
    }

    fun clearError() {
        _errorChannel.value = null
    }
}

val CombinedResultViewModelFactory = object : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: androidx.lifecycle.viewmodel.CreationExtras): T {
        val application = (extras[androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as? com.abutorab.resultentry.MyApplication)
            ?: com.abutorab.resultentry.MyApplication.instance
        return CombinedResultViewModel(application.container.networkManager) as T
    }
}

// Formatting utilities
fun Int.toBengali(): String {
    val banglaDigits = arrayOf('০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯')
    return this.toString().map { if (it.isDigit()) banglaDigits[it - '0'] else it }.joinToString("")
}

fun formatRollSection(roll: Int, section: String): String {
    val rollStr = roll.toString().padStart(2, '0').map { 
        val banglaDigits = arrayOf('০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯')
        if (it.isDigit()) banglaDigits[it - '0'] else it 
    }.joinToString("")
    val secStr = when(section.uppercase()) {
        "A" -> "ক"
        "B" -> "খ"
        "C" -> "গ"
        else -> section
    }
    return "$rollStr$secStr"
}

fun mapCategory(category: String): Pair<String, androidx.compose.ui.graphics.Color> {
    return when (category) {
        "MERIT" -> "মেধাতালিকা" to androidx.compose.ui.graphics.Color(0xFF4CAF50)
        "1ST_CONSIDERATION" -> "১ম বিবেচনা" to androidx.compose.ui.graphics.Color(0xFFFFC107)
        "2ND_CONSIDERATION" -> "২য় বিবেচনা" to androidx.compose.ui.graphics.Color(0xFFFF9800)
        "SPECIAL_CONSIDERATION" -> "বিশেষ বিবেচনা" to androidx.compose.ui.graphics.Color(0xFFF44336)
        "NOT_PASSED" -> "অনুত্তীর্ণ" to androidx.compose.ui.graphics.Color(0xFF757575)
        else -> category to androidx.compose.ui.graphics.Color.Gray
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CombinedResultScreen(
    onNavigateBack: () -> Unit,
    viewModel: CombinedResultViewModel = viewModel(factory = CombinedResultViewModelFactory)
) {
    val summary by viewModel.summary.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isCompiling by viewModel.isCompiling.collectAsState()
    val isGenerating by viewModel.isGenerating.collectAsState()
    val docUrl by viewModel.docUrl.collectAsState()
    val error by viewModel.errorChannel.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Combined Result") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (isLoading && summary == null) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
            
            // Actions
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Button(
                        onClick = { viewModel.compileResults() },
                        enabled = !isCompiling,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (isCompiling) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text("Compile Results")
                    }
                    
                    Button(
                        onClick = { viewModel.generateDoc() },
                        enabled = !isGenerating && !isCompiling,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (isGenerating) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text("Generate Result Doc")
                    }
                }

                if (docUrl != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(docUrl))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("View Result Doc")
                    }
                }
            }
            
            // Summary
            summary?.counts?.let { counts ->
                Text(
                    text = "মেধা ${counts.meritCount.toBengali()} · ১ম বিবেচনা ${counts.tier1Count.toBengali()} · ২য় বিবেচনা ${counts.tier2Count.toBengali()} · বিশেষ বিবেচনা ${counts.tier3Count.toBengali()} · উত্তীর্ণ ${counts.passCount.toBengali()} · অনুত্তীর্ণ ${counts.notPassedCount.toBengali()} · মোট ${counts.totalStudents.toBengali()}",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            
            HorizontalDivider()
            
            // Table
            summary?.students?.let { students ->
                val categoryOrder = mapOf("MERIT" to 0, "1ST_CONSIDERATION" to 1, "2ND_CONSIDERATION" to 2, "SPECIAL_CONSIDERATION" to 3, "NOT_PASSED" to 4)
                val sortedStudents = students.sortedBy { categoryOrder[it.category] ?: 99 }
                
                // M3 Pull To Refresh wrapper
                androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                    isRefreshing = isLoading,
                    onRefresh = { viewModel.fetchSummary() },
                    modifier = Modifier.fillMaxSize()
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(sortedStudents) { student ->
                            StudentSummaryRow(student)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StudentSummaryRow(student: SummaryStudent) {
    val (categoryText, categoryColor) = mapCategory(student.category)
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val rollLabel = if (student.newRoll != null) {
                            "Roll: ${student.newRoll.toBengali()} (was ${formatRollSection(student.oldRoll, student.section)})"
                        } else {
                            formatRollSection(student.oldRoll, student.section)
                        }
                        Text(
                            text = rollLabel,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = categoryColor.copy(alpha = 0.2f),
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = categoryText,
                                color = categoryColor,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = student.name,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Marks: ${student.totalMarks}", style = MaterialTheme.typography.bodyMedium)
                    Text("Failed: ${student.failedCount}", style = MaterialTheme.typography.bodyMedium)
                    Text("GPA: ${student.gpa ?: "-"}", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
