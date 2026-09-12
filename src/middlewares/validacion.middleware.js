import { validationResult } from 'express-validator';

// Convierte los errores de express-validator en un 400 que el frontend puede
// pintar campo por campo.
const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (errores.isEmpty()) return next();

    res.status(400).json({
        status: 'fail',
        mensaje: 'Datos inválidos.',
        datos: errores.array().map((error) => ({ campo: error.path, mensaje: error.msg }))
    });
};

export default validar;
