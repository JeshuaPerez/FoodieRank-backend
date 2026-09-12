import env from './config/env.js';
import { pool, getClient, cerrarConexion } from './config/db.js';
import crearIndices from './config/indexes.js';
import crearApp from './app.js';

const iniciar = async () => {
    const db = await pool();
    await crearIndices(db);

    const app = crearApp(db, getClient());
    const servidor = app.listen(env.puerto, () => {
        console.log(`|--> FoodieRank API v${env.version} corriendo en http://localhost:${env.puerto}/api`);
        console.log(`|--> Documentación disponible en http://localhost:${env.puerto}/api/docs`);
    });

    // Cierre ordenado: primero deja de aceptar peticiones, después suelta Mongo
    const apagar = (senal) => {
        console.log(`\n|--> Señal ${senal} recibida, cerrando el servidor...`);
        servidor.close(async () => {
            await cerrarConexion();
            process.exit(0);
        });
    };

    process.on('SIGINT', () => apagar('SIGINT'));
    process.on('SIGTERM', () => apagar('SIGTERM'));
};

iniciar().catch((error) => {
    console.error(`|--> No se pudo iniciar el servidor: ${error.message}`);
    process.exit(1);
});
