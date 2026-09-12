// Factory: recibe el cliente de MongoDB y devuelve la función que ejecuta algo
// dentro de una transacción. Así los servicios no tienen que conocer la conexión,
// solo reciben la capacidad de ejecutar en transacción.
//
// Todo lo que toque la base dentro del callback tiene que recibir esa misma
// session, o queda fuera de la transacción sin avisar.
const crearTransaccion = (client) => async (callback) => {
    const session = client.startSession();
    try {
        return await session.withTransaction(async () => await callback(session));
    }
    finally {
        await session.endSession();
    }
};

export default crearTransaccion;
