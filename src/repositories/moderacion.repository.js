// Bitácora de reseñas eliminadas por un administrador: guarda autor original,
// admin responsable y fecha. No se borra nunca.
import BaseRepository from './base.repository.js';

export default class ModeracionRepository extends BaseRepository {
    constructor(db) {
        super(db, 'moderaciones');
    }
}
