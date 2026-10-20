import { X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'c', desc: 'Rédiger un nouveau message' },
    { key: '/', desc: 'Rechercher dans les messages' },
    { key: 'j / ↓', desc: 'Message suivant' },
    { key: 'k / ↑', desc: 'Message précédent' },
    { key: 'e', desc: 'Archiver le message' },
    { key: 's', desc: 'Ajouter/supprimer des favoris (étoile)' },
    { key: '#', desc: 'Supprimer le message' },
    { key: 'r', desc: 'Répondre au message' },
    { key: 'a', desc: 'Répondre à tous' },
    { key: 'f', desc: 'Transférer le message' },
    { key: 'Esc', desc: 'Fermer la vue ou la fenêtre' },
    { key: '?', desc: 'Ouvrir cette aide de raccourcis' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-slide">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#202124] shadow-2xl border border-[#e0e2e7] dark:border-[#3c4043] overflow-hidden">
        <div className="flex h-14 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] px-6">
          <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
            Raccourcis clavier Gmail
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2 rounded-lg bg-[#f8f9fa] dark:bg-[#1f1f1f] border border-[#dadce0] dark:border-[#444746]"
            >
              <span className="text-xs text-[#444746] dark:text-[#c4c7c5]">{sc.desc}</span>
              <kbd className="rounded border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#282a2d] px-2 py-0.5 text-xs font-mono font-bold text-[#0b57d0] dark:text-[#a8c7fa] shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e0e2e7] dark:border-[#3c4043] px-6 py-3 flex justify-end bg-[#f8f9fa] dark:bg-[#282a2d]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#0b57d0] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#0842a0]"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
