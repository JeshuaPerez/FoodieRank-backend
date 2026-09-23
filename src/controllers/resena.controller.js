import { enviar } from '../utils/respuesta.js';

export default class ResenaController {
    #resenaService;

    constructor(resenaService) {
        this.#resenaService = resenaService;
        this.listarPorRestaurante = this.listarPorRestaurante.bind(this);
        this.exportarCsv = this.exportarCsv.bind(this);
        this.crear = this.crear.bind(this);
        this.actualizar = this.actualizar.bind(this);
        this.eliminar = this.eliminar.bind(this);
        this.reaccionar = this.reaccionar.bind(this);
    }

    async listarPorRestaurante(req, res) {
        const resenas = await this.#resenaService.listarPorRestaurante(req.params.id, req.usuario);
        enviar(res, 200, 'Reseñas obtenidas.', resenas);
    }

    async exportarCsv(req, res) {
        const resultado = await this.#resenaService.exportarCsv(req.params.id);
        enviar(res, 200, `Archivo CSV generado con ${resultado.totalResenas} reseña(s).`, resultado);
    }

    async crear(req, res) {
        const resena = await this.#resenaService.crear(req.body, req.usuario);
        enviar(res, 201, 'Reseña publicada exitosamente.', resena);
    }

    async actualizar(req, res) {
        const resena = await this.#resenaService.actualizar(req.params.id, req.body, req.usuario);
        enviar(res, 200, 'Reseña actualizada exitosamente.', resena);
    }

    async eliminar(req, res) {
        await this.#resenaService.eliminar(req.params.id, req.usuario);
        res.status(204).send();
    }

    async reaccionar(req, res) {
        const resena = await this.#resenaService.reaccionar(req.params.id, req.body.tipo, req.usuario);
        enviar(res, 200, 'Reacción registrada.', resena);
    }
}
