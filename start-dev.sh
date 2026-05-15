#!/bin/bash
# Script de démarrage local pour Essenti'elle Santé

echo "========================================="
echo "Essenti'elle Santé - Démarrage Local"
echo "========================================="
echo ""

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo ""
fi

# Afficher les informations
echo "✅ Configuration:"
echo "   - Port: 3000"
echo "   - URL: http://localhost:3000"
echo "   - Mode: Développement avec SSR"
echo ""
echo "📋 Comptes de test disponibles:"
echo "   - Admin: admin@lessentielle-sante.site / password123"
echo "   - Instructeur: instructor@lessentielle-sante.site / password123"
echo "   - Étudiant: student@lessentielle-sante.site / password123"
echo ""
echo "🚀 Démarrage du serveur..."
echo "   Appuyez sur Ctrl+C pour arrêter"
echo ""

# Démarrer le serveur
npm run dev
