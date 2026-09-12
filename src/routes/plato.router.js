import { Router } from 'express';
import { body, param } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';

// Los platos se crean y listan desde /restaurantes/:id/platos. Aquí quedan las
// operaciones sobre un plato que ya existe.
const validarId = [param('id').isMongoId().withMessage('El id no es válido.')];

const validarEdicion = [
    ...validarId,
    body('nombre').optional().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres.'),
    body('precio').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número mayor o igual a 0.'),
    body('imagen').optional({ values: 'falsy' }).trim().isURL().withMessage('La imagen debe ser una URL válida.')
];

const crearPlatoRouter = (controller) => {
    const router = Router();

    router.get('/:id', optionalAuth, validarId, validar, controller.obtener);
    router.put('/:id', requireAuth, requireAdmin, validarEdicion, validar, controller.actualizar);
    router.patch('/:id/aprobar', requireAuth, requireAdmin, validarId, validar, controller.aprobar);
    router.delete('/:id', requireAuth, requireAdmin, validarId, validar, controller.eliminar);

    return router;
};

export default crearPlatoRouter;
