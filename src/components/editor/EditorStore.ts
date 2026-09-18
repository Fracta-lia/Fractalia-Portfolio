import type { FileChange } from '../../utils/github';

const EDIT_MODE_KEY = 'lia_edit_mode';
const GITHUB_TOKEN_KEY = 'lia_github_token';
const DRAFTS_KEY = 'lia_pending_drafts';

export interface PendingDrafts {
  [path: string]: {
    path: string;
    content?: string;
    encoding?: 'utf-8' | 'base64';
    delete?: boolean;
    label?: string; // Human-friendly label, e.g. "Obra: Siete Vidas", "Biografía"
  };
}

let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lia_editor_change'));
  }
}

export const EditorStore = {
  isEditMode(): boolean {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      localStorage.setItem(EDIT_MODE_KEY, 'true');
      return true;
    }
    return localStorage.getItem(EDIT_MODE_KEY) === 'true';
  },

  setEditMode(enabled: boolean) {
    if (typeof window === 'undefined') return;
    if (enabled) {
      localStorage.setItem(EDIT_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(EDIT_MODE_KEY);
    }
    notify();
  },

  getGitHubToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
  },

  setGitHubToken(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
    notify();
  },

  getDrafts(): PendingDrafts {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(DRAFTS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setDraft(path: string, draft: { content?: string; encoding?: 'utf-8' | 'base64'; delete?: boolean; label?: string }) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts();
    drafts[path] = { path, ...draft };
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    notify();
  },

  removeDraft(path: string) {
    if (typeof window === 'undefined') return;
    const drafts = this.getDrafts();
    delete drafts[path];
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    notify();
  },

  clearDrafts() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DRAFTS_KEY);
    notify();
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
