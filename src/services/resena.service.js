import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConflictoError, NoEncontradoError, SinPermisoError } from '../utils/errores.js';
import Resena from '../models/resena.model.js';
import Reaccion from '../models/reaccion.model.js';
import Restaurante from '../models/restaurante.model.js';
import { aCsv } from '../utils/csv.js';

// like suma en likes, dislike en dislikes
const campoContador = (tipo) => (tipo === 'like' ? 'likes' : 'dislikes');

// Carpeta donde se guardan los CSV generados, en la raíz del proyecto (no
// dentro de src/), calculada a partir de este archivo para que funcione sin
// importar desde dónde se arranque el proceso.
const DIRECTORIO_EXPORTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../exports');

export default class ResenaService {
    #resenaRepo;
    #reaccionRepo;
    #restauranteRepo;
    #moderacionRepo;
    #ranking;
    #enTransaccion;

    constructor(resenaRepo, reaccionRepo, restauranteRepo, moderacionRepo, ranking, enTransaccion) {
        this.#resenaRepo = resenaRepo;
        this.#reaccionRepo = reaccionRepo;
        this.#restauranteRepo = restauranteRepo;
        this.#moderacionRepo = moderacionRepo;
        this.#ranking = ranking;
        this.#enTransaccion = enTransaccion;
    }

    async listarPorRestaurante(restauranteId, usuario = null) {
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        // Mismo criterio que el detalle: si el restaurante está pendiente, sus
        // reseñas tampoco se listan
        if (!Restaurante.desde(restaurante).esVisiblePara(usuario)) {
            throw new NoEncontradoError('Restaurante no encontrado.');
        }

        const resenas = await this.#resenaRepo.findByRestaurante(restaurante._id, {
            usuarioId: usuario?._id ?? null
        });
        return resenas.map((d) => Resena.desde(d).aPublico());
    }

    // Genera un CSV con las reseñas del restaurante (comentario, calificación,
    // autor y fecha) y lo guarda en /exports. No filtra por aprobación: el
    // reporte es una herramienta interna, no una vista pública.
    async exportarCsv(restauranteId) {
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        const resenas = (await this.#resenaRepo.findByRestaurante(restaurante._id))
            .map((documento) => Resena.desde(documento).aPublico());

        const contenido = aCsv(resenas, [
            { titulo: 'Comentario', valor: (r) => r.comentario },
            { titulo: 'Calificación', valor: (r) => r.calificacion },
            { titulo: 'Autor', valor: (r) => r.autor ?? 'Usuario eliminado' },
            { titulo: 'Fecha', valor: (r) => r.creadoEn?.toISOString() ?? '' }
        ]);

        await mkdir(DIRECTORIO_EXPORTS, { recursive: true });

        const nombreArchivo = `resenas-${restaurante._id}-${Date.now()}.csv`;
        await writeFile(path.join(DIRECTORIO_EXPORTS, nombreArchivo), contenido, 'utf8');

        return {
            archivo: nombreArchivo,
            ruta: `exports/${nombreArchivo}`,
            totalResenas: resenas.length
        };
    }

    // Insertar la reseña y recalcular el ranking son una sola operación: si el
    // recálculo falla, la reseña no puede quedar guardada.
    async crear(datos, usuario) {
        const restaurante = await this.#restauranteRepo.findById(datos.restauranteId);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');
        if (!restaurante.aprobado) {
            throw new ConflictoError('El restaurante está pendiente de aprobación y no admite reseñas.');
        }

        return await this.#enTransaccion(async (session) => {
            const existente = await this.#resenaRepo.findByUsuarioYRestaurante(usuario._id, restaurante._id, { session });
            if (existente) throw new ConflictoError('Ya has reseñado este restaurante.');

            const creada = await this.#resenaRepo.create(
                Resena.nueva(datos, usuario._id, restaurante._id).aDocumento(),
                { session }
            );
            await this.#ranking.recalcular(restaurante._id, { session });

            return Resena.desde({ ...creada, autor: usuario.nombre }).aPublico();
        });
    }

    async actualizar(id, datos, usuario) {
        const resena = await this.#resenaRepo.findById(id);
        if (!resena) throw new NoEncontradoError('Reseña no encontrada.');
        if (!resena.usuarioId.equals(usuario._id)) {
            throw new SinPermisoError('Solo el autor puede editar su reseña.');
        }

        return await this.#enTransaccion(async (session) => {
            const cambios = { editadoEn: new Date() };
            if (datos.comentario !== undefined) cambios.comentario = datos.comentario.trim();
            if (datos.calificacion !== undefined) cambios.calificacion = Number(datos.calificacion);

            const actualizada = await this.#resenaRepo.update(id, cambios, { session });
            if (!actualizada) throw new NoEncontradoError('Reseña no encontrada.');

            await this.#ranking.recalcular(resena.restauranteId, { session });

            return Resena.desde({ ...actualizada, autor: usuario.nombre }).aPublico();
        });
    }

    // La elimina su autor o un administrador. Cuando un admin borra una reseña
    // ajena queda constancia en la bitácora de moderación.
    async eliminar(id, usuario) {
        const resena = await this.#resenaRepo.findById(id);
        if (!resena) throw new NoEncontradoError('Reseña no encontrada.');

        const esAutor = resena.usuarioId.equals(usuario._id);
        const esAdmin = usuario.rol === 'admin';
        if (!esAutor && !esAdmin) {
            throw new SinPermisoError('No tienes permiso para eliminar esta reseña.');
        }

        await this.#enTransaccion(async (session) => {
            // El borrado manda: si dos peticiones llegan juntas (doble clic), solo
            // la que realmente borra sigue adelante. La otra responde 404 y no
            // duplica el registro de moderación.
            const borrada = await this.#resenaRepo.delete(resena._id, { session });
            if (!borrada) throw new NoEncontradoError('Reseña no encontrada.');

            await this.#reaccionRepo.deleteByResenas([resena._id], { session });

            if (esAdmin && !esAutor) {
                await this.#moderacionRepo.create({
                    resenaId: resena._id,
                    autorOriginalId: resena.usuarioId,
                    restauranteId: resena.restauranteId,
                    comentario: resena.comentario,
                    calificacion: resena.calificacion,
                    eliminadaPor: usuario._id,
                    fecha: new Date()
                }, { session });
            }

            await this.#ranking.recalcular(resena.restauranteId, { session });
        });
    }

    // Una sola reacción activa por usuario: repetir el mismo tipo la quita,
    // enviar el otro la cambia. Contadores y ranking se mueven en la misma
    // transacción que la reacción.
    async reaccionar(resenaId, tipo, usuario) {
        const resena = await this.#resenaRepo.findById(resenaId);
        if (!resena) throw new NoEncontradoError('Reseña no encontrada.');
        if (resena.usuarioId.equals(usuario._id)) {
            throw new SinPermisoError('No puedes reaccionar a tu propia reseña.');
        }

        return await this.#enTransaccion(async (session) => {
            const existente = await this.#reaccionRepo.findByUsuarioYResena(usuario._id, resena._id, { session });
            const contadores = { likes: 0, dislikes: 0 };
            let miReaccion = tipo;

            if (!existente) {
                await this.#reaccionRepo.create(Reaccion.nueva({ tipo }, usuario._id, resena._id).aDocumento(), { session });
                contadores[campoContador(tipo)] += 1;
            }
            else if (existente.tipo === tipo) {
                await this.#reaccionRepo.delete(existente._id, { session });
                contadores[campoContador(tipo)] -= 1;
                miReaccion = null;
            }
            else {
                await this.#reaccionRepo.update(existente._id, { tipo, creadoEn: new Date() }, { session });
                contadores[campoContador(tipo)] += 1;
                contadores[campoContador(existente.tipo)] -= 1;
            }

            const actualizada = await this.#resenaRepo.incrementarContadores(resena._id, contadores, { session });
            await this.#ranking.recalcular(resena.restauranteId, { session });

            return Resena.desde({ ...actualizada, miReaccion }).aPublico();
        });
    }
}
