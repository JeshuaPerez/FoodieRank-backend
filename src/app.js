import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import configurarPassport from './config/passport.js';
import montarSwagger from './config/swagger.js';
import crearRutas from './routes/index.js';
import { limitadorGlobal } from './middlewares/limiters.js';
import verificarVersion from './middlewares/version.middleware.js';
import ManejadorDeErrores from './middlewares/error.middleware.js';
import { SinPermisoError } from './utils/errores.js';

// Solo arma la aplicación: no abre puertos ni conexiones. Eso es de server.js,
// y así la app se puede montar en pruebas sin levantar nada.
const crearApp = (db, client) => {
    const app = express();
    const passport = configurarPassport(db);

    app.use(cors({
        origin: (origen, callback) => {
            // Sin cabecera Origin: Postman, curl o un HTML abierto como archivo
            if (!origen || env.corsOrigin.includes(origen)) return callback(null, true);
            callback(new SinPermisoError(`El origen ${origen} no está permitido por CORS.`));
        },
        // Authorization es la que lleva el token; x-version la usa el semver
        allowedHeaders: ['Content-Type', 'Authorization', 'x-version'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Express 5 deja req.body en undefined cuando la petición no trae cuerpo
    app.use((req, res, next) => {
        req.body ??= {};
        next();
    });
    app.use(passport.initialize());
    app.use(limitadorGlobal);
    app.use(verificarVersion);

    montarSwagger(app);
    app.use('/api', crearRutas(db, client));

    // El orden importa: primero el 404, al final el manejador de errores
    app.use(ManejadorDeErrores.noEncontrado);
    app.use(ManejadorDeErrores.manejar);

    return app;
};

export default crearApp;
