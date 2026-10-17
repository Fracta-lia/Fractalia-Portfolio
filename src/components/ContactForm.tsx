import React, { useState, useEffect } from 'react';
import { EditorStore } from './editor/EditorStore';
import { uiTranslations, type Lang } from '../i18n/translations';

export default function ContactForm() {
  const [lang, setLang] = useState<Lang>(EditorStore.getLang());

  useEffect(() => {
    setLang(EditorStore.getLang());
    const unsubscribe = EditorStore.subscribe(() => {
      setLang(EditorStore.getLang());
    });

    const handleLangChange = (e: any) => {
      const newL = e?.detail?.lang;
      if (newL) setLang(newL);
    };
    window.addEventListener('lia_lang_change', handleLangChange);

    return () => {
      unsubscribe();
      window.removeEventListener('lia_lang_change', handleLangChange);
    };
  }, []);

  const t = uiTranslations[lang] || uiTranslations.en;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'wedding',
    eventDate: '',
    message: ''
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('https://formsubmit.co/ajax/liapazart@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          Nombre: formData.name,
          Email: formData.email,
          Teléfono: formData.phone || (lang === 'en' ? 'Not provided' : 'No proporcionado'),
          Servicio: formData.service,
          Fecha_Evento: formData.eventDate || (lang === 'en' ? 'Not specified' : 'No especificada'),
          Mensaje: formData.message,
          _subject: `Nueva consulta web (${lang.toUpperCase()}): ${formData.name} · Lía Paz Art`,
          _template: 'table',
        }),
      });

      if (!response.ok) {
        throw new Error('Hubo un problema al procesar el envío.');
      }

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: 'wedding',
        eventDate: '',
        message: '',
      });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(t['form.error_msg']);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-6 sm:p-12 border border-neutral-200/80 shadow-sm">
      {status === 'success' ? (
        <div className="text-center py-10 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-serif text-2xl text-neutral-900 font-normal">
            {t['form.success_title']}
          </h3>
          <p className="font-sans text-sm text-neutral-600 max-w-md mx-auto leading-relaxed font-light">
            {t['form.success_desc']}
          </p>
          <div className="pt-4">
            <button
              onClick={() => setStatus('idle')}
              className="text-xs font-sans tracking-widest uppercase text-neutral-500 hover:text-neutral-900 underline underline-offset-4 cursor-pointer"
            >
              {t['form.send_another']}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              {t['form.name_label']} <span className="text-neutral-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder={t['form.name_placeholder']}
              className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                {t['form.email_label']} <span className="text-neutral-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={t['form.email_placeholder']}
                className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                {t['form.phone_label']}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t['form.phone_placeholder']}
                className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Servicio de Interés */}
          <div>
            <label htmlFor="service" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              {t['form.service_label']} <span className="text-neutral-400">*</span>
            </label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="wedding">{t['form.service_wedding']}</option>
              <option value="retrato">{t['form.service_portrait']}</option>
              <option value="original">{t['form.service_original']}</option>
              <option value="otro">{t['form.service_other']}</option>
            </select>
          </div>

          {/* Fecha tentativa del evento */}
          {formData.service === 'wedding' && (
            <div>
              <label htmlFor="eventDate" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                {t['form.date_label']}
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Mensaje */}
          <div>
            <label htmlFor="message" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              {t['form.message_label']} <span className="text-neutral-400">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={formData.message}
              onChange={handleChange}
              placeholder={t['form.message_placeholder']}
              className="w-full px-4 py-3 text-base sm:text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-600 font-sans tracking-wide">
              {errorMessage}
            </p>
          )}

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-4 bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-400 text-xs font-sans tracking-[0.25em] uppercase font-medium transition-colors duration-200 cursor-pointer"
          >
            {status === 'loading' ? t['form.submitting'] : t['form.submit']}
          </button>

          <p className="text-center text-[11px] text-neutral-400 font-sans tracking-wider">
            {t['form.response_note']}
          </p>
        </form>
      )}
    </div>
  );
}
