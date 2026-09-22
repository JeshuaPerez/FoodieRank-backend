import { ConflictoError, NoEncontradoError } from '../utils/errores.js';
import { normalizar } from '../utils/texto.js';
import Restaurante from '../models/restaurante.model.js';
import Plato from '../models/plato.model.js';
import Resena from '../models/resena.model.js';

const LIMITE_MAXIMO = 50;

export default class RestauranteService {
    #restauranteRepo;
    #platoRepo;
    #resenaRepo;
    #reaccionRepo;
    #categoriaService;
    #enTransaccion;

    constructor(restauranteRepo, platoRepo, resenaRepo, reaccionRepo, categoriaService, enTransaccion) {
        this.#restauranteRepo = restauranteRepo;
        this.#platoRepo = platoRepo;
        this.#resenaRepo = resenaRepo;
        this.#reaccionRepo = reaccionRepo;
        this.#categoriaService = categoriaService;
        this.#enTransaccion = enTransaccion;
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
            categoriaId: query.categoria,
            orden: query.orden,
            pagina,
            limite,
            aprobado
        });

        return { documentos: documentos.map((d) => Restaurante.desde(d).aPublico()), total, pagina, limite };
    }

    // Detalle con platos y reseñas: es la vista de detalle del frontend
    async obtenerDetalle(id, usuario = null) {
        const restaurante = await this.#restauranteRepo.findDetalle(id);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        if (!Restaurante.desde(restaurante).esVisiblePara(usuario)) {
            throw new NoEncontradoError('Restaurante no encontrado.');
        }

        const esAdmin = usuario?.rol === 'admin';

        const [platos, resenas] = await Promise.all([
            this.#platoRepo.findByRestaurante(restaurante._id, { aprobado: esAdmin ? undefined : true }),
            this.#resenaRepo.findByRestaurante(restaurante._id, { usuarioId: usuario?._id ?? null })
        ]);

        return {
            ...Restaurante.desde(restaurante).aPublico(),
            platos: platos.map((d) => Plato.desde(d).aPublico()),
            resenas: resenas.map((d) => Resena.desde(d).aPublico())
        };
    }

    // El admin crea ya aprobado; un usuario normal deja la entrada pendiente
    async crear(datos, usuario) {
        // verificarExiste devuelve la categoría, así que el id ya viene de la capa
        // de datos y el servicio no tiene que convertir nada
        const categoria = await this.#categoriaService.verificarExiste(datos.categoriaId);

        if (await this.#restauranteRepo.findByNombre(normalizar(datos.nombre))) {
            throw new ConflictoError('Ya existe un restaurante con ese nombre.');
        }

        const documento = Restaurante.nuevo(
            { ...datos, categoriaId: categoria._id },
            usuario._id,
            usuario.rol === 'admin'
        );

        const creado = await this.#restauranteRepo.create(documento.aDocumento());
        return Restaurante.desde(creado).aPublico();
    }

    async actualizar(id, datos) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        const cambios = {};

        if (datos.nombre !== undefined) {
            const duplicado = await this.#restauranteRepo.findByNombre(normalizar(datos.nombre));
            if (duplicado && !duplicado._id.equals(restaurante._id)) {
                throw new ConflictoError('Ya existe un restaurante con ese nombre.');
            }
            cambios.nombre = datos.nombre.trim();
            cambios.nombreNormalizado = normalizar(datos.nombre);
        }

        if (datos.categoriaId !== undefined) {
            const categoria = await this.#categoriaService.verificarExiste(datos.categoriaId);
            cambios.categoriaId = categoria._id;
        }

        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
        if (datos.ubicacion !== undefined) cambios.ubicacion = datos.ubicacion.trim();
        if (datos.imagen !== undefined) cambios.imagen = datos.imagen?.trim() || null;

        const actualizado = await this.#restauranteRepo.update(id, cambios);
        if (!actualizado) throw new NoEncontradoError('Restaurante no encontrado.');
        return Restaurante.desde(actualizado).aPublico();
    }

    async aprobar(id, aprobado = true) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        const actualizado = await this.#restauranteRepo.update(id, { aprobado });
        if (!actualizado) throw new NoEncontradoError('Restaurante no encontrado.');
        return Restaurante.desde(actualizado).aPublico();
    }

    // Borrar el restaurante arrastra platos, reseñas y reacciones: si falla
    // alguna parte no puede quedar nada huérfano, por eso va en transacción
    async eliminar(id) {
        const restaurante = await this.#restauranteRepo.findById(id);
        if (!restaurante) throw new NoEncontradoError('Restaurante no encontrado.');

        await this.#enTransaccion(async (session) => {
            // Igual que en las reseñas: si el borrado no afectó nada, otra
            // petición llegó primero y esta no debe responder como exitosa.
            const borrado = await this.#restauranteRepo.delete(restaurante._id, { session });
            if (!borrado) throw new NoEncontradoError('Restaurante no encontrado.');

            const resenas = await this.#resenaRepo.findAll({ restauranteId: restaurante._id }, { session });
            await this.#reaccionRepo.deleteByResenas(resenas.map((resena) => resena._id), { session });
            await this.#resenaRepo.deleteByRestaurante(restaurante._id, { session });
            await this.#platoRepo.deleteByRestaurante(restaurante._id, { session });
        });
    }
}
