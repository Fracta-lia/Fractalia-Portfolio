import React, { useState, useEffect } from 'react';
import { EditorStore } from './EditorStore';

interface HomeVisionEditorProps {
  initialQuote: string;
  heroImage: string;
}

export default function HomeVisionEditor({ initialQuote, heroImage }: HomeVisionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quote, setQuote] = useState(initialQuote);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuote(val);

    const md = `---
title: "Home"
heroImage: "${heroImage}"
artisticVisionQuote: "${val.replace(/"/g, '\\"')}"
---
`;
    EditorStore.setDraft('src/content/pages/home.md', {
      content: md,
      label: 'Visión Artística (Portada)',
    });
  };

  return (
    <section className="py-20 md:py-28 bg-white border-b border-neutral-100">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium block mb-4">
          Visión Artística
        </span>

        {isEditing ? (
          <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm">
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-medium">
              Frase de Portada (Haz clic para editar):
            </label>
            <textarea
              value={quote}
              onChange={handleChange}
              rows={3}
              className="w-full text-center font-serif text-2xl sm:text-3xl md:text-4xl text-neutral-900 font-light italic leading-snug bg-transparent focus:outline-none resize-y"
            />
          </div>
        ) : (
          <blockquote className="font-serif text-2xl sm:text-3xl md:text-4xl text-neutral-900 font-light italic leading-snug">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}

        <p className="font-sans text-xs tracking-[0.2em] uppercase text-neutral-500 mt-6">
          — Lía Paz
        </p>
      </div>
    </section>
  );
}
