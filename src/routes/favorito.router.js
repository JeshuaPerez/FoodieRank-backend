// === Resolución de examen: rutas de favoritos ===
import { Router } from 'express';
import { param } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const validarId = [param('id').isMongoId().withMessage('El id no es válido.')];

const crearFavoritoRouter = (controller) => {
    const router = Router();

    // Todo aquí exige sesión: un favorito siempre tiene dueño
    router.use(requireAuth);

    router.get('/', controller.listar);

    router.post('/restaurantes/:id', validarId, validar, controller.agregarRestaurante);
    router.delete('/restaurantes/:id', validarId, validar, controller.quitarRestaurante);

    router.post('/platos/:id', validarId, validar, controller.agregarPlato);
    router.delete('/platos/:id', validarId, validar, controller.quitarPlato);

    return router;
};

export default crearFavoritoRouter;
