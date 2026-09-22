import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import { normalizar } from '../utils/texto.js';
import { nuevaCategoria, categoriaPublica } from '../models/categoria.model.js';

export default class CategoriaService {
    #categoriaRepo;
    #restauranteRepo;

    constructor(categoriaRepo, restauranteRepo) {
        this.#categoriaRepo = categoriaRepo;
        this.#restauranteRepo = restauranteRepo;
    }

    async listar() {
        const categorias = await this.#categoriaRepo.findAll({}, { orden: { nombre: 1 } });
        return categorias.map(categoriaPublica);
    }

    async obtener(id) {
        const categoria = await this.#categoriaRepo.findById(id);
        if (!categoria) throw new NoEncontradoError('Categoría no encontrada.');
        return categoriaPublica(categoria);
    }

    async crear(datos) {
        if (await this.#categoriaRepo.findByNombre(normalizar(datos.nombre))) {
            throw new ConflictoError('Ya existe una categoría con ese nombre.');
        }
        const creada = await this.#categoriaRepo.create(nuevaCategoria(datos));
        return categoriaPublica(creada);
    }

    async actualizar(id, datos) {
        const categoria = await this.#categoriaRepo.findById(id);
        if (!categoria) throw new NoEncontradoError('Categoría no encontrada.');

        const cambios = {};
        if (datos.nombre !== undefined) {
            const duplicada = await this.#categoriaRepo.findByNombre(normalizar(datos.nombre));
            if (duplicada && !duplicada._id.equals(categoria._id)) {
                throw new ConflictoError('Ya existe una categoría con ese nombre.');
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }
        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();

        const actualizada = await this.#categoriaRepo.update(id, cambios);
        if (!actualizada) throw new NoEncontradoError('Categoría no encontrada.');
        return categoriaPublica(actualizada);
    }

    async eliminar(id) {
        const categoria = await this.#categoriaRepo.findById(id);
        if (!categoria) throw new NoEncontradoError('Categoría no encontrada.');

        // No se puede dejar restaurantes apuntando a una categoría inexistente
        const enUso = await this.#restauranteRepo.contarPorCategoria(categoria._id);
        if (enUso > 0) {
            throw new ConflictoError(`La categoría tiene ${enUso} restaurante(s) asociado(s) y no se puede eliminar.`);
        }

        const borrada = await this.#categoriaRepo.delete(id);
        if (!borrada) throw new NoEncontradoError('Categoría no encontrada.');
    }

    // Se usa al crear o editar restaurantes
    async verificarExiste(categoriaId) {
        const categoria = await this.#categoriaRepo.findById(categoriaId);
        if (!categoria) throw new NoEncontradoError('La categoría indicada no existe.');
        return categoria;
    }
}
