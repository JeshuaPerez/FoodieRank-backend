import { normalizar } from '../utils/texto.js';

// Entidad Plato. Siempre pertenece a un restaurante: su nombre es único dentro
// de ese restaurante, no en todo el sistema.
export default class Plato {
    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.nombre = datos.nombre;
        this.nombreNormalizado = datos.nombreNormalizado ?? normalizar(datos.nombre ?? '');
        this.descripcion = datos.descripcion ?? '';
        this.precio = datos.precio;
        this.restauranteId = datos.restauranteId;
        this.imagen = datos.imagen ?? null;
        this.aprobado = datos.aprobado ?? false;
        this.creadoPor = datos.creadoPor ?? null;
        this.creadoEn = datos.creadoEn ?? new Date();
    }

    static desde(documento) {
        return documento ? new Plato(documento) : null;
    }

    static nuevo({ nombre, descripcion = '', precio, imagen = null }, restauranteId, creadoPor, aprobado = false) {
        return new Plato({
            nombre: nombre.trim(),
            nombreNormalizado: normalizar(nombre),
            descripcion: descripcion.trim(),
            // Desde un input del navegador el precio llega como texto
            precio: Number(precio),
            restauranteId,
            imagen: imagen?.trim() || null,
            aprobado,
            creadoPor,
            creadoEn: new Date()
        });
    }

    // Mismo criterio que en restaurantes: un plato pendiente no es público
    esVisiblePara(usuario = null) {
        return this.aprobado
            || usuario?.rol === 'admin'
            || Boolean(usuario && this.creadoPor?.equals(usuario._id));
    }

    aDocumento() {
        return {
            nombre: this.nombre,
            nombreNormalizado: this.nombreNormalizado,
            descripcion: this.descripcion,
            precio: this.precio,
            restauranteId: this.restauranteId,
            imagen: this.imagen,
            aprobado: this.aprobado,
            creadoPor: this.creadoPor,
            creadoEn: this.creadoEn
        };
    }

    aPublico() {
        return {
            id: this._id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            restauranteId: this.restauranteId,
            imagen: this.imagen,
            aprobado: this.aprobado,
            creadoEn: this.creadoEn
        };
    }
}
