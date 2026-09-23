// === Resolución de examen: repositorio de favoritos ===
import BaseRepository from './base.repository.js';

export default class FavoritoRepository extends BaseRepository {
    constructor(db) {
        super(db, 'favoritos');
    }

    async findByUsuario(usuarioId, { session } = {}) {
        return await this.findAll({ usuarioId }, { orden: { creadoEn: -1 }, session });
    }

    async findUno(usuarioId, tipo, referenciaId, { session } = {}) {
        const ref = FavoritoRepository.aObjectId(referenciaId);
        if (!ref) return null;
        return await this.findOne({ usuarioId, tipo, referenciaId: ref }, { session });
    }

    // Devuelve si borró algo, para responder 404 cuando no estaba en favoritos
    async deleteUno(usuarioId, tipo, referenciaId, { session } = {}) {
        const ref = FavoritoRepository.aObjectId(referenciaId);
        if (!ref) return false;
        const { deletedCount } = await this.coleccion.deleteOne({ usuarioId, tipo, referenciaId: ref }, { session });
        return deletedCount === 1;
    }
}
