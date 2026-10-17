import React, { useState, useEffect, useRef } from 'react';
import { EditorStore } from './EditorStore';
import EditableText from './EditableText';
import EditableImage from './EditableImage';

interface AboutEditorProps {
  initialPortrait: string;
  initialStatement: string;
  initialSemblanza: string;
  initialQuote?: string;
  initialBio?: string;
  base?: string;
}

function serializeAbout(statement: string, semblanza: string, portrait: string): string {
  return `---
title: "Sobre la Artista"
portrait: "${portrait}"
statement: ${JSON.stringify(statement.trim())}
quote: ${JSON.stringify(statement.trim())}
---

${semblanza.trim()}
`;
}

export default function AboutEditor({
  initialPortrait,
  initialStatement,
  initialSemblanza,
  base = '',
}: AboutEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [portrait, setPortrait] = useState(initialPortrait);
  const [statement, setStatement] = useState(EditorStore.getText('about.statement.body', initialStatement));
  const [semblanza, setSemblanza] = useState(EditorStore.getText('about.semblanza.body', initialSemblanza));
  const [lang, setLang] = useState(EditorStore.getLang());

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    setLang(EditorStore.getLang());
    setStatement(EditorStore.getText('about.statement.body', initialStatement));
    setSemblanza(EditorStore.getText('about.semblanza.body', initialSemblanza));

    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
      setLang(EditorStore.getLang());
      setStatement(EditorStore.getText('about.statement.body', initialStatement));
      setSemblanza(EditorStore.getText('about.semblanza.body', initialSemblanza));
    });

    const handleLangChange = (e: any) => {
      const newL = e?.detail?.lang || EditorStore.getLang();
      setLang(newL);
      setStatement(EditorStore.getText('about.statement.body', initialStatement, newL));
      setSemblanza(EditorStore.getText('about.semblanza.body', initialSemblanza, newL));
    };
    window.addEventListener('lia_lang_change', handleLangChange);

    return () => {
      unsubscribe();
      window.removeEventListener('lia_lang_change', handleLangChange);
    };
  }, [initialStatement, initialSemblanza]);

  const updateDraft = (newStatement: string, newSemblanza: string, newPortrait: string) => {
    EditorStore.updateText('about.statement.body', newStatement);
    EditorStore.updateText('about.semblanza.body', newSemblanza);

    if (EditorStore.getLang() === 'es') {
      const md = serializeAbout(newStatement, newSemblanza, newPortrait);
      EditorStore.setDraft('src/content/pages/about.md', {
        content: md,
        label: 'Página Sobre la Artista (Statement / Semblanza)',
      });
    }
  };

  const handleStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setStatement(val);
    updateDraft(val, semblanza, portrait);
  };

  const handleSemblanzaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSemblanza(val);
    updateDraft(statement, val, portrait);
  };

  const handlePortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const portraitPath = '/images/about/lia-paz.webp';

      EditorStore.setDraft(`public${portraitPath}`, {
        content: base64Data,
        encoding: 'base64',
        label: 'Foto de Artista',
      });

      setPortrait(result);
      updateDraft(statement, semblanza, portraitPath);
    };
    reader.readAsDataURL(file);
  };

  const portraitSrc = portrait.startsWith('data:') || portrait.startsWith('http') ? portrait : `${base}${portrait}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
      {/* Left Column: Portrait */}
      <div className="lg:col-span-5 relative lg:sticky lg:top-28 reveal-on-scroll">
        <div className="relative aspect-[3/4] bg-neutral-100 border border-neutral-200 overflow-hidden shadow-sm group">
          <EditableImage
            contentKey="about.portrait.image"
            defaultSrc={initialPortrait}
            alt="Lía Paz en el estudio"
            label="Foto: Retrato de Artista en el Estudio"
            className="w-full h-full object-cover contrast-[1.02]"
            wrapperClassName="w-full h-full"
            base={base}
          />
        </div>
        <p data-i18n="about.location_caption" className="font-sans text-[11px] text-neutral-400 uppercase tracking-widest text-center mt-3">
          {lang === 'en' ? 'Lía Paz in her studio · Puebla, Mexico' : 'Lía Paz en su estudio · Puebla, México'}
        </p>
      </div>

      {/* Right Column: Statement & Semblanza */}
      <div className="lg:col-span-7 space-y-10 text-neutral-700 font-sans font-light leading-relaxed reveal-on-scroll delay-150">
        {/* Section 1: Statement */}
        <div className="space-y-6">
          <EditableText
            contentKey="about.statement.title"
            defaultText={lang === 'en' ? "Artist's Statement" : "Statement de la Artista"}
            as="h2"
            className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal tracking-tight block"
          />

          {isEditing ? (
            <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                {lang === 'en' ? "Artist's Statement (Click to edit):" : "Statement de la Artista (Haz clic para editar):"}
              </label>
              <textarea
                value={statement}
                onChange={handleStatementChange}
                rows={8}
                placeholder={lang === 'en' ? "Write your artist statement..." : "Escribe tu statement de artista..."}
                className="w-full text-sm sm:text-base text-neutral-700 font-sans leading-relaxed bg-transparent focus:outline-none resize-y"
              />
            </div>
          ) : (
            <div className="pl-6 sm:pl-8 border-l-[3px] border-neutral-200 py-1 space-y-5 text-xl sm:text-2xl text-neutral-800 font-serif italic leading-relaxed whitespace-pre-line">
              {statement.split('\n\n').map((paragraph, idx) => (
                <p
                  key={idx}
                  dangerouslySetInnerHTML={{
                    __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Semblanza */}
        <div className="space-y-6 pt-8 border-t border-neutral-100">
          <EditableText
            contentKey="about.semblanza.title"
            defaultText={lang === 'en' ? "Biography & Career" : "Semblanza"}
            as="h2"
            className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal tracking-tight block"
          />

          {isEditing ? (
            <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                {lang === 'en' ? "Biography & Career (Click to edit):" : "Semblanza Curricular / Trayectoria (Haz clic para editar):"}
              </label>
              <textarea
                value={semblanza}
                onChange={handleSemblanzaChange}
                rows={8}
                placeholder={lang === 'en' ? "Write your biography or career..." : "Escribe tu semblanza o trayectoria..."}
                className="w-full text-sm sm:text-base text-neutral-700 font-sans leading-relaxed bg-transparent focus:outline-none resize-y"
              />
            </div>
          ) : (
            <div className="space-y-4 text-sm sm:text-base text-neutral-600 font-sans leading-relaxed font-light whitespace-pre-line">
              {semblanza.split('\n\n').map((paragraph, idx) => (
                <p
                  key={idx}
                  dangerouslySetInnerHTML={{
                    __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Creative Approach & Values */}
        <div className="pt-8 border-t border-neutral-100">
          <EditableText
            contentKey="about.process.title"
            defaultText={lang === 'en' ? "Process & Materials" : "Proceso & Materiales"}
            as="h3"
            className="font-serif text-2xl sm:text-3xl text-neutral-950 font-normal tracking-tight block mb-6"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 bg-neutral-50 border border-neutral-100">
              <EditableText
                contentKey="about.process.f1.title"
                defaultText={lang === 'en' ? "Fine Pigments & Oils" : "Pigmentos & Óleos Finos"}
                as="span"
                className="font-serif text-lg text-neutral-900 block mb-1"
              />
              <EditableText
                contentKey="about.process.f1.desc"
                defaultText={lang === 'en' ? "Exclusive use of professional artists' oils with exceptional lightfastness and museum-grade archival quality." : "Uso exclusivo de óleos profesionales de alta resistencia a la luz y durabilidad de grado museo."}
                as="p"
                className="text-xs text-neutral-500 leading-relaxed block"
                multiline
              />
            </div>
            <div className="p-5 bg-neutral-50 border border-neutral-100">
              <EditableText
                contentKey="about.process.f2.title"
                defaultText={lang === 'en' ? "Linen & Cotton Canvases" : "Lienzos de Lino & Algodón"}
                as="span"
                className="font-serif text-lg text-neutral-900 block mb-1"
              />
              <EditableText
                contentKey="about.process.f2.desc"
                defaultText={lang === 'en' ? "Artisan-prepared supports primed traditionally to guarantee optimal tooth, flexibility, and longevity." : "Soportes preparados artesanalmente con imprimación tradicional para asegurar una textura óptima."}
                as="p"
                className="text-xs text-neutral-500 leading-relaxed block"
                multiline
              />
            </div>
          </div>
        </div>

        {/* Social / Contact Links */}
        <div className="pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span data-i18n="about.follow_label" className="text-xs font-sans tracking-wider uppercase text-neutral-400 block">
              {lang === 'en' ? 'Follow the creative process:' : 'Sígueme en el proceso:'}
            </span>
            <a
              href="https://www.instagram.com/fracta.lia/"
              target="_blank"
              rel="noopener noreferrer"
              data-i18n="about.follow_link"
              className="font-sans text-sm text-neutral-900 hover:text-neutral-600 font-medium underline underline-offset-4"
            >
              {lang === 'en' ? '@fracta.lia on Instagram' : '@fracta.lia en Instagram'}
            </a>
          </div>
          <a
            href={`${base}/contact`}
            className="px-8 py-3.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.2em] uppercase font-medium transition-colors"
          >
            <EditableText
              contentKey="about.cta"
              defaultText={lang === 'en' ? "Contact Lía" : "Contactar a Lía"}
              as="span"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
