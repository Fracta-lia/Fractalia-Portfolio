import React, { useState, useEffect } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  technique?: string;
  dimensions?: string;
  year?: string;
  src: string;
  width?: number;
  height?: number;
}

interface GalleryGridProps {
  items: GalleryItem[];
  initialCategory?: string;
  showFilters?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'wedding', label: 'Wedding Live Paintings' },
  { id: 'retratos', label: 'Retratos' },
  { id: 'otros', label: 'Otros Trabajos' },
];

export default function GalleryGrid({
  items,
  initialCategory = 'all',
  showFilters = true
}: GalleryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(item => item.category === selectedCategory);

  // Initialize PhotoSwipe Lightbox
  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: '#lia-gallery-grid',
      children: 'a.pswp-gallery-item',
      pswpModule: () => import('photoswipe'),
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
      wheelToZoom: true,
      bgOpacity: 0.95,
      showHideAnimationType: 'fade',
    });

    lightbox.init();

    return () => {
      lightbox.destroy();
    };
  }, [filteredItems]);

  return (
    <div className="w-full">
      {/* Category Filter Tabs */}
      {showFilters && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-12 md:mb-16">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`font-sans text-xs tracking-[0.2em] uppercase px-4 py-2 transition-all duration-200 border ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-sm'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Artwork Grid (Sean Layh style) */}
      <div
        id="lia-gallery-grid"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
      >
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="group relative flex flex-col bg-white overflow-hidden border border-neutral-100 hover:border-neutral-200 transition-all duration-300"
          >
            {/* Clickable image anchor for PhotoSwipe */}
            <a
              href={item.src}
              data-pswp-width={item.width || 1200}
              data-pswp-height={item.height || 900}
              target="_blank"
              rel="noreferrer"
              className="pswp-gallery-item block relative aspect-[4/3] w-full overflow-hidden bg-neutral-50 cursor-pointer"
            >
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-neutral-900/0 group-hover:bg-neutral-900/10 transition-colors duration-300 pointer-events-none" />
            </a>

            {/* Artwork Details */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg md:text-xl text-neutral-900 tracking-wide font-normal">
                  {item.title}
                </h3>
                {item.technique && (
                  <p className="font-sans text-xs text-neutral-500 tracking-wider uppercase mt-1">
                    {item.technique}
                  </p>
                )}
              </div>

              {(item.dimensions || item.year) && (
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans tracking-widest uppercase mt-3 pt-3 border-t border-neutral-100">
                  <span>{item.dimensions}</span>
                  <span>{item.year}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-neutral-400 font-serif italic text-lg">
          No hay obras en esta categoría actualmente.
        </div>
      )}
    </div>
  );
}

