// Forma única de respuesta para toda la API: { status, mensaje, datos }.
// El frontend siempre lee los mismos campos, tanto en éxito como en error.
const enviar = (res, statusCode, mensaje, datos = null) =>
    res.status(statusCode).json({
        status: statusCode < 400 ? 'ok' : 'fail',
        mensaje,
        datos
    });

const paginado = (documentos, total, pagina, limite) => ({
    datos: documentos,
    total,
    pagina,
    limite,
    totalPaginas: limite > 0 ? Math.ceil(total / limite) : 1
});

export { enviar, paginado };
