import { normalizar } from '../utils/texto.js';

// Entidad Usuario: define la forma del documento, cómo se crea uno nuevo y qué
// campos salen hacia el cliente.
export default class Usuario {
    static ROLES = ['usuario', 'admin'];

    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.nombre = datos.nombre;
        this.email = datos.email;
        this.password = datos.password;
        this.rol = datos.rol ?? 'usuario';
        this.creadoEn = datos.creadoEn ?? new Date();
    }

    // Hidrata un documento de la base; null si no hay documento
    static desde(documento) {
        return documento ? new Usuario(documento) : null;
    }

    // El rol nunca se toma del body: llega como parámetro y solo el seed manda
    // uno distinto de "usuario"
    static nuevo({ nombre, email, password }, rol = 'usuario') {
        return new Usuario({
            nombre: nombre.trim(),
            email: normalizar(email),
            password,
            rol: Usuario.ROLES.includes(rol) ? rol : 'usuario',
            creadoEn: new Date()
        });
    }

    esAdmin() {
        return this.rol === 'admin';
    }

    // Documento tal como se guarda. El _id lo pone MongoDB.
    aDocumento() {
        return {
            nombre: this.nombre,
            email: this.email,
            password: this.password,
            rol: this.rol,
            creadoEn: this.creadoEn
        };
    }

    // DTO de salida: la contraseña jamás se expone
    aPublico() {
        return {
            id: this._id,
            nombre: this.nombre,
            email: this.email,
            rol: this.rol,
            creadoEn: this.creadoEn
        };
    }
}
