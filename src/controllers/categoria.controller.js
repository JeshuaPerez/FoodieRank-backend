import { enviar } from '../utils/respuesta.js';

export default class CategoriaController {
    #categoriaService;

    constructor(categoriaService) {
        this.#categoriaService = categoriaService;
        this.listar = this.listar.bind(this);
        this.obtener = this.obtener.bind(this);
        this.crear = this.crear.bind(this);
        this.actualizar = this.actualizar.bind(this);
        this.eliminar = this.eliminar.bind(this);
    }

    async listar(req, res) {
        const categorias = await this.#categoriaService.listar();
        enviar(res, 200, 'Categorías obtenidas.', categorias);
    }

    async obtener(req, res) {
        const categoria = await this.#categoriaService.obtener(req.params.id);
        enviar(res, 200, 'Categoría obtenida.', categoria);
    }

    async crear(req, res) {
        const categoria = await this.#categoriaService.crear(req.body);
        enviar(res, 201, 'Categoría creada exitosamente.', categoria);
    }

    async actualizar(req, res) {
        const categoria = await this.#categoriaService.actualizar(req.params.id, req.body);
        enviar(res, 200, 'Categoría actualizada exitosamente.', categoria);
    }

    async eliminar(req, res) {
        await this.#categoriaService.eliminar(req.params.id);
        res.status(204).send();
    }
}
