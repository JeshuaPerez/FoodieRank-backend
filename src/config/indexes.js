// Índices únicos: son los que garantizan en la base de datos que no haya
// nombres repetidos ni reseñas/reacciones duplicadas, sin consultar antes.
const crearIndices = async (db) => {
    await Promise.all([
        db.collection('usuarios').createIndex({ email: 1 }, { unique: true }),
        db.collection('categorias').createIndex({ nombreNormalizado: 1 }, { unique: true }),
        db.collection('restaurantes').createIndex({ nombreNormalizado: 1 }, { unique: true }),
        db.collection('restaurantes').createIndex({ rankingPonderado: -1 }),
        db.collection('restaurantes').createIndex({ categoriaId: 1 }),
        // El mismo plato puede existir en otro restaurante, por eso el índice es compuesto
        db.collection('platos').createIndex({ restauranteId: 1, nombreNormalizado: 1 }, { unique: true }),
        // Una sola reseña por usuario y restaurante
        db.collection('resenas').createIndex({ usuarioId: 1, restauranteId: 1 }, { unique: true }),
        db.collection('resenas').createIndex({ restauranteId: 1, creadoEn: -1 }),
        // Una sola reacción activa por usuario y reseña
        db.collection('reacciones').createIndex({ usuarioId: 1, resenaId: 1 }, { unique: true }),
        // Se crea aquí para que exista antes de usarla dentro de una transacción
        db.collection('moderaciones').createIndex({ fecha: -1 })
    ]);
    console.log('|--> Índices verificados.');
};

export default crearIndices;
