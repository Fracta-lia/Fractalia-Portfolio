import React, { useState, useEffect, useRef } from 'react';
import { EditorStore } from './EditorStore';

export interface ArtworkChoice {
  id: string;
  title: string;
  src: string;
}

export const SITE_ARTWORKS: ArtworkChoice[] = [
  { id: 'mares-de-silencio', title: 'Mares de silencio', src: '/images/gallery/mares-de-silencio.webp' },
  { id: 'retrato-nick', title: 'Retrato de Nick', src: '/images/gallery/retrato-nick.webp' },
  { id: 'manos-y-anillo', title: 'Manos y Anillo', src: '/images/gallery/manos-y-anillo.webp' },
  { id: 'siete-vidas', title: 'Siete Vidas', src: '/images/gallery/siete-vidas.webp' },
  { id: 'ninos-chapoteando', title: 'Niños chapoteando', src: '/images/gallery/ninos-chapoteando.webp' },
  { id: 'rostro-y-mano', title: 'Rostro y mano', src: '/images/gallery/rostro-y-mano.webp' },
  { id: 'actuacion-musical', title: 'Actuación musical', src: '/images/gallery/actuacion-musical.webp' },
  { id: 'cadaver', title: 'Cadáver', src: '/images/gallery/cadaver.webp' },
  { id: 'vagon-9502', title: 'Vagón 9502', src: '/images/gallery/vagon-9502.webp' },
  { id: 'lia-paz', title: 'Lía Paz en el estudio', src: '/images/about/lia-paz.webp' },
];

export interface EditableImageProps {
  contentKey: string;
  defaultSrc: string;
  alt: string;
  label?: string;
  className?: string;
  wrapperClassName?: string;
  loading?: 'lazy' | 'eager';
  base?: string;
}

function resolveImageSrc(src: string, base: string = ''): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const cleanBase = base === '/' ? '' : base.replace(/\/$/, '');
  const cleanSrc = src.startsWith('/') ? src : `/${src}`;
  if (cleanBase && cleanSrc.startsWith(cleanBase)) {
    return cleanSrc;
  }
  return `${cleanBase}${cleanSrc}`;
}

export default function EditableImage({
  contentKey,
  defaultSrc,
  alt,
  label,
  className = '',
  wrapperClassName = 'w-full h-full',
  loading = 'lazy',
  base = '',
}: EditableImageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(defaultSrc);
  const [showModal, setShowModal] = useState(false);

  // Modal State
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('gallery');
  const [selectedGallerySrc, setSelectedGallerySrc] = useState<string>('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    setCurrentSrc(EditorStore.getImage(contentKey, defaultSrc));

    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
      setCurrentSrc(EditorStore.getImage(contentKey, defaultSrc));
    });

    return () => unsubscribe();
  }, [contentKey, defaultSrc]);

  const resolvedSrc = resolveImageSrc(currentSrc, base);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGallerySrc(currentSrc);
    setUploadedDataUrl(null);
    setUploadedFileName('');
    setUploadedBase64('');
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setUploadedDataUrl(result);
      setUploadedFileName(file.name);
      setUploadedBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (activeTab === 'upload') {
      if (!uploadedDataUrl || !uploadedBase64) {
        alert('Por favor selecciona una imagen desde tu dispositivo.');
        return;
      }

      // Determine extension
      const ext = uploadedFileName.includes('.')
        ? uploadedFileName.split('.').pop()?.toLowerCase() || 'jpg'
        : 'jpg';
      const sanitizedKey = contentKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const publicFilePath = `public/images/uploads/${sanitizedKey}.${ext}`;
      const webPath = `/images/uploads/${sanitizedKey}.${ext}`;

      EditorStore.updateImage(contentKey, webPath, {
        base64: uploadedBase64,
        targetPath: publicFilePath,
        localPreviewUrl: uploadedDataUrl,
        label: label || `Imagen: ${contentKey}`,
      });

      setCurrentSrc(uploadedDataUrl);
      setShowModal(false);
    } else {
      if (!selectedGallerySrc) {
        alert('Por favor selecciona una obra de la galería.');
        return;
      }

      EditorStore.updateImage(contentKey, selectedGallerySrc, {
        label: label || `Imagen: ${contentKey}`,
      } as any);

      setCurrentSrc(selectedGallerySrc);
      setShowModal(false);
    }
  };

  // Normal view: Pure img element with zero wrappers or interference
  if (!isEditing) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        loading={loading}
      />
    );
  }

  // Edit view: Relative container with subtle floating button and edit modal
  return (
    <div className={`relative group ${wrapperClassName}`.trim()} data-editable-image={contentKey}>
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        loading={loading}
      />

      {/* Hover overlay with button */}
      <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 z-20 pointer-events-none">
        <button
          type="button"
          onClick={handleOpenModal}
          className="pointer-events-auto px-4 py-2.5 bg-neutral-950 text-white text-xs font-sans uppercase tracking-widest font-medium rounded-full shadow-2xl flex items-center gap-2 border border-neutral-700 hover:bg-neutral-800 transform hover:scale-105 transition-all cursor-pointer select-none"
        >
          <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <span>Cambiar Imagen</span>
        </button>
      </div>

      {/* Persistent corner badge */}
      <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleOpenModal}
          title="Cambiar imagen"
          className="p-2 bg-neutral-950/85 hover:bg-neutral-900 text-white rounded-full shadow-xl border border-neutral-700/80 backdrop-blur-sm transition-all hover:scale-110 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </button>
      </div>

      {/* Image Picker Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white text-neutral-900 w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-neutral-900 font-normal">
                  Cambiar Imagen
                </h3>
                <p className="font-sans text-[11px] uppercase tracking-widest text-neutral-400 mt-0.5">
                  {label || contentKey}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-800 text-xl font-light p-1 transition-colors"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-neutral-200 px-6 pt-2 bg-neutral-50/30">
              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`pb-3 px-4 font-sans text-xs uppercase tracking-wider font-medium border-b-2 transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-neutral-950 text-neutral-950'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                }`}
              >
                🎨 Elegir de mi Galería
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-3 px-4 font-sans text-xs uppercase tracking-wider font-medium border-b-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-neutral-950 text-neutral-950'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                }`}
              >
                📁 Subir desde mi Equipo
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {activeTab === 'gallery' ? (
                <div>
                  <p className="text-xs text-neutral-500 mb-4 font-sans font-light">
                    Haz clic en cualquiera de tus obras de arte para seleccionarla:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {SITE_ARTWORKS.map((art) => {
                      const isSelected = selectedGallerySrc === art.src;
                      const artSrc = resolveImageSrc(art.src, base);
                      return (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => setSelectedGallerySrc(art.src)}
                          className={`group text-left border rounded-sm p-2 transition-all cursor-pointer relative flex flex-col ${
                            isSelected
                              ? 'border-neutral-950 ring-2 ring-neutral-950 bg-neutral-50'
                              : 'border-neutral-200 hover:border-neutral-400 bg-white'
                          }`}
                        >
                          <div className="aspect-[4/3] bg-neutral-100 overflow-hidden mb-2 relative">
                            <img
                              src={artSrc}
                              alt={art.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 bg-neutral-950 text-white rounded-full p-1 shadow-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="font-serif text-xs text-neutral-900 truncate">
                            {art.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 font-sans font-light">
                    Sube una foto desde tu computadora o celular (JPG, PNG o WEBP):
                  </p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 hover:border-neutral-600 rounded-sm p-8 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50 flex flex-col items-center justify-center space-y-3"
                  >
                    <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <span className="font-sans text-xs font-medium text-neutral-900 block">
                        Haz clic para buscar un archivo en tu equipo
                      </span>
                      <span className="font-sans text-[11px] text-neutral-400 mt-1 block">
                        Recomendado: Formatos JPG, PNG o WEBP en buena resolución
                      </span>
                    </div>
                  </div>

                  {uploadedDataUrl && (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm flex items-center gap-4">
                      <img
                        src={uploadedDataUrl}
                        alt="Previsualización"
                        className="w-14 h-14 object-cover border border-neutral-300"
                      />
                      <div className="overflow-hidden">
                        <span className="text-xs font-medium text-neutral-900 block truncate">
                          {uploadedFileName}
                        </span>
                        <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-medium">
                          ✓ Archivo cargado y listo para aplicar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-sans uppercase tracking-wider text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2 bg-neutral-950 text-white text-xs font-sans uppercase tracking-widest font-medium rounded-sm shadow-md hover:bg-neutral-800 transition-colors"
              >
                Aplicar Imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
