import React, { useState, useEffect, useCallback } from 'react';

export interface GalleryItem {
  id: string;
  title: string;
  technique?: string;
  dimensions?: string;
  year?: string;
  src: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

interface GalleryGridProps {
  items: GalleryItem[];
}

export default function GalleryGrid({ items }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + items.length) % items.length : null));
  }, [items.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % items.length : null));
  }, [items.length]);

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Lock body scroll while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  return (
    <div className="w-full">
      {/* Sean Layh style: Masonry layout respecting natural image aspect ratios, no forced crops */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 sm:gap-8">
        {items.map((item, index) => (
          <div key={item.id} className="break-inside-avoid mb-6 sm:mb-8">
            <button
              type="button"
              onClick={() => handleOpen(index)}
              aria-label={`Ver ficha técnica de ${item.title}`}
              className="group relative block w-full overflow-hidden bg-neutral-100 border border-neutral-200/70 shadow-xs cursor-pointer focus:outline-none"
            >
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              />
            </button>
          </div>
        ))}
      </div>

      {/* Modal / Ficha Técnica Lightbox */}
      {selectedItem !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in cursor-pointer"
        >
          {/* Main Modal Box (clicks inside do not close) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl xl:max-w-7xl max-h-[94vh] bg-white border border-neutral-200 shadow-2xl flex flex-col lg:flex-row overflow-hidden cursor-default"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar ficha técnica"
              className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/90 hover:bg-neutral-900 hover:text-white text-neutral-800 flex items-center justify-center transition-colors shadow-sm focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left/Center: High-Resolution Artwork (Dominant section, up to 86vh) */}
            <div className="lg:flex-1 bg-neutral-950 flex items-center justify-center p-3 sm:p-6 lg:p-8 min-h-[380px] lg:min-h-[620px] relative overflow-hidden">
              <img
                src={selectedItem.src}
                alt={selectedItem.title}
                className="max-h-[60vh] sm:max-h-[68vh] lg:max-h-[86vh] w-auto max-w-full object-contain shadow-2xl transition-all duration-300"
              />

              {/* Prev / Next Navigation Arrows over image */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Obra anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Obra siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Right: Ficha Técnica (Compact, elegant sidebar) */}
            <div className="lg:w-80 xl:w-96 flex-shrink-0 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-neutral-100">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium mb-3">
                    <span>Ficha Técnica</span>
                    <span>
                      {(selectedIndex ?? 0) + 1} de {items.length}
                    </span>
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal tracking-wide">
                    {selectedItem.title}
                  </h2>
                </div>

                <div className="space-y-3 pt-4 border-t border-neutral-100 text-sm font-sans">
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Artista</span>
                    <span className="text-neutral-900 font-medium">Lía Paz</span>
                  </div>

                  {selectedItem.technique && (
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-400 uppercase text-xs tracking-wider">Técnica</span>
                      <span className="text-neutral-900">{selectedItem.technique}</span>
                    </div>
                  )}

                  {selectedItem.dimensions && (
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-400 uppercase text-xs tracking-wider">Dimensiones</span>
                      <span className="text-neutral-900">{selectedItem.dimensions}</span>
                    </div>
                  )}

                  {selectedItem.year && (
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-400 uppercase text-xs tracking-wider">Año</span>
                      <span className="text-neutral-900">{selectedItem.year}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Tipo</span>
                    <span className="text-neutral-900">Obra original</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 font-sans font-light leading-relaxed pt-2">
                  Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-8 border-t border-neutral-100 space-y-3">
                <a
                  href={`/contact?obra=${encodeURIComponent(selectedItem.title)}`}
                  className="block w-full py-3.5 text-center bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.25em] uppercase font-medium transition-colors"
                >
                  Consultar por esta Obra
                </a>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="text-xs font-sans tracking-wider uppercase text-neutral-500 hover:text-neutral-900 transition-colors flex items-center space-x-1"
                  >
                    <span>&larr; Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-xs font-sans tracking-wider uppercase text-neutral-500 hover:text-neutral-900 transition-colors flex items-center space-x-1"
                  >
                    <span>Siguiente &rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


