import React, { useState, useEffect } from 'react';
import { EditorStore } from './editor/EditorStore';
import type { Lang } from '../i18n/translations';

interface Props {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: Props) {
  const [lang, setLang] = useState<Lang>(() => EditorStore.getLang());

  useEffect(() => {
    setLang(EditorStore.getLang());
    const unsubscribe = EditorStore.subscribe(() => {
      setLang(EditorStore.getLang());
    });
    const handleLangChange = (e: any) => {
      const newL = e?.detail?.lang;
      if (newL) setLang(newL);
    };
    window.addEventListener('lia_lang_change', handleLangChange);
    return () => {
      unsubscribe();
      window.removeEventListener('lia_lang_change', handleLangChange);
    };
  }, []);

  const handleSelect = (target: Lang) => {
    if (typeof window !== 'undefined' && (window as any).__liaSetLang) {
      (window as any).__liaSetLang(target);
    } else {
      EditorStore.setLang(target);
    }
    setLang(target);
  };

  return (
    <div
      className={`inline-flex items-center text-[11px] font-sans tracking-[0.2em] uppercase select-none ${className}`.trim()}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        data-lang-btn="es"
        onClick={() => handleSelect('es')}
        className={`px-1 py-0.5 transition-all cursor-pointer ${
          lang === 'es'
            ? 'text-neutral-950 font-semibold border-b border-neutral-900'
            : 'text-neutral-400 hover:text-neutral-800'
        }`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
      <span className="text-neutral-300 text-[10px] mx-1">/</span>
      <button
        type="button"
        data-lang-btn="en"
        onClick={() => handleSelect('en')}
        className={`px-1 py-0.5 transition-all cursor-pointer ${
          lang === 'en'
            ? 'text-neutral-950 font-semibold border-b border-neutral-900'
            : 'text-neutral-400 hover:text-neutral-800'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
