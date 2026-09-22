import passport from 'passport';
import { NoAutenticadoError, SinPermisoError } from '../utils/errores.js';

// Exige token válido. Deja el documento del usuario en req.usuario.
const requireAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (error, usuario) => {
        if (error) return next(error);
        if (!usuario) return next(new NoAutenticadoError('No autenticado. Envía el token en la cabecera Authorization.'));
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
        return next(new SinPermisoError('Se requieren permisos de administrador.'));
    }
    next();
};

export { requireAuth, optionalAuth, requireAdmin };
