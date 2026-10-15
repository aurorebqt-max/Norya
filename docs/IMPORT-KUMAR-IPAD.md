# Guide d'importation du Chapitre 8 Kumar depuis iPad

**Problème** : Lors du téléchargement direct du fichier `norya-private-course-v2.json` depuis GitHub Codespaces via Safari sur iPad, le fichier reçu est souvent une page HTML d'erreur (ex: "Not Found") au lieu du vrai fichier JSON, ce qui provoque l'erreur :
```
JSON Parse error: Unexpected identifier "Not"
```

---

## 🎯 SOLUTION RECOMMANDÉE : Serveur de développement local

### Méthode 1 : Utiliser le serveur intégré (le plus simple)

1. **Dans Codespaces** (sur votre ordinateur) :
   ```bash
   cd /workspaces/Norya
   python3 scripts/dev-server.py --port 8080
   ```
   Le serveur démarre et affiche :
   ```
   🚀 Serveur de développement Norya démarré
   📁 Dossier servi : /workspaces/Norya/references-privees
   🌐 URL Codespaces : https://<votre-codespace>-8080.githubpreview.dev
   ```

2. **Sur votre iPad** :
   - Ouvrez Safari
   - Allez sur l'URL affichée (ex: `https://votre-codespace-8080.githubpreview.dev`)
   - Une page web s'ouvre avec la liste des fichiers disponibles
   - **Cliquez sur** : `norya-private-course-v2.json` (47,7 Mo)
   - Safari télécharge le fichier

3. **Dans l'application Norya** :
   - Allez dans : **Kumar → Chapitre 8**
   - Assurez-vous que le mode **COURS SOURCE** est sélectionné
   - Cliquez sur : **Importer le cours privé**
   - Sélectionnez le fichier `norya-private-course-v2.json` téléchargé
   - Le cours structuré s'affiche

4. **Naviguer dans le cours** :
   - Utilisez les boutons **Page précédente / Page suivante**
   - Basculez entre les modes :
     - **Cours reconstitué** : Texte + visuels structurés
     - **À vérifier** : Liste des alertes de vérification
     - **Pages originales** : Facsimilé complet
   - **Comparer** : Chaque passage a un bouton "Comparer ce passage au visuel original"

---

## 📋 SOLUTION ALTERNATIVE : Téléchargement direct via Codespaces

Si vous préférez ne pas utiliser le serveur :

### Depuis l'application Files sur iPad :

1. **Dans Codespaces** :
   - Ouvrez le terminal
   - Exécutez : `ls -lh /workspaces/Norya/references-privees/cours/kum-08/v1/`
   - Vérifiez que `norya-private-course-v2.json` existe (47,7 Mo)

2. **Sur iPad** :
   - Ouvrez l'application **Files**
   - Connectez-vous à **iCloud Drive** ou utilisez **Sur mon iPad**
   - **IMPORTANT** : Ne passez PAS par Safari → GitHub, car cela télécharge une page HTML

3. **Transfert depuis Codespaces** :
   - Dans Codespaces, cliquez sur l'icône **Explorateur de fichiers** (à gauche)
   - Naviguez jusqu'à : `Norya/references-privees/cours/kum-08/v1/`
   - Cliquez droit sur `norya-private-course-v2.json`
   - Sélectionnez **Download**
   - Choisissez **Enregistrer dans Files** (et sélectionnez iCloud Drive ou Sur mon iPad)

4. **Dans Norya** :
   - Kumar → Chapitre 8 → COURS SOURCE
   - Importer le cours privé
   - Sélectionnez le fichier téléchargé

---

## ⚠️ PROBLÈMES COURANTS ET SOLUTIONS

| **Problème** | **Cause** | **Solution** |
|--------------|-----------|--------------|
| `Unexpected identifier "Not"` | Fichier HTML téléchargé au lieu du JSON | Utilisez le serveur local ou téléchargez via l'explorateur de fichiers |
| `Paquet trop volumineux` | Le fichier dépasse 120 Mo (impossible pour v2) | Vérifiez que vous téléchargez bien le JSON et non un dossier |
| `Paquet invalide : ... HTML ...` | Le fichier téléchargé est une page HTML | Utilisez la Méthode 1 (serveur local) |
| `Fichier non trouvé` | Le fichier n'existe pas dans references-privees/ | Vérifiez le chemin et les permissions |
| Impossible de trouver le fichier | Le fichier a été téléchargé dans un autre dossier | Cherchez dans Files → Parcourir → Téléchargements |

---

## 🔧 DÉPANNAGE

### Vérifier que le fichier est bien un JSON :

Sur votre iPad, après téléchargement :
1. Ouvrez l'application **Files**
2. Appuyez longuement sur `norya-private-course-v2.json`
3. Sélectionnez **Partager** → **Quick Look** ou **Ouvrir dans** → **Aperçu**
4. **Le fichier doit commencer par** : `{"schemaVersion": 2, "chapterId": "kum-08", ...`
5. **Si vous voyez** : `<html>`, `<!DOCTYPE html>`, `Not Found`, `Error 404` → Le fichier est corrompu, recommencez avec la Méthode 1

### Tester le fichier avant importation :

Sur un ordinateur, vous pouvez vérifier :
```bash
# Vérifier que c'est un JSON valide
head -c 50 /workspaces/Norya/references-privees/cours/kum-08/v1/norya-private-course-v2.json
# Doit afficher : {"schemaVersion": 2, "chapterId": "kum-08"

# Vérifier la taille
ls -lh /workspaces/Norya/references-privees/cours/kum-08/v1/norya-private-course-v2.json
# Doit afficher : ~46M ou ~47M
```

---

## 📊 STATUT DES VERSSIONS

| **Fichier** | **Version** | **Taille** | **Contenu** | **Statut** |
|-------------|-------------|------------|-------------|------------|
| `norya-private-course.json` | v1 | ~26 Mo | Pages originales (facsimile) | ✅ Fonctionnel |
| `norya-private-course-v2.json` | v2 | ~47 Mo | Cours structuré (texte + visuels) | ✅ **À utiliser** |

**Utilisez toujours la version v2** pour accéder au cours structuré avec texte extrait et visuels séparés.

---

## 💡 ASTUCES

1. **Conservez l'ancien paquet** : La v1 continue de fonctionner pour afficher les pages originales
2. **Pas besoin de tout re-télécharger** : Une fois importé, le fichier reste stocké localement dans Norya
3. **Mise à jour facile** : Pour une nouvelle version, importez simplement le nouveau fichier
4. **Sécurité** : Aucun fichier n'est envoyé sur Internet, tout reste local sur votre appareil

---

## 📞 AIDE SUPPLÉMENTAIRE

Si vous rencontrez toujours des problèmes :

### 1. Vérifiez le serveur est en cours d'exécution :
```bash
# Dans Codespaces
ps aux | grep dev-server
# Doit afficher : python3 scripts/dev-server.py
```

### 2. Testez l'URL directement :
```bash
# Dans Codespaces
curl -I http://127.0.0.1:8080/cours/kum-08/v1/norya-private-course-v2.json
# Doit retourner : HTTP/1.0 200 OK
```

### 3. Vérifiez l'URL Codespaces :
- Dans Codespaces, cliquez sur **Ports** (barre latérale)
- Trouvez le port 8080 (ou celui que vous avez utilisé)
- Cliquez sur **Open in Browser**
- Vous devriez voir la page d'accueil du serveur

---

**Dernière mise à jour** : 2026-10-15  
**Auteur** : Mistral Vibe (reprise après Codex)  
**Chapitre** : Kumar 8 - Sepsis
