/** Tâches locales du webmail, partagées entre le lecteur et le panneau latéral. */

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  /** Échéance éventuelle au format AAAA-MM-JJ. */
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  /** Adresse de l'expéditeur à l'origine de la tâche. */
  source?: string;
}

const TASKS_KEY = 'webmail_tasks';
const TASKS_CHANGED_EVENT = 'webmail:tasks-changed';

/** Lit les tâches persistées en ignorant silencieusement un stockage corrompu. */
export function loadTasks(fallback: TaskItem[] = []): TaskItem[] {
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(
      (item): item is TaskItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as TaskItem).id === 'string' &&
        typeof (item as TaskItem).text === 'string' &&
        typeof (item as TaskItem).done === 'boolean',
    );
  } catch {
    return fallback;
  }
}

/** Persiste les tâches et prévient les panneaux ouverts. */
export function saveTasks(tasks: TaskItem[]): void {
  try {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // Quota dépassé ou mode privé : on ignore silencieusement.
  }
  window.dispatchEvent(new CustomEvent<TaskItem[]>(TASKS_CHANGED_EVENT, { detail: tasks }));
}

/** Ajoute une tâche en tête de liste. Retourne `null` si le texte est vide. */
export function addTask(input: {
  text: string;
  deadline?: string;
  priority?: TaskItem['priority'];
  source?: string;
}): TaskItem | null {
  const text = input.text.trim();
  if (!text) return null;

  const task: TaskItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
    ...(input.deadline ? { deadline: input.deadline } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.source ? { source: input.source } : {}),
  };

  saveTasks([task, ...loadTasks([])]);
  return task;
}

/** S'abonne aux modifications des tâches. Retourne la fonction de désabonnement. */
export function subscribeTasks(listener: (tasks: TaskItem[]) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TaskItem[]>).detail;
    listener(Array.isArray(detail) ? detail : loadTasks([]));
  };
  window.addEventListener(TASKS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TASKS_CHANGED_EVENT, handler);
}
