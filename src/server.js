import env from './config/env.js';
import Database from './config/db.js';
import crearIndices from './config/indexes.js';
import crearApp from './app.js';

// Si el cierre se queda esperando conexiones abiertas, se fuerza la salida y todo termina
const ESPERA_MAXIMA_DE_CIERRE_MS = 10000;

const iniciar = async () => {
    const baseDeDatos = Database.obtenerInstancia();
    const db = await baseDeDatos.conectar();
    await crearIndices(db);

    const app = crearApp(db, baseDeDatos.obtenerCliente());
    const servidor = app.listen(env.puerto, () => {
        console.log(`|--> FoodieRank API v${env.version} corriendo en http://localhost:${env.puerto}/api`);
        console.log(`|--> Documentación disponible en http://localhost:${env.puerto}/api/docs`);
    });

    let cerrando = false;

    // Cierre ordenado: primero deja de aceptar peticiones, después suelta Mongo
    const apagar = (motivo, codigo = 0) => {
        if (cerrando) return;
        cerrando = true;
        console.log(`\n|--> ${motivo}, cerrando el servidor...`);

        const forzarSalida = setTimeout(() => {
            console.error('|--> El cierre tardó demasiado, se fuerza la salida.');
            process.exit(1);
        }, ESPERA_MAXIMA_DE_CIERRE_MS);

        servidor.close(async () => {
            clearTimeout(forzarSalida);
            await baseDeDatos.cerrar().catch(() => {});
            process.exit(codigo);
        });
    };

    process.on('SIGINT', () => apagar('Señal SIGINT recibida'));
    process.on('SIGTERM', () => apagar('Señal SIGTERM recibida'));

    // Sin estos dos, un fallo fuera del ciclo de una petición termina el proceso
    // sin dejar rastro de qué ocurrió.
    process.on('unhandledRejection', (razon) => {
        console.error('|--> Promesa rechazada sin manejar:', razon);
        apagar('Promesa rechazada sin manejar', 1);
    });

    process.on('uncaughtException', (error) => {
        console.error('|--> Excepción no capturada:', error);
        apagar('Excepción no capturada', 1);
    });
};

iniciar().catch((error) => {
    console.error(`|--> No se pudo iniciar el servidor: ${error.message}`);
    process.exit(1);
});
