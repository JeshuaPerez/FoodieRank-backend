import { normalizar } from '../utils/texto.js';

// Entidad Restaurante. Guarda también los valores derivados del ranking, que
// solo escribe RankingService.
export default class Restaurante {
    constructor(datos = {}) {
        this._id = datos._id ?? null;
        this.nombre = datos.nombre;
        this.nombreNormalizado = datos.nombreNormalizado ?? normalizar(datos.nombre ?? '');
        this.descripcion = datos.descripcion ?? '';
        this.categoriaId = datos.categoriaId;
        // Lo agrega el $lookup del repositorio al leer, no se guarda
        this.categoria = datos.categoria ?? null;
        this.ubicacion = datos.ubicacion;
        this.imagen = datos.imagen ?? null;
        this.aprobado = datos.aprobado ?? false;
        this.creadoPor = datos.creadoPor ?? null;
        this.rankingPonderado = datos.rankingPonderado ?? 0;
        this.totalResenas = datos.totalResenas ?? 0;
        this.promedioCalificacion = datos.promedioCalificacion ?? 0;
        this.creadoEn = datos.creadoEn ?? new Date();
    }

    static desde(documento) {
        return documento ? new Restaurante(documento) : null;
    }

    static nuevo({ nombre, descripcion = '', categoriaId, ubicacion, imagen = null }, creadoPor, aprobado = false) {
        return new Restaurante({
            nombre: nombre.trim(),
            nombreNormalizado: normalizar(nombre),
            descripcion: descripcion.trim(),
            categoriaId,
            ubicacion: ubicacion.trim(),
            imagen: imagen?.trim() || null,
            aprobado,
            creadoPor,
            rankingPonderado: 0,
            totalResenas: 0,
            promedioCalificacion: 0,
            creadoEn: new Date()
        });
    }

    // Un restaurante pendiente de aprobación solo lo ven el administrador y
    // quien lo propuso. Lo usan el detalle y todo lo que cuelga del restaurante.
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
            categoriaId: this.categoriaId,
            ubicacion: this.ubicacion,
            imagen: this.imagen,
            aprobado: this.aprobado,
            creadoPor: this.creadoPor,
            rankingPonderado: this.rankingPonderado,
            totalResenas: this.totalResenas,
            promedioCalificacion: this.promedioCalificacion,
            creadoEn: this.creadoEn
        };
    }

    aPublico() {
        return {
            id: this._id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            categoriaId: this.categoriaId,
            categoria: this.categoria,
            ubicacion: this.ubicacion,
            imagen: this.imagen,
            aprobado: this.aprobado,
            rankingPonderado: Number(this.rankingPonderado?.toFixed?.(4) ?? 0),
            totalResenas: this.totalResenas,
            promedioCalificacion: Number(this.promedioCalificacion?.toFixed?.(2) ?? 0),
            creadoEn: this.creadoEn
        };
    }
}
