import { Router } from 'express';
import { body, param } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const validarId = [param('id').isMongoId().withMessage('El id no es válido.')];

const validarCreacion = [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
        .isLength({ min: 3, max: 50 }).withMessage('El nombre debe tener entre 3 y 50 caracteres.'),
    body('descripcion').optional().trim().isLength({ max: 300 }).withMessage('La descripción no puede exceder 300 caracteres.')
];

const validarEdicion = [
    ...validarId,
    body('nombre').optional().trim().isLength({ min: 3, max: 50 }).withMessage('El nombre debe tener entre 3 y 50 caracteres.'),
    body('descripcion').optional().trim().isLength({ max: 300 }).withMessage('La descripción no puede exceder 300 caracteres.')
];

const crearCategoriaRouter = (controller) => {
    const router = Router();

    router.get('/', controller.listar);
    router.get('/:id', validarId, validar, controller.obtener);

    // Solo administradores gestionan categorías
    router.post('/', requireAuth, requireAdmin, validarCreacion, validar, controller.crear);
    router.put('/:id', requireAuth, requireAdmin, validarEdicion, validar, controller.actualizar);
    router.delete('/:id', requireAuth, requireAdmin, validarId, validar, controller.eliminar);

    return router;
};

export default crearCategoriaRouter;
