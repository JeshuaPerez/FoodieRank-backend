// Prueba de humo de extremo a extremo. Levanta un MongoDB en memoria como
// replica set (las transacciones solo funcionan sobre replica set), monta la app
// y recorre los flujos críticos con peticiones HTTP reales.
// Uso: npm run smoke
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

// Las variables se fijan antes de importar config/env.js, que las lee al cargar
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = replica.getUri();
process.env.DB_NAME = 'foodierank_smoke';
process.env.JWT_SECRET = 'secreto-de-prueba-para-el-smoke-test';
process.env.CORS_ORIGIN = 'http://localhost:5500';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.BCRYPT_ROUNDS = '4';

const { pool, getClient, cerrarConexion } = await import('../src/config/db.js');
const crearIndices = (await import('../src/config/indexes.js')).default;
const crearApp = (await import('../src/app.js')).default;

const db = await pool();
await crearIndices(db);

const servidor = crearApp(db, getClient()).listen(0);
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

const pedir = async (metodo, ruta, { token, body, cabeceras = {} } = {}) => {
    const respuesta = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...cabeceras
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const texto = await respuesta.text();
    return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
};

const registrar = async (nombre, email) => {
    const { cuerpo } = await pedir('POST', '/auth/registro', {
        body: { nombre, email, password: 'Secreta123' }
    });
    return cuerpo.datos.token;
};

console.log('\n== Sistema ==');
const health = await pedir('GET', '/health?v=1.0.0');
verificar('health responde 200', health.status === 200);
verificar('health expone la version', Boolean(health.cuerpo.datos.version));
verificar('health compara la version del cliente', health.cuerpo.datos.compatible === true);

const versionVieja = await pedir('GET', '/health', { cabeceras: { 'x-version': '9.9.9' } });
verificar('x-version incompatible responde 409', versionVieja.status === 409);

const inexistente = await pedir('GET', '/no-existe');
verificar('ruta inexistente responde 404', inexistente.status === 404);

console.log('\n== Autenticación ==');
const registro = await pedir('POST', '/auth/registro', {
    body: { nombre: 'Usuario Uno', email: 'uno@test.com', password: 'Secreta123' }
});
verificar('registro responde 201', registro.status === 201);
verificar('registro devuelve token', Boolean(registro.cuerpo.datos.token));
verificar('registro fuerza el rol usuario', registro.cuerpo.datos.usuario.rol === 'usuario');
verificar('registro no expone la contraseña', registro.cuerpo.datos.usuario.password === undefined);
const tokenUno = registro.cuerpo.datos.token;

const rolForzado = await pedir('POST', '/auth/registro', {
    body: { nombre: 'Falso Admin', email: 'falso@test.com', password: 'Secreta123', rol: 'admin' }
});
verificar('no se puede pedir rol admin en el registro', rolForzado.cuerpo.datos.usuario.rol === 'usuario');

const duplicado = await pedir('POST', '/auth/registro', {
    body: { nombre: 'Usuario Uno', email: 'uno@test.com', password: 'Secreta123' }
});
verificar('email duplicado responde 409', duplicado.status === 409);

const invalido = await pedir('POST', '/auth/registro', {
    body: { nombre: 'A', email: 'no-es-email', password: '123' }
});
verificar('datos inválidos responden 400', invalido.status === 400);
verificar('los errores traen campo y mensaje', invalido.cuerpo.datos.every((e) => e.campo && e.mensaje));

const malaClave = await pedir('POST', '/auth/login', { body: { email: 'uno@test.com', password: 'Incorrecta1' } });
verificar('login con clave incorrecta responde 401', malaClave.status === 401);
const sinUsuario = await pedir('POST', '/auth/login', { body: { email: 'nadie@test.com', password: 'Incorrecta1' } });
verificar('login no revela si el usuario existe', malaClave.cuerpo.mensaje === sinUsuario.cuerpo.mensaje);

verificar('perfil sin token responde 401', (await pedir('GET', '/auth/perfil')).status === 401);
verificar('perfil con token responde 200', (await pedir('GET', '/auth/perfil', { token: tokenUno })).status === 200);
verificar('token falso responde 401', (await pedir('GET', '/auth/perfil', { token: 'abc.def.ghi' })).status === 401);

// El registro público nunca crea administradores: se promueve en la base, igual
// que hace el seed
const tokenDos = await registrar('Usuario Dos', 'dos@test.com');
const tokenAdmin = await registrar('Jefa Admin', 'admin@test.com');
await db.collection('usuarios').updateOne({ email: 'admin@test.com' }, { $set: { rol: 'admin' } });

console.log('\n== Categorías ==');
verificar('crear categoría sin token responde 401', (await pedir('POST', '/categorias', { body: { nombre: 'Sushi' } })).status === 401);
verificar('crear categoría como usuario responde 403',
    (await pedir('POST', '/categorias', { token: tokenUno, body: { nombre: 'Sushi' } })).status === 403);

const categoria = await pedir('POST', '/categorias', {
    token: tokenAdmin,
    body: { nombre: 'Sushi', descripcion: 'Cocina japonesa' }
});
verificar('admin crea categoría con 201', categoria.status === 201);
const categoriaId = categoria.cuerpo.datos.id;

const categoriaDuplicada = await pedir('POST', '/categorias', { token: tokenAdmin, body: { nombre: '  SUSHI  ' } });
verificar('duplicado insensible a mayúsculas responde 409', categoriaDuplicada.status === 409);
verificar('listado de categorías es público', (await pedir('GET', '/categorias')).status === 200);

console.log('\n== Restaurantes y platos ==');
const propuesta = await pedir('POST', '/restaurantes', {
    token: tokenUno,
    body: {
        nombre: 'Propuesta del Usuario',
        descripcion: 'Restaurante propuesto por un usuario normal.',
        categoriaId,
        ubicacion: 'Calle 1 #2-3'
    }
});
verificar('un usuario puede proponer restaurante', propuesta.status === 201);
verificar('la propuesta queda pendiente de aprobación', propuesta.cuerpo.datos.aprobado === false);
const propuestaId = propuesta.cuerpo.datos.id;

const listadoPublico = await pedir('GET', '/restaurantes');
verificar('el listado público oculta los pendientes',
    !listadoPublico.cuerpo.datos.datos.some((r) => r.id === propuestaId));
verificar('el detalle de un pendiente responde 404 al público',
    (await pedir('GET', `/restaurantes/${propuestaId}`)).status === 404);

const aprobacion = await pedir('PATCH', `/restaurantes/${propuestaId}/aprobar`, { token: tokenAdmin });
verificar('el admin aprueba la propuesta', aprobacion.status === 200 && aprobacion.cuerpo.datos.aprobado === true);
verificar('aprobado, ya aparece en el listado público',
    (await pedir('GET', '/restaurantes')).cuerpo.datos.datos.some((r) => r.id === propuestaId));
verificar('aprobar como usuario responde 403',
    (await pedir('PATCH', `/restaurantes/${propuestaId}/aprobar`, { token: tokenUno })).status === 403);

const restaurante = await pedir('POST', '/restaurantes', {
    token: tokenAdmin,
    body: {
        nombre: 'La Parrilla del Norte',
        descripcion: 'Cortes madurados a la brasa con carta de vinos.',
        categoriaId,
        ubicacion: 'Calle 10 #45-30',
        imagen: 'https://ejemplo.com/foto.jpg'
    }
});
verificar('el admin crea el restaurante ya aprobado', restaurante.cuerpo.datos.aprobado === true);
const restauranteId = restaurante.cuerpo.datos.id;

verificar('restaurante con nombre duplicado responde 409',
    (await pedir('POST', '/restaurantes', {
        token: tokenAdmin,
        body: { nombre: 'la parrilla del norte', descripcion: 'Otro con el mismo nombre.', categoriaId, ubicacion: 'Calle 9' }
    })).status === 409);

verificar('restaurante con categoría inexistente responde 404',
    (await pedir('POST', '/restaurantes', {
        token: tokenAdmin,
        body: { nombre: 'Sin Categoría', descripcion: 'Categoría que no existe.', categoriaId: '66e2a1b4c8d9e0f1a2b3c4d5', ubicacion: 'Calle 8' }
    })).status === 404);

verificar('id con formato inválido responde 400',
    (await pedir('GET', '/restaurantes/no-es-un-id')).status === 400);

const plato = await pedir('POST', `/restaurantes/${restauranteId}/platos`, {
    token: tokenAdmin,
    body: { nombre: 'Bife de chorizo', descripcion: 'Corte de 350g.', precio: 62000 }
});
verificar('se crea el plato del restaurante', plato.status === 201);
const platoId = plato.cuerpo.datos.id;

verificar('plato duplicado en el mismo restaurante responde 409',
    (await pedir('POST', `/restaurantes/${restauranteId}/platos`, {
        token: tokenAdmin, body: { nombre: 'BIFE DE CHORIZO', precio: 50000 }
    })).status === 409);

verificar('el mismo plato en otro restaurante sí se permite',
    (await pedir('POST', `/restaurantes/${propuestaId}/platos`, {
        token: tokenAdmin, body: { nombre: 'Bife de chorizo', precio: 58000 }
    })).status === 201);

verificar('plato en restaurante inexistente responde 404',
    (await pedir('POST', '/restaurantes/66e2a1b4c8d9e0f1a2b3c4d5/platos', {
        token: tokenAdmin, body: { nombre: 'Fantasma', precio: 1000 }
    })).status === 404);

verificar('los platos de un restaurante son públicos',
    (await pedir('GET', `/restaurantes/${restauranteId}/platos`)).status === 200);

console.log('\n== Reseñas, reacciones y ranking (transacciones) ==');
const resena = await pedir('POST', '/resenas', {
    token: tokenUno,
    body: { restauranteId, comentario: 'El bife llegó en su punto exacto.', calificacion: 5 }
});
verificar('se publica la reseña con 201', resena.status === 201);
const resenaId = resena.cuerpo.datos.id;

const conUnaResena = await pedir('GET', `/restaurantes/${restauranteId}`);
verificar('la transacción dejó el ranking calculado', conUnaResena.cuerpo.datos.rankingPonderado > 0);
verificar('el total de reseñas se actualizó', conUnaResena.cuerpo.datos.totalResenas === 1);
verificar('el promedio de calificación se actualizó', conUnaResena.cuerpo.datos.promedioCalificacion === 5);

verificar('segunda reseña del mismo usuario responde 409',
    (await pedir('POST', '/resenas', {
        token: tokenUno, body: { restauranteId, comentario: 'Otra vez yo mismo.', calificacion: 1 }
    })).status === 409);

verificar('reseñar sin token responde 401',
    (await pedir('POST', '/resenas', { body: { restauranteId, comentario: 'Sin sesión.', calificacion: 3 } })).status === 401);

verificar('calificación fuera de rango responde 400',
    (await pedir('POST', '/resenas', {
        token: tokenDos, body: { restauranteId, comentario: 'Calificación inválida.', calificacion: 9 }
    })).status === 400);

verificar('reaccionar a la propia reseña responde 403',
    (await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenUno, body: { tipo: 'like' } })).status === 403);

const like = await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'like' } });
verificar('otro usuario da like', like.status === 200 && like.cuerpo.datos.likes === 1);
verificar('la respuesta marca miReaccion', like.cuerpo.datos.miReaccion === 'like');

const quitaLike = await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'like' } });
verificar('repetir el mismo tipo quita la reacción',
    quitaLike.cuerpo.datos.likes === 0 && quitaLike.cuerpo.datos.miReaccion === null);

await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'like' } });
const cambia = await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'dislike' } });
verificar('cambiar de tipo mueve los dos contadores',
    cambia.cuerpo.datos.likes === 0 && cambia.cuerpo.datos.dislikes === 1);
verificar('solo queda una reacción por usuario y reseña',
    (await db.collection('reacciones').countDocuments({})) === 1);

verificar('tipo de reacción inválido responde 400',
    (await pedir('POST', `/resenas/${resenaId}/reaccion`, { token: tokenDos, body: { tipo: 'meh' } })).status === 400);

verificar('editar la reseña de otro responde 403',
    (await pedir('PUT', `/resenas/${resenaId}`, { token: tokenDos, body: { calificacion: 1 } })).status === 403);

const editada = await pedir('PUT', `/resenas/${resenaId}`, { token: tokenUno, body: { calificacion: 3 } });
verificar('el autor edita su reseña', editada.status === 200);
verificar('editar marca editadoEn', Boolean(editada.cuerpo.datos.editadoEn));
verificar('editar recalcula el promedio',
    (await pedir('GET', `/restaurantes/${restauranteId}`)).cuerpo.datos.promedioCalificacion === 3);

console.log('\n== Detalle, listados y miReaccion ==');
const detallePublico = await pedir('GET', `/restaurantes/${restauranteId}`);
verificar('el detalle trae platos y reseñas',
    detallePublico.cuerpo.datos.platos.length === 1 && detallePublico.cuerpo.datos.resenas.length === 1);
verificar('las reseñas traen el nombre del autor', detallePublico.cuerpo.datos.resenas[0].autor === 'Usuario Uno');
verificar('sin token no hay miReaccion', detallePublico.cuerpo.datos.resenas[0].miReaccion === null);

const detalleConToken = await pedir('GET', `/restaurantes/${restauranteId}`, { token: tokenDos });
verificar('con token llega miReaccion', detalleConToken.cuerpo.datos.resenas[0].miReaccion === 'dislike');

const paginado = await pedir('GET', '/restaurantes?pagina=1&limite=1&orden=popularidad');
verificar('el listado viene paginado',
    paginado.cuerpo.datos.datos.length === 1 && paginado.cuerpo.datos.total >= 2 && paginado.cuerpo.datos.totalPaginas >= 2);
verificar('el filtro por categoría funciona',
    (await pedir('GET', `/restaurantes?categoria=${categoriaId}`)).cuerpo.datos.total >= 2);
verificar('la búsqueda por nombre funciona',
    (await pedir('GET', '/restaurantes?busqueda=parrilla')).cuerpo.datos.total === 1);
verificar('un orden no permitido responde 400',
    (await pedir('GET', '/restaurantes?orden=loquesea')).status === 400);

console.log('\n== Moderación y borrados en cascada ==');
verificar('eliminar categoría en uso responde 409',
    (await pedir('DELETE', `/categorias/${categoriaId}`, { token: tokenAdmin })).status === 409);

const moderada = await pedir('DELETE', `/resenas/${resenaId}`, { token: tokenAdmin });
verificar('el admin elimina la reseña de otro con 204', moderada.status === 204);
verificar('queda registro en la bitácora de moderación',
    (await db.collection('moderaciones').countDocuments({})) === 1);
verificar('se borraron las reacciones de esa reseña',
    (await db.collection('reacciones').countDocuments({})) === 0);
verificar('el ranking volvió a cero sin reseñas',
    (await pedir('GET', `/restaurantes/${restauranteId}`)).cuerpo.datos.totalResenas === 0);

await pedir('POST', '/resenas', { token: tokenDos, body: { restauranteId, comentario: 'Reseña para la cascada.', calificacion: 4 } });
verificar('eliminar restaurante responde 204',
    (await pedir('DELETE', `/restaurantes/${restauranteId}`, { token: tokenAdmin })).status === 204);
verificar('la cascada borró sus platos', (await db.collection('platos').countDocuments({ restauranteId: null })) === 0
    && (await pedir('GET', `/platos/${platoId}`)).status === 404);
verificar('la cascada borró sus reseñas', (await db.collection('resenas').countDocuments({})) === 0);

console.log('\n== Contenido pendiente de aprobación ==');
const pendiente = await pedir('POST', '/restaurantes', {
    token: tokenUno,
    body: { nombre: 'Pendiente De Aprobacion', descripcion: 'Propuesto por un usuario, sin aprobar.', categoriaId, ubicacion: 'Calle 2 #3-4' }
});
const pendienteId = pendiente.cuerpo.datos.id;

const platoDeAprobado = await pedir('POST', `/restaurantes/${pendienteId}/platos`, {
    token: tokenAdmin, body: { nombre: 'Plato de un pendiente', precio: 1000 }
});
verificar('los platos de un restaurante pendiente no son públicos',
    (await pedir('GET', `/restaurantes/${pendienteId}/platos`)).status === 404);
verificar('las reseñas de un restaurante pendiente no son públicas',
    (await pedir('GET', `/restaurantes/${pendienteId}/resenas`)).status === 404);
verificar('el detalle de un plato de un restaurante pendiente no es público',
    (await pedir('GET', `/platos/${platoDeAprobado.cuerpo.datos.id}`)).status === 404);

const platoPendiente = await pedir('POST', `/restaurantes/${pendienteId}/platos`, {
    token: tokenUno, body: { nombre: 'Plato propuesto por usuario', precio: 2000 }
});
verificar('un plato propuesto queda pendiente', platoPendiente.cuerpo.datos.aprobado === false);
verificar('un plato pendiente no es público',
    (await pedir('GET', `/platos/${platoPendiente.cuerpo.datos.id}`)).status === 404);
verificar('quien lo propuso sí ve su plato pendiente',
    (await pedir('GET', `/platos/${platoPendiente.cuerpo.datos.id}`, { token: tokenUno })).status === 200);
verificar('el admin ve el plato pendiente',
    (await pedir('GET', `/platos/${platoPendiente.cuerpo.datos.id}`, { token: tokenAdmin })).status === 200);
verificar('quien lo propuso ve su restaurante pendiente',
    (await pedir('GET', `/restaurantes/${pendienteId}`, { token: tokenUno })).status === 200);
verificar('un tercero no ve el restaurante pendiente',
    (await pedir('GET', `/restaurantes/${pendienteId}`, { token: tokenDos })).status === 404);

await pedir('PATCH', `/restaurantes/${pendienteId}/aprobar`, { token: tokenAdmin });
verificar('aprobado el restaurante, sus platos ya son públicos',
    (await pedir('GET', `/restaurantes/${pendienteId}/platos`)).status === 200);
verificar('el plato aprobado ya es público',
    (await pedir('GET', `/platos/${platoDeAprobado.cuerpo.datos.id}`)).status === 200);
verificar('el plato que sigue pendiente no aparece en el listado público',
    !(await pedir('GET', `/restaurantes/${pendienteId}/platos`)).cuerpo.datos.some((p) => p.nombre === 'Plato propuesto por usuario'));

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
