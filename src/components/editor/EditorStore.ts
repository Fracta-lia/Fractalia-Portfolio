import type { FileChange } from '../../utils/github';
import initialSiteContentEs from '../../data/siteContent.json';
import initialSiteContentEn from '../../data/siteContent.en.json';
import { getInitialLanguage, type Lang, LANG_STORAGE_KEY } from '../../i18n/translations';

const EDIT_MODE_KEY = 'lia_edit_mode';
const GITHUB_TOKEN_KEY = 'lia_github_token';
const DRAFTS_KEY = 'lia_pending_drafts';
const CONTENT_KEY_ES = 'lia_site_content';
const CONTENT_KEY_EN = 'lia_site_content_en';

export interface PendingDrafts {
  [path: string]: {
    path: string;
    content?: string;
    encoding?: 'utf-8' | 'base64';
    delete?: boolean;
    label?: string; // Human-friendly label, e.g. "Obra: Siete Vidas", "Biografía"
  };
}

let currentLang: Lang = getInitialLanguage();
let listeners: Array<() => void> = [];
let memoryDrafts: PendingDrafts = {};
let sessionPreviews: Record<string, string> = {};

function notify() {
  listeners.forEach((l) => l());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lia_editor_change'));
  }
}

// Synchronize if another island or script updates language
if (typeof window !== 'undefined') {
  window.addEventListener('lia_lang_change', (e: any) => {
    const newLang = e?.detail?.lang;
    if (newLang && (newLang === 'es' || newLang === 'en')) {
      currentLang = newLang;
      notify();
    }
  });
}

export const EditorStore = {
  getLang(): Lang {
    return currentLang;
  },

  setLang(lang: Lang) {
    if (typeof window === 'undefined') return;
    currentLang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new CustomEvent('lia_lang_change', { detail: { lang } }));
    } catch (e) {
      console.warn('Error saving language:', e);
    }
    notify();
  },

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
      document.body.classList.add('is-edit-mode');
      document.body.setAttribute('data-edit-mode', 'true');
    } else {
      localStorage.removeItem(EDIT_MODE_KEY);
      document.body.classList.remove('is-edit-mode');
      document.body.removeAttribute('data-edit-mode');
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
      const parsed = data ? JSON.parse(data) : {};
      return { ...parsed, ...memoryDrafts };
    } catch {
      return { ...memoryDrafts };
    }
  },

  setDraft(path: string, draft: { content?: string; encoding?: 'utf-8' | 'base64'; delete?: boolean; label?: string }) {
    if (typeof window === 'undefined') return;
    memoryDrafts[path] = { path, ...draft };

    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(memoryDrafts));
    } catch (quotaErr) {
      console.warn('LocalStorage quota warning (draft preserved in memory):', quotaErr);
      try {
        // Strip out large base64 strings from localStorage fallback so it never throws QuotaExceededError
        const lightweight: PendingDrafts = {};
        for (const k in memoryDrafts) {
          lightweight[k] = {
            ...memoryDrafts[k],
            content: memoryDrafts[k].encoding === 'base64' ? '' : memoryDrafts[k].content,
          };
        }
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(lightweight));
      } catch {}
    }
    notify();
  },

  removeDraft(path: string) {
    if (typeof window === 'undefined') return;
    delete memoryDrafts[path];
    try {
      const drafts = this.getDrafts();
      delete drafts[path];
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {}
    notify();
  },

  clearDrafts() {
    memoryDrafts = {};
    sessionPreviews = {};
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(DRAFTS_KEY);
        localStorage.removeItem(CONTENT_KEY_ES);
        localStorage.removeItem(CONTENT_KEY_EN);
      } catch {}
    }
    notify();
  },

  // Site-wide editable text store (per active language)
  getAllContent(lang?: Lang): Record<string, string> {
    const l = lang || currentLang;
    const initial = (l === 'en' ? initialSiteContentEn : initialSiteContentEs) as Record<string, string>;
    if (typeof window === 'undefined') return initial;

    const storageKey = l === 'en' ? CONTENT_KEY_EN : CONTENT_KEY_ES;
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...initial, ...parsed };
    } catch {
      return initial;
    }
  },

  getText(key: string, fallback: string, lang?: Lang): string {
    const l = lang || currentLang;
    const all = this.getAllContent(l);
    if (all[key] !== undefined && all[key] !== '') {
      return all[key];
    }
    // Fallback to opposing language or passed fallback
    const fallbackDict = (l === 'en' ? initialSiteContentEn : initialSiteContentEs) as Record<string, string>;
    return fallbackDict[key] !== undefined ? fallbackDict[key] : fallback;
  },

  getImage(key: string, fallback: string): string {
    if (sessionPreviews[key]) return sessionPreviews[key];
    const all = this.getAllContent();
    return all[key] !== undefined ? all[key] : fallback;
  },

  updateText(key: string, value: string) {
    if (typeof window === 'undefined') return;
    const l = currentLang;
    const all = this.getAllContent(l);
    all[key] = value;

    const storageKey = l === 'en' ? CONTENT_KEY_EN : CONTENT_KEY_ES;
    try {
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Save as draft to corresponding JSON file
    const targetPath = l === 'en' ? 'src/data/siteContent.en.json' : 'src/data/siteContent.json';
    this.setDraft(targetPath, {
      content: JSON.stringify(all, null, 2),
      label: `Texto (${l.toUpperCase()}): ${key}`,
    });
    notify();
  },

  updateImage(
    key: string,
    imagePath: string,
    fileData?: { base64: string; targetPath: string; localPreviewUrl?: string; label?: string }
  ) {
    if (typeof window === 'undefined') return;
    
    // Store preview in memory
    if (fileData?.localPreviewUrl) {
      sessionPreviews[key] = fileData.localPreviewUrl;
    }

    const all = this.getAllContent();
    all[key] = imagePath; // Keep only relative path in localStorage
    try {
      localStorage.setItem(CONTENT_KEY_ES, JSON.stringify(all));
    } catch (e) {
      console.warn('LocalStorage image content error:', e);
    }

    // If there is an uploaded binary file, register the draft
    if (fileData?.base64 && fileData.targetPath) {
      this.setDraft(fileData.targetPath, {
        content: fileData.base64,
        encoding: 'base64',
        label: fileData.label || `Imagen: ${key}`,
      });
    }

    // Save relative image path into src/data/siteContent.json for git commit
    this.setDraft('src/data/siteContent.json', {
      content: JSON.stringify(all, null, 2),
      label: `Imagen: ${key}`,
    });
    notify();
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
