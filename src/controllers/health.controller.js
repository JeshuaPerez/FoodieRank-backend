import { enviar } from '../utils/respuesta.js';

export default class HealthController {
    #healthService;

    constructor(healthService) {
        this.#healthService = healthService;
        this.estado = this.estado.bind(this);
    }

    estado(req, res) {
        enviar(res, 200, 'API operativa.', this.#healthService.estado(req.query.v));
    }
}
