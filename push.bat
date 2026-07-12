@echo off
echo ===================================================
echo Pushing local React updates and animations to GitHub...
echo ===================================================
git push origin main
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Successfully pushed to GitHub! Vercel will now auto-deploy.
) else (
    echo.
    echo [ERROR] Push failed. If you have a VPN active, try turning it off and running this again.
)
echo.
pause
