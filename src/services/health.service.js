import semver from 'semver';
import env from '../config/env.js';

// Tiempo máximo que se espera al ping antes de dar la base por caída. Corto a
// propósito: este endpoint tiene que contestar rápido incluso si Mongo no está.
const TIEMPO_PING_MS = 2000;

export default class HealthService {
    #db;

    constructor(db) {
        this.#db = db;
    }

    // Comprueba de verdad la conexión: sin el ping, el endpoint responde
    // "operativa" aunque la base esté caída.
    async estado(versionCliente = null) {
        let conexion = 'activa';
        try {
            await this.#db.command({ ping: 1 }, { timeoutMS: TIEMPO_PING_MS });
        }
        catch {
            conexion = 'sin conexión';
        }

        // Si el cliente declara con qué versión fue construido, informa si es
        // compatible con la del API. Aquí no falla: solo reporta.
        const compatible = versionCliente && semver.valid(versionCliente)
            ? semver.satisfies(env.version, `^${versionCliente}`)
            : null;

        return {
            version: env.version,
            entorno: env.entorno,
            baseDeDatos: this.#db.databaseName,
            conexion,
            versionCliente: versionCliente ?? null,
            compatible,
            fecha: new Date().toISOString()
        };
    }
}
