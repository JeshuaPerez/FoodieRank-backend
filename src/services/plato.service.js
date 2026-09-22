import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import { normalizar } from '../utils/texto.js';
import { nuevoPlato, platoPublico, platoVisiblePara } from '../models/plato.model.js';
import { esVisiblePara } from '../models/restaurante.model.js';

export default class PlatoService {
    #platoRepo;
    #restauranteRepo;

    constructor(platoRepo, restauranteRepo) {
        this.#platoRepo = platoRepo;
        this.#restauranteRepo = restauranteRepo;
    }

    async listarPorRestaurante(restauranteId, usuario = null) {
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        // Si el restaurante está pendiente, sus platos tampoco son públicos
        if (!esVisiblePara(restaurante, usuario)) {
            throw new NoEncontradoError('Restaurante no encontrado.');
        }

        const esAdmin = usuario?.rol === 'admin';
        const platos = await this.#platoRepo.findByRestaurante(restaurante._id, {
            aprobado: esAdmin ? undefined : true
        });
        return platos.map(platoPublico);
    }

    async obtener(id, usuario = null) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new NoEncontradoError('Plato no encontrado.');
        if (!platoVisiblePara(plato, usuario)) throw new NoEncontradoError('Plato no encontrado.');

        // Un plato aprobado de un restaurante pendiente sigue sin ser público
        const restaurante = await this.#restauranteRepo.findById(plato.restauranteId);
        if (!restaurante || !esVisiblePara(restaurante, usuario)) {
            throw new NoEncontradoError('Plato no encontrado.');
        }

        return platoPublico(plato);
    }

    async crear(restauranteId, datos, usuario) {
        // Un plato no puede existir sin su restaurante
        const restaurante = await this.#restauranteRepo.findById(restauranteId);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        const duplicado = await this.#platoRepo.findByNombreEnRestaurante(restaurante._id, normalizar(datos.nombre));
        if (duplicado) throw new ConflictoError('Ya existe un plato con ese nombre en este restaurante.');

        const documento = nuevoPlato(datos, restaurante._id, usuario._id, usuario.rol === 'admin');
        const creado = await this.#platoRepo.create(documento);
        return platoPublico(creado);
    }

    async actualizar(id, datos) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new NoEncontradoError('Plato no encontrado.');

        const cambios = {};

        if (datos.nombre !== undefined) {
            const duplicado = await this.#platoRepo.findByNombreEnRestaurante(plato.restauranteId, normalizar(datos.nombre));
            if (duplicado && !duplicado._id.equals(plato._id)) {
                throw new ConflictoError('Ya existe un plato con ese nombre en este restaurante.');
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }

        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
        if (datos.precio !== undefined) cambios.precio = Number(datos.precio);
        if (datos.imagen !== undefined) cambios.imagen = datos.imagen?.trim() || null;

        const actualizado = await this.#platoRepo.update(id, cambios);
        if (!actualizado) throw new NoEncontradoError('Plato no encontrado.');
        return platoPublico(actualizado);
    }

    async aprobar(id, aprobado = true) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new NoEncontradoError('Plato no encontrado.');

        const actualizado = await this.#platoRepo.update(id, { aprobado });
        if (!actualizado) throw new NoEncontradoError('Plato no encontrado.');
        return platoPublico(actualizado);
    }

    async eliminar(id) {
        const plato = await this.#platoRepo.findById(id);
        if (!plato) throw new NoEncontradoError('Plato no encontrado.');

        const borrado = await this.#platoRepo.delete(id);
        if (!borrado) throw new NoEncontradoError('Plato no encontrado.');
    }
}
