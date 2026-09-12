import semver from 'semver';
import env from '../config/env.js';

export default class HealthService {
    #nombreBaseDeDatos;

    constructor(nombreBaseDeDatos) {
        this.#nombreBaseDeDatos = nombreBaseDeDatos;
    }

    // Si el cliente declara con qué versión fue construido, informa si es
    // compatible con la del API. Aquí no falla: solo reporta.
    estado(versionCliente = null) {
        const compatible = versionCliente && semver.valid(versionCliente)
            ? semver.satisfies(env.version, `^${versionCliente}`)
            : null;

        return {
            version: env.version,
            entorno: env.entorno,
            baseDeDatos: this.#nombreBaseDeDatos,
            versionCliente: versionCliente ?? null,
            compatible,
            fecha: new Date().toISOString()
        };
    }
}
