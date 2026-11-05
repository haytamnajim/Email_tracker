import { config } from './config.ts';
import {
  demoGetAttachment,
  demoGetMessage,
  demoListFolders,
  demoListMessages,
} from './demoData.ts';
import { imapGetAttachment, imapGetMessage, imapListFolders, imapListFollowups, imapListMessages } from './imap.ts';
import type { FollowupCandidate, MessageQuery } from './types.ts';

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
};
