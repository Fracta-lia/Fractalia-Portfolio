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
  artworkType?: string;
  description?: string;
}

interface GalleryGridProps {
  items: GalleryItem[];
}

function artworkToMarkdown(item: GalleryItem, order: number): string {
  let imagePath = item.src;
  if (item.src.startsWith('data:')) {
    imagePath = `/images/gallery/${item.id}.webp`;
  }
  const artworkType = item.artworkType || 'Obra original';
  const description =
    item.description !== undefined
      ? item.description
      : 'Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.';

  return `---
title: "${(item.title || '').replace(/"/g, '\\"')}"
technique: "${(item.technique || 'Óleo sobre lienzo').replace(/"/g, '\\"')}"
dimensions: "${(item.dimensions || '').replace(/"/g, '\\"')}"
year: "${item.year || new Date().getFullYear().toString()}"
image: "${imagePath}"
width: ${item.width || 2000}
height: ${item.height || 2000}
order: ${order}
artworkType: "${artworkType.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"
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
  const [newArtworkType, setNewArtworkType] = useState('Obra original');
  const [newDescription, setNewDescription] = useState('Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.');
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

  // Track & 3-Slide Carousel animation refs
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Zoom & Swipe Hint State & Refs
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  const zoomRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const hasSeenSwipeHintRef = useRef(false);

  const resetZoom = useCallback(() => {
    zoomRef.current = { scale: 1, panX: 0, panY: 0 };
    setIsZoomed(false);
    if (viewportRef.current) {
      viewportRef.current.style.cursor = 'zoom-in';
    }
    if (currentImageRef.current) {
      currentImageRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      currentImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
      currentImageRef.current.style.cursor = 'zoom-in';
    }
  }, []);

  const zoomTo = useCallback((targetScale: number, clientX?: number, clientY?: number) => {
    const img = currentImageRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;

    if (targetScale <= 1.05) {
      resetZoom();
      return;
    }

    const vpRect = viewport.getBoundingClientRect();
    const centerX = clientX !== undefined ? clientX - vpRect.left : vpRect.width / 2;
    const centerY = clientY !== undefined ? clientY - vpRect.top : vpRect.height / 2;

    const relX = centerX - vpRect.width / 2;
    const relY = centerY - vpRect.height / 2;

    const newPanX = -relX * (targetScale - 1);
    const newPanY = -relY * (targetScale - 1);

    const maxPanX = (vpRect.width * (targetScale - 1)) / 2;
    const maxPanY = (vpRect.height * (targetScale - 1)) / 2;

    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
    const clampedY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

    zoomRef.current = { scale: targetScale, panX: clampedX, panY: clampedY };
    setIsZoomed(true);

    viewport.style.cursor = 'grab';
    img.style.cursor = 'grab';
    img.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    img.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${targetScale})`;
  }, [resetZoom]);

  // Momentary swipe hint on first artwork open in session
  useEffect(() => {
    if (selectedIndex !== null && !hasSeenSwipeHintRef.current) {
      hasSeenSwipeHintRef.current = true;
      setShowSwipeHint(true);
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex]);

  const prevItem =
    selectedIndex !== null && list.length > 1
      ? list[(selectedIndex - 1 + list.length) % list.length]
      : null;
  const nextItem =
    selectedIndex !== null && list.length > 1
      ? list[(selectedIndex + 1) % list.length]
      : null;

  const handleOpen = (index: number) => {
    if (draggedIndex !== null) return;
    resetZoom();
    setSelectedIndex(index);
  };

  const handleClose = useCallback(() => {
    resetZoom();
    setSelectedIndex(null);
  }, [resetZoom]);

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      resetZoom();
      setShowSwipeHint(false);
      if (list.length <= 1 || isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const track = trackRef.current;
      if (track) {
        track.style.transition = 'transform 0.36s cubic-bezier(0.16, 1, 0.3, 1)';
        track.style.transform = 'translateX(0%)';

        setTimeout(() => {
          setSelectedIndex((prev) => (prev !== null ? (prev - 1 + list.length) % list.length : null));
          if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            trackRef.current.style.transform = 'translateX(-33.333333%)';
          }
          isAnimatingRef.current = false;
        }, 360);
      } else {
        setSelectedIndex((prev) => (prev !== null ? (prev - 1 + list.length) % list.length : null));
        isAnimatingRef.current = false;
      }
    },
    [list.length, resetZoom]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      resetZoom();
      setShowSwipeHint(false);
      if (list.length <= 1 || isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const track = trackRef.current;
      if (track) {
        track.style.transition = 'transform 0.36s cubic-bezier(0.16, 1, 0.3, 1)';
        track.style.transform = 'translateX(-66.666666%)';

        setTimeout(() => {
          setSelectedIndex((prev) => (prev !== null ? (prev + 1) % list.length : null));
          if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            trackRef.current.style.transform = 'translateX(-33.333333%)';
          }
          isAnimatingRef.current = false;
        }, 360);
      } else {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % list.length : null));
        isAnimatingRef.current = false;
      }
    },
    [list.length, resetZoom]
  );

  // Dedicated Safari & Chrome Mobile Touch Swipe + Pinch Zoom + Desktop Mouse Drag
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || selectedIndex === null) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let hasDeterminedDirection = false;
    let isHorizontalSwipe = false;

    // Zoom & Pan touch tracking
    let touchStartDistance = 0;
    let touchStartScale = 1;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let touchStartCenter = { x: 0, y: 0 };
    let isPinching = false;
    let isPanningZoom = false;
    let panStartX = 0;
    let panStartY = 0;
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };

    const dismissHint = () => {
      setShowSwipeHint(false);
    };

    const onTouchStart = (e: TouchEvent) => {
      dismissHint();
      if (isAnimatingRef.current) return;

      // 1. Two-finger Pinch to Zoom
      if (e.touches.length === 2) {
        isSwiping = false;
        isPinching = true;
        isPanningZoom = false;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartScale = zoomRef.current.scale;
        touchStartPanX = zoomRef.current.panX;
        touchStartPanY = zoomRef.current.panY;
        touchStartCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        if (currentImageRef.current) {
          currentImageRef.current.style.transition = 'none';
        }
        return;
      }

      // 2. One-finger touch
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime;
        const distSinceLastTap = Math.hypot(touch.clientX - lastTapPos.x, touch.clientY - lastTapPos.y);

        // Double-tap detection
        if (timeSinceLastTap < 320 && distSinceLastTap < 30) {
          lastTapTime = 0;
          if (zoomRef.current.scale > 1.1) {
            resetZoom();
          } else {
            zoomTo(2.5, touch.clientX, touch.clientY);
          }
          return;
        }
        lastTapTime = now;
        lastTapPos = { x: touch.clientX, y: touch.clientY };

        // If currently zoomed in: 1-finger panning
        if (zoomRef.current.scale > 1.05) {
          isPanningZoom = true;
          isSwiping = false;
          panStartX = touch.clientX;
          panStartY = touch.clientY;
          touchStartPanX = zoomRef.current.panX;
          touchStartPanY = zoomRef.current.panY;

          if (currentImageRef.current) {
            currentImageRef.current.style.transition = 'none';
          }
          return;
        }

        // Normal carousel swipe start
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        isSwiping = true;
        hasDeterminedDirection = false;
        isHorizontalSwipe = false;

        if (trackRef.current) {
          trackRef.current.style.transition = 'none';
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isAnimatingRef.current) return;

      // Pinch zoom with 2 fingers
      if (isPinching && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (touchStartDistance > 0) {
          const scaleFactor = dist / touchStartDistance;
          const rawScale = touchStartScale * scaleFactor;
          const scale = Math.max(0.7, Math.min(4.5, rawScale));

          const currentCenter = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
          };
          const centerDiffX = currentCenter.x - touchStartCenter.x;
          const centerDiffY = currentCenter.y - touchStartCenter.y;

          const panX = touchStartPanX + centerDiffX;
          const panY = touchStartPanY + centerDiffY;

          zoomRef.current = { scale, panX, panY };

          if (currentImageRef.current) {
            currentImageRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
          }
        }
        return;
      }

      // Pan while zoomed in with 1 finger
      if (isPanningZoom && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const diffX = touch.clientX - panStartX;
        const diffY = touch.clientY - panStartY;

        const vpRect = el.getBoundingClientRect();
        const scale = zoomRef.current.scale;
        const maxPanX = (vpRect.width * (scale - 1)) / 2 + 60;
        const maxPanY = (vpRect.height * (scale - 1)) / 2 + 60;

        const panX = Math.max(-maxPanX, Math.min(maxPanX, touchStartPanX + diffX));
        const panY = Math.max(-maxPanY, Math.min(maxPanY, touchStartPanY + diffY));

        zoomRef.current.panX = panX;
        zoomRef.current.panY = panY;

        if (currentImageRef.current) {
          currentImageRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
        return;
      }

      // Normal 1-finger horizontal carousel swipe
      if (isSwiping && e.touches.length === 1) {
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        const diffY = e.touches[0].clientY - startY;

        if (!hasDeterminedDirection && (Math.abs(diffX) > 6 || Math.abs(diffY) > 6)) {
          hasDeterminedDirection = true;
          isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY);
        }

        if (isHorizontalSwipe) {
          if (e.cancelable) e.preventDefault();
          if (trackRef.current) {
            trackRef.current.style.transform = `translateX(calc(-33.333333% + ${diffX}px))`;
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // End of pinch
      if (isPinching) {
        if (e.touches.length < 2) {
          isPinching = false;
          const currentScale = zoomRef.current.scale;
          if (currentScale <= 1.05) {
            resetZoom();
          } else {
            const clampedScale = Math.min(4, Math.max(1.05, currentScale));
            setIsZoomed(true);
            const vpRect = el.getBoundingClientRect();
            const maxPanX = (vpRect.width * (clampedScale - 1)) / 2;
            const maxPanY = (vpRect.height * (clampedScale - 1)) / 2;
            const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, zoomRef.current.panX));
            const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, zoomRef.current.panY));

            zoomRef.current = { scale: clampedScale, panX: clampedPanX, panY: clampedPanY };
            if (currentImageRef.current) {
              currentImageRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
              currentImageRef.current.style.transform = `translate(${clampedPanX}px, ${clampedPanY}px) scale(${clampedScale})`;
            }
          }
        }
        return;
      }

      // End of pan while zoomed
      if (isPanningZoom) {
        if (e.touches.length === 0) {
          isPanningZoom = false;
          const scale = zoomRef.current.scale;
          const vpRect = el.getBoundingClientRect();
          const maxPanX = (vpRect.width * (scale - 1)) / 2;
          const maxPanY = (vpRect.height * (scale - 1)) / 2;
          const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, zoomRef.current.panX));
          const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, zoomRef.current.panY));

          zoomRef.current.panX = clampedPanX;
          zoomRef.current.panY = clampedPanY;
          if (currentImageRef.current) {
            currentImageRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
            currentImageRef.current.style.transform = `translate(${clampedPanX}px, ${clampedPanY}px) scale(${scale})`;
          }
        }
        return;
      }

      // End of normal carousel swipe
      if (isSwiping) {
        isSwiping = false;
        if (!isHorizontalSwipe || !trackRef.current || isAnimatingRef.current) {
          return;
        }

        const diffX = currentX - startX;
        const threshold = 40;

        if (diffX < -threshold) {
          handleNext();
        } else if (diffX > threshold) {
          handlePrev();
        } else {
          trackRef.current.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          trackRef.current.style.transform = 'translateX(-33.333333%)';
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Mouse drag support for PC (supports panning if zoomed)
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseCurrentX = 0;
    let isMousePanningZoom = false;
    let mouseStartPanX = 0;
    let mouseStartPanY = 0;

    const onMouseDown = (e: MouseEvent) => {
      dismissHint();
      if (e.button !== 0 || isAnimatingRef.current) return;

      if (zoomRef.current.scale > 1.05) {
        isMousePanningZoom = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        mouseStartPanX = zoomRef.current.panX;
        mouseStartPanY = zoomRef.current.panY;
        if (currentImageRef.current) {
          currentImageRef.current.style.transition = 'none';
        }
        if (el) el.style.cursor = 'grabbing';
        return;
      }

      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      mouseCurrentX = mouseStartX;
      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isAnimatingRef.current) return;

      if (isMousePanningZoom) {
        const diffX = e.clientX - mouseStartX;
        const diffY = e.clientY - mouseStartY;
        const vpRect = el.getBoundingClientRect();
        const scale = zoomRef.current.scale;
        const maxPanX = (vpRect.width * (scale - 1)) / 2 + 50;
        const maxPanY = (vpRect.height * (scale - 1)) / 2 + 50;

        const panX = Math.max(-maxPanX, Math.min(maxPanX, mouseStartPanX + diffX));
        const panY = Math.max(-maxPanY, Math.min(maxPanY, mouseStartPanY + diffY));

        zoomRef.current.panX = panX;
        zoomRef.current.panY = panY;

        if (currentImageRef.current) {
          currentImageRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
        return;
      }

      if (!isMouseDown) return;
      mouseCurrentX = e.clientX;
      const diffX = mouseCurrentX - mouseStartX;
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(calc(-33.333333% + ${diffX}px))`;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isMousePanningZoom) {
        isMousePanningZoom = false;
        if (el) el.style.cursor = 'grab';
        const totalMovement = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);

        // Clean single click while zoomed in: zoom out back to 1x!
        if (totalMovement < 6) {
          resetZoom();
          return;
        }

        const scale = zoomRef.current.scale;
        const vpRect = el.getBoundingClientRect();
        const maxPanX = (vpRect.width * (scale - 1)) / 2;
        const maxPanY = (vpRect.height * (scale - 1)) / 2;
        const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, zoomRef.current.panX));
        const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, zoomRef.current.panY));

        zoomRef.current.panX = clampedPanX;
        zoomRef.current.panY = clampedPanY;
        if (currentImageRef.current) {
          currentImageRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
          currentImageRef.current.style.transform = `translate(${clampedPanX}px, ${clampedPanY}px) scale(${scale})`;
        }
        return;
      }

      if (!isMouseDown) return;
      isMouseDown = false;
      if (!trackRef.current || isAnimatingRef.current) return;

      const diffX = mouseCurrentX - mouseStartX;
      const totalMovement = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);

      // Clean single click while unzoomed: zoom in!
      if (totalMovement < 6) {
        const target = e.target as HTMLElement | null;
        if (target && !target.closest('button') && !target.closest('input')) {
          zoomTo(2.5, e.clientX, e.clientY);
          return;
        }
      }

      const threshold = 45;

      if (diffX < -threshold) {
        handleNext();
      } else if (diffX > threshold) {
        handlePrev();
      } else {
        trackRef.current.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        trackRef.current.style.transform = 'translateX(-33.333333%)';
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [selectedIndex, handleNext, handlePrev, resetZoom, zoomTo]);

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
      artworkType: newArtworkType.trim() || 'Obra original',
      description: newDescription.trim(),
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
    setNewTechnique('Óleo sobre lienzo');
    setNewDimensions('');
    setNewYear(new Date().getFullYear().toString());
    setNewArtworkType('Obra original');
    setNewDescription('Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.');
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
        >
          <div
            className="relative w-full max-w-7xl h-full sm:h-auto sm:max-h-[92vh] bg-neutral-950 lg:bg-white shadow-2xl flex flex-col lg:flex-row overflow-hidden sm:border sm:border-neutral-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Right Modal Controls */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
              {/* Zoom Button (Standard PhotoSwipe style toolbar button) */}
              <button
                type="button"
                onClick={() => {
                  if (isZoomed) {
                    resetZoom();
                  } else {
                    zoomTo(2.5);
                  }
                }}
                aria-label={isZoomed ? "Alejar imagen" : "Acercar imagen"}
                title={isZoomed ? "Alejar imagen" : "Acercar imagen"}
                className={`w-10 h-10 bg-neutral-950/80 hover:bg-neutral-900 text-white flex items-center justify-center transition-all duration-200 rounded-full border shadow-lg cursor-pointer ${
                  isZoomed ? 'border-amber-400/80 text-amber-300' : 'border-neutral-700/60'
                }`}
              >
                {isZoomed ? (
                  /* Zoom Out icon (-) */
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                ) : (
                  /* Zoom In icon (+) */
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar modal"
                className="w-10 h-10 bg-neutral-950/80 hover:bg-neutral-900 text-white flex items-center justify-center transition-colors rounded-full border border-neutral-700/60 shadow-lg cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Left: Artwork Viewport with 3-Slide Carousel Track */}
            <div
              ref={viewportRef}
              className="relative flex-1 bg-neutral-950 flex items-center justify-start h-[62vh] sm:h-[65vh] lg:h-auto lg:min-h-[80vh] lg:max-h-[86vh] select-none overflow-hidden touch-none"
              style={{
                touchAction: 'none',
                cursor: isZoomed ? 'grab' : 'zoom-in',
              }}
            >
              {/* 3-Slide Carousel Track for 60fps/120fps physical swipe */}
              <div
                ref={trackRef}
                className="flex w-[300%] h-full flex-shrink-0"
                style={{
                  transform: 'translateX(-33.333333%)',
                  willChange: 'transform',
                }}
              >
                {/* Slide 0: Previous Artwork */}
                <div className="w-1/3 h-full flex-shrink-0 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden">
                  {prevItem && (
                    <img
                      src={prevItem.src}
                      alt={prevItem.title}
                      draggable={false}
                      className="max-w-full max-h-full lg:max-h-[82vh] w-auto h-auto object-contain shadow-2xl pointer-events-none select-none"
                    />
                  )}
                </div>

                {/* Slide 1: Current Artwork (Supports pinch-to-zoom & single click on PC) */}
                <div
                  className="w-1/3 h-full flex-shrink-0 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden"
                  style={{
                    cursor: isZoomed ? 'grab' : 'zoom-in',
                  }}
                >
                  {selectedItem && (
                    <img
                      ref={currentImageRef}
                      src={selectedItem.src}
                      alt={selectedItem.title}
                      draggable={false}
                      className="max-w-full max-h-full lg:max-h-[82vh] w-auto h-auto object-contain shadow-2xl select-none will-change-transform"
                      style={{
                        cursor: isZoomed ? 'grab' : 'zoom-in',
                      }}
                    />
                  )}
                </div>

                {/* Slide 2: Next Artwork */}
                <div className="w-1/3 h-full flex-shrink-0 flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden">
                  {nextItem && (
                    <img
                      src={nextItem.src}
                      alt={nextItem.title}
                      draggable={false}
                      className="max-w-full max-h-full lg:max-h-[82vh] w-auto h-auto object-contain shadow-2xl pointer-events-none select-none"
                    />
                  )}
                </div>
              </div>

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

              {/* Prev / Next Nav (Hidden while zoomed to avoid obstructing view) */}
              {!isZoomed && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label="Obra anterior"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-neutral-900/70 hover:bg-neutral-900 active:scale-90 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-xs rounded-full cursor-pointer z-20 border border-white/10 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label="Obra siguiente"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-neutral-900/70 hover:bg-neutral-900 active:scale-90 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-xs rounded-full cursor-pointer z-20 border border-white/10 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Mobile swipe subtle indicator (momentary on first entry only) */}
              <div
                className={`sm:hidden absolute bottom-3 inset-x-0 flex justify-center items-center pointer-events-none z-10 transition-all duration-700 ${
                  showSwipeHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <span className="text-[10px] text-white/80 tracking-wider uppercase font-sans bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 shadow-lg">
                  ← Desliza para navegar →
                </span>
              </div>
            </div>

            {/* Right: Ficha Técnica Sidebar (Compact bottom sheet on mobile, full sidebar on PC) */}
            <div className="lg:w-84 xl:w-96 flex-shrink-0 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white rounded-t-2xl lg:rounded-none border-t lg:border-t-0 lg:border-l border-neutral-100 flex-1 lg:flex-initial max-h-[38vh] sm:max-h-[35vh] lg:max-h-none shadow-lg lg:shadow-none">
              <div key={selectedItem.id} className="animate-slide-fade-up space-y-6">
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

                  {/* Tipo */}
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-400 uppercase text-xs tracking-wider">Tipo</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedItem.artworkType || 'Obra original'}
                        placeholder="Ej. Obra original"
                        onChange={(e) => handleUpdateItemField('artworkType', e.target.value)}
                        className="text-right text-xs font-sans border-b border-neutral-300 focus:border-neutral-900 pb-0.5 focus:outline-none text-neutral-900 placeholder:text-neutral-300"
                      />
                    ) : (
                      <span className="text-neutral-900">{selectedItem.artworkType || 'Obra original'}</span>
                    )}
                  </div>
                </div>

                {/* Descripción / Nota de la pieza */}
                <div className="pt-2">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-sans tracking-wider text-neutral-400">
                        Descripción de la pieza
                      </label>
                      <textarea
                        rows={3}
                        value={
                          selectedItem.description !== undefined
                            ? selectedItem.description
                            : 'Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.'
                        }
                        onChange={(e) => handleUpdateItemField('description', e.target.value)}
                        placeholder="Descripción o nota curatorial de la pieza..."
                        className="w-full text-xs font-sans font-light text-neutral-800 p-2.5 border border-neutral-300 rounded-sm focus:border-neutral-900 focus:outline-none resize-none leading-relaxed bg-neutral-50/60"
                      />
                    </div>
                  ) : (
                    (selectedItem.description !== undefined
                      ? selectedItem.description
                      : 'Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.') && (
                      <p className="text-xs text-neutral-500 font-sans font-light leading-relaxed">
                        {selectedItem.description !== undefined
                          ? selectedItem.description
                          : 'Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.'}
                      </p>
                    )
                  )}
                </div>
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

              {/* Artwork Type */}
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                  Tipo de Obra
                </label>
                <input
                  type="text"
                  value={newArtworkType}
                  onChange={(e) => setNewArtworkType(e.target.value)}
                  placeholder="Ej. Obra original, Estudio, Boceto"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-500 mb-1">
                  Descripción / Nota de la Pieza
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descripción o nota curatorial de la pieza..."
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900 resize-none"
                />
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
