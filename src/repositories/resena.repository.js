import BaseRepository from './base.repository.js';

export default class ResenaRepository extends BaseRepository {
    constructor(db) {
        super(db, 'resenas');
    }

    async findByUsuarioYRestaurante(usuarioId, restauranteId, { session } = {}) {
        return await this.findOne({ usuarioId, restauranteId }, { session });
    }

    // Devuelve las reseñas con el nombre del autor y, si se pasa usuarioId,
    // la reacción que ese usuario ya dio (la necesita el botón del frontend).
    async findByRestaurante(restauranteId, { usuarioId = null, session } = {}) {
        const etapas = [
            { $match: { restauranteId } },
            { $sort: { creadoEn: -1 } },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'usuarioId',
                    foreignField: '_id',
                    as: 'autorDoc',
                    pipeline: [{ $project: { nombre: 1 } }]
                }
            },
            { $addFields: { autor: { $first: '$autorDoc.nombre' } } }
        ];

        if (usuarioId) {
            etapas.push(
                {
                    $lookup: {
                        from: 'reacciones',
                        let: { resenaId: '$_id' },
                        as: 'reaccionDoc',
                        pipeline: [
                            { $match: { $expr: { $and: [{ $eq: ['$resenaId', '$$resenaId'] }, { $eq: ['$usuarioId', usuarioId] }] } } },
                            { $project: { tipo: 1 } }
                        ]
                    }
                },
                { $addFields: { miReaccion: { $first: '$reaccionDoc.tipo' } } }
            );
        }

        etapas.push({ $project: { autorDoc: 0, reaccionDoc: 0 } });
        return await this.coleccion.aggregate(etapas, { session }).toArray();
    }

    // Promedio de todas las calificaciones del sistema: es la C del promedio
    // bayesiano del ranking.
    async promedioGlobal({ session } = {}) {
        const [resultado] = await this.coleccion
            .aggregate([{ $group: { _id: null, promedio: { $avg: '$calificacion' } } }], { session })
            .toArray();
        return resultado?.promedio ?? 0;
    }

    async incrementarContadores(resenaId, { likes = 0, dislikes = 0 }, { session } = {}) {
        const _id = BaseRepository.aObjectId(resenaId);
        if (!_id) return null;
        return await this.coleccion.findOneAndUpdate(
            { _id },
            { $inc: { likes, dislikes } },
            { session, returnDocument: 'after' }
        );
    }

    async deleteByRestaurante(restauranteId, { session } = {}) {
        const { deletedCount } = await this.coleccion.deleteMany({ restauranteId }, { session });
        return deletedCount;
    }
}
