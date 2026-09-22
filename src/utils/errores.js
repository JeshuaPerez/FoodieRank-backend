// Jerarquía de errores de la aplicación. Cada clase fija su propio código HTTP,
// así los servicios lanzan el error por su nombre y no cargan números sueltos.

class AppError extends Error {
    constructor(mensaje, statusCode = 500, errores = null) {
        super(mensaje);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errores = errores;

        // Marca los errores previstos: el middleware muestra su mensaje. Los que
        // no lo son se responden como "error interno" para no filtrar detalles.
        this.esOperacional = true;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

class DatosInvalidosError extends AppError {
    constructor(mensaje = 'Datos inválidos.', errores = null) {
        super(mensaje, 400, errores);
    }
}

class NoAutenticadoError extends AppError {
    constructor(mensaje = 'No autenticado. Envía el token en la cabecera Authorization.') {
        super(mensaje, 401);
    }
}

class SinPermisoError extends AppError {
    constructor(mensaje = 'No tienes permiso para realizar esta acción.') {
        super(mensaje, 403);
    }
}

class NoEncontradoError extends AppError {
    constructor(mensaje = 'El recurso no existe.') {
        super(mensaje, 404);
    }
}

class ConflictoError extends AppError {
    constructor(mensaje = 'El registro ya existe.') {
        super(mensaje, 409);
    }
}

class CuerpoDemasiadoGrandeError extends AppError {
    constructor(mensaje = 'El cuerpo de la petición es demasiado grande.') {
        super(mensaje, 413);
    }
}

class VersionIncompatibleError extends AppError {
    constructor(mensaje = 'La versión del cliente no es compatible con la del API.') {
        super(mensaje, 409);
    }
}

class BaseDeDatosNoDisponibleError extends AppError {
    constructor(mensaje = 'La base de datos no está disponible en este momento. Intenta de nuevo en unos segundos.') {
        super(mensaje, 503);
    }
}

export {
    AppError,
    DatosInvalidosError,
    NoAutenticadoError,
    SinPermisoError,
    NoEncontradoError,
    ConflictoError,
    CuerpoDemasiadoGrandeError,
    VersionIncompatibleError,
    BaseDeDatosNoDisponibleError
};
