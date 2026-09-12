import { enviar } from '../utils/respuesta.js';
import { usuarioPublico } from '../models/usuario.model.js';

export default class AuthController {
    #authService;

    constructor(authService) {
        this.#authService = authService;
        this.registro = this.registro.bind(this);
        this.login = this.login.bind(this);
        this.perfil = this.perfil.bind(this);
    }

    async registro(req, res) {
        const datos = await this.#authService.registrar(req.body);
        enviar(res, 201, 'Usuario registrado exitosamente.', datos);
    }

    async login(req, res) {
        const datos = await this.#authService.login(req.body);
        enviar(res, 200, 'Bienvenido a FoodieRank.', datos);
    }

    async perfil(req, res) {
        enviar(res, 200, 'Perfil del usuario autenticado.', usuarioPublico(req.usuario));
    }
}
