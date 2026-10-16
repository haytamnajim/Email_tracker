# Boîte mail (webmail)

Lecture d'une boîte mail via IMAP (**lecture seule**) dans une interface React à 3 zones : dossiers, liste des emails, panneau de lecture.

## Installation

```bash
cd webmail
npm install                # racine + client + server
```

## Configuration

```bash
cp server/.env.example server/.env
```

Puis renseignez `server/.env` (**ce fichier est ignoré par git** et ne doit jamais être partagé) :

```env
IMAP_HOST=imap.orange.fr
IMAP_PORT=993
IMAP_USER=votre.adresse@example.fr
IMAP_PASSWORD=votre-mot-de-passe
IMAP_SECURE=true
DEMO_MODE=false
PORT=3001
```

> Si votre compte utilise une authentification à deux facteurs, il faut généralement un **mot de passe d'application** (Gmail, Outlook, Yahoo).

## Lancement

```bash
npm run dev
```

- Frontend : <http://127.0.0.1:5173>
- API locale : <http://127.0.0.1:3001> (écoute uniquement sur `127.0.0.1`)

Vérification des types : `npm run typecheck`.

## Mode démo ⇄ vrai compte

| | `DEMO_MODE=true` | `DEMO_MODE=false` |
|---|---|---|
| Données | 30 emails factices en français | votre vrai compte |
| Connexion IMAP | aucune | hébergé imap.example.com |
| Identifiants requis | non | oui (`IMAP_*` dans `.env`) |

`DEMO_MODE` vaut `true` par défaut : l'application ne se connecte à votre compte que si vous le demandez explicitement. Pour passer d'un mode à l'autre, modifiez la valeur dans `server/.env` puis relancez `npm run dev`.

## Sécurité

- **Lecture seule** : la boîte est toujours ouverte avec `readOnly: true`. Aucun appel de suppression, déplacement ou modification de drapeau n'existe dans le code.
- Les identifiants ne quittent jamais `server/.env` : ils ne sont ni envoyés au frontend, ni journalisés, ni renvoyés par l'API.
- Le HTML des emails est assaini côté client (DOMPurify) puis affiché dans une `iframe` `sandbox` sans `allow-scripts`.
- Les images distantes des emails sont bloquées par défaut (bouton « Afficher les images »).
