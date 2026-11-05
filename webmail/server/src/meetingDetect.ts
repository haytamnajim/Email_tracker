/**
 * Détection locale de réunion.
 *
 * Sert de repli quand le workflow n8n est injoignable, inactif ou n'a pas
 * encore répondu. Volontairement déterministe : aucune dépendance réseau,
 * aucun coût, résultat stable — contrairement à un appel IA.
 *
 * Le résultat alimente directement le panneau de réponse : en plus de
 * `isMeeting`, on extrait un créneau (`suggestedDate` / `suggestedTime`)
 * pour que la fenêtre « Confirmer le rendez-vous » s'ouvre déjà remplie.
 */

export interface MeetingDetectionInput {
  subject?: string;
  text?: string;
  html?: string | null;
  /** Date ISO de l'email : sert de repère pour « demain », « mardi », etc. */
  date?: string;
}

export interface LocalMeetingDetection {
  isMeeting: boolean;
  confidence: number;
  reason: string;
  suggestedTitle?: string;
  /** Format AAAA-MM-JJ, compatible avec `<input type="date">`. */
  suggestedDate?: string;
  /** Format HH:MM, compatible avec `<input type="time">`. */
  suggestedTime?: string;
}

/* ── Vocabulaire ── */

/** Termes qui suffisent à eux seuls à suspecter une réunion. */
const STRONG_TERMS = [
  'meeting',
  'reunion',
  'rendez-vous',
  'rendez vous',
  'rdv',
  'visio',
  'visioconference',
  'zoom',
  'teams',
  'google meet',
  'webinaire',
  'webinar',
  'conference',
  'entretien',
  'interview',
  'appel',
  'call',
  'demo',
];

/**
 * Termes trop génériques pour conclure seuls : « point » ou « échange »
 * apparaissent dans des emails qui ne proposent aucun rendez-vous. Ils ne
 * comptent que si une date ou une heure accompagne le message.
 */
const CONTEXT_TERMS = [
  'point de suivi',
  "point d'etape",
  "point d'avancement",
  'faire le point',
  'point hebdo',
  'point mensuel',
  'se retrouver',
  'nous retrouver',
  'se voir',
  'dejeuner',
  'apero',
  'echange',
  'discuter',
  'creneau',
  'agenda',
  'calendrier',
  'planifier',
  'organiser',
  'programmer',
];

/**
 * « Êtes-vous disponible… » est une invitation ; « votre facture est
 * disponible » ne l'est pas. La disponibilité ne compte donc que sous forme
 * de question adressée à quelqu'un.
 */
const AVAILABILITY_RE =
  /\b(es-tu|es tu|etes-vous|etes vous|serais-tu|seriez-vous|serais tu|seriez vous|tu es|vous etes|est-ce que tu es|est-ce que vous etes)\s+(disponible|dispo|libre)\b/;

const WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

/**
 * Repères temporels trop imprécis pour remplir un champ date, mais qui
 * confirment qu'un rendez-vous est évoqué (« la semaine prochaine »).
 */
const VAGUE_DATE_RE =
  /\b(cette semaine|la semaine prochaine|semaine prochaine|ce mois|le mois prochain|mois prochain|bientot|prochainement|des que possible|quand tu veux|quand vous voulez|a votre convenance)\b/;

/** « appel d'offres » n'est pas un rendez-vous, malgré le mot « appel ». */
const APPEL_OFFRES_RE = /\bappel d'offres?\b/;

const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

/* ── Utilitaires ── */

/** Minuscules sans accents : « Réunion » et « reunion » se comparent pareil. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cherche des termes entiers.
 *
 * Un simple `includes` laissait « demo » matcher « demolition » ou « call »
 * matcher « calligraphie ». Le test encadre chaque terme par des frontières
 * non alphanumériques, ce qui reste correct pour « rendez-vous ».
 */
function matchesAny(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text),
  );
}

/**
 * Repère une négation juste avant un terme : « aucune réunion », « pas de
 * rendez-vous ». Sans ce filtre, un email qui *exclut* une réunion était
 * compté comme une invitation.
 */
function isNegated(text: string, term: string): boolean {
  const index = text.indexOf(term);
  if (index === -1) return false;
  const before = text.slice(Math.max(0, index - 28), index);
  return /\b(aucun[e]?|pas de|sans|plus de|ni)\s*(d'|de\s+|la\s+|le\s+|les\s+)?$/.test(
    before,
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Repère temporel de l'email, ou aujourd'hui si la date est absente/invalide. */
function referenceDate(raw?: string): Date {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
  }
  return startOfDay(new Date());
}

/**
 * Construit une date à partir d'un jour et d'un mois.
 *
 * L'année vient de l'email. Si la date obtenue précède de plus d'une journée
 * le repère, c'est que l'email parle de l'année suivante : « le 3 janvier »
 * écrit le 20 décembre vise bien janvier N+1.
 */
function buildDate(day: number, monthIndex: number, reference: Date): Date | null {
  if (day < 1 || day > 31 || monthIndex < 0 || monthIndex > 11) return null;

  const candidate = new Date(reference.getFullYear(), monthIndex, day);
  // Rejette les dates impossibles (31 février) que Date décale silencieusement.
  if (candidate.getMonth() !== monthIndex || candidate.getDate() !== day) return null;

  if (candidate.getTime() < addDays(reference, -1).getTime()) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

/* ── Extraction de la date ── */

function extractDate(clean: string, reference: Date): Date | undefined {
  if (/\bapres[- ]demain\b/.test(clean)) return addDays(reference, 2);
  if (/\bdemain\b/.test(clean)) return addDays(reference, 1);

  // « 10 novembre », « 1er décembre »
  const dayMonth = clean.match(
    /\b(\d{1,2})\s*(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/,
  );
  if (dayMonth) {
    const monthIndex = MONTHS.indexOf(dayMonth[2]);
    const built = buildDate(Number(dayMonth[1]), monthIndex, reference);
    if (built) return built;
  }

  // « 12/11 », « 12-11-2026 », « 12.11 »
  const numeric = clean.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const monthIndex = Number(numeric[2]) - 1;
    if (numeric[3]) {
      const rawYear = Number(numeric[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      const explicit = new Date(year, monthIndex, day);
      if (explicit.getMonth() === monthIndex && explicit.getDate() === day) {
        return explicit;
      }
    }
    const built = buildDate(day, monthIndex, reference);
    if (built) return built;
  }

  // « mardi », « mardi prochain » : prochaine occurrence, aujourd'hui exclu.
  const weekdayMatch = clean.match(
    /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/,
  );
  if (weekdayMatch) {
    const target = WEEKDAYS.indexOf(weekdayMatch[1]);
    const current = reference.getDay();
    const delta = (target - current + 7) % 7 || 7;
    return addDays(reference, delta);
  }

  return undefined;
}

/* ── Extraction de l'heure ── */

function extractTime(clean: string): string | undefined {
  // « 14h », « 14h30 », « 9 h 05 »
  const compact = clean.match(/\b(\d{1,2})\s*h\s*(\d{2})?\b/);
  if (compact) {
    const hours = Number(compact[1]);
    const minutes = compact[2] ? Number(compact[2]) : 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // « 14:30 »
  const colon = clean.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colon) {
    const hours = Number(colon[1]);
    const minutes = Number(colon[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  if (/\ba midi\b/.test(clean)) return '12:00';

  return undefined;
}

/* ── Point d'entrée ── */

export function detectMeetingLocally(
  input: MeetingDetectionInput,
  cause?: string,
): LocalMeetingDetection {
  const reference = referenceDate(input.date);

  const body = input.text?.trim()
    ? input.text
    : input.html
      ? stripHtml(input.html)
      : '';
  const raw = `${input.subject ?? ''}\n${body}`;
  const clean = normalize(raw);

  const strong = matchesAny(clean, STRONG_TERMS).filter(
    (term) => !(term === 'appel' && APPEL_OFFRES_RE.test(clean)) && !isNegated(clean, term),
  );
  const contextual = matchesAny(clean, CONTEXT_TERMS).filter(
    (term) => !isNegated(clean, term),
  );
  const availabilityAsked = AVAILABILITY_RE.test(clean);

  const date = extractDate(clean, reference);
  const time = extractTime(clean);
  const vagueDate = VAGUE_DATE_RE.test(clean);

  // Un terme générique ne suffit pas : sans repère temporel, « échange » ou
  // « point » ne sont pas une invitation. Une question de disponibilité
  // adressée au destinataire, elle, suffit.
  const isMeeting =
    strong.length > 0 ||
    availabilityAsked ||
    (contextual.length > 0 && Boolean(date || time || vagueDate));

  let confidence = 0;
  if (strong.length > 0) confidence = 0.62;
  else if (availabilityAsked) confidence = 0.55;
  else if (isMeeting) confidence = 0.6;
  else if (contextual.length > 0) confidence = 0.3;
  else confidence = 0.05;

  if (isMeeting) {
    if (date) confidence += 0.15;
    if (time) confidence += 0.15;
    else if (vagueDate) confidence += 0.08;
    confidence = Math.min(0.92, Number(confidence.toFixed(2)));
  }

  const signals: string[] = [];
  if (strong.length > 0) signals.push(`mots-clés ${strong.slice(0, 3).map((t) => `« ${t} »`).join(', ')}`);
  if (contextual.length > 0) signals.push(`formules ${contextual.slice(0, 3).map((t) => `« ${t} »`).join(', ')}`);
  if (availabilityAsked) signals.push('disponibilité demandée');
  if (date) signals.push('date repérée');
  if (time) signals.push(`heure repérée (${time})`);
  if (!date && vagueDate) signals.push('période évoquée');

  let reason: string;
  if (isMeeting) {
    reason = `Analyse locale : ${signals.join(' · ')}.`;
  } else if (strong.length === 0 && contextual.length === 0) {
    reason = "Analyse locale : aucun mot-clé de réunion dans cet email.";
  } else {
    reason = "Analyse locale : vocabulaire évoquant un échange, mais aucun créneau daté — pas de rendez-vous proposé.";
  }

  if (cause) reason = `${cause} — ${reason}`;

  return {
    isMeeting,
    confidence,
    reason,
    suggestedTitle: isMeeting
      ? (input.subject ?? '').replace(/^\s*((re|fw|fwd|tr)\s*:\s*)+/i, '').trim() || undefined
      : undefined,
    suggestedDate: isMeeting && date ? toIsoDate(date) : undefined,
    suggestedTime: isMeeting ? time : undefined,
  };
}
