import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Columns2,
  Rows2,
  Square,
  CheckSquare2,
  MinusSquare,
  Keyboard,
  Check,
} from 'lucide-react';

export type SplitViewMode = 'none' | 'vertical' | 'horizontal';

interface TopToolbarProps {
  selectedCount: number;
  totalVisible: number;
  totalOverall: number;
  loading: boolean;
  onRefresh: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectRead: () => void;
  onSelectUnread: () => void;
  onSelectStarred: () => void;
  onBatchArchive: () => void;
  onBatchDelete: () => void;
  onBatchMarkRead: () => void;
  onBatchMarkUnread: () => void;
  onBatchSnooze: () => void;
  splitView: SplitViewMode;
  onChangeSplitView: (mode: SplitViewMode) => void;
  onOpenShortcuts: () => void;
}

export default function TopToolbar({
  selectedCount,
  totalVisible,
  totalOverall,
  loading,
  onRefresh,
  onSelectAll,
  onSelectNone,
  onSelectRead,
  onSelectUnread,
  onSelectStarred,
  onBatchArchive,
  onBatchDelete,
  onBatchMarkRead,
  onBatchMarkUnread,
  onBatchSnooze,
  splitView,
  onChangeSplitView,
  onOpenShortcuts,
}: TopToolbarProps) {
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);

  const selectMenuRef = useRef<HTMLDivElement>(null);
  const splitMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target as Node)) {
        setSelectMenuOpen(false);
      }
      if (splitMenuRef.current && !splitMenuRef.current.contains(e.target as Node)) {
        setSplitMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = selectedCount > 0 && selectedCount === totalVisible;
  const isSomeSelected = selectedCount > 0 && selectedCount < totalVisible;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] bg-white dark:bg-[#141414] px-4 select-none">
      {/* ── Gauche : Sélecteur et actions ── */}
      <div className="flex items-center gap-1">
        {/* Case à cocher principale avec dropdown */}
        <div className="relative flex items-center" ref={selectMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (selectedCount > 0) {
                onSelectNone();
              } else {
                onSelectAll();
              }
            }}
            title={selectedCount > 0 ? 'Désélectionner tout' : 'Sélectionner tout'}
            className="flex h-9 w-7 items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] rounded-l-md transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare2 className="h-4 w-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
            ) : isSomeSelected ? (
              <MinusSquare className="h-4 w-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectMenuOpen((prev) => !prev)}
            title="Options de sélection"
            className="flex h-9 w-5 items-center justify-center text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] rounded-r-md transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>

          {selectMenuOpen && (
            <div className="absolute left-0 top-10 z-50 w-36 rounded-lg bg-white dark:bg-[#202124] py-1 shadow-xl border border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide text-xs text-[#1f1f1f] dark:text-[#e8eaed]">
              <button
                type="button"
                onClick={() => {
                  onSelectAll();
                  setSelectMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectNone();
                  setSelectMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                Aucun
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectRead();
                  setSelectMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                Lus
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectUnread();
                  setSelectMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                Non lus
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectStarred();
                  setSelectMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
              >
                Suivis
              </button>
            </div>
          )}
        </div>

        {/* Bouton Actualiser */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Actualiser"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Actions contextuelles quand des messages sont cochés */}
        {selectedCount > 0 ? (
          <div className="flex items-center gap-1 pl-2 border-l border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide">
            <button
              type="button"
              onClick={onBatchArchive}
              title="Archiver"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onBatchDelete}
              title="Supprimer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onBatchMarkRead}
              title="Marquer comme lu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <MailOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onBatchMarkUnread}
              title="Marquer comme non lu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onBatchSnooze}
              title="Mettre en attente"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Droite : Pagination & Modes d'affichage ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] tabular-nums font-medium">
          {totalVisible > 0 ? `1–${totalVisible} sur ${totalOverall}` : '0 message'}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled
            title="Page précédente"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={totalVisible >= totalOverall}
            title="Page suivante"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Volet de lecture / Séparation */}
        <div className="relative pl-1 border-l border-[#e0e2e7] dark:border-[#3c4043]" ref={splitMenuRef}>
          <button
            type="button"
            onClick={() => setSplitMenuOpen((prev) => !prev)}
            title="Activer/désactiver le volet de lecture"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            {splitView === 'vertical' ? (
              <Columns2 className="h-4 w-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
            ) : splitView === 'horizontal' ? (
              <Rows2 className="h-4 w-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          {splitMenuOpen && (
            <div className="absolute right-0 top-9 z-50 w-52 rounded-xl bg-white dark:bg-[#202124] p-1.5 shadow-xl border border-[#e0e2e7] dark:border-[#3c4043] animate-fade-slide text-xs text-[#1f1f1f] dark:text-[#e8eaed]">
              <p className="px-3 py-1 font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
                Volet de lecture
              </p>
              <button
                type="button"
                onClick={() => {
                  onChangeSplitView('none');
                  setSplitMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] ${
                  splitView === 'none' ? 'font-semibold text-[#0b57d0] dark:text-[#a8c7fa]' : ''
                }`}
              >
                <span>Pas de séparation</span>
                {splitView === 'none' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeSplitView('vertical');
                  setSplitMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] ${
                  splitView === 'vertical' ? 'font-semibold text-[#0b57d0] dark:text-[#a8c7fa]' : ''
                }`}
              >
                <span>Séparation verticale</span>
                {splitView === 'vertical' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeSplitView('horizontal');
                  setSplitMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] ${
                  splitView === 'horizontal' ? 'font-semibold text-[#0b57d0] dark:text-[#a8c7fa]' : ''
                }`}
              >
                <span>Séparation horizontale</span>
                {splitView === 'horizontal' && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>

        {/* Bouton Raccourcis clavier */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Raccourcis clavier (?)"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
