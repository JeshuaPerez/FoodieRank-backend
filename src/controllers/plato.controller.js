import { enviar } from '../utils/respuesta.js';

export default class PlatoController {
    #platoService;

    constructor(platoService) {
        this.#platoService = platoService;
        this.listarPorRestaurante = this.listarPorRestaurante.bind(this);
        this.obtener = this.obtener.bind(this);
        this.crear = this.crear.bind(this);
        this.actualizar = this.actualizar.bind(this);
        this.aprobar = this.aprobar.bind(this);
        this.eliminar = this.eliminar.bind(this);
    }

    async listarPorRestaurante(req, res) {
        const platos = await this.#platoService.listarPorRestaurante(req.params.id, req.usuario);
        enviar(res, 200, 'Platos obtenidos.', platos);
    }

    async obtener(req, res) {
        const plato = await this.#platoService.obtener(req.params.id);
        enviar(res, 200, 'Plato obtenido.', plato);
    }

    async crear(req, res) {
        const plato = await this.#platoService.crear(req.params.id, req.body, req.usuario);
        const mensaje = plato.aprobado
            ? 'Plato creado exitosamente.'
            : 'Plato registrado. Queda pendiente de aprobación por un administrador.';
        enviar(res, 201, mensaje, plato);
    }

    async actualizar(req, res) {
        const plato = await this.#platoService.actualizar(req.params.id, req.body);
        enviar(res, 200, 'Plato actualizado exitosamente.', plato);
    }

    async aprobar(req, res) {
        const aprobado = req.body.aprobado ?? true;
        const plato = await this.#platoService.aprobar(req.params.id, aprobado);
        enviar(res, 200, aprobado ? 'Plato aprobado.' : 'Aprobación retirada.', plato);
    }

    async eliminar(req, res) {
        await this.#platoService.eliminar(req.params.id);
        res.status(204).send();
    }
}
