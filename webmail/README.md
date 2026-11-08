# Boîte mail (webmail)

Webmail en français à trois zones (dossiers, liste, lecteur), avec recherche, filtres,
actions IMAP et assistants IA branchés sur n8n.

## Fonctionnalités

- **Lecture IMAP** : dossiers, pagination, recherche plein texte, filtres par expéditeur,
  destinataire, objet, non-lus, suivis et pièces jointes.
- **Classement automatique** : catégories urgent, réunion, facture, action, newsletter.
- **Actions sur les messages** : archiver, supprimer, suivre, marquer lu/non lu, mettre en
  attente, déplacer vers un dossier, étiquettes IMAP, ajout aux tâches.
- **Rédaction** : envoi SMTP direct (repli n8n), annulation d'envoi pendant 5 secondes,
  relances des emails restés sans réponse.
- **Assistants IA** :
  - génération de réponse selon le ton choisi ;
  - résumé en trois points clés ;
  - détection de réunion avec créneau proposé ;
  - extraction des tâches et échéances ;
  - traduction du message ;
  - réécriture et amélioration d'un brouillon.
- **Interface** : thème clair/sombre, raccourcis clavier, toast d'action, notifications de
  bureau, affichage en lecture seule ou en volet divisé.

## Architecture

| Dossier | Rôle |
|---|---|
| `client/` | Interface React + TypeScript + Tailwind CSS + lucide-react (Vite). |
| `server/` | API Express + TypeScript, IMAP via `imapflow`, parsing via `mailparser`, envoi via `nodemailer`. |
| Workflow n8n | Un workflow unique route les événements IA et l'envoi par le champ `event`. |

Les identifiants restent exclusivement dans `server/.env`. Ils ne sont jamais envoyés au
frontend, jamais journalisés et jamais renvoyés par l'API.

## Installation

```bash
cd webmail
npm install
```

La commande installe la racine, le client et le serveur.

## Configuration

```bash
cp server/.env.example server/.env
```

Renseignez ensuite `server/.env` (fichier ignoré par git) :

```env
# IMAP
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_USER=votre.adresse@example.com
IMAP_PASSWORD=mot-de-passe-application
IMAP_SECURE=true

# true = 30 emails factices, aucune connexion IMAP
DEMO_MODE=false

# SMTP (facultatif : déduit automatiquement pour Gmail depuis IMAP_*)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=votre.adresse@example.com
SMTP_PASSWORD=mot-de-passe-application

# Webhooks n8n (facultatifs : repli local si absents)
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/generate-reply
N8N_SEND_WEBHOOK_URL=http://127.0.0.1:5678/webhook/send-email
N8N_DETECT_MEETING_WEBHOOK_URL=http://127.0.0.1:5678/webhook/detect-meeting

PORT=3001
```

> Avec Gmail, utilisez un **mot de passe d'application**. L'hôte et les identifiants SMTP
> sont alors déduits automatiquement des variables `IMAP_*`.

## Lancement

```bash
npm run dev
```

- Frontend : <http://127.0.0.1:5173>
- API locale : <http://127.0.0.1:3001> (écoute uniquement sur `127.0.0.1`)

Vérifications :

```bash
npm run typecheck
npm run build
```

## Mode démo

| | `DEMO_MODE=true` | `DEMO_MODE=false` |
|---|---|---|
| Données | 30 emails factices en français | votre vrai compte |
| Connexion IMAP | aucune | oui |
| Identifiants requis | non | oui (`IMAP_*`) |
| Actions d'écriture | simulées | appliquées au compte |

`DEMO_MODE=true` est la valeur par défaut : l'application ne se connecte à un compte réel
que si vous le demandez explicitement.

## Sécurité et écritures IMAP

- La lecture utilise une connexion IMAP ouverte en `readOnly: true`.
- Les écritures n'ont lieu que sur action explicite de l'utilisateur : marquer lu/non lu,
  suivre, déplacer, appliquer une étiquette, envoyer un email.
- Chaque opération d'écriture ouvre une connexion dédiée, refermée immédiatement après.
- Le HTML des emails est assaini avec DOMPurify puis affiché dans une `iframe` `sandbox`
  sans `allow-scripts`.
- Les images distantes sont bloquées par défaut ; un bouton permet de les afficher.
- Aucun email n'est envoyé sans validation dans la fenêtre de rédaction.

## Assistants IA et n8n

Le workflow n8n unique expose trois webhooks (`generate-reply`, `send-email`,
`detect-meeting`) et route les événements suivants :

`email_reply_generation`, `cancel_reply`, `summarize_email`, `detect_meeting`,
`extract_tasks`, `translate_email`, `rewrite_draft`, `send_email`.

Si un webhook n'est pas configuré, le serveur applique un repli local pour la génération de
réponse, le résumé, la détection de réunion, l'extraction de tâches et la réécriture. La
traduction et l'envoi nécessitent en revanche le service configuré.

Les URLs de webhook peuvent aussi être renseignées ponctuellement depuis l'interface
(paramètres et modales) ; elles sont alors conservées dans le `localStorage` du navigateur.

## Dépannage

- **« Serveur injoignable »** : vérifiez que l'API écoute sur le port `3001`.
- **Erreur IMAP** : contrôlez `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURE` et le mot de passe
  d'application. Les messages d'erreur sont expurgés des identifiants.
- **Webhook n8n introuvable (404)** : l'instance locale doit être démarrée et le workflow
  actif avant l'appel. Un webhook n8n n'est enregistré qu'après l'activation du workflow.
- **Envoi impossible** : vérifiez la configuration SMTP ou le webhook d'envoi n8n.
