import AppError from '../utils/app-error.js';
import env from '../config/env.js';

// Fallos de conexión con la base de datos: no son culpa de la petición, así que
// se responden como servicio no disponible y no como error interno.
const ERRORES_DE_CONEXION = [
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoServerSelectionError',
    'MongoTopologyClosedError',
    'MongoNotConnectedError'
];

const noEncontrado = (req, res, next) =>
    next(new AppError(`La ruta ${req.method} ${req.originalUrl} no existe.`, 404));

// Último middleware de la cadena. Express 5 le reenvía también los errores que
// lanzan los handlers async, así que no hace falta try/catch en cada ruta.
const manejadorErrores = (err, req, res, next) => {
    let statusCode = err.statusCode ?? 500;
    let mensaje = err.esOperacional ? err.message : 'Error interno del servidor.';
    let esDeConexion = false;

    // Índice único violado: el duplicado lo detectó la base de datos
    if (err.code === 11000) {
        statusCode = 409;
        mensaje = 'El registro ya existe.';
    }

    // Errores de body-parser: el cuerpo llegó ilegible o demasiado grande. Traen
    // su código correcto pero el mensaje en inglés, y el frontend lo muestra.
    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        mensaje = 'El cuerpo de la petición no es un JSON válido.';
    }

    if (err.type === 'entity.too.large') {
        statusCode = 413;
        mensaje = 'El cuerpo de la petición es demasiado grande.';
    }

    if (err.name === 'BSONError') {
        statusCode = 400;
        mensaje = 'Identificador inválido.';
    }

    if (ERRORES_DE_CONEXION.includes(err.name)) {
        statusCode = 503;
        mensaje = 'La base de datos no está disponible en este momento. Intenta de nuevo en unos segundos.';
        esDeConexion = true;
        console.error(`|--> Conexión con la base de datos perdida: ${err.message}`);
    }

    // El de conexión ya se registró arriba con una línea clara; no hace falta
    // volcar todo el error
    if (statusCode >= 500 && !esDeConexion) console.error('|--> Error no controlado:', err);

    res.status(statusCode).json({
        status: 'fail',
        mensaje,
        datos: err.errores ?? null,
        ...(env.entorno === 'development' && statusCode >= 500 ? { detalle: err.message } : {})
    });
};

export { noEncontrado, manejadorErrores };
