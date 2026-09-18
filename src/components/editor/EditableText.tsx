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
  const [text, setText] = useState(defaultText);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    setText(EditorStore.getText(contentKey, defaultText));

    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
      setText(EditorStore.getText(contentKey, defaultText));
    });

    return () => unsubscribe();
  }, [contentKey, defaultText]);

  const handleBlur = () => {
    if (!ref.current) return;
    const newText = ref.current.innerText.trim();
    if (newText !== text) {
      setText(newText);
      EditorStore.updateText(contentKey, newText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  if (!isEditing) {
    return React.createElement(Component, { className }, text);
  }

  return React.createElement(
    Component,
    {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      title: 'Haz clic para editar texto',
      className: `${className} relative outline-dashed outline-1 outline-neutral-400/80 hover:outline-neutral-950 focus:outline-neutral-950 px-1 py-0.5 rounded-xs transition-all cursor-text`,
    },
    text
  );
}
