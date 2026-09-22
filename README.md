# FoodieRank — Backend

API RESTful para registrar, calificar y rankear restaurantes y platos. Los usuarios
se registran, proponen restaurantes, publican reseñas con calificación de 1 a 5
estrellas y reaccionan a las reseñas de otros; un administrador gestiona las
categorías y aprueba lo que se publica. El ranking de cada restaurante se calcula
combinando calificaciones, likes/dislikes y la fecha de cada reseña.

## Enlaces del proyecto

| Recurso | Enlace |
|---|---|
| Repositorio del frontend | https://github.com/JeshuaPerez/FoodieRank-frontend |
| Tablero Scrum (Notion) | https://app.notion.com/p/FoodieRank-Proyectos-y-tareas-94286faa23a082d5b5ed01729a74d2e4 |
| Documento PDF y video de la entrega (Drive) | https://drive.google.com/drive/folders/1kp9_M4b4lfy_-uac5aSIvqZ90IFGVwhp |

---

## Tecnologías

| Herramienta | Para qué |
|---|---|
| Node.js 24 + Express 5 | Servidor HTTP y enrutamiento |
| MongoDB 7 (driver oficial) | Persistencia. Sin mongoose |
| jsonwebtoken + passport-jwt | Autenticación por token |
| bcrypt | Hash de contraseñas |
| express-validator | Validación de entrada |
| express-rate-limit | Límite de peticiones |
| swagger-ui-express | Documentación interactiva |
| semver | Versionado del API |
| dotenv | Variables de entorno |
| cors | Acceso desde el frontend |
| mongodb-memory-server | Solo desarrollo: réplica en memoria para la prueba de humo |

---

## Instalación

```bash
git clone https://github.com/JeshuaPerez/FoodieRank-backend.git
cd FoodieRank-backend
npm install
cp .env.example .env     # y completar los valores
npm run seed             # crea el admin y datos de ejemplo
npm run dev
```

El servidor queda en `http://localhost:3000/api` y la documentación en
`http://localhost:3000/api/docs`.

> **La base de datos tiene que ser un replica set.** Las transacciones de MongoDB
> no funcionan contra un `mongod` suelto. El clúster M0 gratuito de Atlas ya es
> replica set, así que sirve tal cual; un MongoDB local instalado por defecto, no.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm start` | Servidor en modo normal |
| `npm run seed` | Inserta administrador, categorías, restaurantes, platos y reseñas de ejemplo |
| `npm run seed -- --reset` | Vacía las colecciones antes de sembrar |
| `npm run smoke` | Prueba de humo: levanta un MongoDB en memoria y recorre toda la API |
| `npm run check:frontend` | Pruebas de consumo desde el navegador: CORS, preflight, formularios, tokens vencidos y doble clic |

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `development` o `production` |
| `PORT` | Puerto del servidor (por defecto 3000) |
| `MONGODB_URI` | Cadena de conexión. **Obligatoria** |
| `DB_NAME` | Nombre de la base de datos. **Obligatoria** |
| `DB_SELECTION_TIMEOUT_MS` | Cuánto espera el driver antes de dar la conexión por perdida (10000 por defecto) |
| `JWT_SECRET` | Secreto para firmar los tokens. **Obligatoria** |
| `JWT_EXPIRES_IN` | Vigencia del token (`1d` por defecto) |
| `BCRYPT_ROUNDS` | Rondas de hash (12 por defecto) |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma |
| `RATE_LIMIT_WINDOW_MS` | Ventana del límite de peticiones en milisegundos |
| `RATE_LIMIT_MAX` | Peticiones permitidas por ventana en toda la API |
| `AUTH_RATE_LIMIT_MAX` | Peticiones permitidas por ventana en `/auth` |
| `ADMIN_NOMBRE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciales del administrador que crea el seed |

El archivo `.env` no se sube al repositorio; `.env.example` sí, sin valores reales.

---

## Estructura del proyecto

```
src/
├── config/          env, conexión, índices, passport y swagger
├── models/          clases entidad: forma del documento, factory y DTO de salida
├── repositories/    acceso a datos sobre el driver de MongoDB
├── services/        reglas de negocio y transacciones
├── controllers/     reciben req/res y delegan al servicio
├── routes/          endpoints con sus validadores
├── middlewares/     auth, errores, validación, rate limit y versión
├── utils/           jerarquía de errores, formato de respuesta, texto y transacciones
├── app.js           monta Express y los middlewares
└── server.js        conecta a Mongo, crea índices y abre el puerto
scripts/
├── seed.js          datos iniciales, incluido el administrador
└── smoke.js         prueba de extremo a extremo
```

---

## Arquitectura y patrones de diseño

La arquitectura es **MVC**, la que pide la guía: la ruta recibe la petición y
valida, el controlador traduce entre HTTP y el negocio, el servicio aplica las
reglas y el modelo define la forma de los datos. El controlador no sabe de
MongoDB y el repositorio no sabe de HTTP, así que una regla de negocio se cambia
en un solo archivo.

Sobre esa base hay cuatro patrones, a propósito. Cada uno resuelve un problema
concreto del proyecto; apilar más patrones solo habría hecho el código más
difícil de seguir y de explicar.

**Repository.** La carpeta `repositories/` aísla el driver de MongoDB del resto
del código. `BaseRepository` concentra el CRUD genérico —`findAll`, `findById`,
`findOne`, `create`, `update`, `delete`, `count`— y cada entidad hereda y añade
solo sus consultas propias: seis entidades sin repetir el mismo CRUD. Todos los
métodos aceptan una `session` opcional, que es lo que permite usarlos dentro de
una transacción. Es también la razón de que exista esta carpeta, que no está en
la lista de la guía: sin ella, cada servicio tendría el driver de MongoDB
incrustado.

**DTO.** Sin mongoose, cada archivo de `models/` es una **clase entidad**:
`Usuario`, `Categoria`, `Restaurante`, `Plato`, `Resena` y `Reaccion`. Cada una
define la forma del documento en su constructor y expone tres métodos:
`aDocumento()` devuelve lo que se guarda, `aPublico()` es el DTO de salida que
decide qué campos viajan al cliente, y las reglas propias de la entidad viven
como métodos —`esVisiblePara()`, `esAdmin()`, `esDe()`—. La contraseña no está
en ningún `aPublico()`.

**Factory.** Los métodos estáticos que construyen entidades ya normalizadas:
`Usuario.nuevo()`, `Restaurante.nuevo()`, `Resena.nueva()` y sus hermanos, más
`Entidad.desde(documento)`, que hidrata un documento de la base y devuelve
`null` si no hay documento. Del lado de la aplicación, las funciones que
construyen y devuelven algo ya configurado: `crearApp(db, client)` arma la
aplicación, `crearRutas(db, client)` arma la cadena completa de repositorios,
servicios y controladores, cada `crear*Router(controlador)` arma su router, y
`crearTransaccion(client)` devuelve la función que ejecuta algo dentro de una
transacción.

**Singleton.** `config/db.js` es la clase `Database` con una instancia estática
privada: el constructor devuelve siempre la misma, y `Database.obtenerInstancia()`
es el punto de acceso. Toda la aplicación comparte un único `MongoClient`, sin
volver a conectarse. `config/env.js` hace lo propio con el `.env`, que se lee una
sola vez al cargar el módulo.

### Además

**Una sola conexión, inyectada hacia abajo.** `server.js` abre la conexión y la
pasa: `crearApp(db, client)` → `crearRutas(db, client)` → repositorios →
servicios → controladores. Ningún módulo abre la suya ni la busca en un global,
y `app.js` se puede montar en pruebas sin levantar el puerto. `routes/index.js`
es el único archivo que instancia clases.

**Errores centralizados.** `utils/errores.js` define una jerarquía de clases
sobre `AppError`: `NoEncontradoError` (404), `ConflictoError` (409),
`SinPermisoError` (403), `NoAutenticadoError` (401), `DatosInvalidosError` (400)
y las demás. Cada clase fija su propio código HTTP, así que los servicios lanzan
el error por su nombre y no cargan números sueltos.

La clase `ManejadorDeErrores`, al final de la cadena de middlewares, traduce
cualquier error a respuesta HTTP. Primero convierte los errores ajenos —índice
único violado, cuerpo ilegible, caída del driver— en errores de la aplicación, y
después responde una sola vez. Lo que no reconoce es un fallo inesperado: se
registra en consola y al cliente le llega un 500 genérico, sin detalles
internos. Express 5 reenvía también los errores de los handlers `async`, así que
no hace falta `try/catch` en cada ruta.

**Validación en el borde.** `express-validator` corre en la definición de cada
ruta, antes del controlador, y un middleware convierte sus errores en un 400 con
la lista de campos que fallaron.

---

## Decisiones técnicas

**Quién puede crear qué.** Cualquier usuario autenticado puede proponer
restaurantes y platos, pero quedan con `aprobado: false` y no aparecen en los
listados públicos hasta que un administrador los aprueba. Cuando el que crea es
administrador, la entrada nace aprobada. Las categorías solo las gestiona un
administrador.

**El primer administrador nace en el seed.** El registro público fuerza el rol
`usuario` y nunca acepta el campo `rol` del cliente, así que el administrador
inicial lo crea `npm run seed` con las credenciales del `.env`.

**Una sola forma de respuesta.** Todas las respuestas tienen la misma envoltura,
en éxito y en error, para que el frontend lea siempre los mismos campos:

```json
{ "status": "ok", "mensaje": "Restaurantes obtenidos.", "datos": { } }
```

En los errores de validación, `datos` es la lista de campos que fallaron:

```json
{
  "status": "fail",
  "mensaje": "Datos inválidos.",
  "datos": [{ "campo": "calificacion", "mensaje": "La calificación debe ser un entero entre 1 y 5." }]
}
```

**Duplicados insensibles a mayúsculas y acentos.** Cada nombre se guarda también
normalizado —minúsculas, sin acentos y sin espacios de más— y sobre ese campo hay
un índice único. Así `"Café Central"` y `"cafe central"` son el mismo nombre, y
el duplicado lo rechaza la base de datos, no una consulta previa.

**Imágenes por URL.** El campo `imagen` es una cadena con la dirección de la
imagen. No hay subida de archivos: el frontend envía una URL.

**`miReaccion` con autenticación opcional.** El listado y el detalle de
restaurantes son públicos, pero si la petición lleva token cada reseña incluye
`miReaccion` (`like`, `dislike` o `null`) para que el frontend pinte el botón
activo. Eso lo permite un middleware `optionalAuth` que, a diferencia de
`requireAuth`, no responde 401 cuando no hay token.

**Transacciones.** Publicar, editar o borrar una reseña y reaccionar a una reseña
modifican varias colecciones a la vez, así que cada una corre dentro de
`session.withTransaction()`: si el recálculo del ranking falla, la reseña no
queda guardada. Borrar un restaurante arrastra en la misma transacción sus
platos, sus reseñas y las reacciones de esas reseñas.

**Moderación con registro.** Un administrador puede borrar la reseña de
cualquiera. Cuando lo hace, queda constancia en la colección `moderaciones` con
el autor original, el administrador responsable, el contenido y la fecha.

**Ante una caída de la base de datos.** El driver reintenta por su cuenta las
lecturas y escrituras que puede reintentar, y `withTransaction` repite la
transacción completa si el fallo es transitorio. Cuando la conexión de verdad no
está, la respuesta es **503** con un mensaje que lo dice, no un 500 genérico, y
`GET /api/health` hace un ping real a la base: si no responde, el endpoint
devuelve 503 y `conexion: "sin conexión"`. El límite de espera del driver está
en 10 segundos en lugar de los 30 por defecto, para que una caída falle rápido en
vez de dejar la petición colgada; el precio es que un cambio de primario que
tarde más de eso se vería como error en lugar de resolverse solo.

**Versionado semver.** La versión vive en `package.json` y es la única fuente de
verdad: se expone en `GET /api/health` y en Swagger. El cliente puede enviar la
cabecera `x-version` con la versión para la que fue construido; si no es
compatible con la del servidor, la respuesta es 409. `GET /api/health?v=1.0.0`
informa la compatibilidad sin fallar.

---

## Ranking ponderado

Combina los tres factores que pide el proyecto: calificación, utilidad
(likes/dislikes) y fecha de la reseña.

Por cada reseña *i*:

```
utilidad_i = máx(0.2,  1 + log10(1 + likes_i) − log10(1 + dislikes_i))
frescura_i = e^(−días_desde(creadoEn_i) / 30)
peso_i     = utilidad_i × (0.5 + 0.5 × frescura_i)
```

Del restaurante:

```
puntuación = Σ(calificación_i × peso_i) / Σ(peso_i)
n          = número de reseñas
C          = promedio de todas las calificaciones del sistema
m          = 5

rankingPonderado = (n × puntuación + m × C) / (n + m)
```

Por qué cada parte:

- **El logaritmo en la utilidad** evita que 100 likes pesen cien veces más que
  uno. Una reseña con muchos dislikes pesa menos, pero el piso de `0.2` impide
  que el peso llegue a cero o se vuelva negativo, lo que rompería el promedio.
- **La frescura** es un decaimiento exponencial: a los 30 días una reseña
  conserva cerca del 37 % de su frescura. Nunca anula el peso, solo lo reduce a
  la mitad en el límite.
- **El promedio bayesiano** del último paso es el que evita la trampa de un solo
  voto: un restaurante con una reseña de 5 estrellas no debe superar a otro con
  cincuenta de 4.5. Con `m = 5`, un restaurante necesita unas cinco reseñas para
  que su propia puntuación pese más que el promedio del sistema.

El valor se recalcula dentro de la misma transacción que lo provoca —alta,
edición o baja de reseña, y cada reacción— y se guarda en el restaurante junto a
`totalResenas` y `promedioCalificacion`, para que el listado pueda ordenar sin
recalcular nada.

---

## Endpoints

Base: `/api`. Los marcados con 🔒 exigen token; con 👤, rol administrador.

### Sistema
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado, versión y compatibilidad de versión del cliente |
| GET | `/docs` | Documentación Swagger |

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/registro` | Registro. Siempre crea rol `usuario` |
| POST | `/auth/login` | Devuelve `{ token, usuario }` |
| GET | `/auth/perfil` 🔒 | Datos del usuario del token |

### Categorías
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/categorias` | Listado público |
| GET | `/categorias/:id` | Detalle público |
| POST | `/categorias` 👤 | Crear |
| PUT | `/categorias/:id` 👤 | Actualizar |
| DELETE | `/categorias/:id` 👤 | Eliminar. 409 si tiene restaurantes |

### Restaurantes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/restaurantes` | Listado público con `busqueda`, `categoria`, `orden`, `pagina`, `limite` |
| GET | `/restaurantes/:id` | Detalle público con platos y reseñas |
| POST | `/restaurantes` 🔒 | Proponer. El admin lo crea aprobado |
| PUT | `/restaurantes/:id` 👤 | Actualizar |
| PATCH | `/restaurantes/:id/aprobar` 👤 | Aprobar o retirar aprobación |
| DELETE | `/restaurantes/:id` 👤 | Eliminar con sus platos y reseñas |

### Platos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/restaurantes/:id/platos` | Platos del restaurante |
| POST | `/restaurantes/:id/platos` 🔒 | Registrar plato |
| GET | `/platos/:id` | Detalle |
| PUT | `/platos/:id` 👤 | Actualizar |
| PATCH | `/platos/:id/aprobar` 👤 | Aprobar o retirar aprobación |
| DELETE | `/platos/:id` 👤 | Eliminar |

### Reseñas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/restaurantes/:id/resenas` | Reseñas del restaurante |
| POST | `/resenas` 🔒 | Publicar. Transaccional |
| PUT | `/resenas/:id` 🔒 | Editar. Solo el autor |
| DELETE | `/resenas/:id` 🔒 | Eliminar. Autor o administrador |
| POST | `/resenas/:id/reaccion` 🔒 | Like o dislike. Transaccional |

### Códigos de estado

`200` ok · `201` creado · `204` eliminado sin cuerpo · `400` datos inválidos ·
`401` sin token o token inválido · `403` sin permiso · `404` no existe ·
`409` duplicado o conflicto · `429` demasiadas peticiones · `500` error interno.

---

## Cómo probar

La forma más rápida es abrir `http://localhost:3000/api/docs` y usar el botón
*Try it out*. Para Postman, la especificación se importa desde
`http://localhost:3000/api/docs.json`.

Con `curl`, después de correr `npm run seed`:

```bash
# 1. Entrar como administrador
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foodierank.com","password":"Admin123*"}'
```

```bash
# 2. Listar restaurantes ordenados por ranking
curl "http://localhost:3000/api/restaurantes?orden=ranking&limite=5"
```

```bash
# 3. Registrar un usuario nuevo
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Nuevo Usuario","email":"nuevo@foodierank.com","password":"Secreta123"}'
```

```bash
# 4. Publicar una reseña (reemplazar TOKEN e ID_RESTAURANTE)
curl -X POST http://localhost:3000/api/resenas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"restauranteId":"ID_RESTAURANTE","comentario":"Muy buena atención y platos generosos.","calificacion":5}'
```

```bash
# 5. Dar like a una reseña de otro usuario
curl -X POST http://localhost:3000/api/resenas/ID_RESENA/reaccion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"tipo":"like"}'
```

El seed deja estas cuentas listas:

| Cuenta | Rol |
|---|---|
| `admin@foodierank.com` / `Admin123*` | admin |
| `juan@foodierank.com` / `Usuario123` | usuario |
| `camila@foodierank.com` / `Usuario123` | usuario |
| `andres@foodierank.com` / `Usuario123` | usuario |

---

## Notas para el consumo desde el frontend

- El token va en `Authorization: Bearer <token>`. La cabecera ya está permitida
  en la configuración de CORS.
- Los orígenes permitidos se declaran en `CORS_ORIGIN`, separados por coma. Las
  peticiones sin cabecera `Origin` (Postman, o un `index.html` abierto como
  archivo con doble clic) se aceptan; si se sirve el frontend con Live Server,
  hay que agregar `http://localhost:5500` y `http://127.0.0.1:5500`.
- Los mensajes de error vienen siempre en `mensaje`, y en los de validación la
  lista de campos viene en `datos`, lista para mostrarse junto a cada input.
- `GET /restaurantes/:id` con token devuelve `miReaccion` en cada reseña; sin
  token, `null`.
- **El cuerpo va como JSON o como formulario urlencoded, no como `FormData`.** Un
  `new FormData(formulario)` se envía como `multipart/form-data`, que la API no
  procesa, y la respuesta sería un 400 de campos faltantes. Las dos formas que
  sí funcionan:

```js
// JSON
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Formulario
fetch(url, { method: 'POST', body: new URLSearchParams(new FormData(formulario)) });
```

- El `Content-Type: application/json` no es opcional: sin él el cuerpo no se
  parsea y la validación responde 400.
- Un token vencido en `localStorage` no rompe las pantallas públicas: el listado
  y el detalle siguen respondiendo 200, solo llega `miReaccion: null`. En las
  rutas con sesión la respuesta es 401 y conviene limpiar el token y redirigir
  al login.
- Los campos numéricos pueden ir como texto (`"5"`, `"38000"`), que es lo que
  entrega un `input`. Un campo `imagen` vacío también se acepta y se guarda como
  `null`.
- **Los comentarios de las reseñas se devuelven tal como los escribió el usuario**,
  sin escapar: el backend no decide cómo se pintan. Al mostrarlos hay que usar
  `elemento.textContent = resena.comentario`, nunca `innerHTML`, o un comentario
  con HTML dentro se ejecuta en la página.
- Un **503** significa que la API está arriba pero sin base de datos. Conviene
  tratarlo distinto de un 500: reintentar en unos segundos en lugar de mostrar
  "error del servidor".
- Si el backend se despliega detrás de un proxy o túnel, hay que activar
  `app.set('trust proxy', 1)`; si no, el límite de peticiones cuenta a todos los
  visitantes como una sola IP.

---

## Créditos

Backend: **Jeshua Perez**, **Juan Lema**.
Proyecto académico — API de calificación y ranking de restaurantes.
