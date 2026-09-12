// Carga el .env y valida lo indispensable antes de que arranque el servidor.
import 'dotenv/config';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

const requeridas = ['MONGODB_URI', 'DB_NAME', 'JWT_SECRET'];
const faltantes = requeridas.filter((clave) => !process.env[clave]);

if (faltantes.length) {
    throw new Error(`|--> Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`);
}

const lista = (valor) => (valor ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export default {
    entorno: process.env.NODE_ENV ?? 'development',
    puerto: Number(process.env.PORT ?? 3000),
    mongodbUri: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    bcryptRondas: Number(process.env.BCRYPT_ROUNDS ?? 12),
    corsOrigin: lista(process.env.CORS_ORIGIN),
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    admin: {
        nombre: process.env.ADMIN_NOMBRE ?? 'Administrador',
        email: process.env.ADMIN_EMAIL ?? 'admin@foodierank.com',
        password: process.env.ADMIN_PASSWORD ?? 'Admin123*'
    },
    // El package.json es la única fuente de verdad de la versión (semver)
    version: pkg.version
};
