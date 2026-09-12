import AppError from '../utils/app-error.js';
import enTransaccion from '../utils/transaccion.js';
import { nuevaResena, resenaPublica } from '../models/resena.model.js';
import { nuevaReaccion } from '../models/reaccion.model.js';

// like suma en likes, dislike en dislikes
const campoContador = (tipo) => (tipo === 'like' ? 'likes' : 'dislikes');

export default class ResenaService {
    #resenaRepo;
    #reaccionRepo;
    #restauranteRepo;
    #moderacionRepo;
    #ranking;

    constructor(resenaRepo, reaccionRepo, restauranteRepo, moderacionRepo, ranking) {
        this.#resenaRepo = resenaRepo;
        this.#reaccionRepo = reaccionRepo;
        this.#restauranteRepo = restauranteRepo;
        this.#moderacionRepo = moderacionRepo;
        this.#ranking = ranking;
    }

    async listarPorRestaurante(restauranteId, usuario = null) {
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const resenas = await this.#resenaRepo.findByRestaurante(restaurante._id, {
            usuarioId: usuario?._id ?? null
        });
        return resenas.map(resenaPublica);
    }

    // Insertar la reseña y recalcular el ranking son una sola operación: si el
    // recálculo falla, la reseña no puede quedar guardada.
    async crear(datos, usuario) {
        const restaurante = await this.#restauranteRepo.findById(datos.restauranteId);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);
        if (!restaurante.aprobado) {
            throw new AppError('El restaurante está pendiente de aprobación y no admite reseñas.', 409);
        }

        return await enTransaccion(async (session) => {
            const existente = await this.#resenaRepo.findByUsuarioYRestaurante(usuario._id, restaurante._id, { session });
            if (existente) throw new AppError('Ya has reseñado este restaurante.', 409);

            const creada = await this.#resenaRepo.create(
                nuevaResena(datos, usuario._id, restaurante._id),
                { session }
            );
            await this.#ranking.recalcular(restaurante._id, { session });

            return resenaPublica({ ...creada, autor: usuario.nombre });
        });
    }

    async actualizar(id, datos, usuario) {
        const resena = await this.#resenaRepo.findById(id);
        if (!resena) throw new AppError('Reseña no encontrada.', 404);
        if (!resena.usuarioId.equals(usuario._id)) {
            throw new AppError('Solo el autor puede editar su reseña.', 403);
        }

        return await enTransaccion(async (session) => {
            const cambios = { editadoEn: new Date() };
            if (datos.comentario !== undefined) cambios.comentario = datos.comentario.trim();
            if (datos.calificacion !== undefined) cambios.calificacion = Number(datos.calificacion);

            const actualizada = await this.#resenaRepo.update(id, cambios, { session });
            await this.#ranking.recalcular(resena.restauranteId, { session });

            return resenaPublica({ ...actualizada, autor: usuario.nombre });
        });
    }

    // La elimina su autor o un administrador. Cuando un admin borra una reseña
    // ajena queda constancia en la bitácora de moderación.
    async eliminar(id, usuario) {
        const resena = await this.#resenaRepo.findById(id);
        if (!resena) throw new AppError('Reseña no encontrada.', 404);

        const esAutor = resena.usuarioId.equals(usuario._id);
        const esAdmin = usuario.rol === 'admin';
        if (!esAutor && !esAdmin) {
            throw new AppError('No tienes permiso para eliminar esta reseña.', 403);
        }

        await enTransaccion(async (session) => {
            await this.#reaccionRepo.deleteByResenas([resena._id], { session });
            await this.#resenaRepo.delete(resena._id, { session });

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
        if (!resena) throw new AppError('Reseña no encontrada.', 404);
        if (resena.usuarioId.equals(usuario._id)) {
            throw new AppError('No puedes reaccionar a tu propia reseña.', 403);
        }

        return await enTransaccion(async (session) => {
            const existente = await this.#reaccionRepo.findByUsuarioYResena(usuario._id, resena._id, { session });
            const contadores = { likes: 0, dislikes: 0 };
            let miReaccion = tipo;

            if (!existente) {
                await this.#reaccionRepo.create(nuevaReaccion({ tipo }, usuario._id, resena._id), { session });
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

            return resenaPublica({ ...actualizada, miReaccion });
        });
    }
}
