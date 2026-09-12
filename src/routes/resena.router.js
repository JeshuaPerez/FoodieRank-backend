import { Router } from 'express';
import { body, param } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { TIPOS } from '../models/reaccion.model.js';

const validarId = [param('id').isMongoId().withMessage('El id no es válido.')];

const validarCreacion = [
    body('restauranteId').notEmpty().withMessage('El restaurante es requerido.').isMongoId().withMessage('El id de restaurante no es válido.'),
    body('comentario').trim().notEmpty().withMessage('El comentario es requerido.')
        .isLength({ min: 5, max: 500 }).withMessage('El comentario debe tener entre 5 y 500 caracteres.'),
    body('calificacion').notEmpty().withMessage('La calificación es requerida.')
        .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser un entero entre 1 y 5.')
];

const validarEdicion = [
    ...validarId,
    body('comentario').optional().trim().isLength({ min: 5, max: 500 }).withMessage('El comentario debe tener entre 5 y 500 caracteres.'),
    body('calificacion').optional().isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser un entero entre 1 y 5.')
];

const validarReaccion = [
    ...validarId,
    body('tipo').notEmpty().withMessage('El tipo es requerido.').isIn(TIPOS).withMessage('El tipo debe ser like o dislike.')
];

const crearResenaRouter = (controller) => {
    const router = Router();

    // Todo aquí exige sesión: reseñas y reacciones siempre tienen dueño
    router.post('/', requireAuth, validarCreacion, validar, controller.crear);
    router.put('/:id', requireAuth, validarEdicion, validar, controller.actualizar);

    // El autor borra la suya; el administrador puede borrar cualquiera
    router.delete('/:id', requireAuth, validarId, validar, controller.eliminar);
    router.post('/:id/reaccion', requireAuth, validarReaccion, validar, controller.reaccionar);

    return router;
};

export default crearResenaRouter;
