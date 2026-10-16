import createDOMPurify from 'dompurify';

/**
 * Assainissement du HTML des emails.
 * - <script>, handlers onclick/onerror et styles dangereux sont supprimés ;
 * - les images distantes sont neutralisées tant que l'utilisateur ne les autorise pas.
 */

const REMOTE_SRC_ATTRIBUTE = 'data-remote-src';
const PLACEHOLDER_PIXEL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#e2e8f0"/><text x="60" y="24" font-size="10" text-anchor="middle" fill="#64748b">image distante</text></svg>',
  );

export interface SanitizeOptions {
  /** true = autorise le chargement des images distantes */
  allowRemoteImages: boolean;
  /**
   * true = neutralise les fonds et couleurs de texte imposés par l'email.
   * Sans cela, un <table bgcolor="#ffffff"> resterait blanc en mode sombre.
   */
  dark?: boolean;
}

/** Attributs qui imposent un fond ou une couleur de texte à l'email. */
const COLORING_ATTRIBUTES = ['bgcolor', 'background', 'color'];

export function sanitizeEmailHtml(html: string, options: SanitizeOptions): string {
  // Une instance dédiée : les hooks ne fuient jamais d'un appel à l'autre.
  const purify = createDOMPurify(window);

  if (!options.allowRemoteImages) {
    purify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName !== 'IMG') return;
      const src = node.getAttribute('src');
      if (src && /^https?:/i.test(src)) {
        node.setAttribute(REMOTE_SRC_ATTRIBUTE, src);
        node.setAttribute('src', PLACEHOLDER_PIXEL);
        node.setAttribute('alt', node.getAttribute('alt') ?? 'Image distante bloquée');
      }
    });
  }

  if (options.dark) {
    purify.addHook('afterSanitizeAttributes', (node) => {
      for (const attribute of COLORING_ATTRIBUTES) {
        if (node.hasAttribute(attribute)) node.removeAttribute(attribute);
      }
    });
  }

  const clean = purify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
  });

  purify.removeAllHooks();
  return clean;
}

/** Détecte la présence d'une image distante dans un HTML d'email. */
export function containsRemoteImages(html: string | null): boolean {
  if (!html) return false;
  return /<img[^>]*\ssrc\s*=\s*["']?https?:\/\//i.test(html);
}
