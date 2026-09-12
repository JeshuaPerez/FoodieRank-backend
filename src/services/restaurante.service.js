import AppError from '../utils/app-error.js';
import enTransaccion from '../utils/transaccion.js';
import { normalizar } from '../utils/texto.js';
import { nuevoRestaurante, restaurantePublico } from '../models/restaurante.model.js';
import { platoPublico } from '../models/plato.model.js';
import { resenaPublica } from '../models/resena.model.js';
import BaseRepository from '../repositories/base.repository.js';

const LIMITE_MAXIMO = 50;

export default class RestauranteService {
    #restauranteRepo;
    #platoRepo;
    #resenaRepo;
    #reaccionRepo;
    #categoriaService;
    #ranking;

    constructor(restauranteRepo, platoRepo, resenaRepo, reaccionRepo, categoriaService, ranking) {
        this.#restauranteRepo = restauranteRepo;
        this.#platoRepo = platoRepo;
        this.#resenaRepo = resenaRepo;
        this.#reaccionRepo = reaccionRepo;
        this.#categoriaService = categoriaService;
        this.#ranking = ranking;
    }

    async listar(query = {}, usuario = null) {
        const esAdmin = usuario?.rol === 'admin';
        const pagina = Math.max(1, Number(query.pagina) || 1);
        const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 10));

        // El público solo ve aprobados; el admin ve todo y puede filtrar la cola
        const aprobado = esAdmin
            ? (query.aprobado === undefined ? undefined : query.aprobado === 'true')
            : true;

        const { documentos, total } = await this.#restauranteRepo.listar({
            busqueda: query.busqueda,
            categoriaId: BaseRepository.aObjectId(query.categoria),
            orden: query.orden,
            pagina,
            limite,
            aprobado
        });

        return { documentos: documentos.map(restaurantePublico), total, pagina, limite };
    }

    // Detalle con platos y reseñas: es la vista de detalle del frontend
    async obtenerDetalle(id, usuario = null) {
        const restaurante = await this.#restauranteRepo.findDetalle(id);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const esAdmin = usuario?.rol === 'admin';
        const esAutor = usuario && restaurante.creadoPor?.equals(usuario._id);
        if (!restaurante.aprobado && !esAdmin && !esAutor) {
            throw new AppError('Restaurante no encontrado.', 404);
        }

        const [platos, resenas] = await Promise.all([
            this.#platoRepo.findByRestaurante(restaurante._id, { aprobado: esAdmin ? undefined : true }),
            this.#resenaRepo.findByRestaurante(restaurante._id, { usuarioId: usuario?._id ?? null })
        ]);

        return {
            ...restaurantePublico(restaurante),
            platos: platos.map(platoPublico),
            resenas: resenas.map(resenaPublica)
        };
    }

    // El admin crea ya aprobado; un usuario normal deja la entrada pendiente
    async crear(datos, usuario) {
        await this.#categoriaService.verificarExiste(datos.categoriaId);

        if (await this.#restauranteRepo.findByNombre(normalizar(datos.nombre))) {
            throw new AppError('Ya existe un restaurante con ese nombre.', 409);
        }

        const documento = nuevoRestaurante(
            { ...datos, categoriaId: BaseRepository.aObjectId(datos.categoriaId) },
            usuario._id,
            usuario.rol === 'admin'
        );

        const creado = await this.#restauranteRepo.create(documento);
        return restaurantePublico(creado);
    }

    async actualizar(id, datos) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const cambios = {};

        if (datos.nombre !== undefined) {
            const duplicado = await this.#restauranteRepo.findByNombre(normalizar(datos.nombre));
            if (duplicado && !duplicado._id.equals(restaurante._id)) {
                throw new AppError('Ya existe un restaurante con ese nombre.', 409);
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }

        if (datos.categoriaId !== undefined) {
            await this.#categoriaService.verificarExiste(datos.categoriaId);
            cambios.categoriaId = BaseRepository.aObjectId(datos.categoriaId);
        }

        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
        if (datos.ubicacion !== undefined) cambios.ubicacion = datos.ubicacion.trim();
        if (datos.imagen !== undefined) cambios.imagen = datos.imagen?.trim() || null;

        const actualizado = await this.#restauranteRepo.update(id, cambios);
        if (!actualizado) throw new AppError('Restaurante no encontrado.', 404);
        return restaurantePublico(actualizado);
    }

    async aprobar(id, aprobado = true) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        const actualizado = await this.#restauranteRepo.update(id, { aprobado });
        if (!actualizado) throw new AppError('Restaurante no encontrado.', 404);
        return restaurantePublico(actualizado);
    }

    // Borrar el restaurante arrastra platos, reseñas y reacciones: si falla
    // alguna parte no puede quedar nada huérfano, por eso va en transacción
    async eliminar(id) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new AppError('Restaurante no encontrado.', 404);

        await enTransaccion(async (session) => {
            // Igual que en las reseñas: si el borrado no afectó nada, otra
            // petición llegó primero y esta no debe responder como exitosa.
            const borrado = await this.#restauranteRepo.delete(restaurante._id, { session });
            if (!borrado) throw new AppError('Restaurante no encontrado.', 404);

            const resenas = await this.#resenaRepo.findAll({ restauranteId: restaurante._id }, { session });
            await this.#reaccionRepo.deleteByResenas(resenas.map((resena) => resena._id), { session });
            await this.#resenaRepo.deleteByRestaurante(restaurante._id, { session });
            await this.#platoRepo.deleteByRestaurante(restaurante._id, { session });
        });
    }
}
