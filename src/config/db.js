import { MongoClient } from 'mongodb';
import env from './env.js';

// Singleton: toda la aplicación comparte una sola conexión. El constructor
// devuelve siempre la misma instancia, así que da igual desde dónde se pida.
export default class Database {
    static #instancia = null;

    #client;
    #db = null;

    constructor() {
        if (Database.#instancia) return Database.#instancia;

        // Sin este límite el driver espera 30 segundos antes de rendirse, y
        // durante una caída de red cada petición se queda colgada todo ese
        // tiempo. El reintento de lecturas y escrituras viene activado por defecto.
        this.#client = new MongoClient(env.mongodbUri, {
            serverSelectionTimeoutMS: env.serverSelectionTimeoutMS
        });

        Database.#instancia = this;
    }

    // Punto de acceso del patrón: crea la instancia la primera vez y la reutiliza
    static obtenerInstancia() {
        return Database.#instancia ?? new Database();
    }

    get conectada() {
        return this.#db !== null;
    }

    async conectar() {
        if (this.#db) return this.#db;

        try {
            await this.#client.connect();
            this.#db = this.#client.db(env.dbName);
            console.log(`|--> Conexión con la base de datos ${env.dbName.toUpperCase()} establecida exitosamente!`);
            return this.#db;
        }
        catch (error) {
            console.error(`|--> Error al intentar conectarse a la base de datos ${env.dbName.toUpperCase()}: ${error.message}`);
            throw error;
        }
    }

    obtenerDb() {
        if (!this.#db) throw new Error('|--> La base de datos no está conectada. Llama a conectar() primero.');
        return this.#db;
    }

    // El cliente se expone porque las transacciones abren sesiones sobre él
    obtenerCliente() {
        return this.#client;
    }

    async cerrar() {
        await this.#client.close();
        this.#db = null;
        console.log('|--> Conexión con la base de datos cerrada.');
    }
}
