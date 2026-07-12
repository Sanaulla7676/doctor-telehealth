package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.network.LoginRequest
import com.example.network.RetrofitClient
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    isDark: Boolean,
    onLoginSuccess: (String, String, String) -> Unit
) {
    var email by remember { mutableStateOf("drvarshabandi@gmail.com") }
    var password by remember { mutableStateOf("drvarsha@07") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val scope = rememberCoroutineScope()

    val bgCol = if (isDark) ClinicColors.DarkBg else ClinicColors.LightBg
    val cardBg = if (isDark) ClinicColors.DarkCard else ClinicColors.LightCard
    val borderCol = if (isDark) ClinicColors.DarkBorder else ClinicColors.LightBorder
    val textColor = if (isDark) ClinicColors.DarkText else ClinicColors.LightText

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgCol)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(cardBg)
                .border(0.5.dp, borderCol, RoundedCornerShape(24.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Text(
                text = "⚕️",
                fontSize = 40.sp,
                textAlign = TextAlign.Center
            )
            
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "HOMEOPATHWAY",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.SansSerif,
                    color = ClinicColors.Rose600,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "EMR Clinical Dashboard Mobile Portal",
                    fontSize = 11.sp,
                    color = ClinicColors.DarkTextMuted,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (errorMessage != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF2D161A))
                        .border(1.dp, Color(0xFFE11D48), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = errorMessage ?: "",
                        color = Color(0xFFFDA4AF),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Input: Email
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; errorMessage = null },
                label = { Text("Doctor Email", fontSize = 12.sp) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ClinicColors.Rose600,
                    unfocusedBorderColor = borderCol,
                    focusedLabelColor = ClinicColors.Rose600,
                    unfocusedLabelColor = Color.Gray,
                    unfocusedContainerColor = Color.Transparent,
                    focusedContainerColor = Color.Transparent
                ),
                modifier = Modifier.fillMaxWidth()
            )

            // Input: Password
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMessage = null },
                label = { Text("Password", fontSize = 12.sp) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ClinicColors.Rose600,
                    unfocusedBorderColor = borderCol,
                    focusedLabelColor = ClinicColors.Rose600,
                    unfocusedLabelColor = Color.Gray,
                    unfocusedContainerColor = Color.Transparent,
                    focusedContainerColor = Color.Transparent
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Submit Button
            Button(
                onClick = {
                    if (email.isBlank() || password.isBlank()) {
                        errorMessage = "Please enter authorize credentials."
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        try {
                            val response = RetrofitClient.apiService.login(LoginRequest(email, password))
                            if (response.isSuccessful && response.body()?.success == true) {
                                val body = response.body()!!
                                onLoginSuccess(email, body.token ?: "", body.doctorName ?: "Dr. Varsha Bandi")
                            } else {
                                errorMessage = response.body()?.error ?: "Invalid credentials."
                            }
                        } catch (e: Exception) {
                            errorMessage = "Network communication failure. Please verify server is live."
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = ClinicColors.Rose600,
                    contentColor = Color.White,
                    disabledContainerColor = ClinicColors.Rose600.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Access EMR Workspace 🔑", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }

            Text(
                text = "Authorized Medical Staff Only.",
                fontSize = 10.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}
