# Vigilo HSE - Setup Cloudinary + Cloudflare KV

## Configuration SUPER SIMPLE ! 🚀

---

### Partie 1 : Cloudinary (pour les images)

1. Créez un compte gratuit sur [cloudinary.com](https://cloudinary.com)
2. Dans votre tableau de bord Cloudinary, récupérez :
   - `Cloud Name`
   - `API Key`
   - `API Secret`
3. Créez un **Upload Preset** :
   - Cliquez sur ⚙️ **Settings** → **Upload**
   - Descendez jusqu'à **Upload presets** → **Add upload preset**
   - Nom : `vigilo_upload`
   - Signing Mode : **Unsigned**
   - Cliquez sur **Save**

---

### Partie 2 : Cloudflare KV (pour les données)

Pas besoin de configuration complexe ! C'est déjà prêt dans votre Worker Cloudflare :

1. Dans votre Worker Cloudflare → **Settings** → **Variables**
2. Liez un **KV Namespace** :
   - Cliquez sur **"Add binding"**
   - Variable name : `DB`
   - KV namespace : Choisissez ou créez un namespace (ex: `vigilo-db`)

---

### Partie 3 : Configuration Cloudflare Workers

Ajoutez ces variables dans votre Worker (**Settings** → **Variables and secrets**) :

| Variable | Valeur |
|----------|--------|
| `CLOUDINARY_CLOUD_NAME` | Votre Cloud Name |
| `CLOUDINARY_API_KEY` | Votre API Key |
| `CLOUDINARY_API_SECRET` | Votre API Secret |
| `CLOUDINARY_UPLOAD_PRESET` | `vigilo_upload` |

---

## Avantages :

- **Cloudinary** : 25GB stockage + 25GB bande passante/mois **GRATUIT**
- **Cloudflare KV** : 100,000 lectures/jour **GRATUIT**
- Parfait pour les photos de chantiers et anomalies !
- Configuration simple et rapide !
