// Conexión única al motor de base de datos. El cliente se expone porque las
// transacciones necesitan abrir sesiones sobre él.
import { MongoClient } from 'mongodb';
import env from './env.js';

// Sin este límite el driver espera 30 segundos antes de rendirse, y durante una
// caída de red cada petición se queda colgada todo ese tiempo. El reintento
// automático de lecturas y escrituras viene activado por defecto.
const client = new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: env.serverSelectionTimeoutMS
});
let db = null;

const pool = async () => {
    try {
        await client.connect();
        db = client.db(env.dbName);
        console.log(`|--> Conexión con la base de datos ${env.dbName.toUpperCase()} establecida exitosamente!`);
        return db;
    }
    catch (error) {
        console.error(`|--> Error al intentar conectarse a la base de datos ${env.dbName.toUpperCase()}: ${error.message}`);
        throw error;
    }
};

const getClient = () => client;

const cerrarConexion = async () => {
    await client.close();
    db = null;
    console.log('|--> Conexión con la base de datos cerrada.');
};

export { pool, getClient, cerrarConexion };
