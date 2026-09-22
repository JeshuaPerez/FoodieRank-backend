// Entidad Reacción: un like o un dislike de un usuario sobre una reseña.
// El índice único garantiza una sola por usuario y reseña.
export default class Reaccion {
    static TIPOS = ['like', 'dislike'];

    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.usuarioId = datos.usuarioId;
        this.resenaId = datos.resenaId;
        this.tipo = datos.tipo;
        this.creadoEn = datos.creadoEn ?? new Date();
    }

    static desde(documento) {
        return documento ? new Reaccion(documento) : null;
    }

    static nueva({ tipo }, usuarioId, resenaId) {
        return new Reaccion({ usuarioId, resenaId, tipo, creadoEn: new Date() });
    }

    // El campo contador de la reseña que le corresponde a este tipo
    campoContador() {
        return this.tipo === 'like' ? 'likes' : 'dislikes';
    }

    aDocumento() {
        return {
            usuarioId: this.usuarioId,
            resenaId: this.resenaId,
            tipo: this.tipo,
            creadoEn: this.creadoEn
        };
    }
}
