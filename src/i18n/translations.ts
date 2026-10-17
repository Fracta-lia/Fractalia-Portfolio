export type Lang = 'es' | 'en';

export const LANG_STORAGE_KEY = 'lia_lang';

export function getInitialLanguage(): Lang {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;

    const navLangs = navigator.languages || [navigator.language || ''];
    for (const l of navLangs) {
      if (l.toLowerCase().startsWith('es')) {
        return 'es';
      }
      if (l.toLowerCase().startsWith('en')) {
        return 'en';
      }
    }
  } catch (e) {
    console.warn('Language detection error:', e);
  }
  // Default to English for international visitors if not Spanish
  return 'en';
}

export const uiTranslations: Record<Lang, Record<string, string>> = {
  es: {
    // Nav
    'nav.home': 'Inicio',
    'nav.gallery': 'Galería',
    'nav.services': 'Servicios',
    'nav.about': 'Sobre Mí',
    'nav.contact': 'Contacto',

    // Footer & Common
    'footer.copyright': 'Todos los derechos reservados.',
    'footer.edit_mode': 'Modo Editor',
    'footer.exit_edit_mode': 'Salir de Edición',

    // Home
    'home.hero.discover': 'Descubrir',
    'home.gallery.explore_btn': 'Explorar Galería Completa',
    'home.services.explore_btn': 'Conocer detalles & tarifas',

    // Contact Page details
    'contact.direct_ig_label': 'Instagram Direct',
    'contact.direct_ig_desc': 'También puedes enviarme un mensaje directo por Instagram para consultas rápidas.',
    'contact.email_label': 'Correo Electrónico',
    'contact.email_desc': 'Para consultas de bodas, cotizaciones formales y encargos de obra original.',
    'contact.coverage_label': 'Cobertura Geográfica',
    'contact.coverage_desc': 'Disponible para eventos y traslados a nivel nacional e internacional.',
    'contact.response_label': 'Tiempo de Respuesta',
    'contact.response_desc': 'Menos de 24 a 48 horas en días hábiles.',

    // Contact Form
    'form.name_label': 'Nombre completo',
    'form.name_placeholder': 'Tu nombre y apellido',
    'form.email_label': 'Correo Electrónico',
    'form.email_placeholder': 'tu@correo.com',
    'form.phone_label': 'Teléfono / WhatsApp',
    'form.phone_placeholder': '+52 ...',
    'form.service_label': 'Servicio de Interés',
    'form.service_wedding': 'Wedding Live Painting (Boda en Vivo)',
    'form.service_portrait': 'Retrato Personalizado por Encargo',
    'form.service_original': 'Obra Original de Galería',
    'form.service_other': 'Otra Consulta Artística',
    'form.date_label': 'Fecha Estimada del Evento / Boda',
    'form.message_label': 'Mensaje o Detalles del Proyecto',
    'form.message_placeholder': 'Cuéntame sobre la fecha, lugar o idea que tienes en mente...',
    'form.submit': 'Enviar Consulta',
    'form.submitting': 'Enviando...',
    'form.success_title': '¡Mensaje Recibido!',
    'form.success_desc': 'Muchas gracias por escribir. Me pondré en contacto contigo a la brevedad para conversar sobre tu proyecto o evento.',
    'form.send_another': 'Enviar otro mensaje',
    'form.response_note': 'Respuesta habitual en menos de 24-48 horas.',
    'form.error_msg': 'Hubo un inconveniente al enviar tu mensaje automáticamente. Por favor escribe directamente a liapazart@gmail.com o contáctame por Instagram @fracta.lia.',

    // Gallery
    'gallery.spec_sheet': 'Ficha Técnica',
    'gallery.of': 'de',
    'gallery.technique': 'Técnica',
    'gallery.dimensions': 'Dimensiones',
    'gallery.year': 'Año',
    'gallery.type': 'Tipo',
    'gallery.description': 'Descripción de la pieza',
    'gallery.inquire': 'Consultar por esta Obra',
    'gallery.prev': 'Anterior',
    'gallery.next': 'Siguiente',
    'gallery.swipe_hint': '← Desliza para navegar →',
    'gallery.zoom_in': 'Acercar imagen',
    'gallery.zoom_out': 'Alejar imagen',
    'gallery.close': 'Cerrar modal',
    'gallery.edit_banner_title': 'Modo Edición Galería:',
    'gallery.edit_banner_desc': 'Arrastra cualquier cuadro con el cursor para moverlo de posición, o haz clic para editar su ficha.',
    'gallery.add_artwork': 'Agregar Nueva Obra',
    'gallery.delete_artwork': 'Eliminar Obra de Galería',
    'gallery.change_image': 'Cambiar Imagen',

    // 404
    '404.badge': 'Error 404 · Sala Inexistente',
    '404.title': 'Esta obra no se encuentra aquí',
    '404.desc': 'La página o pieza que intentas consultar ha sido reubicada o el enlace no es el correcto. Te invitamos a continuar descubriendo la colección.',
    '404.gallery_btn': 'Explorar Galería',
    '404.home_btn': 'Volver al Inicio',

    // About
    'about.location_caption': 'Lía Paz en su estudio · Puebla, México',
    'about.follow_label': 'Sígueme en el proceso:',
    'about.follow_link': '@fracta.lia en Instagram',
    'about.statement_title': 'Statement de la Artista',
    'about.semblanza_title': 'Semblanza',
  },
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.gallery': 'Gallery',
    'nav.services': 'Services',
    'nav.about': 'About',
    'nav.contact': 'Contact',

    // Footer & Common
    'footer.copyright': 'All rights reserved.',
    'footer.edit_mode': 'Edit Mode',
    'footer.exit_edit_mode': 'Exit Edit Mode',

    // Home
    'home.hero.discover': 'Discover',
    'home.gallery.explore_btn': 'Explore Full Gallery',
    'home.services.explore_btn': 'View Details & Pricing',

    // Contact Page details
    'contact.direct_ig_label': 'Instagram Direct',
    'contact.direct_ig_desc': 'You can also send me a direct message on Instagram for quick inquiries.',
    'contact.email_label': 'Email Address',
    'contact.email_desc': 'For wedding inquiries, formal quotes, and original artwork commissions.',
    'contact.coverage_label': 'Geographic Coverage',
    'contact.coverage_desc': 'Available for domestic travel across Mexico and worldwide destination weddings.',
    'contact.response_label': 'Response Time',
    'contact.response_desc': 'Usually within 24 to 48 business hours.',

    // Contact Form
    'form.name_label': 'Full Name',
    'form.name_placeholder': 'Your first and last name',
    'form.email_label': 'Email Address',
    'form.email_placeholder': 'your@email.com',
    'form.phone_label': 'Phone / WhatsApp',
    'form.phone_placeholder': '+1 ...',
    'form.service_label': 'Service of Interest',
    'form.service_wedding': 'Wedding Live Painting (Live Experience)',
    'form.service_portrait': 'Custom Commissioned Portrait',
    'form.service_original': 'Original Gallery Artwork',
    'form.service_other': 'Other Artistic Inquiry',
    'form.date_label': 'Estimated Event / Wedding Date',
    'form.message_label': 'Message or Project Details',
    'form.message_placeholder': 'Tell me about the date, venue, or concept you have in mind...',
    'form.submit': 'Send Inquiry',
    'form.submitting': 'Sending...',
    'form.success_title': 'Message Received!',
    'form.success_desc': 'Thank you so much for reaching out. I will get in touch with you shortly to discuss your project or wedding celebration.',
    'form.send_another': 'Send another message',
    'form.response_note': 'Typical response time within 24-48 hours.',
    'form.error_msg': 'There was an issue sending your message automatically. Please write directly to liapazart@gmail.com or contact me via Instagram @fracta.lia.',

    // Gallery
    'gallery.spec_sheet': 'Artwork Details',
    'gallery.of': 'of',
    'gallery.technique': 'Medium',
    'gallery.dimensions': 'Dimensions',
    'gallery.year': 'Year',
    'gallery.type': 'Type',
    'gallery.description': 'Curatorial Note',
    'gallery.inquire': 'Inquire About this Artwork',
    'gallery.prev': 'Previous',
    'gallery.next': 'Next',
    'gallery.swipe_hint': '← Swipe to navigate →',
    'gallery.zoom_in': 'Zoom in',
    'gallery.zoom_out': 'Zoom out',
    'gallery.close': 'Close modal',
    'gallery.edit_banner_title': 'Gallery Edit Mode:',
    'gallery.edit_banner_desc': 'Drag any artwork to reorder, or click to edit its details.',
    'gallery.add_artwork': 'Add New Artwork',
    'gallery.delete_artwork': 'Delete from Gallery',
    'gallery.change_image': 'Change Image',

    // 404
    '404.badge': 'Error 404 · Room Not Found',
    '404.title': 'This artwork is not here',
    '404.desc': 'The page or piece you are looking for has been relocated or the link is incorrect. We invite you to continue exploring the collection.',
    '404.gallery_btn': 'Explore Gallery',
    '404.home_btn': 'Back to Home',

    // About
    'about.location_caption': 'Lía Paz in her studio · Puebla, Mexico',
    'about.follow_label': 'Follow the creative process:',
    'about.follow_link': '@fracta.lia on Instagram',
    'about.statement_title': "Artist's Statement",
    'about.semblanza_title': 'Biography & Career',
  },
};

export const techniqueTranslations: Record<string, string> = {
  'Óleo sobre lienzo': 'Oil on canvas',
  'óleo sobre lienzo': 'Oil on canvas',
  'Acrílico sobre lienzo': 'Acrylic on canvas',
  'acrílico sobre lienzo': 'Acrylic on canvas',
  'Óleo y técnica mixta': 'Oil and mixed media',
  'Óleo sobre lino': 'Oil on linen',
  'Técnica mixta sobre lienzo': 'Mixed media on canvas',
};

export const artworkTypeTranslations: Record<string, string> = {
  'Obra original': 'Original artwork',
  'obra original': 'Original artwork',
  'Estudio': 'Study',
  'estudio': 'Study',
  'Boceto': 'Sketch',
  'Retrato': 'Portrait',
  'Comisión': 'Commission',
};

export function translateTechnique(technique: string | undefined, lang: Lang): string {
  if (!technique) return '';
  if (lang === 'es') return technique;
  return techniqueTranslations[technique.trim()] || technique;
}

export function translateArtworkType(type: string | undefined, lang: Lang): string {
  if (!type) return '';
  if (lang === 'es') return type;
  return artworkTypeTranslations[type.trim()] || type;
}

export function translateArtworkDescription(desc: string | undefined, lang: Lang): string {
  if (!desc) return '';
  if (lang === 'es') return desc;
  if (desc.includes('Pieza original realizada al óleo con pigmentos de alta permanencia sobre soporte preparado artesanalmente.')) {
    return 'Original artwork created in oil with archival, museum-grade pigments on handcrafted canvas.';
  }
  if (desc.includes('Pieza original realizada al acrílico con pigmentos de alta permanencia sobre soporte preparado artesanalmente.')) {
    return 'Original artwork created in acrylic with archival pigments on handcrafted canvas.';
  }
  return desc;
}
