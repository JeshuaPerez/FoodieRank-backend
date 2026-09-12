// Error con código HTTP para que el middleware central sepa qué responder.
export default class AppError extends Error {
    constructor(mensaje, statusCode = 500, errores = null) {
        super(mensaje);
        this.statusCode = statusCode;
        this.errores = errores;
        this.esOperacional = true;
    }
}
