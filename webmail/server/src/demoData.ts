import { MailError } from './errors.ts';
import { folderLabel, folderSortValue, makePreview } from './format.ts';
import type {
  Address,
  AttachmentFile,
  AttachmentMeta,
  Folder,
  MessageDetail,
  MessageQuery,
  MessageSummary,
  Paginated,
} from './types.ts';

/**
 * Mode démo : 30 emails factices réalistes en français.
 * Aucune connexion IMAP n'est effectuée, aucun identifiant n'est utilisé.
 */

export const DEMO_ACCOUNT = 'vous@exemple.fr';

interface SeedAttachment {
  filename: string;
  contentType: string;
  size: number;
}

interface Seed {
  uid: number;
  folder: string;
  fromName: string;
  fromAddr: string;
  to: Address[];
  cc?: Address[];
  subject: string;
  text: string;
  html?: string;
  hoursAgo: number;
  read: boolean;
  flagged: boolean;
  attachments?: SeedAttachment[];
}

const me: Address = { name: 'Vous', address: DEMO_ACCOUNT };

const FOLDER_IDS = ['INBOX', 'Sent', 'Drafts', 'Junk', 'Trash'];

const SEEDS: Seed[] = [
  {
    uid: 1,
    folder: 'INBOX',
    fromName: 'Service Client Chronopost',
    fromAddr: 'service.client@chronopost-exemple.fr',
    to: [me],
    subject: 'Votre colis XP123456789FR est en attente de livraison',
    text: 'Bonjour, votre colis est en attente de livraison. Prévenez-nous si le créneau ne vous convient pas. Cordialement, le service client.',
    hoursAgo: 2,
    read: false,
    flagged: false,
  },
  {
    uid: 2,
    folder: 'INBOX',
    fromName: 'Camille Bertrand',
    fromAddr: 'camille.bertrand@exemple.fr',
    to: [me],
    subject: 'Re: point sur la refonte du site',
    text: "J'ai relu le cahier des charges, tout me semble cohérent. On peut prévoir une revue mardi matin si ça te va ? Bonne journée, Camille.",
    hoursAgo: 5,
    read: true,
    flagged: true,
  },
  {
    uid: 3,
    folder: 'INBOX',
    fromName: 'Netflix',
    fromAddr: 'info@netflix-exemple.fr',
    to: [me],
    subject: 'Votre abonnement a été renouvelé',
    text: 'Votre abonnement a été renouvelé pour le mois à venir. Retrouvez le détail sur votre espace client.',
    hoursAgo: 9,
    read: true,
    flagged: false,
    attachments: [{ filename: 'facture-avril.pdf', contentType: 'application/pdf', size: 48210 }],
  },
  {
    uid: 4,
    folder: 'INBOX',
    fromName: 'SNCF Connect',
    fromAddr: 'noreply@sncf-connect-exemple.fr',
    to: [me],
    subject: 'Votre billet TGV Paris – Lyon du 12 mars',
    text: 'Votre billet est disponible dans votre espace. Présentez-le directement depuis l’application, wagon 12, place 42.',
    hoursAgo: 12,
    read: false,
    flagged: false,
    attachments: [{ filename: 'billet-paris-lyon.pdf', contentType: 'application/pdf', size: 152040 }],
  },
  {
    uid: 5,
    folder: 'INBOX',
    fromName: 'Doctolib',
    fromAddr: 'confirmation@doctolib-exemple.fr',
    to: [me],
    subject: 'Confirmation de rendez-vous avec le Dr Nguyen',
    text: 'Votre rendez-vous est confirmé pour jeudi 14 h 30, 12 rue des Lilas. Merci d’arriver 5 minutes en avance.',
    hoursAgo: 20,
    read: true,
    flagged: false,
  },
  {
    uid: 6,
    folder: 'INBOX',
    fromName: 'EDF',
    fromAddr: 'factures@edf-exemple.fr',
    to: [me],
    subject: 'Votre facture d’électricité de février',
    text: 'Votre facture est disponible. Le montant de votre contrat est de 78,40 €, prélèvement prévu le 15 du mois.',
    hoursAgo: 26,
    read: false,
    flagged: false,
    attachments: [{ filename: 'facture-edf-fevrier.pdf', contentType: 'application/pdf', size: 96300 }],
  },
  {
    uid: 7,
    folder: 'INBOX',
    fromName: 'Mairie de Nantes',
    fromAddr: 'contact@mairie-nantes-exemple.fr',
    to: [me],
    subject: 'Travaux rue Crébillon : circulation modifiée',
    text: 'Des travaux de voirie débuteront lundi. La circulation sera déviée pendant trois semaines. Nous vous remercions de votre compréhension.',
    hoursAgo: 30,
    read: true,
    flagged: false,
  },
  {
    uid: 8,
    folder: 'INBOX',
    fromName: 'Sarah Lemoine',
    fromAddr: 'sarah.lemoine@exemple.fr',
    to: [me],
    subject: 'Photos du séminaire',
    text: 'Voici les photos du séminaire de janvier. N’hésite pas à me dire si tu veux les originaux en pleine résolution.',
    hoursAgo: 34,
    read: false,
    flagged: false,
    attachments: [{ filename: 'photos-seminaire.zip', contentType: 'application/zip', size: 4820114 }],
  },
  {
    uid: 9,
    folder: 'INBOX',
    fromName: 'GitHub',
    fromAddr: 'noreply@github-exemple.fr',
    to: [me],
    subject: 'Alerte de sécurité : nouvelle connexion détectée',
    text: 'Une connexion depuis un nouvel appareil a été détectée sur votre compte. Si ce n’était pas vous, réinitialisez votre mot de passe.',
    hoursAgo: 40,
    read: true,
    flagged: false,
  },
  {
    uid: 10,
    folder: 'INBOX',
    fromName: 'Newsletter Tech',
    fromAddr: 'redaction@newsletter-tech-exemple.fr',
    to: [me],
    subject: 'Les tendances du développement web en 2026',
    text: 'Découvrez notre sélection de tendances pour l’année : rendu serveur, accessibilité par défaut et outillage simplifié.',
    html:
      '<h1>Les tendances du développement web en 2026</h1>' +
      '<p>Notre sélection de l’année, illustrée d’exemples concrets.</p>' +
      '<img src="https://images.example.com/banniere-tendances.jpg" alt="Bannière" width="600" height="200">' +
      '<script>alert("script malveillant exécuté");</script>' +
      '<p onclick="alert(\'clic malveillant\')">Un paragraphe prétendument cliquable.</p>' +
      '<style>body { background: red; }</style>' +
      '<p>Bonne lecture !</p>',
    hoursAgo: 44,
    read: false,
    flagged: false,
  },
  {
    uid: 11,
    folder: 'INBOX',
    fromName: 'BNP Paribas',
    fromAddr: 'espace-client@bnp-exemple.fr',
    to: [me],
    subject: 'Votre relevé de compte du mois',
    text: 'Votre relevé est disponible dans votre espace sécurisé. Il détaille vos opérations du mois écoulé.',
    hoursAgo: 50,
    read: true,
    flagged: false,
    attachments: [{ filename: 'releve-compte.pdf', contentType: 'application/pdf', size: 63120 }],
  },
  {
    uid: 12,
    folder: 'INBOX',
    fromName: 'Julien Moreau',
    fromAddr: 'julien.moreau@exemple.fr',
    to: [me],
    subject: 'Réunion annulée jeudi',
    text: 'La réunion de jeudi est annulée, je reprogramme la semaine prochaine. Désolé pour le désagrément.',
    hoursAgo: 56,
    read: true,
    flagged: false,
  },
  {
    uid: 13,
    folder: 'INBOX',
    fromName: 'Ameli',
    fromAddr: 'no-reply@ameli-exemple.fr',
    to: [me],
    subject: 'Votre attestation de droits 2026',
    text: 'Votre attestation de droits est prête. Vous pouvez l’imprimer ou la télécharger depuis votre compte.',
    hoursAgo: 62,
    read: true,
    flagged: false,
    attachments: [{ filename: 'attestation-droits.pdf', contentType: 'application/pdf', size: 88412 }],
  },
  {
    uid: 14,
    folder: 'INBOX',
    fromName: 'Le Monde',
    fromAddr: 'newsletters@lemonde-exemple.fr',
    to: [me],
    subject: 'Le fil de l’actu de cette nuit',
    text: 'La sélection des informations à retenir cette nuit, en quatre points clés.',
    hoursAgo: 70,
    read: true,
    flagged: false,
  },
  {
    uid: 15,
    folder: 'INBOX',
    fromName: 'Orange',
    fromAddr: 'facturation@orange-exemple.fr',
    to: [me],
    subject: 'Votre facture est disponible',
    text: 'Votre facture du mois est disponible en ligne. Montant : 39,99 €, prélèvement automatique le 8.',
    hoursAgo: 78,
    read: true,
    flagged: false,
  },
  {
    uid: 16,
    folder: 'INBOX',
    fromName: 'MAIF',
    fromAddr: 'courrier@maif-exemple.fr',
    to: [me],
    subject: 'Avenant à votre contrat d’habitation',
    text: 'Veuillez trouver ci-joint l’avenant à votre contrat. Nous vous invitons à le lire attentivement.',
    hoursAgo: 90,
    read: false,
    flagged: true,
    attachments: [{ filename: 'avenant-contrat.pdf', contentType: 'application/pdf', size: 121004 }],
  },
  {
    uid: 17,
    folder: 'INBOX',
    fromName: 'Sarah Lemoine',
    fromAddr: 'sarah.lemoine@exemple.fr',
    to: [me],
    cc: [{ name: 'Julien Moreau', address: 'julien.moreau@exemple.fr' }],
    subject: 'Compte rendu de la réunion client',
    text: 'Voici le compte rendu ainsi que l’export des données discutées. Dis-moi si tu vois des incohérences.',
    hoursAgo: 100,
    read: true,
    flagged: false,
    attachments: [
      { filename: 'compte-rendu.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 34210 },
      { filename: 'export-donnees.csv', contentType: 'text/csv', size: 8120 },
    ],
  },
  {
    uid: 18,
    folder: 'INBOX',
    fromName: 'Théâtre de la Ville',
    fromAddr: 'billetterie@theatre-ville-exemple.fr',
    to: [me],
    subject: 'Vos places pour Le Songe d’une nuit d’été',
    text: 'Votre commande est validée. Deux places en fanion, samedi 20 h, porteur du nom indiqué à l’entrée.',
    hoursAgo: 120,
    read: true,
    flagged: false,
    attachments: [{ filename: 'e-billet.pdf', contentType: 'application/pdf', size: 45210 }],
  },
  {
    uid: 19,
    folder: 'Sent',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Camille Bertrand', address: 'camille.bertrand@exemple.fr' }],
    subject: 'Re: point sur la refonte du site',
    text: 'Mardi matin me va très bien. Je prépare le document de suivi. À bientôt.',
    hoursAgo: 4,
    read: true,
    flagged: false,
  },
  {
    uid: 20,
    folder: 'Sent',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Julien Moreau', address: 'julien.moreau@exemple.fr' }],
    subject: 'Compte rendu de la réunion',
    text: 'Comme convenu, voici le compte rendu de la réunion de ce matin.',
    hoursAgo: 28,
    read: true,
    flagged: false,
    attachments: [{ filename: 'compte-rendu-reunion.pdf', contentType: 'application/pdf', size: 51200 }],
  },
  {
    uid: 21,
    folder: 'Sent',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Sarah Lemoine', address: 'sarah.lemoine@exemple.fr' }],
    subject: 'Séminaire : planning prévisionnel',
    text: 'Voici le planning prévisionnel du séminaire. Merci de valider avant vendredi.',
    hoursAgo: 52,
    read: true,
    flagged: false,
  },
  {
    uid: 22,
    folder: 'Sent',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Service Client Chronopost', address: 'service.client@chronopost-exemple.fr' }],
    subject: 'Réclamation : colis non livré',
    text: 'Le colis annoncé livré ne m’a jamais été remis. Merci d’enquêter et de me tenir informé.',
    hoursAgo: 96,
    read: true,
    flagged: false,
  },
  {
    uid: 23,
    folder: 'Sent',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Julien Moreau', address: 'julien.moreau@exemple.fr' }],
    subject: 'Meilleures voeux',
    text: 'Je te souhaite une excellente année, pleine de projets réussis.',
    hoursAgo: 200,
    read: true,
    flagged: false,
  },
  {
    uid: 24,
    folder: 'Drafts',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Camille Bertrand', address: 'camille.bertrand@exemple.fr' }],
    subject: 'Proposition d’architecture',
    text: 'Voici ma proposition d’architecture pour la refonte : une API locale et un client React.',
    hoursAgo: 10,
    read: true,
    flagged: true,
  },
  {
    uid: 25,
    folder: 'Drafts',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Sarah Lemoine', address: 'sarah.lemoine@exemple.fr' }],
    subject: 'Invitation au pot de départ',
    text: 'Bonjour à toutes et à tous, nous vous invitons au pot de départ de Julien, vendredi à 17 h.',
    hoursAgo: 40,
    read: true,
    flagged: false,
  },
  {
    uid: 26,
    folder: 'Drafts',
    fromName: 'Vous',
    fromAddr: DEMO_ACCOUNT,
    to: [{ name: 'Julien Moreau', address: 'julien.moreau@exemple.fr' }],
    subject: 'Questions sur le budget',
    text: 'J’aurais quelques questions sur la ventilation du budget prévu pour le deuxième trimestre.',
    hoursAgo: 80,
    read: true,
    flagged: false,
  },
  {
    uid: 27,
    folder: 'Junk',
    fromName: 'Service Promo',
    fromAddr: 'gagnez@offres-dubieuses-exemple.fr',
    to: [me],
    subject: 'Vous avez gagné un smartphone !',
    text: 'Félicitations, vous avez été sélectionné. Cliquez vite pour réclamer votre lot.',
    html:
      '<p><b>Félicitations !</b> Vous avez gagné un smartphone.</p>' +
      '<a href="https://offres-dubieuses-exemple.fr/prix">Réclamer mon lot</a>',
    hoursAgo: 8,
    read: false,
    flagged: false,
  },
  {
    uid: 28,
    folder: 'Junk',
    fromName: 'PayExemple',
    fromAddr: 'securite@pay-exemple.fr',
    to: [me],
    subject: 'Votre compte a été suspendu',
    text: 'Votre compte a été suspendu. Connectez-vous rapidement pour réactiver vos accès.',
    hoursAgo: 30,
    read: false,
    flagged: false,
  },
  {
    uid: 29,
    folder: 'Trash',
    fromName: 'Boutique en ligne',
    fromAddr: 'promo@boutique-exemple.fr',
    to: [me],
    subject: ' -30 % sur toute la collection',
    text: 'Profitez de 30 % de remise sur toute la collection pendant 48 heures.',
    hoursAgo: 60,
    read: true,
    flagged: false,
  },
  {
    uid: 30,
    folder: 'Trash',
    fromName: 'Expéditeur inconnu',
    fromAddr: 'inconnu@exemple.fr',
    to: [me],
    subject: 'Message en attente d’expédition',
    text: 'Votre message n’a pas pu être expédie : le destinataire n’existe pas.',
    hoursAgo: 72,
    read: true,
    flagged: false,
  },
];

interface DemoMessage extends MessageDetail {
  attachmentContents: Buffer[];
}

const messages: DemoMessage[] = SEEDS.map((seed) => {
  const attachments: AttachmentMeta[] = (seed.attachments ?? []).map((a, index) => ({
    index,
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
  }));
  return {
    uid: seed.uid,
    folder: seed.folder,
    from: { name: seed.fromName, address: seed.fromAddr },
    to: seed.to,
    cc: seed.cc ?? [],
    subject: seed.subject,
    date: new Date(Date.now() - seed.hoursAgo * 3_600_000).toISOString(),
    isRead: seed.read,
    isFlagged: seed.flagged,
    text: seed.text,
    html: seed.html ?? null,
    attachments,
    attachmentContents: attachments.map((a) =>
      Buffer.from(
        `Pièce jointe factice (mode démo).\nFichier : ${a.filename}\nType : ${a.contentType}\nTaille annoncée : ${a.size} octets.\n`,
        'utf8',
      ),
    ),
  };
});

function toSummary(message: DemoMessage): MessageSummary {
  return {
    uid: message.uid,
    folder: message.folder,
    from: message.from,
    subject: message.subject,
    preview: makePreview(message.text || message.subject),
    date: message.date,
    isRead: message.isRead,
    isFlagged: message.isFlagged,
    hasAttachments: message.attachments.length > 0,
  };
}

/** Retourne une copie sans le contenu binaire des pièces jointes. */
function toDetail(message: DemoMessage): MessageDetail {
  const { attachmentContents: _contents, ...detail } = message;
  return detail;
}

export function demoListFolders(): Folder[] {
  const folders = FOLDER_IDS.map((id) => {
    const inFolder = messages.filter((m) => m.folder === id);
    return {
      id,
      name: id,
      label: folderLabel(id),
      unread: inFolder.filter((m) => !m.isRead).length,
      total: inFolder.length,
    };
  });
  return folders.sort((a, b) => folderSortValue(a) - folderSortValue(b));
}

export function demoListMessages(query: MessageQuery): Paginated<MessageSummary> {
  let items = messages.filter((m) => m.folder === query.folder);

  if (query.q) {
    const needle = query.q.toLowerCase();
    items = items.filter((m) =>
      [m.from.name, m.from.address, m.subject, m.text].some((value) =>
        (value ?? '').toLowerCase().includes(needle),
      ),
    );
  }
  if (query.unread) items = items.filter((m) => !m.isRead);
  if (query.flagged) items = items.filter((m) => m.isFlagged);
  if (query.attachments) items = items.filter((m) => m.attachments.length > 0);

  items = [...items].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return query.sort === 'asc' ? diff : -diff;
  });

  const total = items.length;
  const start = (query.page - 1) * query.limit;
  const pageItems = items.slice(start, start + query.limit);

  return {
    items: pageItems.map(toSummary),
    total,
    page: query.page,
    limit: query.limit,
    hasMore: start + pageItems.length < total,
  };
}

export function demoGetMessage(uid: number, folder: string): MessageDetail {
  const message = messages.find((m) => m.uid === uid && m.folder === folder);
  if (!message) throw new MailError('Message introuvable dans ce dossier.', 404);
  return toDetail(message);
}

export function demoGetAttachment(uid: number, index: number, folder: string): AttachmentFile {
  const message = messages.find((m) => m.uid === uid && m.folder === folder);
  if (!message) throw new MailError('Message introuvable dans ce dossier.', 404);
  const attachment = message.attachments[index];
  if (!attachment) throw new MailError('Pièce jointe introuvable.', 404);
  return {
    filename: attachment.filename,
    contentType: attachment.contentType,
    content: message.attachmentContents[index],
  };
}
