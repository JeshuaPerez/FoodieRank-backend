import BaseRepository from './base.repository.js';

export default class CategoriaRepository extends BaseRepository {
    constructor(db) {
        super(db, 'categorias');
    }

    // Se compara por el nombre normalizado, así "Sushi" y "sushi" son la misma
    async findByNombre(nombreNormalizado, { session } = {}) {
        return await this.findOne({ nombreNormalizado }, { session });
    }
}
