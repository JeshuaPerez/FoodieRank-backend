// Forma del documento de plato. Siempre pertenece a un restaurante.
import { normalizar } from '../utils/texto.js';

const nuevoPlato = ({ nombre, descripcion = '', precio, imagen = null }, restauranteId, creadoPor, aprobado = false) => ({
    nombre: nombre.trim(),
    nombreNormalizado: normalizar(nombre),
    descripcion: descripcion.trim(),
    precio: Number(precio),
    restauranteId,
    imagen: imagen?.trim() || null,
    aprobado,
    creadoPor,
    creadoEn: new Date()
});

const platoPublico = (plato) => plato && ({
    id: plato._id,
    nombre: plato.nombre,
    descripcion: plato.descripcion,
    precio: plato.precio,
    restauranteId: plato.restauranteId,
    imagen: plato.imagen,
    aprobado: plato.aprobado,
    creadoEn: plato.creadoEn
});

export { nuevoPlato, platoPublico };
