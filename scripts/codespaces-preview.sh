#!/bin/bash
# Script pour démarrer un serveur de développement accessible depuis iPad
# dans GitHub Codespaces

PORT=8080

echo "=========================================="
echo "Serveur de prévisualisation Norya"
echo "=========================================="
echo ""

# Vérifier que python3 est disponible
if ! command -v python3 &> /dev/null; then
    echo "❌ Erreur : python3 n'est pas installé"
    exit 1
fi

# Vérifier que le dossier references-privees existe
if [ ! -d "/workspaces/Norya/references-privees" ]; then
    echo "❌ Erreur : /workspaces/Norya/references-privees n'existe pas"
    exit 1
fi

# Démarrer le serveur en arrière-plan
echo "🚀 Démarrage du serveur sur le port $PORT..."
python3 /workspaces/Norya/scripts/dev-server.py --port $PORT --host 0.0.0.0 &
SERVER_PID=$!

# Attendre que le serveur soit prêt
sleep 2

# Vérifier que le serveur écoute
if ! nc -z 127.0.0.1 $PORT 2>/dev/null; then
    echo "❌ Erreur : Le serveur n'a pas démarré correctement"
    kill $SERVER_PID
    exit 1
fi

echo "✅ Serveur démarré avec succès !"
echo ""
echo "=========================================="
echo "Accès depuis iPad :"
echo "=========================================="
echo ""

# Obtenir l'URL Codespaces
CODESPACE_NAME=$(echo $CODESPACES | jq -r '.name' 2>/dev/null || echo "votre-codespace")
echo "1. Dans Codespaces, cliquez sur l'onglet 'Ports'"
echo "2. Trouvez le port $PORT dans la liste"
echo "3. Cliquez sur le lien pour l'ouvrir dans un navigateur"
echo ""
echo "   Ou allez directement sur :"
echo "   https://$CODESPACE_NAME-$PORT.githubpreview.dev"
echo ""
echo "4. Téléchargez le fichier :"
echo "   norya-private-course-v2.json"
echo ""
echo "5. Dans Norya (sur iPad) :"
echo "   - Allez dans Kumar → Chapitre 8"
echo "   - Sélectionnez mode 'COURS SOURCE'"
echo "   - Cliquez sur 'Importer le cours privé'"
echo "   - Sélectionnez le fichier téléchargé"
echo ""
echo "=========================================="
echo "Pour arrêter le serveur : Ctrl+C"
echo "=========================================="
echo ""

# Attendre les connexions
wait $SERVER_PID
