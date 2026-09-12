import BaseRepository from './base.repository.js';

export default class ReaccionRepository extends BaseRepository {
    constructor(db) {
        super(db, 'reacciones');
    }

    async findByUsuarioYResena(usuarioId, resenaId, { session } = {}) {
        return await this.findOne({ usuarioId, resenaId }, { session });
    }

    // Al borrar una reseña hay que arrastrar sus reacciones o quedan huérfanas
    async deleteByResenas(resenaIds, { session } = {}) {
        if (!resenaIds.length) return 0;
        const { deletedCount } = await this.coleccion.deleteMany({ resenaId: { $in: resenaIds } }, { session });
        return deletedCount;
    }
}
