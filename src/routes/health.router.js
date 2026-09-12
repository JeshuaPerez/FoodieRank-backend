import { Router } from 'express';
import { query } from 'express-validator';
import semver from 'semver';
import env from '../config/env.js';
import { enviar } from '../utils/respuesta.js';

// Estado del servicio y versión del API. Con ?v=1.0.0 informa además si esa
// versión de cliente es compatible, sin fallar.
const crearHealthRouter = (nombreBaseDeDatos) => {
    const router = Router();

    router.get('/', query('v').optional().isString(), (req, res) => {
        const cliente = req.query.v;
        const compatible = cliente && semver.valid(cliente)
            ? semver.satisfies(env.version, `^${cliente}`)
            : null;

        enviar(res, 200, 'API operativa.', {
            version: env.version,
            entorno: env.entorno,
            baseDeDatos: nombreBaseDeDatos,
            versionCliente: cliente ?? null,
            compatible,
            fecha: new Date().toISOString()
        });
    });

    return router;
};

export default crearHealthRouter;
