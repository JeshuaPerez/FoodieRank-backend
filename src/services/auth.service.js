import { hashSync, compareSync } from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { ConflictoError, NoAutenticadoError, NoEncontradoError } from '../utils/errores.js';
import { normalizar } from '../utils/texto.js';
import { nuevoUsuario, usuarioPublico } from '../models/usuario.model.js';

export default class AuthService {
    #usuarioRepo;

    constructor(usuarioRepo) {
        this.#usuarioRepo = usuarioRepo;
    }

    async registrar(datos) {
        if (await this.#usuarioRepo.findByEmail(normalizar(datos.email))) {
            throw new ConflictoError('El email ya está registrado.');
        }

        const usuario = nuevoUsuario({
            ...datos,
            password: hashSync(datos.password, env.bcryptRondas)
        });

        const creado = await this.#usuarioRepo.create(usuario);
        return { token: this.#firmarToken(creado), usuario: usuarioPublico(creado) };
    }

    async login({ email, password }) {
        const usuario = await this.#usuarioRepo.findByEmail(normalizar(email));

        // Mismo mensaje exista o no el usuario: no se revela qué campo falló
        if (!usuario || !compareSync(password, usuario.password)) {
            throw new NoAutenticadoError('Credenciales inválidas.');
        }

        return { token: this.#firmarToken(usuario), usuario: usuarioPublico(usuario) };
    }

    async perfil(usuarioId) {
        const usuario = await this.#usuarioRepo.findById(usuarioId);
        if (!usuario) throw new NoEncontradoError('Usuario no encontrado.');
        return usuarioPublico(usuario);
    }

    // En el payload solo va el id y el rol, nada sensible
    #firmarToken(usuario) {
        return jwt.sign(
            { sub: usuario._id.toString(), rol: usuario.rol },
            env.jwtSecret,
            { expiresIn: env.jwtExpiresIn }
        );
    }
}
