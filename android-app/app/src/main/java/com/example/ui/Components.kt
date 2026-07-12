package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.draw.clip
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

// Custom visual palette to match High Density design theme
object ClinicColors {
    // High Density Blue Palette mapped to original keys for seamless compilation and backwards-compatibility
    val Rose600 = Color(0xFF3B82F6) // Sleek Premium Electric Blue
    val Rose950 = Color(0xFF1E3A8A) // High Density Blue-950
    val Rose900 = Color(0xFF2563EB) // Dynamic Royal Blue
    val Rose50 = Color(0xFFEFF6FF)  // High Density Blue-50
    
    // Dark Palette (2026 Premium Cosmic Glassmorphic Theme)
    val DarkBg = Color(0xFF080C14)       // Deep, obsidian-black cosmic space
    val DarkCard = Color(0xFF0F1626)     // High-end glassmorphic dark slate
    val DarkBorder = Color(0xFF1E2E4A)   // Luminescent subtle electric-tinted gray border
    val DarkText = Color(0xFFF9FAFB)     // Pristine white-gray
    val DarkTextMuted = Color(0xFF94A3B8) // Balanced slate-muted text
    
    // Light Palette (2026 Premium Crisp Slate Theme)
    val LightBg = Color(0xFFF8FAFC)      // Ultra-clean Slate-50 background
    val LightCard = Color(0xFFFFFFFF)    // Pure white porcelain card
    val LightBorder = Color(0xFFE2E8F0)  // Slate-200 premium border
    val LightText = Color(0xFF0F172A)    // Elegant slate-900 text
    val LightTextMuted = Color(0xFF64748B) // Slate-500 neutral text
}

@Composable
fun ClinicCard(
    isDark: Boolean,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val bgColor = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderColor = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    var baseModifier = modifier
        .fillMaxWidth()
        .background(bgColor, RoundedCornerShape(16.dp))
        .border(1.dp, borderColor, RoundedCornerShape(16.dp))
        .padding(16.dp)

    if (onClick != null) {
        baseModifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .background(bgColor, RoundedCornerShape(16.dp))
            .border(1.dp, ClinicColors.Rose600.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            .padding(16.dp)
    }

    Column(modifier = baseModifier) {
        content()
    }
}

@Composable
fun GlassCard(
    isDark: Boolean,
    modifier: Modifier = Modifier,
    borderColor: Color? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val bgColor = if (isDark) {
        Color(0xFF0F1626).copy(alpha = 0.85f)
    } else {
        Color(0xFFFFFFFF).copy(alpha = 0.9f)
    }
    val defaultBorderColor = if (isDark) {
        Color(0xFF1E2E4A).copy(alpha = 0.8f)
    } else {
        Color(0xFFE2E8F0)
    }
    val borderCol = borderColor ?: defaultBorderColor

    val cardShape = RoundedCornerShape(20.dp) // Premium rounded corners

    var cardModifier = modifier
        .fillMaxWidth()
        .clip(cardShape)
        .background(bgColor)
        .border(1.dp, borderCol, cardShape)

    if (onClick != null) {
        cardModifier = cardModifier.clickable { onClick() }
    }

    Column(
        modifier = cardModifier.padding(16.dp)
    ) {
        content()
    }
}

@Composable
fun Sparkline(
    points: List<Float>,
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        if (points.isEmpty()) return@Canvas
        val width = size.width
        val height = size.height
        val maxVal = points.maxOrNull() ?: 1f
        val minVal = points.minOrNull() ?: 0f
        val range = if (maxVal == minVal) 1f else maxVal - minVal

        val path = Path()
        val fillPath = Path()

        val pointsToDraw = points.mapIndexed { idx, value ->
            val x = idx * (width / (points.size - 1))
            val y = height - ((value - minVal) / range) * (height * 0.7f) - (height * 0.15f)
            Pair(x, y)
        }

        path.moveTo(pointsToDraw[0].first, pointsToDraw[0].second)
        fillPath.moveTo(pointsToDraw[0].first, height)
        fillPath.lineTo(pointsToDraw[0].first, pointsToDraw[0].second)

        for (i in 1 until pointsToDraw.size) {
            val prev = pointsToDraw[i - 1]
            val current = pointsToDraw[i]
            val controlX1 = prev.first + (current.first - prev.first) / 2
            val controlY1 = prev.second
            val controlX2 = prev.first + (current.first - prev.first) / 2
            val controlY2 = current.second

            path.cubicTo(controlX1, controlY1, controlX2, controlY2, current.first, current.second)
            fillPath.cubicTo(controlX1, controlY1, controlX2, controlY2, current.first, current.second)
        }

        fillPath.lineTo(pointsToDraw.last().first, height)
        fillPath.close()

        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                colors = listOf(color.copy(alpha = 0.25f), Color.Transparent),
                startY = 0f,
                endY = height
            )
        )

        drawPath(
            path = path,
            color = color,
            style = Stroke(width = 2.dp.toPx())
        )
    }
}

@Composable
fun MetricCard(
    isDark: Boolean,
    title: String,
    value: String,
    icon: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val subtitleText = when (title) {
        "Patients" -> "All registered patients"
        "Today's Appts" -> "Scheduled for today"
        "Follow-ups" -> "Pending follow-ups"
        "Completed" -> "Appointments done"
        else -> "Statistics"
    }

    val trendText = when (title) {
        "Patients" -> "+12% ↗"
        "Today's Appts" -> "+8% ↗"
        "Follow-ups" -> "+5% ↗"
        "Completed" -> "+15% ↗"
        else -> "+10% ↗"
    }

    val themeColor = when (title) {
        "Patients" -> Color(0xFF3B82F6) // Sleek Premium Electric Blue
        "Today's Appts" -> Color(0xFF0D9488) // Cyan / Teal
        "Follow-ups" -> Color(0xFFD97706) // Orange / Amber
        "Completed" -> Color(0xFFDB2777) // Pink / Magenta
        else -> ClinicColors.Rose600
    }

    val sparklinePoints = when (title) {
        "Patients" -> listOf(10f, 15f, 12f, 18f, 24f, 20f, 28f)
        "Today's Appts" -> listOf(5f, 8f, 4f, 10f, 7f, 12f, 9f)
        "Follow-ups" -> listOf(2f, 4f, 3f, 6f, 5f, 8f, 6f)
        "Completed" -> listOf(3f, 6f, 5f, 10f, 8f, 14f, 11f)
        else -> listOf(5f, 7f, 6f, 8f, 7f, 9f, 8f)
    }

    val titleColor = if (isDark) ClinicColors.DarkTextMuted else ClinicColors.LightTextMuted
    val valueColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText

    GlassCard(isDark = isDark, modifier = modifier, onClick = onClick, borderColor = themeColor.copy(alpha = 0.25f)) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(themeColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = icon, fontSize = 18.sp)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = title,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = titleColor
                        )
                        Text(
                            text = value,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = valueColor
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = subtitleText,
                    fontSize = 9.sp,
                    color = titleColor
                )
                Text(
                    text = trendText,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = themeColor
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Sparkline(
                points = sparklinePoints,
                color = themeColor,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(28.dp)
            )
        }
    }
}

@Composable
fun ClinicButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isSecondary: Boolean = false,
    isDark: Boolean = true
) {
    val containerColor = if (isSecondary) {
        if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)
    } else {
        ClinicColors.Rose600
    }
    val contentColor = if (isSecondary) {
        if (isDark) Color.White else Color.Black
    } else {
        Color.White
    }

    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor
        ),
        shape = RoundedCornerShape(10.dp),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
        modifier = modifier
    ) {
        Text(text = text, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.2.sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClinicTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    isDark: Boolean = true
) {
    val textColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
    val fieldBg = if (isDark) ClinicColors.DarkCard else Color.White
    val borderColor = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, fontSize = 11.sp, color = ClinicColors.DarkTextMuted) },
        textStyle = LocalTextStyle.current.copy(color = textColor, fontSize = 12.sp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = fieldBg,
            unfocusedContainerColor = fieldBg,
            focusedBorderColor = ClinicColors.Rose600,
            unfocusedBorderColor = borderColor,
            cursorColor = ClinicColors.Rose600
        ),
        singleLine = singleLine,
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = ImeAction.Next
        ),
        shape = RoundedCornerShape(8.dp),
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun ReadMoreDialog(
    text: String,
    onDismiss: () -> Unit,
    isDark: Boolean
) {
    val bgColor = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val textColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
    val borderColor = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor, RoundedCornerShape(16.dp))
                .border(1.dp, borderColor, RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column {
                Text(
                    text = "Full Consultation Notes",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
                Spacer(modifier = Modifier.height(1.dp))
                Divider(color = borderColor, modifier = Modifier.padding(vertical = 10.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = text,
                    fontSize = 12.sp,
                    color = if (isDark) Color.LightGray else Color.DarkGray,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    ClinicButton(
                        text = "Close",
                        onClick = onDismiss,
                        isSecondary = true,
                        isDark = isDark
                    )
                }
            }
        }
    }
}

@Composable
fun AddPatientDialog(
    onDismiss: () -> Unit,
    onSave: (name: String, phone: String, age: Int, gender: String, address: String, history: String, notes: String) -> Unit,
    isDark: Boolean
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf("Female") }
    var address by remember { mutableStateOf("") }
    var history by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    val bgColor = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val textColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText
    val borderColor = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor, RoundedCornerShape(16.dp))
                .border(1.dp, borderColor, RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(androidx.compose.foundation.rememberScrollState())
            ) {
                Text(
                    text = "Register New Patient",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = textColor
                )
                Divider(color = borderColor, modifier = Modifier.padding(vertical = 12.dp))

                ClinicTextField(value = name, onValueChange = { name = it }, label = "Patient Name", isDark = isDark)
                Spacer(modifier = Modifier.height(8.dp))
                ClinicTextField(value = phone, onValueChange = { phone = it }, label = "Phone Number", keyboardType = KeyboardType.Phone, isDark = isDark)
                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ClinicTextField(
                        value = age,
                        onValueChange = { age = it },
                        label = "Age",
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f),
                        isDark = isDark
                    )
                    
                    // Small mock gender selection
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Gender", fontSize = 10.sp, color = ClinicColors.DarkTextMuted)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                                .background(if (isDark) ClinicColors.DarkCard else Color.White, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            listOf("Female", "Male", "Other").forEach { g ->
                                Text(
                                    text = g.take(1),
                                    fontSize = 10.sp,
                                    fontWeight = if (gender == g) FontWeight.Bold else FontWeight.Normal,
                                    color = if (gender == g) ClinicColors.Rose600 else ClinicColors.DarkTextMuted,
                                    modifier = Modifier
                                        .clickable { gender = g }
                                        .padding(4.dp)
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                ClinicTextField(value = address, onValueChange = { address = it }, label = "Address", singleLine = false, isDark = isDark)
                Spacer(modifier = Modifier.height(8.dp))
                ClinicTextField(value = history, onValueChange = { history = it }, label = "Medical History", singleLine = false, isDark = isDark)
                Spacer(modifier = Modifier.height(8.dp))
                ClinicTextField(value = notes, onValueChange = { notes = it }, label = "Notes", singleLine = false, isDark = isDark)

                Spacer(modifier = Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = if (isDark) Color.White else Color.Black, fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    ClinicButton(
                        text = "Save Patient",
                        onClick = {
                            if (name.isNotBlank() && phone.isNotBlank()) {
                                onSave(name, phone, age.toIntOrNull() ?: 30, gender, address, history, notes)
                            }
                        },
                        isDark = isDark
                    )
                }
            }
        }
    }
}
