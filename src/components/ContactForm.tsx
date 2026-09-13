import React, { useState } from 'react';

export default function ContactForm() {
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
      // Simulate/Send to Formspree or Email API
      // When the user provides their Formspree ID or email endpoint, it plugs in here.
      // Default fallback handles it gracefully.
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: 'wedding',
        eventDate: '',
        message: ''
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage('Hubo un inconveniente al enviar tu mensaje. Por favor intenta de nuevo o contáctame por Instagram.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-8 sm:p-12 border border-neutral-200/80 shadow-sm">
      {status === 'success' ? (
        <div className="text-center py-10 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-serif text-2xl text-neutral-900 font-normal">
            ¡Mensaje Recibido!
          </h3>
          <p className="font-sans text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
            Muchas gracias por escribir. Me pondré en contacto contigo a la brevedad para conversar sobre tu proyecto o evento.
          </p>
          <div className="pt-4">
            <button
              onClick={() => setStatus('idle')}
              className="text-xs font-sans tracking-widest uppercase text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
            >
              Enviar otro mensaje
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              Nombre completo <span className="text-neutral-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre y apellido"
              className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                Correo Electrónico <span className="text-neutral-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+52 ..."
                className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Servicio de Interés */}
          <div>
            <label htmlFor="service" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              Servicio de Interés <span className="text-neutral-400">*</span>
            </label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="retrato">Retrato Personalizado por Encargo</option>
              <option value="wedding">Wedding Live Painting (Boda en Vivo)</option>
              <option value="original">Obra Original de Galería</option>
              <option value="otro">Otra Consulta Artística</option>
            </select>
          </div>

          {/* Fecha tentativa del evento (relevante para bodas) */}
          {formData.service === 'wedding' && (
            <div>
              <label htmlFor="eventDate" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
                Fecha Estimada del Evento / Boda
              </label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Mensaje */}
          <div>
            <label htmlFor="message" className="block text-xs font-sans tracking-[0.15em] uppercase text-neutral-700 mb-2">
              Mensaje o Detalles del Proyecto <span className="text-neutral-400">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={formData.message}
              onChange={handleChange}
              placeholder="Cuéntame sobre la fecha, lugar o idea que tienes en mente..."
              className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-200 focus:border-neutral-900 focus:bg-white focus:outline-none transition-colors resize-none"
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
            {status === 'loading' ? 'Enviando...' : 'Enviar Consulta'}
          </button>

          <p className="text-center text-[11px] text-neutral-400 font-sans tracking-wider">
            Respuesta habitual en menos de 24-48 horas.
          </p>
        </form>
      )}
    </div>
  );
}

