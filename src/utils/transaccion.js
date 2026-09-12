// Abre una sesión, corre el callback dentro de la transacción y cierra la
// sesión pase lo que pase. Todo lo que toque la base dentro del callback tiene
// que recibir esa misma session o queda fuera de la transacción.
import { getClient } from '../config/db.js';

const enTransaccion = async (callback) => {
    const session = getClient().startSession();
    try {
        return await session.withTransaction(async () => await callback(session));
    }
    finally {
        await session.endSession();
    }
};

export default enTransaccion;
