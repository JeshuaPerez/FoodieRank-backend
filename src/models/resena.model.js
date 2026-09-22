// Entidad Reseña. Los contadores de likes y dislikes viven aquí para no contar
// la colección de reacciones en cada lectura.
export default class Resena {
    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.usuarioId = datos.usuarioId;
        this.restauranteId = datos.restauranteId;
        this.comentario = datos.comentario;
        this.calificacion = datos.calificacion;
        this.likes = datos.likes ?? 0;
        this.dislikes = datos.dislikes ?? 0;
        this.creadoEn = datos.creadoEn ?? new Date();
        this.editadoEn = datos.editadoEn ?? null;

        // Los agrega el repositorio al leer: el frontend necesita el nombre del
        // autor y saber si el usuario ya reaccionó. No se guardan.
        this.autor = datos.autor ?? null;
        this.miReaccion = datos.miReaccion ?? null;
    }

    static desde(documento) {
        return documento ? new Resena(documento) : null;
    }

    static nueva({ comentario, calificacion }, usuarioId, restauranteId) {
        return new Resena({
            usuarioId,
            restauranteId,
            comentario: comentario.trim(),
            // Desde un input del navegador la calificación llega como texto
            calificacion: Number(calificacion),
            likes: 0,
            dislikes: 0,
            creadoEn: new Date(),
            editadoEn: null
        });
    }

    esDe(usuario) {
        return Boolean(usuario && this.usuarioId?.equals(usuario._id));
    }

    aDocumento() {
        return {
            usuarioId: this.usuarioId,
            restauranteId: this.restauranteId,
            comentario: this.comentario,
            calificacion: this.calificacion,
            likes: this.likes,
            dislikes: this.dislikes,
            creadoEn: this.creadoEn,
            editadoEn: this.editadoEn
        };
    }

    aPublico() {
        return {
            id: this._id,
            usuarioId: this.usuarioId,
            autor: this.autor,
            restauranteId: this.restauranteId,
            comentario: this.comentario,
            calificacion: this.calificacion,
            likes: this.likes,
            dislikes: this.dislikes,
            miReaccion: this.miReaccion,
            creadoEn: this.creadoEn,
            editadoEn: this.editadoEn
        };
    }
}
