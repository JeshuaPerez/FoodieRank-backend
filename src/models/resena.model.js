// Forma del documento de reseña. Los contadores de likes/dislikes viven aquí
// para no contar la colección de reacciones en cada lectura.
const nuevaResena = ({ comentario, calificacion }, usuarioId, restauranteId) => ({
    usuarioId,
    restauranteId,
    comentario: comentario.trim(),
    calificacion: Number(calificacion),
    likes: 0,
    dislikes: 0,
    creadoEn: new Date(),
    editadoEn: null
});

// "autor" y "miReaccion" los agrega el repositorio al leer; el frontend los
// necesita para mostrar el nombre y marcar el botón activo.
const resenaPublica = (resena) => resena && ({
    id: resena._id,
    usuarioId: resena.usuarioId,
    autor: resena.autor ?? null,
    restauranteId: resena.restauranteId,
    comentario: resena.comentario,
    calificacion: resena.calificacion,
    likes: resena.likes,
    dislikes: resena.dislikes,
    miReaccion: resena.miReaccion ?? null,
    creadoEn: resena.creadoEn,
    editadoEn: resena.editadoEn
});

export { nuevaResena, resenaPublica };
