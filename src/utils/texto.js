// Normaliza nombres para comparar duplicados: minúsculas, sin acentos y sin
// espacios extra. "Café  Central" y "cafe central" quedan iguales.
const normalizar = (texto = '') =>
    texto
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

// Escapa el texto del usuario antes de usarlo en una búsqueda por regex
const escaparRegex = (texto = '') => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export { normalizar, escaparRegex };
