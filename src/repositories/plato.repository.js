import BaseRepository from './base.repository.js';

export default class PlatoRepository extends BaseRepository {
    constructor(db) {
        super(db, 'platos');
    }

    async findByRestaurante(restauranteId, { aprobado, session } = {}) {
        const filtro = { restauranteId };
        if (typeof aprobado === 'boolean') filtro.aprobado = aprobado;
        return await this.findAll(filtro, { orden: { nombre: 1 }, session });
    }

    // El duplicado se valida dentro del restaurante, no globalmente
    async findByNombreEnRestaurante(restauranteId, nombreNormalizado, { session } = {}) {
        return await this.findOne({ restauranteId, nombreNormalizado }, { session });
    }

    async deleteByRestaurante(restauranteId, { session } = {}) {
        const { deletedCount } = await this.coleccion.deleteMany({ restauranteId }, { session });
        return deletedCount;
    }
}
