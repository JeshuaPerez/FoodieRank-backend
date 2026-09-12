import { Router } from 'express';
import { body, param, query } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';

const validarId = [param('id').isMongoId().withMessage('El id no es válido.')];

const validarListado = [
    query('busqueda').optional().trim().isLength({ max: 100 }),
    query('categoria').optional().isMongoId().withMessage('El id de categoría no es válido.'),
    query('orden').optional().isIn(['ranking', 'popularidad', 'recientes']).withMessage('Orden válido: ranking, popularidad o recientes.'),
    query('pagina').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero mayor a 0.'),
    query('limite').optional().isInt({ min: 1, max: 50 }).withMessage('El límite debe estar entre 1 y 50.'),
    query('aprobado').optional().isBoolean().withMessage('aprobado debe ser true o false.')
];

const validarCreacion = [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres.'),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida.')
        .isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres.'),
    body('categoriaId').notEmpty().withMessage('La categoría es requerida.').isMongoId().withMessage('El id de categoría no es válido.'),
    body('ubicacion').trim().notEmpty().withMessage('La ubicación es requerida.')
        .isLength({ min: 3, max: 200 }).withMessage('La ubicación debe tener entre 3 y 200 caracteres.'),
    // La imagen es opcional y se guarda como URL: no hay subida de archivos
    body('imagen').optional({ values: 'falsy' }).trim().isURL().withMessage('La imagen debe ser una URL válida.')
];

const validarEdicion = [
    ...validarId,
    body('nombre').optional().trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres.'),
    body('descripcion').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres.'),
    body('categoriaId').optional().isMongoId().withMessage('El id de categoría no es válido.'),
    body('ubicacion').optional().trim().isLength({ min: 3, max: 200 }).withMessage('La ubicación debe tener entre 3 y 200 caracteres.'),
    body('imagen').optional({ values: 'falsy' }).trim().isURL().withMessage('La imagen debe ser una URL válida.')
];

const validarPlato = [
    ...validarId,
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres.'),
    body('precio').notEmpty().withMessage('El precio es requerido.').isFloat({ min: 0 }).withMessage('El precio debe ser un número mayor o igual a 0.'),
    body('imagen').optional({ values: 'falsy' }).trim().isURL().withMessage('La imagen debe ser una URL válida.')
];

const crearRestauranteRouter = (controller, platoController, resenaController) => {
    const router = Router();

    // Listado y detalle son públicos. optionalAuth hace que, si viene token, la
    // respuesta incluya miReaccion y que el admin vea los pendientes.
    router.get('/', optionalAuth, validarListado, validar, controller.listar);
    router.get('/:id', optionalAuth, validarId, validar, controller.obtener);

    // Cualquier usuario autenticado propone; el admin crea ya aprobado
    router.post('/', requireAuth, validarCreacion, validar, controller.crear);
    router.put('/:id', requireAuth, requireAdmin, validarEdicion, validar, controller.actualizar);
    router.patch('/:id/aprobar', requireAuth, requireAdmin, validarId, validar, controller.aprobar);
    router.delete('/:id', requireAuth, requireAdmin, validarId, validar, controller.eliminar);

    // Recursos anidados: platos y reseñas de un restaurante
    router.get('/:id/platos', optionalAuth, validarId, validar, platoController.listarPorRestaurante);
    router.post('/:id/platos', requireAuth, validarPlato, validar, platoController.crear);
    router.get('/:id/resenas', optionalAuth, validarId, validar, resenaController.listarPorRestaurante);

    return router;
};

export default crearRestauranteRouter;
