// === Resolución de examen: controlador de favoritos ===
import { enviar } from '../utils/respuesta.js';

export default class FavoritoController {
    #favoritoService;

    constructor(favoritoService) {
        this.#favoritoService = favoritoService;
        this.listar = this.listar.bind(this);
        this.agregarRestaurante = this.agregarRestaurante.bind(this);
        this.quitarRestaurante = this.quitarRestaurante.bind(this);
        this.agregarPlato = this.agregarPlato.bind(this);
        this.quitarPlato = this.quitarPlato.bind(this);
    }

    async listar(req, res) {
        const favoritos = await this.#favoritoService.listar(req.usuario);
        enviar(res, 200, 'Favoritos obtenidos.', favoritos);
    }

    async agregarRestaurante(req, res) {
        const favorito = await this.#favoritoService.agregar('restaurante', req.params.id, req.usuario);
        enviar(res, 201, 'Restaurante agregado a favoritos.', favorito);
    }

    // Responde con JSON y no 204: el examen pide mensaje claro también al quitar
    async quitarRestaurante(req, res) {
        await this.#favoritoService.quitar('restaurante', req.params.id, req.usuario);
        enviar(res, 200, 'Restaurante eliminado de favoritos.');
    }

    async agregarPlato(req, res) {
        const favorito = await this.#favoritoService.agregar('plato', req.params.id, req.usuario);
        enviar(res, 201, 'Plato agregado a favoritos.', favorito);
    }

    async quitarPlato(req, res) {
        await this.#favoritoService.quitar('plato', req.params.id, req.usuario);
        enviar(res, 200, 'Plato eliminado de favoritos.');
    }
}
