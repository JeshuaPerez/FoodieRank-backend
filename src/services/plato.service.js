import AppError from '../utils/app-error.js';
import { normalizar } from '../utils/texto.js';
import { nuevoPlato, platoPublico } from '../models/plato.model.js';

export default class PlatoService {
    #platoRepo;
    #restauranteRepo;

    constructor(platoRepo, restauranteRepo) {
        this.#platoRepo = platoRepo;
        this.#restauranteRepo = restauranteRepo;
    }

    async listarPorRestaurante(restauranteId, usuario = null) {
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const esAdmin = usuario?.rol === 'admin';
        const platos = await this.#platoRepo.findByRestaurante(restaurante._id, {
            aprobado: esAdmin ? undefined : true
        });
        return platos.map(platoPublico);
    }

    async obtener(id) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new AppError('Plato no encontrado.', 404);
        return platoPublico(plato);
    }

    async crear(restauranteId, datos, usuario) {
        // Un plato no puede existir sin su restaurante
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const duplicado = await this.#platoRepo.findByNombreEnRestaurante(restaurante._id, normalizar(datos.nombre));
        if (duplicado) throw new AppError('Ya existe un plato con ese nombre en este restaurante.', 409);

        const documento = nuevoPlato(datos, restaurante._id, usuario._id, usuario.rol === 'admin');
        const creado = await this.#platoRepo.create(documento);
        return platoPublico(creado);
    }

    async actualizar(id, datos) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new AppError('Plato no encontrado.', 404);

        const cambios = {};

        if (datos.nombre !== undefined) {
            const duplicado = await this.#platoRepo.findByNombreEnRestaurante(plato.restauranteId, normalizar(datos.nombre));
            if (duplicado && !duplicado._id.equals(plato._id)) {
                throw new AppError('Ya existe un plato con ese nombre en este restaurante.', 409);
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }

        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
        if (datos.precio !== undefined) cambios.precio = Number(datos.precio);
        if (datos.imagen !== undefined) cambios.imagen = datos.imagen?.trim() || null;

        const actualizado = await this.#platoRepo.update(id, cambios);
        return platoPublico(actualizado);
    }

    async aprobar(id, aprobado = true) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new AppError('Plato no encontrado.', 404);

        const actualizado = await this.#platoRepo.update(id, { aprobado });
        return platoPublico(actualizado);
    }

    async eliminar(id) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new AppError('Plato no encontrado.', 404);
        await this.#platoRepo.delete(id);
    }
}
