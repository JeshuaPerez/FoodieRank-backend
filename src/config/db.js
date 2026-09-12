// Conexión única al motor de base de datos. El cliente se expone porque las
// transacciones necesitan abrir sesiones sobre él.
import { MongoClient } from 'mongodb';
import env from './env.js';

const client = new MongoClient(env.mongodbUri);
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

const getDb = () => {
    if (!db) throw new Error('|--> La base de datos no está conectada. Ejecuta pool() primero.');
    return db;
};

const getClient = () => client;

const cerrarConexion = async () => {
    await client.close();
    db = null;
    console.log('|--> Conexión con la base de datos cerrada.');
};

export { pool, getDb, getClient, cerrarConexion };
