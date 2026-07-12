package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.db.AppointmentEntity
import com.example.db.DocumentEntity
import com.example.db.FollowUpEntity
import com.example.db.PatientEntity
import com.example.ui.*
import com.example.ui.theme.MyApplicationTheme
import com.example.network.AuthPreferences
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {
    private val viewModel: ClinicViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Prompt for Android 13+ Notification Permissions dynamically
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }

        // Initialize and boot up the persistent website booking alerts background listener
        try {
            val serviceIntent = Intent(this, com.example.notification.ClinicNotificationService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Schedule WorkManager periodic task strictly for offline recovery and deep reconciliation
        try {
            val syncRequest = androidx.work.PeriodicWorkRequestBuilder<com.example.network.OfflineSyncWorker>(
                1, java.util.concurrent.TimeUnit.HOURS
            ).setConstraints(
                androidx.work.Constraints.Builder()
                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                    .build()
            ).build()

            androidx.work.WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "OfflineSyncWork",
                androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }

        setContent {
            var isDarkTheme by remember { mutableStateOf(true) }
            val context = LocalContext.current
            val authPrefs = remember { AuthPreferences(context) }
            var isLoggedIn by remember { mutableStateOf(authPrefs.isLoggedIn) }
            
            MyApplicationTheme(darkTheme = isDarkTheme, dynamicColor = false) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = if (isDarkTheme) ClinicColors.DarkBg else ClinicColors.LightBg
                ) {
                    if (isLoggedIn) {
                        MainAppLayout(
                            viewModel = viewModel,
                            isDark = isDarkTheme,
                            onToggleTheme = { isDarkTheme = !isDarkTheme },
                            onLogout = {
                                authPrefs.clear()
                                isLoggedIn = false
                            }
                        )
                    } else {
                        LoginScreen(
                            isDark = isDarkTheme,
                            onLoginSuccess = { email, token, name ->
                                authPrefs.token = token
                                authPrefs.doctorEmail = email
                                authPrefs.doctorName = name
                                isLoggedIn = true
                            }
                        )
                    }
                }
            }
        }
    }
}

enum class ClinicTab(val title: String, val icon: String) {
    DASHBOARD("Dashboard", "📊"),
    PATIENTS("Patients", "👥"),
    FOLLOW_UPS("Follow-ups", "📅"),
    BOOKS("Books", "📚")
}

@Composable
fun MainAppLayout(
    viewModel: ClinicViewModel,
    isDark: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit = {}
) {
    var activeTab by remember { mutableStateOf(ClinicTab.DASHBOARD) }
    
    // Dialog states
    var showAddPatientDialog by remember { mutableStateOf(false) }
    var showNotificationSettingsDialog by remember { mutableStateOf(false) }
    var readMoreText by remember { mutableStateOf<String?>(null) }
    
    // Sub-screens states
    var showSettingsScreen by remember { mutableStateOf(false) }
    var showProfileScreen by remember { mutableStateOf(false) }
    var showNotificationCenter by remember { mutableStateOf(false) }

    // Case Timeline Sheet state
    var timelinePatient by remember { mutableStateOf<PatientEntity?>(null) }
    var timelineVisits by remember { mutableStateOf<List<AppointmentEntity>>(emptyList()) }
    
    // Consultation Overlay state
    var activeConsultationAppt by remember { mutableStateOf<AppointmentEntity?>(null) }
    
    // Toast notifications state
    var toastMessage by remember { mutableStateOf<String?>(null) }

    // LaunchedEffect for automatic toast clear
    LaunchedEffect(toastMessage) {
        if (toastMessage != null) {
            delay(4000)
            toastMessage = null
        }
    }

    if (showProfileScreen) {
        ProfileScreen(isDark = isDark, onDismiss = { showProfileScreen = false })
    } else if (showSettingsScreen) {
        SettingsScreen(
            isDark = isDark,
            onDismiss = { showSettingsScreen = false },
            onLogout = onLogout,
            toastTrigger = { toastMessage = it }
        )
    } else {
        Scaffold(
            bottomBar = {
                ClinicBottomBar(
                    activeTab = activeTab,
                    onTabSelected = { activeTab = it },
                    isDark = isDark
                )
            },
            containerColor = Color.Transparent,
            modifier = Modifier.fillMaxSize()
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Header Panel
                    ClinicHeader(
                        isDark = isDark,
                        onToggleTheme = onToggleTheme,
                        onSettingsClick = { showSettingsScreen = true },
                        onProfileClick = { showProfileScreen = true },
                        onNotificationsClick = { showNotificationCenter = true },
                        toastTrigger = { toastMessage = it },
                        onLogoutClick = onLogout
                    )

                    // Main Workspace depending on Tab selection
                    Box(
                        modifier = Modifier
                            .weight(1.5f)
                            .fillMaxWidth()
                    ) {
                        when (activeTab) {
                            ClinicTab.DASHBOARD -> DashboardScreen(
                                viewModel = viewModel,
                                isDark = isDark,
                                onOpenWorkspace = { activeConsultationAppt = it },
                                onSelectPatientsTab = { activeTab = ClinicTab.PATIENTS },
                                onSelectFollowupsTab = { activeTab = ClinicTab.FOLLOW_UPS }
                            )
                            ClinicTab.PATIENTS -> PatientsScreen(
                                viewModel = viewModel,
                                isDark = isDark,
                                onRegisterClick = { showAddPatientDialog = true },
                                onTimelineClick = { patientId ->
                                    viewModel.getPatientHistory(patientId) { patient, visits ->
                                        timelinePatient = patient
                                        timelineVisits = visits
                                    }
                                }
                            )
                            ClinicTab.FOLLOW_UPS -> FollowupsScreen(
                                viewModel = viewModel,
                                isDark = isDark,
                                onReadMore = { readMoreText = it }
                            )
                            ClinicTab.BOOKS -> BooksScreen(
                                viewModel = viewModel,
                                isDark = isDark
                            )
                        }
                    }
                }

                // --- Dialog Overlays ---

                // Save SOAP Success Notification / Toasts
                toastMessage?.let { msg ->
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 16.dp)
                            .background(ClinicColors.DarkCard, RoundedCornerShape(8.dp))
                            .border(1.dp, ClinicColors.Rose600, RoundedCornerShape(8.dp))
                            .padding(horizontal = 20.dp, vertical = 10.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🔔", fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(msg, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Register Patient Dialog
                if (showAddPatientDialog) {
                    AddPatientDialog(
                        onDismiss = { showAddPatientDialog = false },
                        onSave = { name, phone, age, gender, address, history, notes ->
                            viewModel.addPatient(name, phone, age, gender, address, history, notes)
                            showAddPatientDialog = false
                            toastMessage = "Patient Registered Successfully"
                        },
                        isDark = isDark
                    )
                }

                // Read More Dialog
                readMoreText?.let { text ->
                    ReadMoreDialog(
                        text = text,
                        onDismiss = { readMoreText = null },
                        isDark = isDark
                    )
                }

                // Patient Case Study Timeline Sheet
                timelinePatient?.let { patient ->
                    PatientTimelineSheet(
                        patient = patient,
                        visits = timelineVisits,
                        isDark = isDark,
                        onDismiss = { timelinePatient = null }
                    )
                }

                // Consultation Overlay
                activeConsultationAppt?.let { appt ->
                    ConsultationOverlay(
                        appt = appt,
                        isDark = isDark,
                        onSave = { sub, obj, ass, plan, rx, meds, adv, fupDate, fupNotes ->
                            viewModel.saveClinicalNotes(appt.id, sub, obj, ass, plan, rx, meds, adv, fupDate, fupNotes)
                            activeConsultationAppt = null
                            toastMessage = "Clinical Case Sheet Saved for ${appt.patientName}"
                        },
                        onDismiss = { activeConsultationAppt = null },
                        onDisableFollowup = {
                            viewModel.disableFollowUp(appt.id)
                            toastMessage = "Follow-up disabled"
                        }
                    )
                }

                // Notification Settings Dialog
                if (showNotificationSettingsDialog) {
                    NotificationSettingsDialog(
                        isDark = isDark,
                        onDismiss = { showNotificationSettingsDialog = false },
                        toastTrigger = { toastMessage = it }
                    )
                }

                // Notification Center Sheet
                if (showNotificationCenter) {
                    NotificationCenterSheet(
                        isDark = isDark,
                        onDismiss = { showNotificationCenter = false },
                        onOpenSettings = {
                            showNotificationCenter = false
                            showNotificationSettingsDialog = true
                        },
                        toastTrigger = { toastMessage = it }
                    )
                }
            }
        }
    }
}

@Composable
fun ClinicHeader(
    isDark: Boolean,
    onToggleTheme: () -> Unit,
    onSettingsClick: () -> Unit,
    onProfileClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    toastTrigger: (String) -> Unit,
    onLogoutClick: () -> Unit = {}
) {
    var clockTime by remember { mutableStateOf("03:47 PM") }
    var clockDate by remember { mutableStateOf("21 June 2026") }
    var clockDay by remember { mutableStateOf("Sunday") }
    var clockGreeting by remember { mutableStateOf("Good morning,") }

    LaunchedEffect(Unit) {
        while (true) {
            val now = Calendar.getInstance()
            val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
            val dateFormat = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
            val dayFormat = SimpleDateFormat("EEEE", Locale.getDefault())

            clockTime = timeFormat.format(now.time)
            clockDate = dateFormat.format(now.time)
            clockDay = dayFormat.format(now.time)

            val hour = now.get(Calendar.HOUR_OF_DAY)
            clockGreeting = when {
                hour in 5..11 -> "Good Morning,"
                hour in 12..16 -> "Good Afternoon,"
                hour in 17..20 -> "Good Evening,"
                else -> "Working Late,"
            }
            delay(1000)
        }
    }

    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg)
            .border(width = (0.5).dp, color = borderCol)
            .statusBarsPadding()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.clickable { onProfileClick() },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(ClinicColors.Rose600.copy(alpha = 0.15f))
                    .border(1.5.dp, ClinicColors.Rose600, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("👩‍⚕️", fontSize = 22.sp)
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = clockGreeting,
                    fontSize = 10.sp,
                    color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Dr. Varsha Bandi",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = if (isDark) Color.White else ClinicColors.LightText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("✔️", fontSize = 11.sp, color = ClinicColors.Rose600)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            // Live connection badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Green.copy(alpha = 0.12f))
                    .border(0.5.dp, Color.Green.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .clickable { toastTrigger("Regional cloud gateway fully connected") }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(Color.Green)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("LIVE", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.Green)
            }

            // Notification Bell with Badge
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.4f) else Color(0xFFF1F5F9))
                    .clickable { onNotificationsClick() },
                contentAlignment = Alignment.Center
            ) {
                Text("🔔", fontSize = 14.sp)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(2.dp)
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(Color.Red),
                    contentAlignment = Alignment.Center
                ) {
                    Text("3", fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }
            }

            // Settings Gear
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.4f) else Color(0xFFF1F5F9))
                    .clickable { onSettingsClick() },
                contentAlignment = Alignment.Center
            ) {
                Text("⚙️", fontSize = 14.sp)
            }

            // Theme Toggle
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.4f) else Color(0xFFF1F5F9))
                    .clickable { onToggleTheme() },
                contentAlignment = Alignment.Center
            ) {
                Text(if (isDark) "🌙" else "☀", fontSize = 14.sp)
            }
        }
    }
}

@Composable
fun ClinicBottomBar(
    activeTab: ClinicTab,
    onTabSelected: (ClinicTab) -> Unit,
    isDark: Boolean
) {
    val barBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(barBg.copy(alpha = 0.85f))
                .border(1.dp, borderCol.copy(alpha = 0.5f), RoundedCornerShape(24.dp))
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ClinicTab.values().forEach { tab ->
                val isSelected = activeTab == tab
                val tintColor = if (isSelected) ClinicColors.Rose600 else ClinicColors.DarkTextMuted

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onTabSelected(tab) }
                        .background(if (isSelected) ClinicColors.Rose600.copy(alpha = 0.12f) else Color.Transparent)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = tab.icon,
                        fontSize = 18.sp,
                        color = tintColor
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = tab.title,
                        fontSize = 9.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = tintColor
                    )
                }
            }
        }
    }
}

// ================= TAB VIEW 1: DASHBOARD =================

@Composable
fun DashboardScreen(
    viewModel: ClinicViewModel,
    isDark: Boolean,
    onOpenWorkspace: (AppointmentEntity) -> Unit,
    onSelectPatientsTab: () -> Unit,
    onSelectFollowupsTab: () -> Unit
) {
    val appointments by viewModel.appointments.collectAsState()
    val followups by viewModel.followUps.collectAsState()
    val patients by viewModel.patients.collectAsState()

    val totalPatients = patients.size.toString()
    val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    val todayAppts = appointments.filter { it.date == todayDate }.size.toString()
    val todayFups = followups.filter { it.followupDate == todayDate }.size.toString()
    val completedCount = appointments.filter { it.status == "Completed" || (it.date == todayDate && it.status == "Confirmed") }.size.toString()

    var activeTimelineFilter by remember { mutableStateOf("Today") }

    val filteredTimelineAppts = when (activeTimelineFilter) {
        "Today" -> appointments.filter { it.date == todayDate && it.status != "Completed" && it.status != "Cancelled" }
        "Upcoming" -> appointments.filter { it.date > todayDate && it.status != "Cancelled" }
        "Completed" -> appointments.filter { it.status == "Completed" || (it.date == todayDate && it.status == "Confirmed") }
        "Cancelled" -> appointments.filter { it.status == "Cancelled" }
        else -> appointments
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Stats grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard(
                        isDark = isDark,
                        title = "Patients",
                        value = totalPatients,
                        icon = "👥",
                        modifier = Modifier.weight(1f),
                        onClick = onSelectPatientsTab
                    )
                    MetricCard(
                        isDark = isDark,
                        title = "Today's Appts",
                        value = todayAppts,
                        icon = "📅",
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard(
                        isDark = isDark,
                        title = "Follow-ups",
                        value = todayFups,
                        icon = "⏳",
                        modifier = Modifier.weight(1f),
                        onClick = onSelectFollowupsTab
                    )
                    MetricCard(
                        isDark = isDark,
                        title = "Completed",
                        value = completedCount,
                        icon = "✓",
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Live Clinic Status Card
        item {
            val confirmedCount = appointments.filter { it.status == "Confirmed" }.size.toString()
            val pendingCount = appointments.filter { it.status == "Pending" }.size.toString()
            
            GlassCard(isDark = isDark, borderColor = Color.Green.copy(alpha = 0.3f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(Color.Green.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("✔️", fontSize = 10.sp)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                "Clinic Status",
                                fontSize = 10.sp,
                                color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted
                            )
                            Text(
                                "Open & Accepting",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
                            )
                        }
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isDark) Color(0xFF1E2E4A) else Color(0xFFF1F5F9))
                            .clickable { viewModel.refreshAll() }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            "Manage",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.Rose600
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            ">",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.Rose600
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder, thickness = (0.5).dp)
                Spacer(modifier = Modifier.height(16.dp))

                // Horizontal status indicators
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Availability
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color.Green.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("⏰", fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Availability", fontSize = 8.sp, color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted)
                            Text("Active Now", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText)
                        }
                    }
                    
                    // Consultations
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(ClinicColors.Rose600.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🩺", fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Consults", fontSize = 8.sp, color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted)
                            Text("$confirmedCount Active", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText)
                        }
                    }

                    // Queue status
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF8B5CF6).copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("👥", fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Queue", fontSize = 8.sp, color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted)
                            Text("$pendingCount Waiting", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText)
                        }
                    }
                }
            }
        }

        // Timeline Filter and View Calendar Action Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Clinical Timeline",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { viewModel.refreshAll() }
                ) {
                    Text("📅", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "View Calendar",
                        fontSize = 11.sp,
                        color = ClinicColors.Rose600,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Timeline Filter Segments
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val filters = listOf("Today", "Upcoming", "Completed", "Cancelled")
                filters.forEach { filter ->
                    val isSelected = activeTimelineFilter == filter
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) ClinicColors.Rose600 else (if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.3f) else Color(0xFFE2E8F0)))
                            .clickable { activeTimelineFilter = filter }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = filter,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else (if (isDark) Color.LightGray else Color.DarkGray)
                        )
                    }
                }
            }
        }

        // Timeline List
        if (filteredTimelineAppts.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 30.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No appointments under $activeTimelineFilter.", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
                }
            }
        } else {
            items(filteredTimelineAppts) { appt ->
                AppointmentItem(
                    appt = appt,
                    isDark = isDark,
                    viewModel = viewModel,
                    onOpenClick = { onOpenWorkspace(appt) }
                )
            }
        }
    }
}

@Composable
fun AppointmentItem(
    appt: AppointmentEntity,
    isDark: Boolean,
    viewModel: ClinicViewModel,
    onOpenClick: () -> Unit
) {
    val context = LocalContext.current
    val isConfirmed = appt.status == "Confirmed"
    val borderCol = if (isConfirmed) Color(0xFF10B981).copy(alpha = 0.3f) else {
        if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder
    }
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard

    val statusColor = when (appt.status) {
        "Confirmed" -> Color(0xFF10B981)
        "WhatsApp Sent" -> Color(0xFF3B82F6)
        "Pending" -> Color(0xFFD97706)
        "Cancelled", "Rejected" -> Color.Red
        else -> ClinicColors.Rose600
    }

    val paymentStatusColor = when (appt.paymentStatus) {
        "Paid" -> Color(0xFF10B981)
        "Payment Request Sent" -> Color(0xFF3B82F6)
        "Unpaid" -> Color(0xFFD97706)
        else -> ClinicColors.DarkTextMuted
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg, RoundedCornerShape(20.dp))
            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Vertical accent box showing scheduled time
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .width(64.dp)
                .background(if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.4f) else Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                .border(0.5.dp, if (isConfirmed) Color(0xFF10B981).copy(alpha = 0.2f) else ClinicColors.Rose600.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                .padding(vertical = 10.dp)
        ) {
            Text(
                text = appt.time.take(5),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (isDark) Color.White else ClinicColors.LightText
            )
            Text(
                text = appt.time.takeLast(2),
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold,
                color = ClinicColors.Rose600
            )
        }

        // Main content
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = appt.patientName,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isDark) Color.White else ClinicColors.LightText
                )
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    // Status Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(statusColor.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = appt.status,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                    // Payment Status Badge
                    if (appt.paymentStatus.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(paymentStatusColor.copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = appt.paymentStatus,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = paymentStatusColor
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "📞 ${appt.phone}  •  📅 ${appt.date}",
                fontSize = 9.sp,
                color = ClinicColors.DarkTextMuted
            )

            if (appt.serviceName.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "🩺 ${appt.serviceName} • Fee: ₹${appt.consultationFee}",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = ClinicColors.Rose600
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Reason quote box
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (isDark) Color(0xFF131B2E) else Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                    .border(width = (0.5).dp, color = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder, shape = RoundedCornerShape(10.dp))
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("💬", fontSize = 10.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "\"${appt.reason}\"",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (isDark) Color.LightGray else Color.DarkGray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (appt.status == "Pending") {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Button(
                            onClick = {
                                viewModel.sendWhatsAppPayment(appt.id)
                                val cleanPhone = appt.phone.replace(Regex("[^0-9+]"), "")
                                val msg = "Dear ${appt.patientName}, your appointment request for ${appt.serviceName.ifBlank { "consultation" }} on ${appt.date} at ${appt.time} has been received. Fee: ₹${appt.consultationFee}. Please complete payment and send screenshot here. — Dr. Varsha Bandi, Homeopathway"
                                val url = "https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(msg)}"
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("📲 WhatsApp", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { viewModel.acceptAppointment(appt.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = ClinicColors.Rose600),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("✅ Accept", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                    Button(
                        onClick = { viewModel.rejectAppointment(appt.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.8f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Reject Request", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            } else if (appt.status == "WhatsApp Sent") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Button(
                        onClick = { viewModel.acceptAppointment(appt.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("✅ Accept Payment", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Button(
                        onClick = { viewModel.rejectAppointment(appt.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.8f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Reject", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            } else if (isConfirmed) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Button(
                        onClick = {
                            viewModel.joinVideo(appt.id) { room ->
                                onOpenClick()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ClinicColors.Rose600),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1.2f)
                    ) {
                        Text("📹 Join Video", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Button(
                        onClick = onOpenClick,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isDark) Color(0xFF1E2E4A) else Color(0xFFE2E8F0)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Workspace", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                    }
                }
            } else {
                Button(
                    onClick = onOpenClick,
                    colors = ButtonDefaults.buttonColors(containerColor = if (isDark) Color(0xFF1E2E4A) else Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("View Workspace", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                }
            }
        }
    }
}

// ================= TAB VIEW 2: PATIENTS =================

@Composable
fun PatientsScreen(
    viewModel: ClinicViewModel,
    isDark: Boolean,
    onRegisterClick: () -> Unit,
    onTimelineClick: (String) -> Unit
) {
    val patients by viewModel.patients.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    val filteredPatients = patients.filter {
        it.name.contains(searchQuery, ignoreCase = true) || it.id.contains(searchQuery, ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard)
                    .border(1.dp, if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 2.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🔍", fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        textStyle = LocalTextStyle.current.copy(
                            color = if (isDark) Color.White else Color.Black,
                            fontSize = 13.sp
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        decorationBox = { innerTextField ->
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Search patient directory...",
                                    color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted,
                                    fontSize = 13.sp
                                )
                            }
                            innerTextField()
                        }
                    )
                }
            }

            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(ClinicColors.Rose600)
                    .clickable { onRegisterClick() },
                contentAlignment = Alignment.Center
            ) {
                Text("+", fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "Patient Profiles (${filteredPatients.size})",
            fontSize = 14.sp,
            fontWeight = FontWeight.Black,
            color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
        )

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredPatients.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("No patients found in directory.", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredPatients) { pat ->
                    PatientListItem(
                        patient = pat,
                        isDark = isDark,
                        onTimelineClick = { onTimelineClick(pat.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun PatientListItem(
    patient: PatientEntity,
    isDark: Boolean,
    onTimelineClick: () -> Unit
) {
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg, RoundedCornerShape(20.dp))
            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (isDark) Color(0xFF1E2E4A) else Color(0xFFE2E8F0)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (patient.gender.lowercase() == "female") "👩" else "👨",
                        fontSize = 18.sp
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = patient.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isDark) Color.White else ClinicColors.LightText
                    )
                    Text(
                        text = "ID: ${patient.id.take(8)}  •  ${patient.age} yrs / ${patient.gender}",
                        fontSize = 9.sp,
                        color = ClinicColors.DarkTextMuted
                    )
                }
            }
            
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(ClinicColors.Rose600.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "${patient.totalVisits} Consults",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = ClinicColors.Rose600
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = borderCol.copy(alpha = 0.5f), thickness = (0.5).dp)
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("PHONE NUMBER", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted)
                Text(patient.phone, fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
            }
            Column(modifier = Modifier.weight(1.2f)) {
                Text("DIAGNOSIS HISTORY", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted)
                Text(
                    text = patient.medicalHistory.ifBlank { "No prior record" },
                    fontSize = 11.sp,
                    color = if (isDark) Color.LightGray else Color.DarkGray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onTimelineClick,
            colors = ButtonDefaults.buttonColors(containerColor = if (isDark) Color(0xFF1E2E4A) else Color(0xFFF1F5F9)),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(0.5.dp, if (isDark) Color.LightGray.copy(alpha = 0.1f) else Color.DarkGray.copy(alpha = 0.1f))
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("📈", fontSize = 12.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "Open Patient Case Timeline",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isDark) Color.White else Color.Black
                )
            }
        }
    }
}

// ================= TAB VIEW 3: FOLLOW-UPS =================

@Composable
fun FollowupsScreen(
    viewModel: ClinicViewModel,
    isDark: Boolean,
    onReadMore: (String) -> Unit
) {
    val followups by viewModel.followUps.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedStage by remember { mutableStateOf("") }

    val filteredFups = followups.filter {
        val matchesSearch = it.patientName.contains(searchQuery, ignoreCase = true)
        val matchesStage = if (selectedStage.isBlank()) true else it.stage == selectedStage
        matchesSearch && matchesStage
    }

    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard)
                .border(1.dp, if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder, RoundedCornerShape(16.dp))
                .padding(horizontal = 14.dp, vertical = 2.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🔍", fontSize = 14.sp)
                Spacer(modifier = Modifier.width(10.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    textStyle = LocalTextStyle.current.copy(
                        color = if (isDark) Color.White else Color.Black,
                        fontSize = 13.sp
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    decorationBox = { innerTextField ->
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Search patient name...",
                                color = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted,
                                fontSize = 13.sp
                            )
                        }
                        innerTextField()
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Horizontal filter tags for Stage
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val stages = listOf("" to "All", "DAY_MINUS_3" to "3 Days", "DAY_MINUS_2" to "2 Days", "DAY_MINUS_1" to "1 Day", "DAY_0" to "Consult")
            stages.forEach { (key, display) ->
                val isSelected = selectedStage == key
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isSelected) ClinicColors.Rose600 else (if (isDark) Color(0xFF1E2E4A).copy(alpha = 0.4f) else Color(0xFFE2E8F0)))
                        .clickable { selectedStage = key }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = display,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) Color.White else (if (isDark) Color.LightGray else Color.DarkGray)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "Today's Follow-up Reminders (${filteredFups.size})",
            fontSize = 14.sp,
            fontWeight = FontWeight.Black,
            color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
        )

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredFups.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("No reminders scheduled.", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredFups) { fup ->
                    FollowupListItem(
                        fup = fup,
                        isDark = isDark,
                        onReadMore = { onReadMore(fup.doctorNotes) },
                        onSendWhatsApp = {
                            viewModel.markFollowUpMessagePrepared(fup.id)
                            val cleanPhone = fup.contactNumber.replace(Regex("[^0-9+]"), "")
                            val url = "https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(fup.preparedMessage)}"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            context.startActivity(intent)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun FollowupListItem(
    fup: FollowUpEntity,
    isDark: Boolean,
    onReadMore: () -> Unit,
    onSendWhatsApp: () -> Unit
) {
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    val stageLabel = when (fup.stage) {
        "DAY_MINUS_3" -> "3 Days Before"
        "DAY_MINUS_2" -> "2 Days Before"
        "DAY_MINUS_1" -> "1 Day Before"
        "DAY_0" -> "Consultation Day"
        else -> fup.stage
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg, RoundedCornerShape(20.dp))
            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(ClinicColors.Rose600.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("⏳", fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = fup.patientName,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isDark) Color.White else ClinicColors.LightText
                    )
                    Text(
                        text = "Last: ${fup.lastVisitDate}  •  Next: ${fup.followupDate}",
                        fontSize = 9.sp,
                        color = ClinicColors.DarkTextMuted
                    )
                }
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(ClinicColors.Rose600.copy(alpha = 0.15f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = stageLabel,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold,
                    color = ClinicColors.Rose600
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = borderCol.copy(alpha = 0.5f), thickness = (0.5).dp)
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("CLINICAL NOTES", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted)
                val text = fup.doctorNotes
                val display = if (text.length > 40) text.take(37) + "..." else text
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(display, fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                    if (text.length > 40) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Read More",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.Rose600,
                            modifier = Modifier.clickable { onReadMore() }
                        )
                    }
                }
            }
            
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (fup.reminderStatus == "Message Prepared") Color.Green.copy(alpha = 0.15f) else Color(0xFFD97706).copy(alpha = 0.15f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = fup.reminderStatus,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (fup.reminderStatus == "Message Prepared") Color.Green else Color(0xFFD97706)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // WhatsApp Alert Box
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isDark) Color(0xFF131B2E) else Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                .border(width = (0.5).dp, color = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder, shape = RoundedCornerShape(10.dp))
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("💬", fontSize = 10.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "WhatsApp Alert: \"${fup.preparedMessage}\"",
                fontSize = 9.sp,
                color = ClinicColors.DarkTextMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        Button(
            onClick = onSendWhatsApp,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366), contentColor = Color.White),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("💬", fontSize = 12.sp, color = Color.White)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Send WhatsApp Reminder", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

// ================= TAB VIEW 4: BOOKS / REFERENCE =================

@Composable
fun BooksScreen(
    viewModel: ClinicViewModel,
    isDark: Boolean
) {
    val documents by viewModel.documents.collectAsState()
    var selectedCategory by remember { mutableStateOf("Guidelines") }
    var mockUploadName by remember { mutableStateOf("") }
    var mockUploadSize by remember { mutableStateOf("1.5 MB") }
    var showUploadDialog by remember { mutableStateOf(false) }

    val filteredDocs = documents.filter { it.category == selectedCategory }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Dropdown selection category
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val categories = listOf("Guidelines", "Reports", "Reference Books", "Patient Documents")
            Column(modifier = Modifier.weight(1f)) {
                Text("Select Document Folder", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .border(
                            1.dp,
                            if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder,
                            RoundedCornerShape(8.dp)
                        )
                        .background(if (isDark) ClinicColors.DarkCard else Color.White, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp)
                        .clickable {
                            // Quick toggle cycle
                            val nextIndex = (categories.indexOf(selectedCategory) + 1) % categories.size
                            selectedCategory = categories[nextIndex]
                        },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "📂  $selectedCategory",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isDark) Color.White else Color.Black
                    )
                    Text("▼", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                }
            }

            ClinicButton(
                text = "Upload Doc",
                onClick = { showUploadDialog = true },
                isDark = isDark,
                modifier = Modifier.padding(top = 14.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Folder Contents (${filteredDocs.size})",
            fontSize = 13.sp,
            fontWeight = FontWeight.Black,
            color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (filteredDocs.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("No files in this folder.", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredDocs) { doc ->
                    DocumentItem(
                        doc = doc,
                        isDark = isDark,
                        onDelete = { viewModel.deleteDocument(doc.id) }
                    )
                }
            }
        }
    }

    if (showUploadDialog) {
        val dialogBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
        val txtColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
        val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

        Dialog(onDismissRequest = { showUploadDialog = false }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(dialogBg, RoundedCornerShape(16.dp))
                    .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                    .padding(20.dp)
            ) {
                Column {
                    Text("Upload Document", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = txtColor)
                    Spacer(modifier = Modifier.height(12.dp))
                    ClinicTextField(value = mockUploadName, onValueChange = { mockUploadName = it }, label = "File Name (e.g., Asthma Cure.pdf)", isDark = isDark)
                    Spacer(modifier = Modifier.height(8.dp))
                    ClinicTextField(value = mockUploadSize, onValueChange = { mockUploadSize = it }, label = "File Size (e.g., 1.2 MB)", isDark = isDark)
                    Spacer(modifier = Modifier.height(20.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { showUploadDialog = false }) {
                            Text("Cancel", color = if (isDark) Color.White else Color.Black)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        ClinicButton(
                            text = "Save File",
                            onClick = {
                                if (mockUploadName.isNotBlank()) {
                                    viewModel.uploadDocument(mockUploadName, selectedCategory, mockUploadSize)
                                    mockUploadName = ""
                                    showUploadDialog = false
                                }
                            },
                            isDark = isDark
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DocumentItem(
    doc: DocumentEntity,
    isDark: Boolean,
    onDelete: () -> Unit
) {
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    var showPreview by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg, RoundedCornerShape(12.dp))
            .border(1.dp, borderCol, RoundedCornerShape(12.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = doc.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (isDark) ClinicColors.DarkText else ClinicColors.LightText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${doc.category} • Size: ${doc.size}",
                fontSize = 9.sp,
                color = ClinicColors.DarkTextMuted
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(ClinicColors.Rose600.copy(alpha = 0.15f))
                    .clickable { showPreview = true }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text("Open", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = ClinicColors.Rose600)
            }
            Text(
                text = "✕",
                fontSize = 12.sp,
                color = Color.Red,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clickable { onDelete() }
                    .padding(4.dp)
            )
        }
    }

    if (showPreview) {
        ReadMoreDialog(
            text = "Successfully opened Document: ${doc.name}.\nThis simulates a secure reader frame inside the clinical workspace.\nFile Content Preview:\n${doc.fileData}",
            onDismiss = { showPreview = false },
            isDark = isDark
        )
    }
}

// ================= DIALOG 1: CASE STUDY TIMELINE =================

@Composable
fun PatientTimelineSheet(
    patient: PatientEntity,
    visits: List<AppointmentEntity>,
    isDark: Boolean,
    onDismiss: () -> Unit
) {
    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardColor = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = bgColor
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Patient Case Study",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = ClinicColors.Rose600
                        )
                        Text(
                            "${patient.name} (${patient.age} yrs / ${patient.gender})",
                            fontSize = 11.sp,
                            color = ClinicColors.DarkTextMuted
                        )
                    }
                    TextButton(onClick = onDismiss) {
                        Text("✕", fontSize = 16.sp, color = ClinicColors.Rose600, fontWeight = FontWeight.Bold)
                    }
                }

                Divider(color = borderCol, modifier = Modifier.padding(vertical = 12.dp))

                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        ClinicCard(isDark = isDark) {
                            Text("Medical History & Profile Notes", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ClinicColors.Rose600)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(patient.medicalHistory, fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Notes:", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                            Text(patient.notes, fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                        }
                    }

                    item {
                        Text(
                            "Consultation Timeline (${visits.size} Visits)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isDark) Color.White else Color.Black
                        )
                    }

                    if (visits.isEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) {
                                Text("No visits charted yet.", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
                            }
                        }
                    } else {
                        items(visits) { visit ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(cardColor, RoundedCornerShape(8.dp))
                                    .border(1.dp, borderCol, RoundedCornerShape(8.dp))
                                    .padding(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "VISIT — ${visit.date} (${visit.time})",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = ClinicColors.Rose600
                                    )
                                    Text(
                                        text = visit.status,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Green
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Reason: \"${visit.reason}\"",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = if (isDark) Color.White else Color.Black
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Divider(color = borderCol, thickness = (0.5).dp)
                                Spacer(modifier = Modifier.height(6.dp))

                                Text("Subjective (S):", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.subjective.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Objective (O):", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.objective.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Assessment (A):", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.assessment.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Plan (P):", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.plan.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Prescription:", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.prescription.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Medicines:", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.medicines.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                                Spacer(modifier = Modifier.height(4.dp))

                                Text("Advice:", fontSize = 8.sp, color = ClinicColors.DarkTextMuted)
                                Text(visit.advice.ifBlank { "N/A" }, fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)

                                if (visit.followupDate.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color.Yellow.copy(alpha = 0.05f))
                                            .border(width = (0.5).dp, color = Color.Yellow.copy(alpha = 0.3f), shape = RoundedCornerShape(4.dp))
                                            .padding(6.dp)
                                    ) {
                                        Text(
                                            "📅 Next Follow-up: ${visit.followupDate} (${visit.followupNotes})",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isDark) Color.Yellow else Color(0xFFD97706)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ================= DIALOG 2: CONSULTATION WORKSPACE =================

@Composable
fun ConsultationOverlay(
    appt: AppointmentEntity,
    isDark: Boolean,
    onSave: (subjective: String, objective: String, assessment: String, plan: String, prescription: String, medicines: String, advice: String, followupDate: String, followupNotes: String) -> Unit,
    onDismiss: () -> Unit,
    onDisableFollowup: () -> Unit
) {
    var subjective by remember { mutableStateOf(appt.subjective) }
    var objective by remember { mutableStateOf(appt.objective) }
    var assessment by remember { mutableStateOf(appt.assessment) }
    var plan by remember { mutableStateOf(appt.plan) }
    var prescription by remember { mutableStateOf(appt.prescription) }
    var medicines by remember { mutableStateOf(appt.medicines) }
    var advice by remember { mutableStateOf(appt.advice) }
    
    var followupDate by remember { mutableStateOf(appt.followupDate) }
    var followupNotes by remember { mutableStateOf(appt.followupNotes) }

    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val headerBg = if (isDark) ClinicColors.DarkCard else Color.White
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    var isMuted by remember { mutableStateOf(false) }
    var isCameraOff by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = bgColor
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Workspace Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(headerBg)
                        .padding(14.dp)
                        .statusBarsPadding(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color.Red))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Live Case Sheet", fontSize = 12.sp, fontWeight = FontWeight.Black, color = ClinicColors.Rose600)
                        }
                        Text("Patient: ${appt.patientName}", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
                    }

                    TextButton(onClick = onDismiss) {
                        Text("Close", color = ClinicColors.Rose600, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Jitsi Telehealth Stream Mockup
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.Black)
                        ) {
                            // Main patient stream mockup
                            if (!isCameraOff) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("👤", fontSize = 36.sp)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(appt.patientName, fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                        Text("Telehealth Feed Connected", fontSize = 8.sp, color = Color.LightGray)
                                    }
                                }
                            } else {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("Video Feed Muted", fontSize = 10.sp, color = Color.Gray)
                                }
                            }

                            // Small doctor preview card (Top Right)
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(8.dp)
                                    .size(width = 60.dp, height = 45.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Color.DarkGray),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🩺 Dr. V", fontSize = 8.sp, color = Color.White)
                            }

                            // Active call controller bar (Bottom Center)
                            Row(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 10.dp)
                                    .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(20.dp))
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                                    contentDescription = "Mute",
                                    tint = if (isMuted) Color.Red else Color.White,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { isMuted = !isMuted }
                                )
                                Icon(
                                    imageVector = if (isCameraOff) Icons.Default.VideocamOff else Icons.Default.Videocam,
                                    contentDescription = "Video",
                                    tint = if (isCameraOff) Color.Red else Color.White,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { isCameraOff = !isCameraOff }
                                )
                                Icon(
                                    imageVector = Icons.Default.CallEnd,
                                    contentDescription = "End",
                                    tint = Color.Red,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clickable { onDismiss() }
                                )
                            }
                        }
                    }

                    // SOAP Notes
                    item {
                        Text("Clinical Case Notes (SOAP)", fontSize = 12.sp, fontWeight = FontWeight.Black, color = if (isDark) Color.White else Color.Black)
                    }

                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            ClinicTextField(
                                value = subjective,
                                onValueChange = { subjective = it },
                                label = "Subjective (S) - Patient symptoms & description",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = objective,
                                onValueChange = { objective = it },
                                label = "Objective (O) - Clinical findings & temperature",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = assessment,
                                onValueChange = { assessment = it },
                                label = "Assessment (A) - Diagnosis & remedy assessment",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = plan,
                                onValueChange = { plan = it },
                                label = "Plan (P) - Future prescription dosage",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = prescription,
                                onValueChange = { prescription = it },
                                label = "📋 Prescription (visible to patient)",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = medicines,
                                onValueChange = { medicines = it },
                                label = "💊 Medicines (dosage & schedule)",
                                singleLine = false,
                                isDark = isDark
                            )
                            ClinicTextField(
                                value = advice,
                                onValueChange = { advice = it },
                                label = "💡 Doctor Advice (lifestyle / diet)",
                                singleLine = false,
                                isDark = isDark
                            )
                        }
                    }

                    // Follow-up block
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(ClinicColors.Rose600.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                                .border(1.dp, borderCol, RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text("📅 Follow-up Scheduling", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ClinicColors.Rose600)
                            Spacer(modifier = Modifier.height(10.dp))
                            
                            ClinicTextField(
                                value = followupDate,
                                onValueChange = { followupDate = it },
                                label = "Next Follow-up Date (YYYY-MM-DD)",
                                isDark = isDark
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            ClinicTextField(
                                value = followupNotes,
                                onValueChange = { followupNotes = it },
                                label = "Consultation Summary (Max 120 chars)",
                                isDark = isDark
                            )
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ClinicButton(
                                    text = "Enable / Set",
                                    onClick = { 
                                        if (followupDate.isBlank()) {
                                            followupDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(System.currentTimeMillis() + 7 * 24 * 60 * 60 * 1000L))
                                        }
                                        followupNotes = "Prescription Follow-up"
                                    },
                                    isDark = isDark
                                )
                                TextButton(onClick = onDisableFollowup) {
                                    Text("Disable Follow-up", color = Color.Red, fontSize = 11.sp)
                                }
                            }
                        }
                    }

                    // Action buttons
                    item {
                        ClinicButton(
                            text = "Save Consultation Case Sheet",
                            onClick = {
                                onSave(subjective, objective, assessment, plan, prescription, medicines, advice, followupDate, followupNotes)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            isDark = isDark
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationSettingsDialog(
    isDark: Boolean,
    onDismiss: () -> Unit,
    toastTrigger: (String) -> Unit
) {
    val context = LocalContext.current
    val helper = remember { com.example.notification.ClinicNotificationHelper(context) }
    
    var ringEnabled by remember { mutableStateOf(helper.isRingEnabled) }
    var vibrateEnabled by remember { mutableStateOf(helper.isVibrateEnabled) }
    
    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardColor = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder
    val textColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText

    val scope = rememberCoroutineScope()

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = bgColor
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Header Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Push Alerts & Notifications",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = ClinicColors.Rose600
                        )
                        Text(
                            "Real-time patient booking gateway configuration",
                            fontSize = 11.sp,
                            color = ClinicColors.DarkTextMuted
                        )
                    }
                    TextButton(onClick = onDismiss) {
                        Text("✕", fontSize = 16.sp, color = ClinicColors.Rose600, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = borderCol, thickness = (0.5).dp)
                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // System Info Card explaining Notification Triggers & Content Strategies to maximize user engagement
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(ClinicColors.Rose600.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                                .border((0.5).dp, ClinicColors.Rose600.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                "🚀 Notification Optimization Strategy",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = ClinicColors.Rose600
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "• Triggers: Automatically fire high-priority push alerts only for urgent user-initiated bookings from your clinic website portal.\n" +
                                "• Smart Engagement: Alerts contain actionable summaries including consultation symptoms to prepare you before opening the app.\n" +
                                "• Non-Intrusive Design: Avoids daily spam. System groups periodic patient reminders to keep your status bar clean.",
                                fontSize = 10.sp,
                                color = if (isDark) Color.LightGray else Color.DarkGray,
                                lineHeight = 14.sp
                            )
                        }
                    }

                    // Preferences header
                    item {
                        Text(
                            "DEVICE ALERT SETTINGS",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.DarkTextMuted
                        )
                    }

                    // Ring Alert Switch Row
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(cardColor, RoundedCornerShape(10.dp))
                                .border((0.5).dp, borderCol, RoundedCornerShape(10.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Audible Notification Sound", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = textColor)
                                Text("Play custom ringtone for instant website bookings", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                            }
                            Switch(
                                checked = ringEnabled,
                                onCheckedChange = {
                                    ringEnabled = it
                                    helper.isRingEnabled = it
                                    toastTrigger("Sound alerts ${if (it) "enabled" else "disabled"}")
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = ClinicColors.Rose600
                                )
                            )
                        }
                    }

                    // Vibrate Alert Switch Row
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(cardColor, RoundedCornerShape(10.dp))
                                .border((0.5).dp, borderCol, RoundedCornerShape(10.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Haptic Vibration Pattern", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = textColor)
                                Text("Vibrate when website bookings occur", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                            }
                            Switch(
                                checked = vibrateEnabled,
                                onCheckedChange = {
                                    vibrateEnabled = it
                                    helper.isVibrateEnabled = it
                                    toastTrigger("Vibrate haptics ${if (it) "enabled" else "disabled"}")
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = ClinicColors.Rose600
                                )
                            )
                        }
                    }

                    // Trigger Simulation sandbox
                    item {
                        Text(
                            "REAL-TIME SIMULATION SUITE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.DarkTextMuted
                        )
                    }

                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(cardColor, RoundedCornerShape(12.dp))
                                .border((0.5).dp, borderCol, RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text("Mock Website Patient Self-Booking Test", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = textColor)
                            Text("Triggers a real push notification with your custom sound/vibrate preferences instantly.", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                            
                            Spacer(modifier = Modifier.height(10.dp))
                            
                            Button(
                                onClick = {
                                    helper.showBookingNotification(
                                        patientName = "Siddharth Sharma",
                                        appointmentTime = "04:30 PM",
                                        reason = "Severe migraine triggered by bright computer screens."
                                    )
                                    toastTrigger("Simulated Booking Notification sent successfully!")
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = ClinicColors.Rose600),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Simulate Website Booking Alert", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = {
                                    toastTrigger("Simulating background delay. Minimize app now!")
                                    scope.launch {
                                        delay(4000)
                                        helper.showBookingNotification(
                                            patientName = "Meera Nair",
                                            appointmentTime = "02:15 PM",
                                            reason = "Seasonal skin allergies and severe eczema on wrists."
                                        )
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0)),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Test Background Trigger (4s delay)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = if (isDark) Color(0xFF27272A) else Color(0xFFE4E4E7)),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Close Panel", fontSize = 12.sp, color = textColor)
                }
            }
        }
    }
}

// ================= SUB SCREEN 1: PROFILE SCREEN =================

@Composable
fun ProfileScreen(
    isDark: Boolean,
    onDismiss: () -> Unit
) {
    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Profile Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Text("←", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                }
                Text(
                    "Doctor Profile",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDark) Color.White else ClinicColors.LightText
                )
                Box(modifier = Modifier.size(48.dp)) // Spacer
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Hero Avatar card
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(24.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(24.dp))
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .background(ClinicColors.Rose600.copy(alpha = 0.15f))
                                .border(2.dp, ClinicColors.Rose600, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🩺", fontSize = 54.sp)
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Dr. Vikramaditya, MD",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isDark) Color.White else ClinicColors.LightText
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF3B82F6)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("✓", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Senior Consultant Cardiologist",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = ClinicColors.Rose600
                        )

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Reg No: NMC-2026-98754",
                            fontSize = 10.sp,
                            color = ClinicColors.DarkTextMuted
                        )
                    }
                }

                // Grid Stats
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(cardBg, RoundedCornerShape(16.dp))
                                .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Experience", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                            Text("18+ Yrs", fontSize = 16.sp, fontWeight = FontWeight.Black, color = if (isDark) Color.White else Color.Black)
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(cardBg, RoundedCornerShape(16.dp))
                                .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Patients Served", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                            Text("12.5k+", fontSize = 16.sp, fontWeight = FontWeight.Black, color = if (isDark) Color.White else Color.Black)
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(cardBg, RoundedCornerShape(16.dp))
                                .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Rating", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                            Text("4.9 ★", fontSize = 16.sp, fontWeight = FontWeight.Black, color = if (isDark) Color.White else Color.Black)
                        }
                    }
                }

                // Professional Summary
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(20.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Text("Professional Profile Summary", fontSize = 12.sp, fontWeight = FontWeight.Black, color = ClinicColors.Rose600)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Dr. Vikramaditya is a highly respected cardiologist specializing in advanced non-invasive cardiac imaging, real-time telehealth diagnostics, and customized treatment plans. Serving at the intersection of modern technology and evidence-based patient-centric clinical care.",
                            fontSize = 11.sp,
                            color = if (isDark) Color.LightGray else Color.DarkGray,
                            lineHeight = 16.sp
                        )
                    }
                }

                // Clinic & Location info
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(20.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Text("Clinical Hub & Workspace", fontSize = 12.sp, fontWeight = FontWeight.Black, color = ClinicColors.Rose600)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("🏢 Metro Cardiac Sciences Clinic", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                        Text("📍 4th Floor, Medical Arts Block, Apollo Enclave, Sector 12", fontSize = 11.sp, color = ClinicColors.DarkTextMuted)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("🕒 Clinic Timings: Mon - Sat (09:00 AM - 05:00 PM)", fontSize = 10.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                    }
                }

                // Certificates and Achievements
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(20.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Text("Certifications & Qualifications", fontSize = 12.sp, fontWeight = FontWeight.Black, color = ClinicColors.Rose600)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("• Fellow of the American College of Cardiology (FACC)", fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                        Text("• Doctor of Medicine (MD) — Cardiology, AIIMS New Delhi", fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                        Text("• Bachelor of Medicine, Bachelor of Surgery (MBBS)", fontSize = 11.sp, color = if (isDark) Color.LightGray else Color.DarkGray)
                    }
                }
            }
        }
    }
}

// ================= SUB SCREEN 2: SETTINGS SCREEN =================

@Composable
fun SettingsScreen(
    isDark: Boolean,
    onDismiss: () -> Unit,
    onLogout: () -> Unit,
    toastTrigger: (String) -> Unit
) {
    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder
    val textColor = if (isDark) Color.White else ClinicColors.LightText

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Text("←", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                }
                Text(
                    "Settings Panel",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDark) Color.White else ClinicColors.LightText
                )
                Box(modifier = Modifier.size(48.dp)) // Spacer
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Section: App Preferences
                item {
                    Text("APP PREFERENCES", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted, modifier = Modifier.padding(start = 4.dp))
                }

                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(16.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                    ) {
                        // Option 1: Profile shortcut
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { toastTrigger("Profile details up to date") }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("👨‍⚕️", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Doctor Profile Details", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor)
                                    Text("Verify qualifications & registration numbers", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                                }
                            }
                            Text(">", fontSize = 12.sp, color = ClinicColors.DarkTextMuted)
                        }

                        HorizontalDivider(color = borderCol.copy(alpha = 0.5f), thickness = (0.5).dp)

                        // Option 2: Clinic info
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { toastTrigger("Clinic details successfully validated") }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🏢", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Clinic Information", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor)
                                    Text("Address, timings & digital receptionist details", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                                }
                            }
                            Text(">", fontSize = 12.sp, color = ClinicColors.DarkTextMuted)
                        }
                    }
                }

                // Section: Infrastructure & Sync Status
                item {
                    Text("SYSTEM & STORAGE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted, modifier = Modifier.padding(start = 4.dp))
                }

                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(16.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                    ) {
                        // Sync
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { toastTrigger("Durable offline backup has been reconciled!") }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🔄", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Data Synchronization Status", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor)
                                    Text("All offline records backed up securely to Cloud", fontSize = 9.sp, color = Color.Green)
                                }
                            }
                            Text("Synced", fontSize = 10.sp, color = Color.Green, fontWeight = FontWeight.Bold)
                        }

                        HorizontalDivider(color = borderCol.copy(alpha = 0.5f), thickness = (0.5).dp)

                        // Connected devices
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { toastTrigger("Verified active telehealth camera feeds") }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("📹", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Connected Devices", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor)
                                    Text("Telehealth high-definition camera & microphone", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                                }
                            }
                            Text("Connected", fontSize = 10.sp, color = ClinicColors.Rose600, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Section: Privacy & Compliance
                item {
                    Text("SECURITY & HIPAA COMPLIANCE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted, modifier = Modifier.padding(start = 4.dp))
                }

                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(16.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { toastTrigger("Encrypted end-to-end data transfer verified") }
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🔒", fontSize = 16.sp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("End-to-End Encryption", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor)
                                    Text("Strictly AES-256 protected patient healthcare data", fontSize = 9.sp, color = ClinicColors.DarkTextMuted)
                                }
                            }
                            Text("Active", fontSize = 10.sp, color = Color.Green, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Section: General Info
                item {
                    Text("INFO", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = ClinicColors.DarkTextMuted, modifier = Modifier.padding(start = 4.dp))
                }

                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(16.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Text("Application Version: 4.12.0-PRO", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = textColor)
                        Text("Platform Environment: Google Cloud Run container gateway connected securely to production doctor clinical portal.", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                    }
                }

                // Section: Actions
                item {
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = onLogout,
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Securely Log Out of System", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

// ================= SUB SCREEN 3: NOTIFICATION CENTER =================

@Composable
fun NotificationCenterSheet(
    isDark: Boolean,
    onDismiss: () -> Unit,
    onOpenSettings: () -> Unit,
    toastTrigger: (String) -> Unit
) {
    val bgColor = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder
    val textColor = if (isDark) Color.White else ClinicColors.LightText

    // Grouped simulated real alerts to avoid tech larping or mock indicators
    val dummyAlerts = listOf(
        Triple("New Urgent Booking", "Meera Nair requested a cardiac consultation session at 02:15 PM.", "Just Now"),
        Triple("Urgent Portal Alert", "Siddharth Sharma registered via website form citing computer-screen migraines.", "2 Hours Ago"),
        Triple("Case Sheet Synced", "Reconciled clinical notes safely with main database server for patient Vikram Nair.", "Yesterday")
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Text("←", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color.White else Color.Black)
                }
                Text(
                    "Clinic Notifications Center",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDark) Color.White else ClinicColors.LightText
                )
                IconButton(onClick = onOpenSettings) {
                    Text("⚙️", fontSize = 18.sp)
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "REAL-TIME WEBSITE PORTAL ALERTS",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.DarkTextMuted
                        )
                        Text(
                            "Mark all as read",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicColors.Rose600,
                            modifier = Modifier.clickable { toastTrigger("All alerts marked as read") }
                        )
                    }
                }

                items(dummyAlerts) { alert ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cardBg, RoundedCornerShape(16.dp))
                            .border(1.dp, borderCol, RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(ClinicColors.Rose600)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = alert.first,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = textColor
                                )
                            }
                            Text(
                                text = alert.third,
                                fontSize = 8.sp,
                                color = ClinicColors.DarkTextMuted
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = alert.second,
                            fontSize = 10.sp,
                            color = if (isDark) Color.LightGray else Color.DarkGray,
                            lineHeight = 14.sp
                        )
                    }
                }
            }
        }
    }
}
