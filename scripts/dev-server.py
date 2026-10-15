#!/usr/bin/env python3
"""
Serveur de développement local pour Norya.

Sert les fichiers privés du dossier references-privees/ via une URL accessible
depuis un navigateur mobile (iPad) connecté à Codespaces.

Utilisation :
    python3 scripts/dev-server.py [--port PORT] [--host HOST]

Accès depuis iPad :
    1. Dans Codespaces, exécuter : python3 scripts/dev-server.py
    2. Cliquer sur "Ports" dans la barre latérale Codespaces
    3. Trouver le port affiché (par défaut 8080)
    4. Sur iPad, ouvrir Safari et aller sur :
       https://<votre-codespace>-8080.githubpreview.dev/private/kum-08/norya-private-course-v2.json
       (ou le port affiché dans la console)

Le serveur :
- Ne sert QUE les fichiers de references-privees/
- Vérifie que les requêtes restent dans ce dossier
- Ajoute des en-têtes CORS pour permettre le téléchargement depuis mobile
- Affiche une page d'accueil simple avec les liens directs
"""

import argparse
import json
import os
import sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

# Configuration
PRIVATE_ROOT = Path('/workspaces/Norya/references-privees')
ALLOWED_PATH = PRIVATE_ROOT.resolve()
PORT = 8080
HOST = '0.0.0.0'  # Accessible depuis Codespaces


def is_safe_path(requested_path: Path) -> bool:
    """Vérifie que le chemin est bien dans references-privees/"""
    try:
        resolved = requested_path.resolve()
        return resolved.is_relative_to(ALLOWED_PATH)
    except (ValueError, RuntimeError):
        return False


class DevHandler(SimpleHTTPRequestHandler):
    """Gère les requêtes HTTP pour le serveur de développement."""
    
    def __init__(self, *args, directory=None, **kwargs):
        # Forcer le répertoire à references-privees
        if directory is None:
            directory = str(ALLOWED_PATH)
        super().__init__(*args, directory=directory, **kwargs)
    
    def do_GET(self):
        """Gère les requêtes GET."""
        # Nettoyer et décoder le chemin
        path = unquote(self.path)
        
        # Gérer la racine
        if path == '/' or path == '':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(generate_index_html().encode('utf-8'))
            return
        
        # Bloquer l'accès à tout ce qui n'est pas dans references-privees
        if not path.startswith('/'):
            self.send_error(403, 'Accès refusé')
            return
        
        # Remplacer les préfixes /private/ par / pour simplifier
        clean_path = path.lstrip('/')
        if clean_path.startswith('private/'):
            clean_path = clean_path[8:]  # Supprimer private/
        
        # Construire le chemin complet
        full_path = (ALLOWED_PATH / clean_path).resolve()
        
        # Vérification de sécurité : le chemin doit être dans ALLOWED_PATH
        if not full_path.is_relative_to(ALLOWED_PATH):
            self.send_error(403, 'Accès refusé : chemin en dehors de references-privees/')
            return
        
        # Vérifier que le fichier existe
        if not full_path.exists():
            self.send_error(404, f'Fichier non trouvé : {path}')
            return
        
        # Vérifier que c'est un fichier (pas un dossier)
        if not full_path.is_file():
            self.send_error(403, f'Accès refusé : {path} est un dossier')
            return
        
        # Déterminer le type MIME
        content_type = self.guess_type(str(full_path))
        if not content_type:
            if full_path.suffix == '.json':
                content_type = 'application/json; charset=utf-8'
            elif full_path.suffix == '.png':
                content_type = 'image/png'
            elif full_path.suffix == '.pdf':
                content_type = 'application/pdf'
            else:
                content_type = 'application/octet-stream'
        
        # Ajouter les en-têtes CORS pour permettre le téléchargement depuis mobile
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(full_path.stat().st_size))
        self.send_header('Content-Disposition', f'attachment; filename="{full_path.name}"')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # Envoyer le fichier
        with open(full_path, 'rb') as f:
            self.wfile.write(f.read())
    
    def do_OPTIONS(self):
        """Gère les requêtes OPTIONS pour CORS."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Réduire les logs pour éviter le spam."""
        sys.stderr.write(f"[{self.command}] {format % args}\n")


def generate_index_html():
    """Génère une page HTML d'index avec les liens directs."""
    # Trouver tous les fichiers JSON dans references-privees
    json_files = []
    for root, dirs, files in os.walk(ALLOWED_PATH):
        for file in files:
            if file.endswith('.json') and 'norya-private-course' in file:
                rel_path = os.path.relpath(os.path.join(root, file), ALLOWED_PATH)
                json_files.append({
                    'name': file,
                    'path': f'/private/{rel_path.replace(os.sep, "/")}',
                    'size': os.path.getsize(os.path.join(root, file))
                })
    
    # Générer le HTML
    links = []
    for file in sorted(json_files, key=lambda x: x['size'], reverse=True):
        size_mb = file['size'] / (1024 * 1024)
        links.append(
            f'<li><a href="{file["path"]}" download="{file["name"]}">'
            f'{file["name"]}</a> ({size_mb:.1f} Mo)</li>'
        )
    
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Norya - Téléchargement des cours privés</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               max-width: 800px; margin: 40px auto; padding: 20px; 
               background: #f5f5f5; color: #333; }}
        h1 {{ color: #2c3e50; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        ul {{ list-style: none; padding: 0; }}
        li {{ background: white; margin: 10px 0; padding: 15px; border-radius: 8px; 
             box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        a {{ color: #27ae60; text-decoration: none; font-weight: 500; }}
        a:hover {{ text-decoration: underline; }}
        .info {{ background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; 
                 border-left: 4px solid #ffc107; }}
        .success {{ background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;
                    border-left: 4px solid #28a745; }}
        code {{ background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-family: monospace; }}
    </style>
</head>
<body>
    <h1>⬇️ Téléchargement des cours privés Norya</h1>
    
    <div class="success">
        <strong>✓ Serveur de développement actif</strong><br>
        Ce serveur permet de télécharger les fichiers JSON privés depuis votre iPad.
    </div>
    
    <h2>📁 Fichiers disponibles</h2>
    <p>Cliquez sur un fichier pour le télécharger directement sur votre appareil :</p>
    <ul>
        {''.join(links)}
    </ul>
    
    <div class="info">
        <strong>ℹ️ Instructions pour iPad :</strong><br>
        1. Cliquez sur le lien du fichier ci-dessus<br>
        2. Safari va télécharger le fichier<br>
        3. Dans Norya → Kumar → Chapitre 8 → COURS SOURCE<br>
        4. Cliquez sur "Importer le cours privé"<br>
        5. Sélectionnez le fichier téléchargé
    </div>
    
    <div class="info">
        <strong>⚠️ Important :</strong><br>
        - Les fichiers sont servi depuis <code>references-privees/</code>
        - Ils restent <strong>privés</strong> et ne sont pas accessibles publiquement
        - Ne partagez pas ces fichiers en dehors de votre appareil
    </div>
    
    <h2>🔗 URL directe</h2>
    <p>Pour télécharger directement le chapitre 8 :</p>
    <p><a href="/private/cours/kum-08/v1/norya-private-course-v2.json" 
           download="norya-private-course-v2.json">
        ↓ Télécharger norya-private-course-v2.json (47,7 Mo)
    </a></p>
</body>
</html>"""
    return html


def main():
    parser = argparse.ArgumentParser(description='Serveur de développement pour Norya')
    parser.add_argument('--port', type=int, default=PORT, help=f'Port du serveur (défaut: {PORT})')
    parser.add_argument('--host', type=str, default=HOST, help=f'Host du serveur (défaut: {HOST})')
    args = parser.parse_args()
    
    # Vérifier que references-privees existe
    if not ALLOWED_PATH.exists():
        print(f'Erreur : {ALLOWED_PATH} n\'existe pas.', file=sys.stderr)
        sys.exit(1)
    
    # Démarrer le serveur
    server = ThreadingHTTPServer((args.host, args.port), DevHandler)
    
    print(f'\n{'='*60}')
    print(f'🚀 Serveur de développement Norya démarré')
    print(f'{'='*60}')
    print(f'📁 Dossier servi : {ALLOWED_PATH}')
    print(f'🌐 URL locale : http://{args.host}:{args.port}')
    print(f'🌐 URL Codespaces : https://<votre-codespace>-{args.port}.githubpreview.dev')
    print(f'{'='*60}')
    print(f'\n📱 Pour accéder depuis votre iPad :')
    print(f'  1. Cliquez sur "Ports" dans la barre latérale Codespaces')
    print(f'  2. Trouvez le port {args.port} et cliquez sur "Open in Browser"')
    print(f'  3. Ou allez sur : http://localhost:{args.port}')
    print(f'  4. Téléchargez le fichier depuis la page web')
    print(f'  5. Dans Norya, importez le fichier téléchargé')
    print(f'\n{'='*60}\n')
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Serveur arrêté')
        server.shutdown()


if __name__ == '__main__':
    main()
