import { config } from './config.ts';
import {
  demoGetAttachment,
  demoGetKeywords,
  demoGetMessage,
  demoListFolders,
  demoListMessages,
  demoMoveMessages,
  demoSetKeyword,
} from './demoData.ts';
import { MailError } from './errors.ts';
import {
  imapGetAttachment,
  imapGetMessage,
  imapGetMessageFlags,
  imapListFolders,
  imapListFollowups,
  imapListMessages,
} from './imap.ts';
import {
  moveMessage as imapMoveMessage,
  moveMessages as imapMoveMessages,
  setKeyword as imapSetKeyword,
  setKeywordOnUids as imapSetKeywordOnUids,
} from './imapFlags.ts';
import {
  cancelSnooze as cancelStoredSnooze,
  releaseDueSnoozes as releaseStoredSnoozes,
  scheduleSnoozes as scheduleStoredSnoozes,
} from './snooze.ts';
import type { FollowupCandidate, MessageQuery } from './types.ts';

function demoMove(uids: number[], from: string, to: string): Promise<number> {
  const moved = demoMoveMessages(uids, from, to);
  if (moved === 0) {
    return Promise.reject(new MailError('Message introuvable dans ce dossier.', 404));
  }
  return Promise.resolve(moved);
}

/**
 * Façade unique consommée par les routes.
 * En mode démo, aucune connexion IMAP n'est ouverte.
 */
export const service = {
  listFolders: () => (config.demoMode ? demoListFolders() : imapListFolders()),
  listMessages: (query: MessageQuery) =>
    config.demoMode ? demoListMessages(query) : imapListMessages(query),
  getMessage: (uid: number, folder: string) =>
    config.demoMode ? demoGetMessage(uid, folder) : imapGetMessage(uid, folder),
  getAttachment: (uid: number, index: number, folder: string) =>
    config.demoMode ? demoGetAttachment(uid, index, folder) : imapGetAttachment(uid, index, folder),
  listFollowups: (sentFolder: string, days: number, limit: number): Promise<FollowupCandidate[]> =>
    config.demoMode ? Promise.resolve([]) : imapListFollowups(sentFolder, days, limit),
  getMessageFlags: (uid: number, folder: string): Promise<string[]> =>
    config.demoMode ? Promise.resolve(demoGetKeywords(uid)) : imapGetMessageFlags(uid, folder),
  moveMessage: (uid: number, from: string, to: string): Promise<void> =>
    config.demoMode
      ? demoMove([uid], from, to).then(() => undefined)
      : imapMoveMessage(uid, from, to),
  moveMessages: (uids: number[], from: string, to: string): Promise<number> =>
    config.demoMode ? demoMove(uids, from, to) : imapMoveMessages(uids, from, to),
  setKeyword: (uid: number, folder: string, keyword: string, value: boolean): Promise<void> =>
    config.demoMode
      ? Promise.resolve(demoSetKeyword(uid, keyword, value))
      : imapSetKeyword(uid, folder, keyword, value),
  setKeywords: (
    uids: number[],
    folder: string,
    keyword: string,
    value: boolean,
  ): Promise<number> =>
    config.demoMode
      ? Promise.resolve(
          uids.map((uid) => demoSetKeyword(uid, keyword, value)).length,
        )
      : imapSetKeywordOnUids(uids, folder, keyword, value),
  snoozeMessages: (uids: number[], from: string, until: string): Promise<number> =>
    config.demoMode ? Promise.resolve(uids.length) : scheduleStoredSnoozes(uids, from, until),
  cancelSnooze: (sourceUid: number): Promise<void> =>
    config.demoMode ? Promise.resolve() : cancelStoredSnooze(sourceUid),
  releaseDueSnoozes: (): Promise<number> =>
    config.demoMode ? Promise.resolve(0) : releaseStoredSnoozes(),
};
