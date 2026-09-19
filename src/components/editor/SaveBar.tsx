import React, { useState, useEffect } from 'react';
import { EditorStore, type PendingDrafts } from './EditorStore';
import { commitFilesToGitHub, verifyGitHubToken } from '../../utils/github';

export default function SaveBar() {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<PendingDrafts>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Floating Edit Pencil overlay position state
  const [pencilPos, setPencilPos] = useState<{ top: number; left: number; el: HTMLElement } | null>(null);

  useEffect(() => {
    setIsEditing(EditorStore.isEditMode());
    setDrafts(EditorStore.getDrafts());
    setTokenInput(EditorStore.getGitHubToken());

    const unsubscribe = EditorStore.subscribe(() => {
      setIsEditing(EditorStore.isEditMode());
      setDrafts(EditorStore.getDrafts());
    });

    // Floating pencil hover tracker (zero DOM impact on content elements)
    const handleMouseOver = (e: MouseEvent) => {
      if (!EditorStore.isEditMode()) return;
      const target = (e.target as HTMLElement).closest('[data-editable="true"]') as HTMLElement | null;
      if (target) {
        const rect = target.getBoundingClientRect();
        setPencilPos({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX,
          el: target,
        });
      } else {
        const onPencil = (e.target as HTMLElement).closest('.floating-pencil-badge');
        if (!onPencil) {
          setPencilPos(null);
        }
      }
    };
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('scroll', () => setPencilPos(null));

    const handleWindowChange = () => {
      setIsEditing(EditorStore.isEditMode());
      setDrafts(EditorStore.getDrafts());
    };
    window.addEventListener('lia_editor_change', handleWindowChange);

    return () => {
      unsubscribe();
      window.removeEventListener('lia_editor_change', handleWindowChange);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (!isEditing) return null;

  const draftKeys = Object.keys(drafts);
  const draftCount = draftKeys.length;

  const handleSave = async () => {
    if (draftCount === 0) {
      setStatusMessage({ text: 'No tienes cambios pendientes por guardar.', type: 'info' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const token = EditorStore.getGitHubToken() || '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';
    const changes = Object.values(drafts);
    const count = changes.length;

    setIsSaving(true);
    setStatusMessage({ text: 'Guardando y sincronizando cambios...', type: 'info' });

    const isLocalHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.') ||
        window.location.hostname.startsWith('10.') ||
        window.location.hostname.endsWith('.local'));

    let gitHubSuccess = false;
    let localDiskSuccess = false;
    let errorMessage = '';

    try {
      // 1. Commit to GitHub FIRST while the page and network are 100% idle
      try {
        const result = await commitFilesToGitHub({
          token,
          message: `Actualización de contenido por Lía (${count} cambio${count > 1 ? 's' : ''})`,
          changes,
        });
        if (result.success) {
          gitHubSuccess = true;
        } else {
          errorMessage = result.error || 'No se pudo conectar con GitHub.';
        }
      } catch (ghErr: any) {
        errorMessage = ghErr?.message || 'Error de conexión con GitHub.';
      }

      // 2. If running in development (localhost or LAN IP), write to local disk
      if (isLocalHost) {
        try {
          const localRes = await fetch('/api/save-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changes }),
          });
          if (localRes.ok) {
            localDiskSuccess = true;
          }
        } catch (localErr) {
          console.warn('Local disk sync notice:', localErr);
        }
      }

      // In local dev, operation succeeds if either local disk or GitHub succeeded!
      const isSaved = isLocalHost ? (localDiskSuccess || gitHubSuccess) : gitHubSuccess;

      if (!isSaved) {
        throw new Error(errorMessage || 'No se pudieron guardar los cambios.');
      }

      // 3. Clear drafts immediately so the UI counter drops to 0 instantly
      EditorStore.clearDrafts();
      setDrafts({});

      let msg = '¡Cambios guardados con éxito!';
      if (isLocalHost && gitHubSuccess && localDiskSuccess) {
        msg = '¡Cambios guardados en tu equipo y sincronizados con GitHub!';
      } else if (isLocalHost && localDiskSuccess && !gitHubSuccess) {
        msg = 'Cambios guardados en tu equipo localmente.';
      }

      setStatusMessage({
        text: msg,
        type: 'success',
      });

      // 4. Smooth reload after green confirmation
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error al guardar cambios', type: 'error' });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError('');
    if (!tokenInput.trim()) {
      setTokenError('Por favor ingresa un token válido.');
      return;
    }

    setIsVerifyingToken(true);
    const verify = await verifyGitHubToken(tokenInput.trim());
    setIsVerifyingToken(false);

    if (!verify.success) {
      setTokenError(verify.error || 'No se pudo verificar el token.');
      return;
    }

    EditorStore.setGitHubToken(tokenInput.trim());
    setShowTokenModal(false);
    setStatusMessage({ text: `Llave de acceso conectada (@${verify.username}).`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDiscard = () => {
    if (confirm('¿Seguro que quieres descartar todos los cambios no guardados?')) {
      EditorStore.clearDrafts();
      window.location.reload();
    }
  };

  const handleExitEditMode = () => {
    if (draftCount > 0) {
      if (!confirm('Tienes cambios sin guardar. ¿Deseas salir del Modo Edición de todas formas?')) {
        return;
      }
      EditorStore.clearDrafts();
    }
    EditorStore.setEditMode(false);
    window.location.href = window.location.pathname;
  };

  return (
    <>
      {/* Non-intrusive Floating Edit Pencil Badge */}
      {pencilPos && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            pencilPos.el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
            setPencilPos(null);
          }}
          style={{
            position: 'absolute',
            top: `${pencilPos.top - 8}px`,
            left: `${pencilPos.left}px`,
            transform: 'translate(-100%, -100%)',
          }}
          className="floating-pencil-badge z-[120] pointer-events-auto bg-neutral-950 text-white text-[10px] font-sans px-2 py-0.5 rounded-full shadow-2xl flex items-center gap-1 border border-neutral-700 hover:bg-neutral-800 transition-all cursor-pointer select-none"
        >
          <svg className="w-2.5 h-2.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="font-medium tracking-normal text-[9px] uppercase">Editar</span>
        </button>
      )}

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-2xl text-xs sm:text-sm font-sans flex items-center gap-2.5 animate-bounce-in border backdrop-blur-md ${
            statusMessage.type === 'success'
              ? 'bg-neutral-900/95 text-white border-emerald-500/50 shadow-emerald-950/20'
              : statusMessage.type === 'error'
              ? 'bg-neutral-900/95 text-rose-200 border-rose-500/50 shadow-rose-950/20'
              : 'bg-neutral-900/95 text-neutral-100 border-neutral-700/80 shadow-black/30'
          }`}
        >
          {statusMessage.type === 'success' && <span className="text-emerald-400 font-bold text-base">✓</span>}
          {statusMessage.type === 'error' && <span className="text-rose-400 font-bold text-base">✕</span>}
          {statusMessage.type === 'info' && (
            <svg className="animate-spin h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-[90] pointer-events-none pb-3 sm:pb-4 px-3 sm:px-6 flex justify-center">
        <div className="pointer-events-auto bg-neutral-950/95 backdrop-blur-md border border-neutral-800 text-white rounded-full px-4 py-2 sm:px-5 sm:py-3 shadow-2xl flex items-center justify-between sm:justify-start gap-2 sm:gap-6 max-w-4xl w-full sm:w-auto">
          
          {/* Mode Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-medium text-neutral-200 hidden xs:inline sm:inline">
              Editor
            </span>
          </div>

          <div className="h-4 w-[1px] bg-neutral-800 hidden sm:block" />

          {/* Pending Changes Badge */}
          <div className="text-[11px] sm:text-xs font-sans text-neutral-300 truncate">
            {isSaving ? (
              <span className="text-amber-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                <span>Guardando...</span>
              </span>
            ) : draftCount === 0 ? (
              <span className="text-neutral-400 text-[11px] sm:text-xs">Todo al día</span>
            ) : (
              <span className="font-medium text-white">
                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] sm:text-[11px] mr-1 font-mono font-semibold">
                  {draftCount}
                </span>
                <span className="hidden sm:inline">cambio{draftCount > 1 ? 's' : ''} pendiente{draftCount > 1 ? 's' : ''}</span>
                <span className="sm:hidden">cambio{draftCount > 1 ? 's' : ''}</span>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
            {draftCount > 0 && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs text-neutral-400 hover:text-white uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Descartar
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || draftCount === 0}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-white text-neutral-950 hover:bg-neutral-200 rounded-full text-[11px] sm:text-xs font-sans tracking-[0.12em] sm:tracking-[0.18em] uppercase font-medium transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3 sm:h-3.5 w-3 sm:w-3.5 text-neutral-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar</span>
              )}
            </button>

            {/* Config Token */}
            <button
              type="button"
              onClick={() => setShowTokenModal(true)}
              title="Configurar Llave de GitHub"
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800"
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>

            {/* Exit Mode */}
            <button
              type="button"
              onClick={handleExitEditMode}
              title="Salir del Modo Edición"
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-rose-400 transition-colors rounded-full hover:bg-neutral-800"
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* GitHub Token Config Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 text-neutral-900 rounded-sm shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6">
            <div>
              <span className="font-sans text-[11px] tracking-[0.25em] uppercase text-neutral-400 font-medium block mb-1">
                Conexión con GitHub
              </span>
              <h3 className="font-serif text-2xl text-neutral-900">
                Llave de Acceso (Token)
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                Para que Lía pueda guardar cambios directamente en la web sin servidores, pega tu Personal Access Token de GitHub con permiso <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">repo</code>. Se guarda de forma segura en este navegador.
              </p>
            </div>

            <form onSubmit={handleSaveToken} className="space-y-4">
              <div>
                <label className="block text-[11px] font-sans tracking-wider uppercase text-neutral-600 mb-1.5">
                  Personal Access Token (ghp_...)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900 bg-neutral-50"
                  required
                />
                {tokenError && (
                  <p className="text-[11px] text-rose-600 mt-1.5 font-sans">{tokenError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-4 py-2 text-xs font-sans uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingToken}
                  className="px-6 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-sans tracking-[0.18em] uppercase font-medium rounded-sm disabled:opacity-50"
                >
                  {isVerifyingToken ? 'Verificando...' : 'Guardar Llave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
