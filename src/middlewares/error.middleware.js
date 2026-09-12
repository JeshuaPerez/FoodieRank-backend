import AppError from '../utils/app-error.js';
import env from '../config/env.js';

const noEncontrado = (req, res, next) =>
    next(new AppError(`La ruta ${req.method} ${req.originalUrl} no existe.`, 404));

// Último middleware de la cadena. Express 5 le reenvía también los errores que
// lanzan los handlers async, así que no hace falta try/catch en cada ruta.
const manejadorErrores = (err, req, res, next) => {
    let statusCode = err.statusCode ?? 500;
    let mensaje = err.esOperacional ? err.message : 'Error interno del servidor.';

    // Índice único violado: el duplicado lo detectó la base de datos
    if (err.code === 11000) {
        statusCode = 409;
        mensaje = 'El registro ya existe.';
    }

    if (err.name === 'BSONError') {
        statusCode = 400;
        mensaje = 'Identificador inválido.';
    }

    if (statusCode >= 500) console.error('|--> Error no controlado:', err);

    res.status(statusCode).json({
        status: 'fail',
        mensaje,
        datos: err.errores ?? null,
        ...(env.entorno === 'development' && statusCode >= 500 ? { detalle: err.message } : {})
    });
};

export { noEncontrado, manejadorErrores };
