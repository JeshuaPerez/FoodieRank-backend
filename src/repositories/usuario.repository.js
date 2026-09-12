import BaseRepository from './base.repository.js';

export default class UsuarioRepository extends BaseRepository {
    constructor(db) {
        super(db, 'usuarios');
    }

    async findByEmail(email, { session } = {}) {
        return await this.findOne({ email }, { session });
    }
}
