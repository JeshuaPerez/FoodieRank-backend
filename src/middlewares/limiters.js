import { rateLimit } from 'express-rate-limit';
import env from '../config/env.js';

const respuesta429 = (mensaje) => (req, res) =>
    res.status(429).json({ status: 'fail', mensaje, datos: null });

// Límite suave para toda la API
const limitadorGlobal = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    handler: respuesta429('Has superado el límite de peticiones. Intenta de nuevo más tarde.')
});

// Límite estricto en registro y login: es donde se intenta fuerza bruta.
// Los intentos exitosos no se cuentan.
const limitadorAuth = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.authRateLimitMax,
    skipSuccessfulRequests: true,
    handler: respuesta429('Demasiados intentos de autenticación. Espera unos minutos.')
});

export { limitadorGlobal, limitadorAuth };
