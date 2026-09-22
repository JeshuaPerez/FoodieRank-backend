import { normalizar } from '../utils/texto.js';

// Entidad Categoría. El nombre se guarda dos veces: como lo escribió el usuario
// y normalizado, que es sobre el que va el índice único.
export default class Categoria {
    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.nombre = datos.nombre;
        this.nombreNormalizado = datos.nombreNormalizado ?? normalizar(datos.nombre ?? '');
        this.descripcion = datos.descripcion ?? '';
        this.creadoEn = datos.creadoEn ?? new Date();
    }

    static desde(documento) {
        return documento ? new Categoria(documento) : null;
    }

    static nueva({ nombre, descripcion = '' }) {
        return new Categoria({
            nombre: nombre.trim(),
            nombreNormalizado: normalizar(nombre),
            descripcion: descripcion.trim(),
            creadoEn: new Date()
        });
    }

    aDocumento() {
        return {
            nombre: this.nombre,
            nombreNormalizado: this.nombreNormalizado,
            descripcion: this.descripcion,
            creadoEn: this.creadoEn
        };
    }

    aPublico() {
        return {
            id: this._id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            creadoEn: this.creadoEn
        };
    }
}
