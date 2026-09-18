import React, { useState, useEffect, useRef } from 'react';
import { EditorStore } from './EditorStore';

interface EditableTextProps {
  contentKey: string;
  defaultText: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
}

export default function EditableText({
  contentKey,
  defaultText,
  as: Component = 'span',
  className = '',
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [text, setText] = useState(defaultText);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    setText(EditorStore.getText(contentKey, defaultText));

    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
      setText(EditorStore.getText(contentKey, defaultText));
    });

    return () => unsubscribe();
  }, [contentKey, defaultText]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsActive(true);
    setTimeout(() => {
      if (elementRef.current) {
        elementRef.current.focus();
        // Place cursor at the end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(elementRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 20);
  };

  const handleBlur = () => {
    setIsActive(false);
    if (!elementRef.current) return;
    const newText = elementRef.current.innerText.trim();
    if (newText && newText !== text) {
      setText(newText);
      EditorStore.updateText(contentKey, newText);
    } else if (!newText) {
      elementRef.current.innerText = text; // Prevent empty text
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (elementRef.current) elementRef.current.innerText = text;
      elementRef.current?.blur();
    }
  };

  if (!isEditing) {
    return React.createElement(Component, { className }, text);
  }

  return (
    <span
      className="relative inline-block group/editable max-w-full"
      onClick={handleStartEdit}
    >
      {/* Floating Edit Pencil Badge (Squarespace style) */}
      {!isActive && (
        <span
          onClick={handleStartEdit}
          title="Editar este texto"
          className="absolute -top-3 -right-3 z-30 opacity-0 group-hover/editable:opacity-100 transition-opacity bg-neutral-950 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 cursor-pointer font-sans normal-case tracking-normal border border-neutral-700 pointer-events-auto"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-[9px] font-medium">Editar</span>
        </span>
      )}

      {/* Editable Element */}
      {React.createElement(
        Component,
        {
          ref: elementRef,
          contentEditable: isActive,
          suppressContentEditableWarning: true,
          onBlur: handleBlur,
          onKeyDown: handleKeyDown,
          className: `${className} transition-all ${
            isActive
              ? 'ring-2 ring-neutral-900 bg-amber-50/50 px-1 py-0.5 rounded-xs outline-none cursor-text'
              : 'hover:outline-dashed hover:outline-1 hover:outline-neutral-400 cursor-pointer rounded-xs'
          }`,
        },
        text
      )}
    </span>
  );
}
