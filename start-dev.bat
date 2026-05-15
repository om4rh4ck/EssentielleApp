@echo off
REM Script de démarrage local pour Essenti'elle Santé (Windows)

echo.
echo =========================================
echo Essenti'elle Santé - Démarrage Local
echo =========================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    call npm install
    echo.
)

REM Afficher les informations
echo ✅ Configuration:
echo    - Port: 3000
echo    - URL: http://localhost:3000
echo    - Mode: Développement avec SSR
echo.
echo 📋 Comptes de test disponibles:
echo    - Admin: admin@lessentielle-sante.site / password123
echo    - Instructeur: instructor@lessentielle-sante.site / password123
echo    - Étudiant: student@lessentielle-sante.site / password123
echo.
echo 🚀 Démarrage du serveur...
echo    Appuyez sur Ctrl+C pour arrêter
echo.

REM Démarrer le serveur
call npm run dev

pause
