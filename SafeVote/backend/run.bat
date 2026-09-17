@echo off
echo ====================================================
echo  Starting SafeVote Django Backend on Port 8081...
echo ====================================================
cd /d "%~dp0"
call venv\Scripts\activate.bat
python manage.py runserver 8081
pause
