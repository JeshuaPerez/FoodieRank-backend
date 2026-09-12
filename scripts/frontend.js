// Pruebas de consumo desde el navegador. Cubren lo que un fetch hace distinto a
// curl: preflight de CORS, cuerpos en formato de formulario, tokens vencidos,
// doble clic en un botón y respuestas de error que el frontend tiene que pintar.
// Uso: npm run check:frontend
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

const ORIGEN = 'http://localhost:5500';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = replica.getUri();
process.env.DB_NAME = 'foodierank_frontend';
process.env.JWT_SECRET = 'secreto-de-prueba-para-las-pruebas-de-frontend';
process.env.CORS_ORIGIN = `${ORIGEN},http://127.0.0.1:5500`;
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '5';
process.env.BCRYPT_ROUNDS = '4';

const jwt = (await import('jsonwebtoken')).default;
const env = (await import('../src/config/env.js')).default;
const { pool, cerrarConexion } = await import('../src/config/db.js');
const crearIndices = (await import('../src/config/indexes.js')).default;
const crearApp = (await import('../src/app.js')).default;

const db = await pool();
await crearIndices(db);

const servidor = crearApp(db).listen(0);
const base = `http://127.0.0.1:${servidor.address().port}/api`;

let pasadas = 0;
const fallos = [];

const verificar = (nombre, condicion, detalle = '') => {
    if (condicion) {
        pasadas += 1;
        console.log(`  ok   ${nombre}`);
    }
    else {
        fallos.push(nombre);
        console.log(`  FALLA ${nombre} ${detalle}`);
    }
};

// Imita a fetch desde el navegador: siempre manda la cabecera Origin
const pedir = async (metodo, ruta, { token, body, cabeceras = {}, origen = ORIGEN, crudo } = {}) => {
    const respuesta = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: {
            ...(origen ? { Origin: origen } : {}),
            ...(body && !crudo ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...cabeceras
        },
        body: crudo ?? (body ? JSON.stringify(body) : undefined)
    });
    const texto = await respuesta.text();
    let cuerpo = null;
    try {
        cuerpo = texto ? JSON.parse(texto) : null;
    }
    catch {
        cuerpo = { textoCrudo: texto };
    }
    return { status: respuesta.status, cuerpo, cabeceras: respuesta.headers, texto };
};

const registrar = async (nombre, email) => {
    const { cuerpo } = await pedir('POST', '/auth/registro', { body: { nombre, email, password: 'Secreta123' } });
    return cuerpo.datos.token;
};

// Datos de apoyo
const tokenAdmin = await registrar('Jefa Admin', 'admin@front.com');
await db.collection('usuarios').updateOne({ email: 'admin@front.com' }, { $set: { rol: 'admin' } });
const tokenUno = await registrar('Usuario Uno', 'uno@front.com');
const tokenDos = await registrar('Usuario Dos', 'dos@front.com');

const categoriaId = (await pedir('POST', '/categorias', { token: tokenAdmin, body: { nombre: 'Sushi' } })).cuerpo.datos.id;
const restauranteId = (await pedir('POST', '/restaurantes', {
    token: tokenAdmin,
    body: { nombre: 'Sakura Sushi Bar', descripcion: 'Barra de sushi con pescado del día.', categoriaId, ubicacion: 'Avenida 19 #104-20' }
})).cuerpo.datos.id;

console.log('\n== CORS y preflight ==');
const preflight = await pedir('OPTIONS', '/restaurantes', {
    cabeceras: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' }
});
verificar('el preflight responde 2xx', preflight.status === 204 || preflight.status === 200, `(status ${preflight.status})`);
verificar('el preflight devuelve Allow-Origin con el origen del frontend',
    preflight.cabeceras.get('access-control-allow-origin') === ORIGEN);
verificar('el preflight permite la cabecera Authorization',
    (preflight.cabeceras.get('access-control-allow-headers') ?? '').toLowerCase().includes('authorization'));
verificar('el preflight permite los métodos de escritura',
    ['POST', 'PUT', 'PATCH', 'DELETE'].every((m) => (preflight.cabeceras.get('access-control-allow-methods') ?? '').includes(m)));

const preflightBorrado = await pedir('OPTIONS', `/resenas/${restauranteId}`, {
    cabeceras: { 'Access-Control-Request-Method': 'DELETE' }
});
verificar('el preflight de DELETE no exige token', preflightBorrado.status === 204 || preflightBorrado.status === 200);

const conOrigen = await pedir('GET', '/restaurantes');
verificar('la respuesta real lleva Allow-Origin', conOrigen.cabeceras.get('access-control-allow-origin') === ORIGEN);

const otroOrigen = await pedir('GET', '/restaurantes', { origen: 'http://sitio-no-autorizado.com' });
verificar('un origen no autorizado se rechaza con 403', otroOrigen.status === 403);
verificar('el rechazo de CORS explica el motivo en JSON',
    typeof otroOrigen.cuerpo?.mensaje === 'string' && otroOrigen.cuerpo.mensaje.includes('CORS'));

verificar('sin cabecera Origin (Postman) funciona igual',
    (await pedir('GET', '/restaurantes', { origen: null })).status === 200);

console.log('\n== Cuerpos tal como los manda un formulario ==');
const urlencoded = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { Origin: ORIGEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'uno@front.com', password: 'Secreta123' })
});
verificar('un cuerpo urlencoded se procesa bien', urlencoded.status === 200);

const formData = new FormData();
formData.append('email', 'uno@front.com');
formData.append('password', 'Secreta123');
const multipart = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: ORIGEN }, body: formData });
const multipartCuerpo = await multipart.json();
verificar('un FormData (multipart) responde 400 y no 500', multipart.status === 400, `(status ${multipart.status})`);
verificar('el 400 de multipart indica qué campos faltan',
    Array.isArray(multipartCuerpo.datos) && multipartCuerpo.datos.length > 0);

const jsonRoto = await pedir('POST', '/auth/login', {
    crudo: '{"email":"uno@front.com","password":}',
    cabeceras: { 'Content-Type': 'application/json' }
});
verificar('un JSON malformado responde 400', jsonRoto.status === 400, `(status ${jsonRoto.status})`);
verificar('el mensaje del JSON malformado no dice "error interno"',
    !/interno/i.test(jsonRoto.cuerpo?.mensaje ?? ''), `(mensaje: ${jsonRoto.cuerpo?.mensaje})`);

const sinContentType = await pedir('POST', '/auth/login', {
    crudo: JSON.stringify({ email: 'uno@front.com', password: 'Secreta123' })
});
verificar('sin Content-Type responde 400 y no 500', sinContentType.status === 400, `(status ${sinContentType.status})`);

const grande = await pedir('POST', '/resenas', {
    token: tokenUno,
    crudo: JSON.stringify({ restauranteId, calificacion: 5, comentario: 'x'.repeat(200000) }),
    cabeceras: { 'Content-Type': 'application/json' }
});
verificar('un cuerpo enorme responde 413 y no 500', grande.status === 413, `(status ${grande.status})`);
verificar('el mensaje del cuerpo enorme no dice "error interno"',
    !/interno/i.test(grande.cuerpo?.mensaje ?? ''), `(mensaje: ${grande.cuerpo?.mensaje})`);

console.log('\n== Tipos que llegan desde un input HTML ==');
const numerosComoTexto = await pedir('POST', `/restaurantes/${restauranteId}/platos`, {
    token: tokenAdmin,
    body: { nombre: 'Roll tempura', descripcion: 'Camarón tempura.', precio: '38000' }
});
verificar('un precio enviado como texto se acepta', numerosComoTexto.status === 201, `(status ${numerosComoTexto.status})`);
verificar('el precio se guarda como número', numerosComoTexto.cuerpo?.datos?.precio === 38000);

const imagenVacia = await pedir('POST', `/restaurantes/${restauranteId}/platos`, {
    token: tokenAdmin,
    body: { nombre: 'Sashimi', precio: '42000', imagen: '', descripcion: '' }
});
verificar('un campo imagen vacío no invalida el formulario', imagenVacia.status === 201, `(status ${imagenVacia.status})`);
verificar('la imagen vacía se guarda como null', imagenVacia.cuerpo?.datos?.imagen === null);

const resenaConAcentos = await pedir('POST', '/resenas', {
    token: tokenUno,
    body: { restauranteId, calificacion: '4', comentario: 'Comí aquí el miércoles: ñoquis, jalapeños y té 🍣' }
});
verificar('una calificación enviada como texto se acepta', resenaConAcentos.status === 201, `(status ${resenaConAcentos.status})`);
verificar('los acentos y emoji se devuelven intactos',
    resenaConAcentos.cuerpo?.datos?.comentario === 'Comí aquí el miércoles: ñoquis, jalapeños y té 🍣');
const resenaId = resenaConAcentos.cuerpo?.datos?.id;

console.log('\n== Tokens ==');
const vencido = jwt.sign({ sub: '66e2a1b4c8d9e0f1a2b3c4d5', rol: 'usuario' }, env.jwtSecret, { expiresIn: '-1h' });
const conVencido = await pedir('GET', '/auth/perfil', { token: vencido });
verificar('un token vencido responde 401', conVencido.status === 401, `(status ${conVencido.status})`);
verificar('el 401 del token vencido trae mensaje legible', typeof conVencido.cuerpo?.mensaje === 'string');

const firmaAjena = jwt.sign({ sub: '66e2a1b4c8d9e0f1a2b3c4d5', rol: 'admin' }, 'otro-secreto-cualquiera');
verificar('un token firmado con otro secreto responde 401',
    (await pedir('GET', '/auth/perfil', { token: firmaAjena })).status === 401);

const usuarioBorrado = jwt.sign({ sub: '66e2a1b4c8d9e0f1a2b3c4d5', rol: 'admin' }, env.jwtSecret);
verificar('un token de un usuario que ya no existe responde 401',
    (await pedir('GET', '/auth/perfil', { token: usuarioBorrado })).status === 401);

verificar('Authorization sin el prefijo Bearer responde 401',
    (await pedir('GET', '/auth/perfil', { cabeceras: { Authorization: 'abc.def.ghi' } })).status === 401);
verificar('Bearer vacío responde 401',
    (await pedir('GET', '/auth/perfil', { cabeceras: { Authorization: 'Bearer ' } })).status === 401);

// Un token caducado guardado en localStorage no debe tumbar las pantallas públicas
const publicoConTokenMalo = await pedir('GET', `/restaurantes/${restauranteId}`, { token: vencido });
verificar('una ruta pública con token vencido sigue respondiendo 200', publicoConTokenMalo.status === 200, `(status ${publicoConTokenMalo.status})`);
verificar('con token inválido miReaccion llega en null',
    publicoConTokenMalo.cuerpo?.datos?.resenas?.[0]?.miReaccion === null);
verificar('una ruta pública con Authorization basura responde 200',
    (await pedir('GET', '/restaurantes', { cabeceras: { Authorization: 'Bearer basura' } })).status === 200);

console.log('\n== Doble clic y peticiones simultáneas ==');
const dobleResena = await Promise.all([
    pedir('POST', '/resenas', { token: tokenDos, body: { restauranteId, comentario: 'Doble clic en publicar.', calificacion: 5 } }),
    pedir('POST', '/resenas', { token: tokenDos, body: { restauranteId, comentario: 'Doble clic en publicar.', calificacion: 5 } })
]);
const creadas = dobleResena.filter((r) => r.status === 201).length;
verificar('el doble clic en publicar crea una sola reseña', creadas === 1,
    `(respuestas: ${dobleResena.map((r) => r.status).join(' y ')})`);
verificar('la reseña repetida responde 409 y no 500',
    dobleResena.some((r) => r.status === 409), `(respuestas: ${dobleResena.map((r) => r.status).join(' y ')})`);
verificar('en la base quedó una sola reseña de ese usuario',
    (await db.collection('resenas').countDocuments({ comentario: 'Doble clic en publicar.' })) === 1);

const dobleLike = await Promise.all([
    pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'like' } }),
    pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'like' } })
]);
verificar('el doble clic en like no devuelve error 500',
    dobleLike.every((r) => r.status === 200), `(respuestas: ${dobleLike.map((r) => r.status).join(' y ')})`);
const reaccionesEnBase = await db.collection('reacciones').countDocuments({ resenaId: { $exists: true } });
const resenaEnBase = await db.collection('resenas').findOne({ comentario: { $regex: 'miércoles' } });
verificar('el contador de likes coincide con las reacciones guardadas',
    resenaEnBase.likes === reaccionesEnBase, `(likes ${resenaEnBase.likes}, reacciones ${reaccionesEnBase})`);
verificar('el contador de likes nunca queda negativo', resenaEnBase.likes >= 0 && resenaEnBase.dislikes >= 0);

const resenaParaBorrar = (await pedir('POST', '/resenas', {
    token: tokenAdmin, body: { restauranteId, comentario: 'Reseña para borrar dos veces.', calificacion: 3 }
})).cuerpo.datos.id;
const dobleBorrado = await Promise.all([
    pedir('DELETE', `/resenas/${resenaParaBorrar}`, { token: tokenAdmin }),
    pedir('DELETE', `/resenas/${resenaParaBorrar}`, { token: tokenAdmin })
]);
verificar('el doble clic en eliminar responde 204 y 404, sin 500',
    dobleBorrado.filter((r) => r.status === 204).length === 1 && dobleBorrado.some((r) => r.status === 404),
    `(respuestas: ${dobleBorrado.map((r) => r.status).join(' y ')})`);

console.log('\n== Rutas, métodos y errores que el frontend tiene que pintar ==');
verificar('una ruta con barra final funciona igual', (await pedir('GET', '/restaurantes/')).status === 200);
const noExiste = await pedir('GET', '/restaurantez');
verificar('una ruta inexistente responde 404', noExiste.status === 404);
verificar('el 404 viene en JSON y no en HTML', typeof noExiste.cuerpo?.mensaje === 'string' && !noExiste.texto.includes('<html'));

const metodoNoSoportado = await pedir('PATCH', `/categorias/${categoriaId}`, { token: tokenAdmin, body: { nombre: 'Otro' } });
verificar('un método no soportado responde 404 en JSON', metodoNoSoportado.status === 404 && typeof metodoNoSoportado.cuerpo?.mensaje === 'string');

const idInvalido = await pedir('GET', '/restaurantes/123');
verificar('un id con formato inválido responde 400 y no 500', idInvalido.status === 400);
verificar('el 400 del id inválido dice qué campo falló',
    idInvalido.cuerpo?.datos?.[0]?.campo === 'id');

const sinPermiso = await pedir('DELETE', `/restaurantes/${restauranteId}`, { token: tokenUno });
verificar('un usuario sin permisos recibe 403 con mensaje', sinPermiso.status === 403 && Boolean(sinPermiso.cuerpo.mensaje));

console.log('\n== Límite de peticiones ==');
const intentos = [];
for (let i = 0; i < 7; i += 1) {
    intentos.push((await pedir('POST', '/auth/login', { body: { email: 'uno@front.com', password: 'ClaveMala1' } })).status);
}
verificar('el login repetido termina en 429', intentos.includes(429), `(respuestas: ${intentos.join(',')})`);
const bloqueado = await pedir('POST', '/auth/login', { body: { email: 'uno@front.com', password: 'ClaveMala1' } });
verificar('el 429 viene en JSON con mensaje', typeof bloqueado.cuerpo?.mensaje === 'string');
verificar('el 429 también lleva las cabeceras de CORS',
    bloqueado.cabeceras.get('access-control-allow-origin') === ORIGEN);
verificar('el límite de auth no bloquea el resto de la API',
    (await pedir('GET', '/restaurantes')).status === 200);

console.log('\n== Paginación y filtros desde la pantalla de listado ==');
const paginaVacia = await pedir('GET', '/restaurantes?pagina=99');
verificar('una página fuera de rango devuelve lista vacía, no error',
    paginaVacia.status === 200 && paginaVacia.cuerpo.datos.datos.length === 0 && paginaVacia.cuerpo.datos.total >= 1);
verificar('un límite demasiado alto responde 400',
    (await pedir('GET', '/restaurantes?limite=500')).status === 400);
verificar('una página no numérica responde 400',
    (await pedir('GET', '/restaurantes?pagina=abc')).status === 400);
const busquedaConRegex = await pedir('GET', '/restaurantes?busqueda=.*');
verificar('una búsqueda con caracteres de regex no rompe ni trae todo',
    busquedaConRegex.status === 200 && busquedaConRegex.cuerpo.datos.total === 0,
    `(total ${busquedaConRegex.cuerpo?.datos?.total})`);
verificar('una búsqueda sin resultados devuelve total 0',
    (await pedir('GET', '/restaurantes?busqueda=noexisteestenombre')).cuerpo.datos.total === 0);
verificar('un filtro por categoría inexistente devuelve total 0',
    (await pedir('GET', '/restaurantes?categoria=66e2a1b4c8d9e0f1a2b3c4d5')).cuerpo.datos.total === 0);
verificar('una categoría con id inválido responde 400',
    (await pedir('GET', '/restaurantes?categoria=abc')).status === 400);

console.log(`\n${'='.repeat(50)}`);
console.log(`Pruebas superadas: ${pasadas}`);
if (fallos.length) {
    console.log(`Fallaron ${fallos.length}:`);
    fallos.forEach((nombre) => console.log(`  - ${nombre}`));
}
console.log('='.repeat(50));

servidor.close();
await cerrarConexion();
await replica.stop();
process.exit(fallos.length ? 1 : 0);
