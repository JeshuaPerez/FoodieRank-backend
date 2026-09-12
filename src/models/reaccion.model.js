// Forma del documento de reacción. Un usuario tiene como máximo una por reseña.
const TIPOS = ['like', 'dislike'];

const nuevaReaccion = ({ tipo }, usuarioId, resenaId) => ({
    usuarioId,
    resenaId,
    tipo,
    creadoEn: new Date()
});

export { TIPOS, nuevaReaccion };
