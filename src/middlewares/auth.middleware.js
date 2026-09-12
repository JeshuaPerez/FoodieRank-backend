import passport from 'passport';
import AppError from '../utils/app-error.js';

// Exige token válido. Deja el documento del usuario en req.usuario.
const requireAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (error, usuario) => {
        if (error) return next(error);
        if (!usuario) return next(new AppError('No autenticado. Envía el token en la cabecera Authorization.', 401));
        req.usuario = usuario;
        next();
    })(req, res, next);
};

// Para rutas públicas que dan algo extra si hay sesión (por ejemplo miReaccion).
// Sin token sigue adelante en lugar de responder 401.
const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization) return next();
    passport.authenticate('jwt', { session: false }, (error, usuario) => {
        if (error) return next(error);
        if (usuario) req.usuario = usuario;
        next();
    })(req, res, next);
};

const requireAdmin = (req, res, next) => {
    if (req.usuario?.rol !== 'admin') {
        return next(new AppError('Se requieren permisos de administrador.', 403));
    }
    next();
};

export { requireAuth, optionalAuth, requireAdmin };
