import AppError from '../utils/app-error.js';
import { normalizar } from '../utils/texto.js';
import { nuevaCategoria, categoriaPublica } from '../models/categoria.model.js';
import BaseRepository from '../repositories/base.repository.js';

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
        if (!categoria) throw new AppError('Categoría no encontrada.', 404);
        return categoriaPublica(categoria);
    }

    async crear(datos) {
        if (await this.#categoriaRepo.findByNombre(normalizar(datos.nombre))) {
            throw new AppError('Ya existe una categoría con ese nombre.', 409);
        }
        const creada = await this.#categoriaRepo.create(nuevaCategoria(datos));
        return categoriaPublica(creada);
    }

    async actualizar(id, datos) {
        const categoria = await this.#categoriaRepo.findById(id);
        if (!categoria) throw new AppError('Categoría no encontrada.', 404);

        const cambios = {};
        if (datos.nombre !== undefined) {
            const duplicada = await this.#categoriaRepo.findByNombre(normalizar(datos.nombre));
            if (duplicada && !duplicada._id.equals(categoria._id)) {
                throw new AppError('Ya existe una categoría con ese nombre.', 409);
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }
        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();

        const actualizada = await this.#categoriaRepo.update(id, cambios);
        return categoriaPublica(actualizada);
    }

    async eliminar(id) {
        const categoria = await this.#categoriaRepo.findById(id);
        if (!categoria) throw new AppError('Categoría no encontrada.', 404);

        // No se puede dejar restaurantes apuntando a una categoría inexistente
        const enUso = await this.#restauranteRepo.contarPorCategoria(categoria._id);
        if (enUso > 0) {
            throw new AppError(`La categoría tiene ${enUso} restaurante(s) asociado(s) y no se puede eliminar.`, 409);
        }

        await this.#categoriaRepo.delete(id);
    }

    // Se usa al crear o editar restaurantes
    async verificarExiste(categoriaId) {
        const _id = BaseRepository.aObjectId(categoriaId);
        const categoria = _id && await this.#categoriaRepo.findById(_id);
        if (!categoria) throw new AppError('La categoría indicada no existe.', 404);
        return categoria;
    }
}
