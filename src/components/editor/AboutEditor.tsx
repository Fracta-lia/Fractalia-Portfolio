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
  const [statement, setStatement] = useState(initialStatement);
  const [semblanza, setSemblanza] = useState(initialSemblanza);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
    });
    return () => unsubscribe();
  }, []);

  const updateDraft = (newStatement: string, newSemblanza: string, newPortrait: string) => {
    const md = serializeAbout(newStatement, newSemblanza, newPortrait);
    EditorStore.setDraft('src/content/pages/about.md', {
      content: md,
      label: 'Página Sobre la Artista (Statement / Semblanza)',
    });
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
        <p className="font-sans text-[11px] text-neutral-400 uppercase tracking-widest text-center mt-3">
          Lía Paz en su estudio de creación
        </p>
      </div>

      {/* Right Column: Statement & Semblanza */}
      <div className="lg:col-span-7 space-y-10 text-neutral-700 font-sans font-light leading-relaxed reveal-on-scroll delay-150">
        {/* Section 1: Statement */}
        <div className="space-y-4">
          <EditableText
            contentKey="about.statement.title"
            defaultText="Statement"
            as="h2"
            className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal tracking-tight block"
          />

          {isEditing ? (
            <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                Statement de la Artista (Haz clic para editar / saltos de línea permitidos):
              </label>
              <textarea
                value={statement}
                onChange={handleStatementChange}
                rows={5}
                placeholder="Escribe tu statement de artista..."
                className="w-full text-base sm:text-lg text-neutral-900 font-serif italic bg-transparent focus:outline-none resize-y leading-relaxed"
              />
            </div>
          ) : (
            <div className="border-l-2 border-neutral-900/70 pl-5 sm:pl-6 py-1">
              <div className="text-base sm:text-lg text-neutral-800 leading-relaxed font-serif italic whitespace-pre-line space-y-2">
                {statement}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Semblanza */}
        <div className="space-y-4 pt-8 border-t border-neutral-100">
          <EditableText
            contentKey="about.semblanza.title"
            defaultText="Semblanza"
            as="h2"
            className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal tracking-tight block"
          />

          {isEditing ? (
            <div className="p-4 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                Semblanza Curricular / Trayectoria (Haz clic para editar / párrafos o markdown):
              </label>
              <textarea
                value={semblanza}
                onChange={handleSemblanzaChange}
                rows={8}
                placeholder="Escribe tu semblanza o trayectoria..."
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
            defaultText="Proceso & Materiales"
            as="h3"
            className="font-serif text-xl sm:text-2xl text-neutral-900 font-normal mb-4 block"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 bg-neutral-50 border border-neutral-100">
              <EditableText
                contentKey="about.process.f1.title"
                defaultText="Pigmentos & Óleos Finos"
                as="span"
                className="font-serif text-lg text-neutral-900 block mb-1"
              />
              <EditableText
                contentKey="about.process.f1.desc"
                defaultText="Uso exclusivo de óleos profesionales de alta resistencia a la luz y durabilidad de grado museo."
                as="p"
                className="text-xs text-neutral-500 leading-relaxed block"
                multiline
              />
            </div>
            <div className="p-5 bg-neutral-50 border border-neutral-100">
              <EditableText
                contentKey="about.process.f2.title"
                defaultText="Lienzos de Lino & Algodón"
                as="span"
                className="font-serif text-lg text-neutral-900 block mb-1"
              />
              <EditableText
                contentKey="about.process.f2.desc"
                defaultText="Soportes preparados artesanalmente con imprimación tradicional para asegurar una textura óptima."
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
            <span className="text-xs font-sans tracking-wider uppercase text-neutral-400 block">Sígueme en el proceso:</span>
            <a
              href="https://www.instagram.com/fracta.lia/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm text-neutral-900 hover:text-neutral-600 font-medium underline underline-offset-4"
            >
              @fracta.lia en Instagram
            </a>
          </div>
          <a
            href={`${base}/contact`}
            className="px-8 py-3.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.2em] uppercase font-medium transition-colors"
          >
            <EditableText
              contentKey="about.cta"
              defaultText="Contactar a Lía"
              as="span"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
