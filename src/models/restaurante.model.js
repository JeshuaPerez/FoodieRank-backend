// Forma del documento de restaurante, incluidos los contadores que alimenta
// el servicio de ranking.
import { normalizar } from '../utils/texto.js';

const nuevoRestaurante = ({ nombre, descripcion = '', categoriaId, ubicacion, imagen = null }, creadoPor, aprobado = false) => ({
    nombre: nombre.trim(),
    nombreNormalizado: normalizar(nombre),
    descripcion: descripcion.trim(),
    categoriaId,
    ubicacion: ubicacion.trim(),
    imagen: imagen?.trim() || null,
    aprobado,
    creadoPor,
    // Valores derivados: solo los escribe ranking.service
    rankingPonderado: 0,
    totalResenas: 0,
    promedioCalificacion: 0,
    creadoEn: new Date()
});

const restaurantePublico = (restaurante) => restaurante && ({
    id: restaurante._id,
    nombre: restaurante.nombre,
    descripcion: restaurante.descripcion,
    categoriaId: restaurante.categoriaId,
    categoria: restaurante.categoria ?? null,
    ubicacion: restaurante.ubicacion,
    imagen: restaurante.imagen,
    aprobado: restaurante.aprobado,
    rankingPonderado: Number(restaurante.rankingPonderado?.toFixed?.(4) ?? 0),
    totalResenas: restaurante.totalResenas,
    promedioCalificacion: Number(restaurante.promedioCalificacion?.toFixed?.(2) ?? 0),
    creadoEn: restaurante.creadoEn
});

export { nuevoRestaurante, restaurantePublico };
