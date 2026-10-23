import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  X,
  SlidersHorizontal,
  CircleHelp,
  Settings,
  Grid,
  Sun,
  Moon,
  Check,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  Mail,
  Calendar,
  FolderOpen,
  Video,
  Lightbulb,
  ListTodo,
  Users,
  MessageSquare,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GmailLogo from './GmailLogo';
import type { Theme } from '../types';
import { EMPTY_ADVANCED_FILTERS } from '../types';
import type { AdvancedFilters } from '../types';
import { useRipple } from '../utils/ripple';

/**
 * Grille de services. Chaque service porte sa teinte et son icône vectorielle :
 * les émojis changent d'apparence selon la police et le système, se rendent
 * mal en petit corps et ne peuvent pas être teintés. Ici les fonds sont
 * choisis pour garder un contraste ≥ 3:1 avec l'icône blanche (WCAG AA,
 * élément non textuel).
 */
const SERVICES: Array<{ name: string; icon: LucideIcon; color: string; active?: boolean }> = [
  { name: 'Gmail', icon: Mail, color: '#d93025', active: true },
  { name: 'Agenda', icon: Calendar, color: '#1a73e8' },
  { name: 'Drive', icon: FolderOpen, color: '#188038' },
  { name: 'Meet', icon: Video, color: '#007b83' },
  { name: 'Keep', icon: Lightbulb, color: '#e37400' },
  { name: 'Tâches', icon: ListTodo, color: '#8430ce' },
  { name: 'Contacts', icon: Users, color: '#00796b' },
  { name: 'Chat', icon: MessageSquare, color: '#185abc' },
  { name: 'Vault', icon: Lock, color: '#5f6368' },
];

/** Cascade d'ouverture de la grille, comme pour les sections des paramètres. */
const SERVICE_STEP = 22;

interface HeaderProps {
  navOpen: boolean;
  onToggleNav: () => void;
  search: string;
  onSearchChange: (query: string) => void;
  /** Filtres avancés appliqués, pilotés par le parent */
  advancedFilters: AdvancedFilters;
  onAdvancedFilters: (filters: AdvancedFilters) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export default function Header({
  navOpen,
  onToggleNav,
  search,
  onSearchChange,
  advancedFilters,
  onAdvancedFilters,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
}: HeaderProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Filtres avancés
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterHasAttachment, setFilterHasAttachment] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const ripple = useRipple();

  // Sync external search prop
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Le panneau garde un brouillon local pour permettre « Appliquer » ; on le
  // resynchronise quand le parent change ses filtres (réinitialisation).
  useEffect(() => {
    setFilterFrom(advancedFilters.from);
    setFilterTo(advancedFilters.to);
    setFilterSubject(advancedFilters.subject);
    setFilterHasAttachment(advancedFilters.hasAttachment);
  }, [advancedFilters]);

  // Close popups on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyAdvancedFilter = (e: React.FormEvent) => {
    e.preventDefault();
    // On transmet des champs STRUCTURÉS. La version précédente concaténait
    // « from:x to:y subject:z » dans la barre de recherche : le serveur
    // recevait cette chaîne entière et la passait en recherche IMAP TEXT,
    // d'où « aucun résultat » pour tout filtre renseigné.
    onAdvancedFilters({
      from: filterFrom.trim(),
      to: filterTo.trim(),
      subject: filterSubject.trim(),
      hasAttachment: filterHasAttachment,
    });
    setFilterOpen(false);
  };

  const handleClearAdvancedFilter = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterSubject('');
    setFilterHasAttachment(false);
    setSearchInput('');
    onSearchChange('');
    onAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onSearchChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchChange(searchInput);
    }
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between px-3 bg-[#f6f8fc] dark:bg-[#1f1f1f] border-b border-transparent">
      {/* ── Gauche : Menu hamburger + Logo Gmail ── */}
      <div className="flex items-center gap-1 min-w-[240px]">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={navOpen ? 'Réduire le volet' : 'Développer le volet'}
          title="Menu principal"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] active:scale-[0.95] transition-[background-color,transform]"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="pl-1 flex items-center">
          <GmailLogo />
        </div>
      </div>

      {/* ── Centre : Barre de recherche Gmail officielle ── */}
      <div className="relative flex-1 max-w-[720px] mx-4">
        <div
          className={`relative flex h-12 items-center rounded-full transition-[background-color,box-shadow] duration-200 ${
            searchFocused || filterOpen
              ? 'bg-white dark:bg-[#141414] shadow-md ring-1 ring-black/5 dark:ring-white/10'
              : 'bg-[#eaf1fb] dark:bg-[#2a2b2e] hover:bg-[#dfe7f2] dark:hover:bg-[#34373b] hover:shadow-sm'
          }`}
        >
          <div className="pl-4 pr-3 text-[#444746] dark:text-[#c4c7c5]">
            <Search className="h-5 w-5" />
          </div>

          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher dans les messages"
            className="flex-1 bg-transparent text-[15px] text-[#1f1f1f] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] outline-none"
          />

          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              title="Effacer la recherche"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            title="Options de recherche"
            className={`flex h-9 w-9 items-center justify-center rounded-full mr-2 transition-colors ${
              filterOpen
                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* ── Fenêtre Filtres avancés ── */}
        {filterOpen && (
          <div
            ref={filterRef}
            className="absolute left-0 right-0 top-14 z-50 rounded-2xl bg-white dark:bg-[#202124] p-5 shadow-2xl border border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide text-sm text-[#1f1f1f] dark:text-[#e8eaed]"
          >
            <form onSubmit={handleApplyAdvancedFilter} className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">De</label>
                <input
                  type="text"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  placeholder="nom ou adresse email"
                  className="rounded-lg border border-[#dadce0] dark:border-[#444746] bg-transparent px-3 py-1.5 outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
                />
              </div>

              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">À</label>
                <input
                  type="text"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  placeholder="destinataire"
                  className="rounded-lg border border-[#dadce0] dark:border-[#444746] bg-transparent px-3 py-1.5 outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
                />
              </div>

              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">Objet</label>
                <input
                  type="text"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  placeholder="mots dans l'objet"
                  className="rounded-lg border border-[#dadce0] dark:border-[#444746] bg-transparent px-3 py-1.5 outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 pl-[100px]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#444746] dark:text-[#c4c7c5]">
                  <input
                    type="checkbox"
                    checked={filterHasAttachment}
                    onChange={(e) => setFilterHasAttachment(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#0b57d0]"
                  />
                  <span>Contient une pièce jointe</span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#e0e2e7] dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={handleClearAdvancedFilter}
                  className="text-xs font-medium text-[#0b57d0] hover:underline dark:text-[#a8c7fa]"
                >
                  Réinitialiser
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[#0b57d0] text-white px-5 py-1.5 text-xs font-medium shadow-sm hover:bg-[#0842a0] transition-colors"
                  >
                    Rechercher
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Droite : Outils, Thème, Apps Google & Avatar ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Support / Aide */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            aria-label="Aide et assistance"
            title="Aide"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] active:scale-[0.95] transition-[background-color,transform]"
          >
            <CircleHelp className="h-5 w-5" />
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl bg-white dark:bg-[#202124] p-2 shadow-xl border border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide">
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(false);
                  onOpenShortcuts();
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-[#1f1f1f] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                <span>Raccourcis clavier</span>
                <kbd className="rounded border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#303134] px-1.5 py-0.5 text-[10px] font-mono">?</kbd>
              </button>
              <div className="my-1 border-t border-[#e0e2e7] dark:border-[#3c4043]" />
              <div className="px-3 py-2 text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">Webmail IMAP v1.2</p>
                <p className="mt-0.5">Interface Gmail Material You officielle</p>
                <p className="mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Chiffrement SSL/TLS sécurisé
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Paramètres rapides */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Paramètres"
          title="Paramètres rapides"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] active:scale-[0.95] transition-[background-color,transform]"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* Bascule Thème Clair / Sombre */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] active:scale-[0.95] transition-[background-color,transform]"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Grille Applications Google (9 points) */}
        <div className="relative" ref={appsRef}>
          <button
            type="button"
            onClick={() => setAppsOpen((prev) => !prev)}
            aria-label="Applications Google"
            title="Applications Google"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] active:scale-[0.95] transition-[background-color,transform]"
          >
            <Grid className="h-5 w-5" />
          </button>

          {appsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[292px] rounded-2xl border border-[#e0e2e7] bg-white p-4 shadow-2xl animate-fade-slide dark:border-[#3c4043] dark:bg-[#202124]">
              <div className="px-2 pb-3">
                <p className="text-[13px] font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                  Services connectés
                </p>
                <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                  9 services · Gmail actuellement ouvert
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {SERVICES.map((app, index) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => setAppsOpen(false)}
                      onPointerDown={ripple}
                      aria-label={`Ouvrir ${app.name}`}
                      style={{ animationDelay: `${index * SERVICE_STEP}ms` }}
                      className="ripple-host animate-fade-slide group flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-[background-color,transform] hover:bg-[#f1f3f4] active:scale-[0.95] dark:hover:bg-[#282a2c]"
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-110 ${
                          app.active
                            ? 'ring-2 ring-offset-2 ring-[#0b57d0] dark:ring-offset-[#202124]'
                            : ''
                        }`}
                        style={{ background: app.color }}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-medium text-[#1f1f1f] dark:text-[#e8eaed]">
                        {app.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Compte Utilisateur / Avatar */}
        <div className="relative pl-1" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            aria-label="Compte Google"
            title="Compte Google"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:ring-4 hover:ring-black/5 dark:hover:ring-white/10 transition-[background-color,box-shadow]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0b57d0] to-[#1a73e8] text-white text-xs font-semibold shadow-sm">
              H
            </div>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-3xl bg-[#edf2fa] dark:bg-[#282a2d] p-4 shadow-2xl border border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide">
              <div className="rounded-2xl bg-white dark:bg-[#1f1f1f] p-4 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0b57d0] to-[#1a73e8] text-white text-2xl font-bold shadow-md">
                  H
                </div>
                <h3 className="mt-3 text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                  Haytam Najim
                </h3>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  haytamnajim07@gmail.com
                </p>

                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-[#f0f4f9] dark:bg-[#2a2b2e] px-3 py-1 text-[11px] font-medium text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d3e3fd] dark:border-[#004a77]">
                  <Check className="h-3.5 w-3.5" /> Connecté via IMAP Sécurisé
                </div>

                <div className="mt-4 border-t border-[#e0e2e7] dark:border-[#3c4043] pt-3 text-left">
                  <div className="flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6] mb-1.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HardDrive className="h-3.5 w-3.5" /> Stockage Google
                    </span>
                    <span className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">1,45 Go / 15 Go</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e0e2e7] dark:bg-[#444746]">
                    <div className="h-full rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa]" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <a
                  href="https://myaccount.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:underline py-1"
                >
                  <span>Gérer votre compte Google</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
