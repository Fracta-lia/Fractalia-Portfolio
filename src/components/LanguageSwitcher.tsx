import React, { useState, useEffect } from 'react';
import { EditorStore } from './editor/EditorStore';
import type { Lang } from '../i18n/translations';

interface Props {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: Props) {
  const [lang, setLang] = useState<Lang>(EditorStore.getLang());

  useEffect(() => {
    setLang(EditorStore.getLang());
    const unsubscribe = EditorStore.subscribe(() => {
      setLang(EditorStore.getLang());
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (target: Lang) => {
    if (lang === target) return;
    EditorStore.setLang(target);
  };

  return (
    <div
      className={`inline-flex items-center text-[11px] font-sans tracking-[0.2em] uppercase select-none ${className}`.trim()}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
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
