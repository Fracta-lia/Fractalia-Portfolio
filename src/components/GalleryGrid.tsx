import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorStore } from './editor/EditorStore';

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
  // If src is base64 data URL, keep original path or generate proper path
  const imagePath = item.src.startsWith('data:') ? `/images/gallery/${item.id}.webp` : item.src;
  return `---
title: "${(item.title || '').replace(/"/g, '\\"')}"
technique: "${(item.technique || 'Óleo sobre lienzo').replace(/"/g, '\\"')}"
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

  // New artwork modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newTechnique, setNewTechnique] = useState('Óleo sobre lienzo');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newImageDataUrl, setNewImageDataUrl] = useState<string | null>(null);
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

  // Reordering helpers
  const handleMove = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Recalculate orders 1..N
    const reordered = updated.map((item, idx) => {
      const order = idx + 1;
      const md = artworkToMarkdown(item, order);
      EditorStore.setDraft(`src/content/gallery/${item.id}.md`, {
        content: md,
        label: `Orden de obra: ${item.title} (#${order})`,
      });
      return { ...item, order };
    });

    setList(reordered);
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
  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedIndex === null || !selectedItem) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const imagePath = `public/images/gallery/${selectedItem.id}.webp`;

      // Update in drafts
      EditorStore.setDraft(imagePath, {
        content: base64Data,
        encoding: 'base64',
        label: `Nueva imagen para: ${selectedItem.title}`,
      });

      handleUpdateItemField('src', result);
    };
    reader.readAsDataURL(file);
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
      const md = artworkToMarkdown(item, order);
      EditorStore.setDraft(`src/content/gallery/${item.id}.md`, {
        content: md,
        label: `Reordenar: ${item.title}`,
      });
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
    const imagePath = `/images/gallery/${id}.webp`;

    const newItem: GalleryItem = {
      id,
      title: newTitle.trim(),
      technique: newTechnique.trim() || 'Óleo sobre lienzo',
      year: newYear.trim() || new Date().getFullYear().toString(),
      src: newImageDataUrl,
      width: 2400,
      height: 2400,
      aspectRatio: 1,
      order: nextOrder,
    };

    // Save image draft
    const base64Data = newImageDataUrl.split(',')[1];
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
    setNewImageDataUrl(null);
    setNewImageFile(null);
  };

  return (
    <div className="w-full">
      {/* Edit Mode Header Bar (Only if isEditing) */}
      {isEditing && (
        <div className="mb-8 p-4 bg-neutral-50 border border-neutral-200 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-sans text-neutral-600">
            <span className="font-semibold text-neutral-900 uppercase tracking-wider">Modo Edición Galería:</span>
            <span>Usa las flechas ▲ ▼ sobre cada cuadro para reordenar, o haz clic para editar datos.</span>
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

      {/* CSS Masonry Columns Layout (Sean Layh style) */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 [column-fill:_balance]">
        {list.map((item, index) => (
          <div
            key={item.id || index}
            className="group relative mb-6 md:mb-8 break-inside-avoid overflow-hidden cursor-pointer bg-neutral-100 transition-all duration-300"
            onClick={() => handleOpen(index)}
          >
            {/* Artwork Image */}
            <div className="w-full overflow-hidden">
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              />
            </div>

            {/* In-Situ Reordering Controls Overlay (Edit Mode only) */}
            {isEditing && (
              <div
                className="absolute inset-x-0 top-0 p-2 bg-gradient-to-b from-black/75 to-transparent flex items-center justify-between text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs font-medium">
                  #{item.order ?? index + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => handleMove(index, 'up', e)}
                    title="Mover antes"
                    className="p-1.5 bg-black/70 hover:bg-neutral-900 text-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={index === list.length - 1}
                    onClick={(e) => handleMove(index, 'down', e)}
                    title="Mover después"
                    className="p-1.5 bg-black/70 hover:bg-neutral-900 text-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-neutral-950/90 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-7xl max-h-[92vh] bg-white shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-neutral-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-neutral-950/80 hover:bg-neutral-950 text-white flex items-center justify-center transition-colors rounded-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left: Artwork Viewport */}
            <div className="relative flex-1 bg-neutral-950 flex items-center justify-center min-h-[45vh] lg:min-h-[80vh] max-h-[86vh] p-4 sm:p-8 select-none">
              <img
                src={selectedItem.src}
                alt={selectedItem.title}
                className="max-w-full max-h-[82vh] w-auto h-auto object-contain shadow-2xl transition-opacity duration-300"
              />

              {/* Edit Image Button (Edit Mode) */}
              {isEditing && (
                <div className="absolute bottom-4 left-4 z-10">
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
                    className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-neutral-900 text-xs font-sans rounded-sm shadow-md flex items-center gap-1.5 transition-colors uppercase tracking-wider font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Cambiar Imagen</span>
                  </button>
                </div>
              )}

              {/* Prev / Next Nav */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Obra anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Obra siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors backdrop-blur-xs rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Right: Ficha Técnica Sidebar */}
            <div className="lg:w-84 xl:w-96 flex-shrink-0 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-neutral-100">
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
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Artista</span>
                    <span className="text-neutral-900 font-medium">Lía Paz</span>
                  </div>

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

                  {/* Order Number (Editable in Edit Mode) */}
                  {isEditing && (
                    <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                      <span className="text-neutral-400 uppercase text-xs tracking-wider">Posición #</span>
                      <input
                        type="number"
                        min="1"
                        max={list.length}
                        value={selectedItem.order ?? selectedIndex + 1}
                        onChange={(e) => handleUpdateItemField('order', parseInt(e.target.value, 10) || 1)}
                        className="text-right text-xs font-mono w-16 border-b border-neutral-300 focus:border-neutral-900 pb-0.5 focus:outline-none text-neutral-900 font-semibold"
                      />
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
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-sm p-6 text-center cursor-pointer transition-colors bg-neutral-50"
                >
                  {newImageDataUrl ? (
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNewImageFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setNewImageDataUrl(reader.result as string);
                      reader.readAsDataURL(file);
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

              {/* Technique & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                    Técnica
                  </label>
                  <input
                    type="text"
                    value={newTechnique}
                    onChange={(e) => setNewTechnique(e.target.value)}
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
