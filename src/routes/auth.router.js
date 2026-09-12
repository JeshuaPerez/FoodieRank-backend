import { Router } from 'express';
import { body } from 'express-validator';
import validar from '../middlewares/validacion.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { limitadorAuth } from '../middlewares/limiters.js';

const validarRegistro = [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
        .isLength({ min: 3, max: 60 }).withMessage('El nombre debe tener entre 3 y 60 caracteres.'),
    body('email').trim().notEmpty().withMessage('El email es requerido.')
        .isEmail().withMessage('El email no tiene un formato válido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.')
        .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
        .matches(/[A-Za-z]/).withMessage('La contraseña debe incluir al menos una letra.')
        .matches(/\d/).withMessage('La contraseña debe incluir al menos un número.')
];

const validarLogin = [
    body('email').trim().notEmpty().withMessage('El email es requerido.').isEmail().withMessage('El email no tiene un formato válido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.')
];

const crearAuthRouter = (controller) => {
    const router = Router();

    // Rate limit estricto: aquí es donde se intenta fuerza bruta
    router.post('/registro', limitadorAuth, validarRegistro, validar, controller.registro);
    router.post('/login', limitadorAuth, validarLogin, validar, controller.login);
    router.get('/perfil', requireAuth, controller.perfil);

    return router;
};

export default crearAuthRouter;
