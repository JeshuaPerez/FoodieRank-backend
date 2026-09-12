import { Router } from 'express';
import { query } from 'express-validator';
import semver from 'semver';
import env from '../config/env.js';
import { enviar } from '../utils/respuesta.js';

import UsuarioRepository from '../repositories/usuario.repository.js';
import CategoriaRepository from '../repositories/categoria.repository.js';
import RestauranteRepository from '../repositories/restaurante.repository.js';
import PlatoRepository from '../repositories/plato.repository.js';
import ResenaRepository from '../repositories/resena.repository.js';
import ReaccionRepository from '../repositories/reaccion.repository.js';
import ModeracionRepository from '../repositories/moderacion.repository.js';

import AuthService from '../services/auth.service.js';
import CategoriaService from '../services/categoria.service.js';
import RestauranteService from '../services/restaurante.service.js';
import PlatoService from '../services/plato.service.js';
import ResenaService from '../services/resena.service.js';
import RankingService from '../services/ranking.service.js';

import AuthController from '../controllers/auth.controller.js';
import CategoriaController from '../controllers/categoria.controller.js';
import RestauranteController from '../controllers/restaurante.controller.js';
import PlatoController from '../controllers/plato.controller.js';
import ResenaController from '../controllers/resena.controller.js';

import crearAuthRouter from './auth.router.js';
import crearCategoriaRouter from './categoria.router.js';
import crearRestauranteRouter from './restaurante.router.js';
import crearPlatoRouter from './plato.router.js';
import crearResenaRouter from './resena.router.js';

// Aquí se arma la cadena repositorio -> servicio -> controlador una sola vez,
// con la conexión ya abierta. Los routers solo reciben su controlador.
const crearRutas = (db) => {
    const usuarioRepo = new UsuarioRepository(db);
    const categoriaRepo = new CategoriaRepository(db);
    const restauranteRepo = new RestauranteRepository(db);
    const platoRepo = new PlatoRepository(db);
    const resenaRepo = new ResenaRepository(db);
    const reaccionRepo = new ReaccionRepository(db);
    const moderacionRepo = new ModeracionRepository(db);

    const ranking = new RankingService(resenaRepo, restauranteRepo);
    const authService = new AuthService(usuarioRepo);
    const categoriaService = new CategoriaService(categoriaRepo, restauranteRepo);
    const restauranteService = new RestauranteService(restauranteRepo, platoRepo, resenaRepo, reaccionRepo, categoriaService, ranking);
    const platoService = new PlatoService(platoRepo, restauranteRepo);
    const resenaService = new ResenaService(resenaRepo, reaccionRepo, restauranteRepo, moderacionRepo, ranking);

    const restauranteController = new RestauranteController(restauranteService);
    const platoController = new PlatoController(platoService);
    const resenaController = new ResenaController(resenaService);

    const router = Router();

    // Estado del servicio y versión del API. Con ?v=1.0.0 responde además si esa
    // versión de cliente es compatible con la del servidor.
    router.get('/health', query('v').optional().isString(), (req, res) => {
        const cliente = req.query.v;
        const compatible = cliente && semver.valid(cliente)
            ? semver.satisfies(env.version, `^${cliente}`)
            : null;

        enviar(res, 200, 'API operativa.', {
            version: env.version,
            entorno: env.entorno,
            baseDeDatos: db.databaseName,
            versionCliente: cliente ?? null,
            compatible,
            fecha: new Date().toISOString()
        });
    });

    router.use('/auth', crearAuthRouter(new AuthController(authService)));
    router.use('/categorias', crearCategoriaRouter(new CategoriaController(categoriaService)));
    router.use('/restaurantes', crearRestauranteRouter(restauranteController, platoController, resenaController));
    router.use('/platos', crearPlatoRouter(platoController));
    router.use('/resenas', crearResenaRouter(resenaController));

    return router;
};

export default crearRutas;
