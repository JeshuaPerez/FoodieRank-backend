// Forma del documento de categoría.
import { normalizar } from '../utils/texto.js';

const nuevaCategoria = ({ nombre, descripcion = '' }) => ({
    nombre: nombre.trim(),
    nombreNormalizado: normalizar(nombre),
    descripcion: descripcion.trim(),
    creadoEn: new Date()
});

const categoriaPublica = (categoria) => categoria && ({
    id: categoria._id,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion,
    creadoEn: categoria.creadoEn
});

export { nuevaCategoria, categoriaPublica };
