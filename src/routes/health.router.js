import { Router } from 'express';
import { query } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';

// Estado del servicio y versión del API. Con ?v=1.0.0 informa además si esa
// versión de cliente es compatible.
const crearHealthRouter = (controller) => {
    const router = Router();

    router.get(
        '/',
        query('v').optional().isString().withMessage('La versión del cliente debe ser texto.'),
        validar,
        controller.estado
    );

    return router;
};

export default crearHealthRouter;
