import { enviar } from '../utils/respuesta.js';

export default class HealthController {
    #healthService;

    constructor(healthService) {
        this.#healthService = healthService;
        this.estado = this.estado.bind(this);
    }

    async estado(req, res) {
        const datos = await this.#healthService.estado(req.query.v);

        // Sin base de datos el API no puede servir: 503 para que un monitor o el
        // frontend lo detecten en vez de leer "operativa".
        const operativa = datos.conexion === 'activa';
        enviar(
            res,
            operativa ? 200 : 503,
            operativa ? 'API operativa.' : 'API sin conexión a la base de datos.',
            datos
        );
    }
}
