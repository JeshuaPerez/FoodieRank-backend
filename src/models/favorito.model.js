// === Resolución de examen: entidad Favorito ===
export default class Favorito {
    static TIPOS = ['restaurante', 'plato'];

    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.usuarioId = datos.usuarioId;
        this.tipo = datos.tipo;
        this.referenciaId = datos.referenciaId;
        this.creadoEn = datos.creadoEn ?? new Date();

        // Lo agrega el servicio al listar: el restaurante o plato ya resuelto. No se guarda.
        this.referencia = datos.referencia ?? null;
    }

    static desde(documento) {
        return documento ? new Favorito(documento) : null;
    }

    static nuevo(tipo, usuarioId, referenciaId) {
        return new Favorito({
            usuarioId,
            tipo: Favorito.TIPOS.includes(tipo) ? tipo : null,
            referenciaId,
            creadoEn: new Date()
        });
    }

    aDocumento() {
        return {
            usuarioId: this.usuarioId,
            tipo: this.tipo,
            referenciaId: this.referenciaId,
            creadoEn: this.creadoEn
        };
    }

    // El dato favorito viaja bajo su propio nombre: "restaurante" o "plato"
    aPublico() {
        return {
            id: this._id,
            tipo: this.tipo,
            referenciaId: this.referenciaId,
            [this.tipo]: this.referencia,
            creadoEn: this.creadoEn
        };
    }
}
