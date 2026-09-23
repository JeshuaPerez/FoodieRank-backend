// === Resolución de examen: lógica de favoritos ===
import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import Favorito from '../models/favorito.model.js';
import Restaurante from '../models/restaurante.model.js';
import Plato from '../models/plato.model.js';

export default class FavoritoService {
    #favoritoRepo;
    #restauranteRepo;
    #platoRepo;

    constructor(favoritoRepo, restauranteRepo, platoRepo) {
        this.#favoritoRepo = favoritoRepo;
        this.#restauranteRepo = restauranteRepo;
        this.#platoRepo = platoRepo;
    }

    async listar(usuario) {
        const documentos = await this.#favoritoRepo.findByUsuario(usuario._id);
        if (!documentos.length) return { total: 0, restaurantes: [], platos: [] };

        const idsDe = (tipo) => documentos.filter((d) => d.tipo === tipo).map((d) => d.referenciaId);

        const [restaurantes, platos] = await Promise.all([
            this.#buscarPorIds(this.#restauranteRepo, idsDe('restaurante')),
            this.#buscarPorIds(this.#platoRepo, idsDe('plato'))
        ]);

        const porId = new Map([
            ...restaurantes.map((d) => [String(d._id), Restaurante.desde(d).aPublico()]),
            ...platos.map((d) => [String(d._id), Plato.desde(d).aPublico()])
        ]);

        const lista = documentos
            .map((documento) => {
                const favorito = Favorito.desde(documento);
                favorito.referencia = porId.get(String(favorito.referenciaId)) ?? null;
                return favorito;
            })
            // Si el restaurante o plato ya no existe, el favorito no se lista
            .filter((favorito) => favorito.referencia)
            .map((favorito) => favorito.aPublico());

        return {
            total: lista.length,
            restaurantes: lista.filter((f) => f.tipo === 'restaurante'),
            platos: lista.filter((f) => f.tipo === 'plato')
        };
    }

    async agregar(tipo, id, usuario) {
        const referenciaId = await this.#verificarDestino(tipo, id, usuario);

        // El índice único lo garantiza en la base; esto da el mensaje claro
        const existente = await this.#favoritoRepo.findUno(usuario._id, tipo, referenciaId);
        if (existente) throw new ConflictoError(`Este ${tipo} ya está en tus favoritos.`);

        const creado = await this.#favoritoRepo.create(Favorito.nuevo(tipo, usuario._id, referenciaId).aDocumento());
        return Favorito.desde(creado).aPublico();
    }

    async quitar(tipo, id, usuario) {
        const borrado = await this.#favoritoRepo.deleteUno(usuario._id, tipo, id);
        if (!borrado) throw new NoEncontradoError(`Este ${tipo} no está en tus favoritos.`);
    }

    // Solo se marca lo que existe y el usuario puede ver
    async #verificarDestino(tipo, id, usuario) {
        if (tipo === 'restaurante') {
            const restaurante = await this.#restauranteRepo.findById(id);
            if (!restaurante || !Restaurante.desde(restaurante).esVisiblePara(usuario)) {
                throw new NoEncontradoError('Restaurante no encontrado.');
            }
            return restaurante._id;
        }

        const plato = await this.#platoRepo.findById(id);
        if (!plato || !Plato.desde(plato).esVisiblePara(usuario)) {
            throw new NoEncontradoError('Plato no encontrado.');
        }
        return plato._id;
    }

    async #buscarPorIds(repo, ids) {
        return ids.length ? await repo.findAll({ _id: { $in: ids } }) : [];
    }
}
