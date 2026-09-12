import { enviar, paginado } from '../utils/respuesta.js';

export default class RestauranteController {
    #restauranteService;

    constructor(restauranteService) {
        this.#restauranteService = restauranteService;
        this.listar = this.listar.bind(this);
        this.obtener = this.obtener.bind(this);
        this.crear = this.crear.bind(this);
        this.actualizar = this.actualizar.bind(this);
        this.aprobar = this.aprobar.bind(this);
        this.eliminar = this.eliminar.bind(this);
    }

    async listar(req, res) {
        const { documentos, total, pagina, limite } = await this.#restauranteService.listar(req.query, req.usuario);
        enviar(res, 200, 'Restaurantes obtenidos.', paginado(documentos, total, pagina, limite));
    }

    async obtener(req, res) {
        const restaurante = await this.#restauranteService.obtenerDetalle(req.params.id, req.usuario);
        enviar(res, 200, 'Restaurante obtenido.', restaurante);
    }

    async crear(req, res) {
        const restaurante = await this.#restauranteService.crear(req.body, req.usuario);
        const mensaje = restaurante.aprobado
            ? 'Restaurante creado exitosamente.'
            : 'Restaurante registrado. Queda pendiente de aprobación por un administrador.';
        enviar(res, 201, mensaje, restaurante);
    }

    async actualizar(req, res) {
        const restaurante = await this.#restauranteService.actualizar(req.params.id, req.body);
        enviar(res, 200, 'Restaurante actualizado exitosamente.', restaurante);
    }

    async aprobar(req, res) {
        const aprobado = req.body.aprobado ?? true;
        const restaurante = await this.#restauranteService.aprobar(req.params.id, aprobado);
        enviar(res, 200, aprobado ? 'Restaurante aprobado.' : 'Aprobación retirada.', restaurante);
    }

    async eliminar(req, res) {
        await this.#restauranteService.eliminar(req.params.id);
        res.status(204).send();
    }
}
