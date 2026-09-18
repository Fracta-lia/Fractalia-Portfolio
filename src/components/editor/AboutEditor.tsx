import React, { useState, useEffect, useRef } from 'react';
import { EditorStore } from './EditorStore';
import EditableText from './EditableText';
import EditableImage from './EditableImage';

interface AboutEditorProps {
  initialPortrait: string;
  initialQuote: string;
  initialBio: string;
  base?: string;
}

function serializeAbout(quote: string, portrait: string, bio: string): string {
  return `---
title: "Sobre la Artista"
quote: "${quote.replace(/"/g, '\\"')}"
portrait: "${portrait}"
---

${bio.trim()}
`;
}

export default function AboutEditor({
  initialPortrait,
  initialQuote,
  initialBio,
  base = '',
}: AboutEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [portrait, setPortrait] = useState(initialPortrait);
  const [quote, setQuote] = useState(initialQuote);
  const [bio, setBio] = useState(initialBio);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
    });
    return () => unsubscribe();
  }, []);

  const updateDraft = (newQuote: string, newPortrait: string, newBio: string) => {
    const md = serializeAbout(newQuote, newPortrait, newBio);
    EditorStore.setDraft('src/content/pages/about.md', {
      content: md,
      label: 'Página Sobre la Artista (Bio/Cita)',
    });
  };

  const handleQuoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuote(val);
    updateDraft(val, portrait, bio);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBio(val);
    updateDraft(quote, portrait, val);
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
      updateDraft(quote, portraitPath, bio);
    };
    reader.readAsDataURL(file);
  };

  const portraitSrc = portrait.startsWith('data:') || portrait.startsWith('http') ? portrait : `${base}${portrait}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
      {/* Left Column: Portrait */}
      <div className="lg:col-span-5 sticky top-28 reveal-on-scroll">
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

      {/* Right Column: Narrative & Biography */}
      <div className="lg:col-span-7 space-y-8 text-neutral-700 font-sans font-light leading-relaxed reveal-on-scroll delay-150">
        <div>
          <EditableText
            contentKey="about.bio.title"
            defaultText="La pintura como archivo emocional"
            as="h2"
            className="font-serif text-2xl sm:text-3xl text-neutral-950 font-normal mb-4 block"
          />

          {isEditing ? (
            <div className="p-3 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-medium">
                Cita Filosófica (Haz clic para editar):
              </label>
              <textarea
                value={quote}
                onChange={handleQuoteChange}
                rows={3}
                className="w-full text-base sm:text-lg text-neutral-800 font-serif italic bg-transparent focus:outline-none resize-y"
              />
            </div>
          ) : (
            <p className="text-base sm:text-lg text-neutral-800 leading-relaxed font-normal font-serif italic">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>

        <div>
          {isEditing ? (
            <div className="p-3 bg-neutral-50 border border-dashed border-neutral-300 rounded-sm">
              <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-medium">
                Texto de Biografía (Markdown permitido):
              </label>
              <textarea
                value={bio}
                onChange={handleBioChange}
                rows={10}
                className="w-full text-sm sm:text-base text-neutral-700 font-sans leading-relaxed bg-transparent focus:outline-none resize-y"
              />
            </div>
          ) : (
            <div className="space-y-4 text-sm sm:text-base text-neutral-600">
              {bio.split('\n\n').map((paragraph, idx) => (
                <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          )}
        </div>

        {/* Creative Approach & Values */}
        <div className="pt-6 border-t border-neutral-100">
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
