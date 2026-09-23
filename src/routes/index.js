import { Router } from 'express';
import crearTransaccion from '../utils/transaccion.js';

import UsuarioRepository from '../repositories/usuario.repository.js';
import CategoriaRepository from '../repositories/categoria.repository.js';
import RestauranteRepository from '../repositories/restaurante.repository.js';
import PlatoRepository from '../repositories/plato.repository.js';
import ResenaRepository from '../repositories/resena.repository.js';
import ReaccionRepository from '../repositories/reaccion.repository.js';
import ModeracionRepository from '../repositories/moderacion.repository.js';
// === Resolución de examen: favoritos ===
import FavoritoRepository from '../repositories/favorito.repository.js';

import HealthService from '../services/health.service.js';
import AuthService from '../services/auth.service.js';
import CategoriaService from '../services/categoria.service.js';
import RestauranteService from '../services/restaurante.service.js';
import PlatoService from '../services/plato.service.js';
import ResenaService from '../services/resena.service.js';
import RankingService from '../services/ranking.service.js';
// === Resolución de examen: favoritos ===
import FavoritoService from '../services/favorito.service.js';

import HealthController from '../controllers/health.controller.js';
import AuthController from '../controllers/auth.controller.js';
import CategoriaController from '../controllers/categoria.controller.js';
import RestauranteController from '../controllers/restaurante.controller.js';
import PlatoController from '../controllers/plato.controller.js';
import ResenaController from '../controllers/resena.controller.js';
// === Resolución de examen: favoritos ===
import FavoritoController from '../controllers/favorito.controller.js';

import crearHealthRouter from './health.router.js';
import crearAuthRouter from './auth.router.js';
import crearCategoriaRouter from './categoria.router.js';
import crearRestauranteRouter from './restaurante.router.js';
import crearPlatoRouter from './plato.router.js';
import crearResenaRouter from './resena.router.js';
// === Resolución de examen: favoritos ===
import crearFavoritoRouter from './favorito.router.js';

// Único lugar donde se instancia algo: arma la cadena repositorio -> servicio ->
// controlador con la conexión ya abierta y monta cada router con su controlador.
const crearRutas = (db, client) => {
    const usuarioRepo = new UsuarioRepository(db);
    const categoriaRepo = new CategoriaRepository(db);
    const restauranteRepo = new RestauranteRepository(db);
    const platoRepo = new PlatoRepository(db);
    const resenaRepo = new ResenaRepository(db);
    const reaccionRepo = new ReaccionRepository(db);
    const moderacionRepo = new ModeracionRepository(db);
    // === Resolución de examen: favoritos ===
    const favoritoRepo = new FavoritoRepository(db);

    const enTransaccion = crearTransaccion(client);

    const healthService = new HealthService(db);
    const ranking = new RankingService(resenaRepo, restauranteRepo);
    const authService = new AuthService(usuarioRepo);
    const categoriaService = new CategoriaService(categoriaRepo, restauranteRepo);
    const restauranteService = new RestauranteService(restauranteRepo, platoRepo, resenaRepo, reaccionRepo, categoriaService, enTransaccion);
    const platoService = new PlatoService(platoRepo, restauranteRepo);
    const resenaService = new ResenaService(resenaRepo, reaccionRepo, restauranteRepo, moderacionRepo, ranking, enTransaccion);
    // === Resolución de examen: favoritos ===
    const favoritoService = new FavoritoService(favoritoRepo, restauranteRepo, platoRepo);

    const restauranteController = new RestauranteController(restauranteService);
    const platoController = new PlatoController(platoService);
    const resenaController = new ResenaController(resenaService);

    const router = Router();

    router.use('/health', crearHealthRouter(new HealthController(healthService)));
    router.use('/auth', crearAuthRouter(new AuthController(authService)));
    router.use('/categorias', crearCategoriaRouter(new CategoriaController(categoriaService)));
    router.use('/restaurantes', crearRestauranteRouter(restauranteController, platoController, resenaController));
    router.use('/platos', crearPlatoRouter(platoController));
    router.use('/resenas', crearResenaRouter(resenaController));
    // === Resolución de examen: favoritos ===
    router.use('/favoritos', crearFavoritoRouter(new FavoritoController(favoritoService)));

    return router;
};

export default crearRutas;
