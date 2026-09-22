import env from '../config/env.js';
import {
    AppError,
    ConflictoError,
    DatosInvalidosError,
    CuerpoDemasiadoGrandeError,
    NoEncontradoError,
    BaseDeDatosNoDisponibleError
} from '../utils/errores.js';

// Nombres de error del driver que significan "la base no responde"
const ERRORES_DE_CONEXION = [
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoServerSelectionError',
    'MongoTopologyClosedError',
    'MongoNotConnectedError'
];

// Centraliza el paso de un error cualquiera a una respuesta HTTP. Los métodos
// son estáticos porque no guarda estado: solo traduce y responde.
export default class ManejadorDeErrores {

    // Última ruta de la cadena: si nadie atendió la petición, no existe
    static noEncontrado(req, res, next) {
        next(new NoEncontradoError(`La ruta ${req.method} ${req.originalUrl} no existe.`));
    }

    // Convierte un error ajeno (driver, body-parser) en uno de la aplicación.
    // Devuelve null si no lo reconoce: eso es un fallo inesperado.
    static #traducir(err) {
        if (err instanceof AppError) return err;

        // Índice único violado: el duplicado lo detectó la base de datos
        if (err.code === 11000) return new ConflictoError();

        // El cuerpo llegó ilegible o demasiado grande
        if (err.type === 'entity.parse.failed') {
            return new DatosInvalidosError('El cuerpo de la petición no es un JSON válido.');
        }
        if (err.type === 'entity.too.large') return new CuerpoDemasiadoGrandeError();

        if (err.name === 'BSONError') return new DatosInvalidosError('Identificador inválido.');

        if (ERRORES_DE_CONEXION.includes(err.name)) return new BaseDeDatosNoDisponibleError();

        return null;
    }

    // Último middleware de la cadena. Express 5 le reenvía también los errores
    // que lanzan los handlers async, así que no hace falta try/catch en las rutas.
    static manejar(err, req, res, next) {
        const conocido = ManejadorDeErrores.#traducir(err);

        if (conocido instanceof BaseDeDatosNoDisponibleError) {
            console.error(`|--> Conexión con la base de datos perdida: ${err.message}`);
        }
        else if (!conocido) {
            console.error('|--> Error no controlado:', err);
        }

        const statusCode = conocido?.statusCode ?? 500;
        const mensaje = conocido?.message ?? 'Error interno del servidor.';

        res.status(statusCode).json({
            status: 'fail',
            mensaje,
            datos: conocido?.errores ?? null,
            ...(env.entorno === 'development' && !conocido ? { detalle: err.message } : {})
        });
    }
}
