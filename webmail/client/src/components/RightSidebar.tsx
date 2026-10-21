import { useState } from 'react';
import {
  Calendar,
  Lightbulb,
  CheckSquare,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';

export type CompanionPanelType = 'calendar' | 'keep' | 'tasks' | 'contacts' | null;

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
}

/* ── Persistance localStorage (#10) : lectures/écritures protégées ── */

const TASKS_KEY = 'webmail_tasks';
const NOTES_KEY = 'webmail_notes';

const DEFAULT_TASKS: TaskItem[] = [
  { id: '1', text: 'Répondre aux emails importants', done: false },
  { id: '2', text: 'Vérifier la configuration du serveur IMAP', done: true },
  { id: '3', text: 'Télécharger les pièces jointes des factures', done: false },
];

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: '1',
    title: 'Identifiants IMAP',
    content: 'Serveur: imap.gmail.com, Port: 993, Chiffrement: SSL/TLS',
  },
  {
    id: '2',
    title: 'Liste de courses',
    content: 'Café, thé vert, fruits frais pour le bureau',
  },
];

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota dépassé ou mode privé : on ignore silencieusement.
  }
}

export default function RightSidebar() {
  const [activePanel, setActivePanel] = useState<CompanionPanelType>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Données interactives pour les tâches (persistées)
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadStored(TASKS_KEY, DEFAULT_TASKS));
  const [newTaskText, setNewTaskText] = useState('');

  // Données interactives pour Google Keep (persistées)
  const [notes, setNotes] = useState<NoteItem[]>(() => loadStored(NOTES_KEY, DEFAULT_NOTES));
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Sauvegarde automatique à chaque changement
  const handleSetTasks = (updater: (prev: TaskItem[]) => TaskItem[]) => {
    setTasks((prev) => {
      const next = updater(prev);
      saveStored(TASKS_KEY, next);
      return next;
    });
  };

  const handleSetNotes = (updater: (prev: NoteItem[]) => NoteItem[]) => {
    setNotes((prev) => {
      const next = updater(prev);
      saveStored(NOTES_KEY, next);
      return next;
    });
  };

  const togglePanel = (panel: CompanionPanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    handleSetTasks((prev) => [
      { id: Date.now().toString(), text: newTaskText.trim(), done: false },
      ...prev,
    ]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    handleSetTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const deleteTask = (id: string) => {
    handleSetTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    handleSetNotes((prev) => [
      {
        id: Date.now().toString(),
        title: newNoteTitle.trim() || 'Note sans titre',
        content: newNoteContent.trim(),
      },
      ...prev,
    ]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const deleteNote = (id: string) => {
    handleSetNotes((prev) => prev.filter((n) => n.id !== id));
  };

  if (collapsed) {
    return (
      <div className="hidden lg:flex items-end justify-center pb-3 w-4 shrink-0 bg-[#f6f8fc] dark:bg-[#1f1f1f]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Afficher le panneau latéral"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex shrink-0 select-none">
      {/* ── Tiroir de contenu ouvert ── */}
      {activePanel !== null && (
        <div className="w-[300px] border-l border-[#e0e2e7] dark:border-[#3c4043] bg-white dark:bg-[#141414] flex flex-col h-full animate-fade-slide shadow-lg z-20">
          {/* En-tête du volet */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] px-4">
            <span className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
              {activePanel === 'tasks' && 'Google Tâches'}
              {activePanel === 'keep' && 'Google Keep'}
              {activePanel === 'calendar' && 'Google Agenda'}
              {activePanel === 'contacts' && 'Google Contacts'}
            </span>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Contenu spécifique au volet sélectionné */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Volet TÂCHES */}
            {activePanel === 'tasks' && (
              <div>
                <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Ajouter une tâche..."
                    className="flex-1 rounded-lg border border-[#dadce0] dark:border-[#444746] bg-transparent px-3 py-1.5 text-xs text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0]"
                  />
                  <button
                    type="submit"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b57d0] text-white hover:bg-[#0842a0]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </form>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-[#e0e2e7] dark:border-[#303134] p-2.5 hover:bg-[#f8f9fa] dark:hover:bg-[#1f1f1f] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={`flex h-4 w-4 shrink-0 mt-0.5 items-center justify-center rounded border transition-colors ${
                          task.done
                            ? 'bg-[#0b57d0] border-[#0b57d0] text-white'
                            : 'border-[#5f6368] text-transparent hover:border-[#0b57d0]'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>
                      <span
                        className={`flex-1 text-xs leading-relaxed ${
                          task.done
                            ? 'line-through text-[#5f6368] dark:text-[#9aa0a6]'
                            : 'text-[#1f1f1f] dark:text-[#e8eaed]'
                        }`}
                      >
                        {task.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#5f6368] dark:text-[#9aa0a6] hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volet KEEP */}
            {activePanel === 'keep' && (
              <div>
                {!isAddingNote ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(true)}
                    className="flex w-full items-center gap-2 rounded-xl border border-[#dadce0] dark:border-[#444746] p-3 text-xs text-[#5f6368] dark:text-[#9aa0a6] shadow-xs hover:shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Créer une note...</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddNote} className="rounded-xl border border-[#dadce0] dark:border-[#444746] p-3 space-y-2 bg-[#f8f9fa] dark:bg-[#1f1f1f]">
                    <input
                      type="text"
                      placeholder="Titre"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                    />
                    <textarea
                      placeholder="Créer une note..."
                      rows={3}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="text-xs px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        Fermer
                      </button>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 bg-[#0b57d0] text-white rounded font-medium"
                      >
                        Ajouter
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-4 space-y-2.5">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="group relative rounded-xl border border-[#e0e2e7] dark:border-[#303134] p-3 hover:shadow-md transition-all bg-white dark:bg-[#141414]"
                    >
                      <h4 className="text-xs font-bold text-[#1f1f1f] dark:text-[#e8eaed] mb-1">
                        {note.title}
                      </h4>
                      <p className="text-xs text-[#444746] dark:text-[#c4c7c5] whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-[#5f6368] dark:text-[#9aa0a6] hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volet AGENDA */}
            {activePanel === 'calendar' && (
              <div className="text-xs space-y-3">
                <div className="rounded-xl bg-[#eaf1fb] dark:bg-[#004a77]/30 p-3 text-[#0b57d0] dark:text-[#a8c7fa]">
                  <p className="font-semibold">Aujourd'hui</p>
                  <p className="text-[11px] opacity-80">19 octobre 2026</p>
                </div>
                <div className="border-l-2 border-[#0b57d0] pl-3 py-1">
                  <p className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">Synchronisation IMAP</p>
                  <p className="text-[#5f6368] dark:text-[#9aa0a6]">Toutes les 60 secondes</p>
                </div>
                <div className="border-l-2 border-emerald-500 pl-3 py-1">
                  <p className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">Session Webmail Active</p>
                  <p className="text-[#5f6368] dark:text-[#9aa0a6]">21:00 - 23:00</p>
                </div>
              </div>
            )}

            {/* Volet CONTACTS */}
            {activePanel === 'contacts' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#202124]">
                  <div className="h-7 w-7 rounded-full bg-[#0b57d0] text-white flex items-center justify-center font-bold text-[10px]">
                    H
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">Haytam Najim</p>
                    <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate">haytamnajim07@gmail.com</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rail vertical des icônes d'applications Google compagnon ── */}
      <div className="flex flex-col items-center justify-between py-3 w-14 shrink-0 bg-[#f6f8fc] dark:bg-[#1f1f1f] border-l border-[#e0e2e7] dark:border-[#3c4043]">
        <div className="flex flex-col items-center gap-2">
          {/* Agenda */}
          <button
            type="button"
            onClick={() => togglePanel('calendar')}
            title="Google Agenda"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              activePanel === 'calendar'
                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
            }`}
          >
            <Calendar className="h-5 w-5 text-[#1a73e8]" />
          </button>

          {/* Keep */}
          <button
            type="button"
            onClick={() => togglePanel('keep')}
            title="Google Keep"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              activePanel === 'keep'
                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
            }`}
          >
            <Lightbulb className="h-5 w-5 text-[#f9ab00]" />
          </button>

          {/* Tâches */}
          <button
            type="button"
            onClick={() => togglePanel('tasks')}
            title="Google Tâches"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              activePanel === 'tasks'
                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
            }`}
          >
            <CheckSquare className="h-5 w-5 text-[#1a73e8]" />
          </button>

          {/* Contacts */}
          <button
            type="button"
            onClick={() => togglePanel('contacts')}
            title="Contacts"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              activePanel === 'contacts'
                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
            }`}
          >
            <UserCheck className="h-5 w-5 text-[#188038]" />
          </button>
        </div>

        {/* Bouton replier le volet compagnon */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Masquer le panneau latéral"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
