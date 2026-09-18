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
      elementRef.current.innerText = text;
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

  // Normal view: 100% original element, zero extra tags or wrappers
  if (!isEditing) {
    return React.createElement(Component, { className }, text);
  }

  // Edit mode: keeps exact tag and className, only adds subtle active focus outline
  const editClasses = isActive
    ? 'outline-2 outline-neutral-950 bg-amber-50/50 cursor-text'
    : 'cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-neutral-400';

  return React.createElement(
    Component,
    {
      ref: elementRef,
      'data-editable': 'true',
      'data-content-key': contentKey,
      contentEditable: isActive,
      suppressContentEditableWarning: true,
      onClick: handleStartEdit,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      title: 'Haz clic para editar texto',
      className: `${className} ${editClasses}`.trim(),
    },
    text
  );
}
