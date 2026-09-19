import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorStore } from './editor/EditorStore';
import { processImageFile, type ProcessedImage } from '../utils/imageProcess';

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
  order?: number;
}

interface GalleryGridProps {
  items: GalleryItem[];
}

function artworkToMarkdown(item: GalleryItem, order: number): string {
  let imagePath = item.src;
  if (item.src.startsWith('data:')) {
    imagePath = `/images/gallery/${item.id}.webp`;
  }
  return `---
title: "${(item.title || '').replace(/"/g, '\\"')}"
technique: "${(item.technique || 'Óleo sobre lienzo').replace(/"/g, '\\"')}"
dimensions: "${(item.dimensions || '').replace(/"/g, '\\"')}"
year: "${item.year || new Date().getFullYear().toString()}"
image: "${imagePath}"
width: ${item.width || 2000}
height: ${item.height || 2000}
order: ${order}
---
`;
}

export default function GalleryGrid({ items }: GalleryGridProps) {
  const [list, setList] = useState<GalleryItem[]>(items);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // New artwork modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newTechnique, setNewTechnique] = useState('Óleo sobre lienzo');
  const [newDimensions, setNewDimensions] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newImageDataUrl, setNewImageDataUrl] = useState<string | null>(null);
  const [newProcessedImage, setNewProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
    });
    return () => unsubscribe();
  }, []);

  // Sync initial list with order
  useEffect(() => {
    const sorted = [...items].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setList(sorted);
  }, [items]);

  const selectedItem = selectedIndex !== null ? list[selectedIndex] : null;

  const handleOpen = (index: number) => {
    if (draggedIndex !== null) return;
    setSelectedIndex(index);
  };

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + list.length) % list.length : null));
  }, [list.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % list.length : null));
  }, [list.length]);

  // Dedicated Safari & Chrome Mobile Swipe Controller via native non-passive listener
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isSwiping = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = startX;
      currentY = startY;
      isSwiping = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isSwiping || e.touches.length !== 1) return;
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);

      // If user is swiping horizontally, prevent Safari from triggering back/forward navigation or rubber-banding
      if (diffX > diffY && diffX > 6) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return;
      isSwiping = false;

      if (e.changedTouches.length > 0) {
        currentX = e.changedTouches[0].clientX;
        currentY = e.changedTouches[0].clientY;
      }

      const diffX = startX - currentX;
      const diffY = startY - currentY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 24) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    const onTouchCancel = (e: TouchEvent) => {
      if (!isSwiping) return;
      isSwiping = false;

      if (e.changedTouches.length > 0) {
        currentX = e.changedTouches[0].clientX;
        currentY = e.changedTouches[0].clientY;
      }

      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Even if Safari fired touchcancel, if user moved > 24px horizontally, execute swipe!
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 24) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [selectedIndex, handleNext, handlePrev]);

  // Mouse drag fallback for PC testing
  const mouseStartX = useRef<number | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 35) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    mouseStartX.current = null;
  };

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditing) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditing || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditing || draggedIndex === null) return;
    e.preventDefault();
    if (draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...list];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    // Recalculate orders 1..N
    const reordered = updated.map((item, idx) => {
      const order = idx + 1;
      if (item.order !== order) {
        const md = artworkToMarkdown(item, order);
        EditorStore.setDraft(`src/content/gallery/${item.id}.md`, {
          content: md,
          label: `Reordenar: ${item.title} (#${order})`,
        });
      }
      return { ...item, order };
    });

    setList(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Edit item metadata in modal
  const handleUpdateItemField = (field: keyof GalleryItem, value: any) => {
    if (selectedIndex === null || !selectedItem) return;
    const updated = [...list];
    const current = { ...selectedItem, [field]: value };
    updated[selectedIndex] = current;
    setList(updated);

    const order = current.order ?? selectedIndex + 1;
    const md = artworkToMarkdown(current, order);
    EditorStore.setDraft(`src/content/gallery/${current.id}.md`, {
      content: md,
      label: `Editar obra: ${current.title}`,
    });
  };

  // Replace image in modal
  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedIndex === null || !selectedItem) return;

    try {
      const processed = await processImageFile(file);
      const ext = processed.extension;
      const imagePath = `public/images/gallery/${selectedItem.id}.${ext}`;

      EditorStore.setDraft(imagePath, {
        content: processed.base64,
        encoding: 'base64',
        label: `Nueva imagen para: ${selectedItem.title}`,
      });

      handleUpdateItemField('src', processed.dataUrl);
      handleUpdateItemField('width', processed.width);
      handleUpdateItemField('height', processed.height);
      handleUpdateItemField('aspectRatio', processed.aspectRatio);
    } catch (err: any) {
      alert(err?.message || 'Error al procesar la imagen seleccionada.');
    }
  };

  // Delete item
  const handleDeleteItem = () => {
    if (selectedIndex === null || !selectedItem) return;
    if (!confirm(`¿Seguro que deseas eliminar la obra "${selectedItem.title}" de la galería?`)) return;

    const idToDelete = selectedItem.id;
    const titleToDelete = selectedItem.title;

    EditorStore.setDraft(`src/content/gallery/${idToDelete}.md`, {
      delete: true,
      label: `Eliminar obra: ${titleToDelete}`,
    });

    const updated = list.filter((_, idx) => idx !== selectedIndex);
    // Recalculate remaining orders
    const reordered = updated.map((item, idx) => {
      const order = idx + 1;
      if (item.order !== order) {
        const md = artworkToMarkdown(item, order);
        EditorStore.setDraft(`src/content/gallery/${item.id}.md`, {
          content: md,
          label: `Reordenar: ${item.title}`,
        });
      }
      return { ...item, order };
    });

    setList(reordered);
    setSelectedIndex(null);
  };

  // Add new artwork
  const handleAddNewArtwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newImageDataUrl) {
      alert('Por favor añade un título y selecciona una imagen.');
      return;
    }

    const slug = newTitle
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const id = slug || `obra-${Date.now()}`;
    const nextOrder = list.length + 1;
    const ext = newProcessedImage?.extension || 'webp';
    const imagePath = `/images/gallery/${id}.${ext}`;
    const width = newProcessedImage?.width || 2000;
    const height = newProcessedImage?.height || 2000;
    const aspectRatio = newProcessedImage?.aspectRatio || width / height;

    const newItem: GalleryItem = {
      id,
      title: newTitle.trim(),
      technique: newTechnique.trim() || 'Óleo sobre lienzo',
      dimensions: newDimensions.trim(),
      year: newYear.trim() || new Date().getFullYear().toString(),
      src: newProcessedImage?.dataUrl || newImageDataUrl,
      width,
      height,
      aspectRatio,
      order: nextOrder,
    };

    // Save image draft with true WebP content
    const base64Data = newProcessedImage?.base64 || newImageDataUrl.split(',')[1];
    EditorStore.setDraft(`public${imagePath}`, {
      content: base64Data,
      encoding: 'base64',
      label: `Imagen: ${newItem.title}`,
    });

    // Save markdown draft
    const md = artworkToMarkdown(newItem, nextOrder);
    EditorStore.setDraft(`src/content/gallery/${id}.md`, {
      content: md,
      label: `Nueva obra: ${newItem.title}`,
    });

    setList([...list, newItem]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDimensions('');
    setNewImageDataUrl(null);
    setNewProcessedImage(null);
    setNewImageFile(null);
  };

  return (
    <div className="w-full">
      {/* Edit Mode Header Bar (Only if isEditing) */}
      {isEditing && (
        <div className="mb-8 p-4 bg-neutral-50 border border-neutral-200 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-sans text-neutral-600">
            <span className="font-semibold text-neutral-900 uppercase tracking-wider">Modo Edición Galería:</span>
            <span>Arrastra cualquier cuadro con el cursor para moverlo de posición, o haz clic para editar su ficha.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.2em] uppercase font-medium rounded-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>+</span>
            <span>Agregar Nueva Obra</span>
          </button>
        </div>
      )}

      {/* CSS Masonry Columns Layout (Sean Layh style with native Drag & Drop) */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 [column-fill:_balance]">
        {list.map((item, index) => (
          <div
            key={item.id || index}
            draggable={isEditing}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={(e) => handleDragLeave(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative mb-6 md:mb-8 break-inside-avoid overflow-hidden cursor-pointer bg-neutral-100 transition-all duration-300 ${
              isEditing ? 'cursor-grab active:cursor-grabbing select-none' : ''
            } ${
              draggedIndex === index ? 'opacity-35 scale-95 border-2 border-dashed border-neutral-900' : ''
            } ${
              dragOverIndex === index ? 'ring-4 ring-neutral-950 ring-offset-2 scale-[1.015]' : ''
            }`}
            onClick={() => handleOpen(index)}
          >
            {/* Artwork Image */}
            <div className="w-full overflow-hidden pointer-events-none">
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              />
            </div>

            {/* Drag & Drop Indicator Overlay (Edit Mode only) */}
            {isEditing && (
              <div className="absolute inset-x-0 top-0 p-2.5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-end text-white pointer-events-none">
                <span className="text-[10px] uppercase font-sans tracking-wider text-neutral-200 bg-black/70 px-2.5 py-1 rounded flex items-center gap-1.5 backdrop-blur-xs">
                  <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                  </svg>
                  <span>Arrastrar para mover</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 md:p-8 bg-neutral-950/95 sm:bg-neutral-950/90 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-7xl h-full sm:h-auto sm:max-h-[92vh] bg-neutral-950 lg:bg-white shadow-2xl flex flex-col lg:flex-row overflow-hidden sm:border sm:border-neutral-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar modal"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-10 h-10 bg-neutral-950/80 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors rounded-full border border-neutral-700/60 shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left: Artwork Viewport (Dominates 62-65% height on mobile, full width on PC) */}
            <div
              ref={viewportRef}
              className="relative flex-1 bg-neutral-950 flex items-center justify-center h-[62vh] sm:h-[65vh] lg:h-auto lg:min-h-[80vh] lg:max-h-[86vh] p-3 sm:p-6 lg:p-8 select-none overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              style={{ touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              <img
                src={selectedItem.src}
                alt={selectedItem.title}
                draggable={false}
                className="max-w-full max-h-full lg:max-h-[82vh] w-auto h-auto object-contain shadow-2xl transition-opacity duration-300 pointer-events-none select-none"
              />

              {/* Edit Image Button (Edit Mode) */}
              {isEditing && (
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto">
                  <input
                    type="file"
                    ref={replaceFileInputRef}
                    onChange={handleReplaceImage}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => replaceFileInputRef.current?.click()}
                    className="px-3 py-1 sm:px-3.5 sm:py-1.5 bg-white/90 hover:bg-white text-neutral-900 text-[11px] sm:text-xs font-sans rounded-sm shadow-md flex items-center gap-1.5 transition-colors uppercase tracking-wider font-medium cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Cambiar Imagen</span>
                  </button>
                </div>
              )}

              {/* Prev / Next Nav (Visible on both mobile & desktop) */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Obra anterior"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-neutral-900/70 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs rounded-full cursor-pointer z-20 border border-white/10 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Obra siguiente"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-neutral-900/70 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs rounded-full cursor-pointer z-20 border border-white/10 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Mobile swipe subtle indicator */}
              <div className="sm:hidden absolute bottom-2 inset-x-0 flex justify-center items-center pointer-events-none z-10">
                <span className="text-[10px] text-white/70 tracking-wider uppercase font-sans bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  ← Desliza para navegar →
                </span>
              </div>
            </div>

            {/* Right: Ficha Técnica Sidebar (Compact bottom sheet on mobile, full sidebar on PC) */}
            <div className="lg:w-84 xl:w-96 flex-shrink-0 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white rounded-t-2xl lg:rounded-none border-t lg:border-t-0 lg:border-l border-neutral-100 flex-1 lg:flex-initial max-h-[38vh] sm:max-h-[35vh] lg:max-h-none shadow-lg lg:shadow-none">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium mb-3">
                    <span>Ficha Técnica</span>
                    <span>
                      {(selectedIndex ?? 0) + 1} de {list.length}
                    </span>
                  </div>

                  {/* Title (Editable in Edit Mode) */}
                  {isEditing ? (
                    <div>
                      <label className="block text-[10px] uppercase font-sans tracking-widest text-neutral-400 mb-1">
                        Título de la Obra:
                      </label>
                      <input
                        type="text"
                        value={selectedItem.title}
                        onChange={(e) => handleUpdateItemField('title', e.target.value)}
                        className="w-full font-serif text-2xl text-neutral-900 border-b-2 border-neutral-900 pb-1 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal tracking-wide">
                      {selectedItem.title}
                    </h2>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-neutral-100 text-sm font-sans">
                  {/* Technique */}
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Técnica</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedItem.technique || ''}
                        onChange={(e) => handleUpdateItemField('technique', e.target.value)}
                        className="text-right text-xs font-sans border-b border-neutral-300 focus:border-neutral-900 pb-0.5 focus:outline-none text-neutral-900"
                      />
                    ) : (
                      <span className="text-neutral-900">{selectedItem.technique}</span>
                    )}
                  </div>

                  {/* Dimensions */}
                  {(selectedItem.dimensions || isEditing) && (
                    <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                      <span className="text-neutral-400 uppercase text-xs tracking-wider">Dimensiones</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={selectedItem.dimensions || ''}
                          placeholder="Ej. 60 × 80 cm"
                          onChange={(e) => handleUpdateItemField('dimensions', e.target.value)}
                          className="text-right text-xs font-sans border-b border-neutral-300 focus:border-neutral-900 pb-0.5 focus:outline-none text-neutral-900 placeholder:text-neutral-300"
                        />
                      ) : (
                        <span className="text-neutral-900">{selectedItem.dimensions}</span>
                      )}
                    </div>
                  )}

                  {/* Year */}
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Año</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedItem.year || ''}
                        onChange={(e) => handleUpdateItemField('year', e.target.value)}
                        className="text-right text-xs font-sans w-20 border-b border-neutral-300 focus:border-neutral-900 pb-0.5 focus:outline-none text-neutral-900"
                      />
                    ) : (
                      <span className="text-neutral-900">{selectedItem.year}</span>
                    )}
                  </div>

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
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleDeleteItem}
                    className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-sans tracking-[0.2em] uppercase font-medium transition-colors border border-rose-200"
                  >
                    Eliminar Obra de Galería
                  </button>
                ) : (
                  <a
                    href={`/contact?obra=${encodeURIComponent(selectedItem.title)}`}
                    className="block w-full py-3.5 text-center bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.25em] uppercase font-medium transition-colors"
                  >
                    Consultar por esta Obra
                  </a>
                )}

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

      {/* Add Artwork Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white border border-neutral-200 max-w-lg w-full p-6 sm:p-8 rounded-sm shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[11px] font-sans tracking-[0.25em] uppercase text-neutral-400 font-medium block mb-1">
                Nueva Obra
              </span>
              <h3 className="font-serif text-2xl text-neutral-900">
                Agregar Pintura a la Galería
              </h3>
            </div>

            <form onSubmit={handleAddNewArtwork} className="space-y-4">
              {/* Image Upload Area */}
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1.5">
                  Fotografía de la Obra *
                </label>
                <div
                  onClick={() => !isProcessingImage && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-sm p-6 text-center cursor-pointer transition-colors bg-neutral-50"
                >
                  {isProcessingImage ? (
                    <div className="py-8 space-y-2 text-neutral-500">
                      <div className="w-6 h-6 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin mx-auto"></div>
                      <span className="text-xs">Optimizando imagen...</span>
                    </div>
                  ) : newImageDataUrl ? (
                    <div className="space-y-2">
                      <img
                        src={newImageDataUrl}
                        alt="Previsualización"
                        className="max-h-48 mx-auto object-contain rounded-sm"
                      />
                      <span className="text-xs text-neutral-500 block underline">Hacer clic para cambiar</span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-neutral-500">
                      <svg className="w-8 h-8 mx-auto text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-medium block">Seleccionar imagen desde tu computadora</span>
                      <span className="text-[11px] text-neutral-400 block">Formatos: JPG, PNG, WEBP</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNewImageFile(file);
                      setIsProcessingImage(true);
                      try {
                        const processed = await processImageFile(file);
                        setNewProcessedImage(processed);
                        setNewImageDataUrl(processed.dataUrl);
                      } catch (err: any) {
                        const reader = new FileReader();
                        reader.onload = () => setNewImageDataUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      } finally {
                        setIsProcessingImage(false);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                  Título de la Obra *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Sinfonía en Óleo"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Technique */}
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                  Técnica
                </label>
                <input
                  type="text"
                  value={newTechnique}
                  onChange={(e) => setNewTechnique(e.target.value)}
                  placeholder="Ej. Óleo sobre lienzo"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Dimensions & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                    Dimensiones
                  </label>
                  <input
                    type="text"
                    value={newDimensions}
                    onChange={(e) => setNewDimensions(e.target.value)}
                    placeholder="Ej. 60 × 80 cm"
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                    Año
                  </label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-sans uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.2em] uppercase font-medium rounded-sm shadow-sm"
                >
                  Añadir a Galería
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
