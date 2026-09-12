import BaseRepository from './base.repository.js';
import { escaparRegex, normalizar } from '../utils/texto.js';

// Criterios de ordenamiento permitidos en el listado público
const ORDENES = {
    ranking: { rankingPonderado: -1, totalResenas: -1 },
    popularidad: { totalResenas: -1, rankingPonderado: -1 },
    recientes: { creadoEn: -1 }
};

// Trae el nombre de la categoría para que el frontend no haga una segunda petición
const LOOKUP_CATEGORIA = [
    {
        $lookup: {
            from: 'categorias',
            localField: 'categoriaId',
            foreignField: '_id',
            as: 'categoriaDoc',
            pipeline: [{ $project: { nombre: 1 } }]
        }
    },
    { $addFields: { categoria: { $first: '$categoriaDoc.nombre' } } },
    { $project: { categoriaDoc: 0 } }
];

export default class RestauranteRepository extends BaseRepository {
    constructor(db) {
        super(db, 'restaurantes');
    }

    async findByNombre(nombreNormalizado, { session } = {}) {
        return await this.findOne({ nombreNormalizado }, { session });
    }

    async findDetalle(id, { session } = {}) {
        const _id = BaseRepository.aObjectId(id);
        if (!_id) return null;
        const [restaurante] = await this.coleccion
            .aggregate([{ $match: { _id } }, ...LOOKUP_CATEGORIA], { session })
            .toArray();
        return restaurante ?? null;
    }

    // $facet devuelve página y total en una sola ida a la base de datos
    async listar({ busqueda, categoriaId, orden = 'ranking', pagina = 1, limite = 10, aprobado } = {}) {
        const filtro = {};
        if (typeof aprobado === 'boolean') filtro.aprobado = aprobado;
        if (categoriaId) filtro.categoriaId = categoriaId;
        if (busqueda) filtro.nombreNormalizado = { $regex: escaparRegex(normalizar(busqueda)) };

        const paginacion = [{ $skip: (pagina - 1) * limite }];
        if (limite > 0) paginacion.push({ $limit: limite });

        const [resultado] = await this.coleccion
            .aggregate([
                { $match: filtro },
                { $sort: ORDENES[orden] ?? ORDENES.ranking },
                {
                    $facet: {
                        documentos: [...paginacion, ...LOOKUP_CATEGORIA],
                        total: [{ $count: 'valor' }]
                    }
                }
            ])
            .toArray();

        return {
            documentos: resultado?.documentos ?? [],
            total: resultado?.total?.[0]?.valor ?? 0
        };
    }

    async contarPorCategoria(categoriaId, { session } = {}) {
        return await this.count({ categoriaId }, { session });
    }
}
