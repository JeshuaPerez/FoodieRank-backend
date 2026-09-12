import swaggerUi from 'swagger-ui-express';
import env from './env.js';

// Respuesta estándar de la API: todas devuelven status, mensaje y datos
const respuesta = (descripcion, datos = { type: 'object' }) => ({
    description: descripcion,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'ok' },
                    mensaje: { type: 'string' },
                    datos
                }
            }
        }
    }
});

const error = (descripcion, mensaje) => ({
    description: descripcion,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'fail' },
                    mensaje: { type: 'string', example: mensaje },
                    datos: { type: 'array', nullable: true, items: { type: 'object' } }
                }
            }
        }
    }
});

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const lista = (nombre) => ({ type: 'array', items: ref(nombre) });

const parametroId = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    example: '66e2a1b4c8d9e0f1a2b3c4d5'
};

const documento = {
    openapi: '3.0.3',
    info: {
        title: 'FoodieRank API',
        version: env.version,
        description: [
            'API para registrar, calificar y rankear restaurantes y platos.',
            '',
            'Autenticación: envía el token en la cabecera `Authorization: Bearer <token>`.',
            'Versionado: opcionalmente manda `x-version` con la versión semver que espera el cliente.',
            'Las operaciones de reseñas y reacciones se ejecutan dentro de transacciones de MongoDB.'
        ].join('\n')
    },
    servers: [{ url: '/api', description: 'Servidor actual' }],
    tags: [
        { name: 'Sistema', description: 'Estado y versión del API' },
        { name: 'Autenticación', description: 'Registro, login y perfil' },
        { name: 'Categorías', description: 'Gestión de categorías (escritura solo admin)' },
        { name: 'Restaurantes', description: 'Listado, detalle y gestión de restaurantes' },
        { name: 'Platos', description: 'Platos de cada restaurante' },
        { name: 'Reseñas', description: 'Reseñas, calificaciones y reacciones' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        schemas: {
            Usuario: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: '66e2a1b4c8d9e0f1a2b3c4d5' },
                    nombre: { type: 'string', example: 'Jeshua Perez' },
                    email: { type: 'string', example: 'jeshua@foodierank.com' },
                    rol: { type: 'string', enum: ['usuario', 'admin'], example: 'usuario' },
                    creadoEn: { type: 'string', format: 'date-time' }
                }
            },
            Sesion: {
                type: 'object',
                properties: {
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    usuario: ref('Usuario')
                }
            },
            Categoria: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string', example: 'Comida rápida' },
                    descripcion: { type: 'string', example: 'Hamburguesas, pizzas y alitas' },
                    creadoEn: { type: 'string', format: 'date-time' }
                }
            },
            Restaurante: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string', example: 'La Parrilla del Norte' },
                    descripcion: { type: 'string' },
                    categoriaId: { type: 'string' },
                    categoria: { type: 'string', nullable: true, example: 'Gourmet' },
                    ubicacion: { type: 'string', example: 'Calle 10 #45-30, Bogotá' },
                    imagen: { type: 'string', nullable: true, example: 'https://ejemplo.com/foto.jpg' },
                    aprobado: { type: 'boolean', example: true },
                    rankingPonderado: { type: 'number', example: 4.3128 },
                    totalResenas: { type: 'integer', example: 12 },
                    promedioCalificacion: { type: 'number', example: 4.42 },
                    creadoEn: { type: 'string', format: 'date-time' }
                }
            },
            Plato: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string', example: 'Bandeja paisa' },
                    descripcion: { type: 'string' },
                    precio: { type: 'number', example: 38000 },
                    restauranteId: { type: 'string' },
                    imagen: { type: 'string', nullable: true },
                    aprobado: { type: 'boolean' },
                    creadoEn: { type: 'string', format: 'date-time' }
                }
            },
            Resena: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    usuarioId: { type: 'string' },
                    autor: { type: 'string', nullable: true, example: 'Juan Lema' },
                    restauranteId: { type: 'string' },
                    comentario: { type: 'string', example: 'La atención fue excelente y el plato llegó caliente.' },
                    calificacion: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                    likes: { type: 'integer', example: 7 },
                    dislikes: { type: 'integer', example: 1 },
                    miReaccion: {
                        type: 'string',
                        nullable: true,
                        enum: ['like', 'dislike', null],
                        description: 'Reacción del usuario autenticado. Solo llega si la petición incluye token.'
                    },
                    creadoEn: { type: 'string', format: 'date-time' },
                    editadoEn: { type: 'string', format: 'date-time', nullable: true }
                }
            },
            RestauranteDetalle: {
                allOf: [
                    ref('Restaurante'),
                    {
                        type: 'object',
                        properties: {
                            platos: lista('Plato'),
                            resenas: lista('Resena')
                        }
                    }
                ]
            },
            Paginado: {
                type: 'object',
                properties: {
                    datos: lista('Restaurante'),
                    total: { type: 'integer', example: 37 },
                    pagina: { type: 'integer', example: 1 },
                    limite: { type: 'integer', example: 10 },
                    totalPaginas: { type: 'integer', example: 4 }
                }
            }
        }
    },
    paths: {
        '/health': {
            get: {
                tags: ['Sistema'],
                summary: 'Estado del servicio y versión del API',
                parameters: [{
                    name: 'v',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    example: '1.0.0',
                    description: 'Versión del cliente. Si se envía, la respuesta indica si es compatible.'
                }],
                responses: { 200: respuesta('API operativa') }
            }
        },
        '/auth/registro': {
            post: {
                tags: ['Autenticación'],
                summary: 'Registrar un usuario',
                description: 'El rol siempre es "usuario": no se acepta el campo rol desde el cliente.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['nombre', 'email', 'password'],
                                properties: {
                                    nombre: { type: 'string', example: 'Jeshua Perez' },
                                    email: { type: 'string', example: 'jeshua@foodierank.com' },
                                    password: { type: 'string', example: 'Secreta123' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: respuesta('Usuario registrado', ref('Sesion')),
                    400: error('Datos inválidos', 'Datos inválidos.'),
                    409: error('Email ya registrado', 'El email ya está registrado.'),
                    429: error('Demasiados intentos', 'Demasiados intentos de autenticación. Espera unos minutos.')
                }
            }
        },
        '/auth/login': {
            post: {
                tags: ['Autenticación'],
                summary: 'Iniciar sesión',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', example: 'admin@foodierank.com' },
                                    password: { type: 'string', example: 'Admin123*' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: respuesta('Sesión iniciada', ref('Sesion')),
                    401: error('Credenciales inválidas. No se indica qué campo falló', 'Credenciales inválidas.'),
                    429: error('Demasiados intentos', 'Demasiados intentos de autenticación. Espera unos minutos.')
                }
            }
        },
        '/auth/perfil': {
            get: {
                tags: ['Autenticación'],
                summary: 'Datos del usuario autenticado',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: respuesta('Perfil obtenido', ref('Usuario')),
                    401: error('Sin token o token inválido', 'No autenticado. Envía el token en la cabecera Authorization.')
                }
            }
        },
        '/categorias': {
            get: {
                tags: ['Categorías'],
                summary: 'Listar categorías (público)',
                responses: { 200: respuesta('Categorías obtenidas', lista('Categoria')) }
            },
            post: {
                tags: ['Categorías'],
                summary: 'Crear categoría (admin)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['nombre'],
                                properties: {
                                    nombre: { type: 'string', example: 'Vegetariano' },
                                    descripcion: { type: 'string', example: 'Cocina sin carne' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: respuesta('Categoría creada', ref('Categoria')),
                    400: error('Datos inválidos', 'Datos inválidos.'),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    409: error('Nombre duplicado', 'Ya existe una categoría con ese nombre.')
                }
            }
        },
        '/categorias/{id}': {
            get: {
                tags: ['Categorías'],
                summary: 'Obtener una categoría (público)',
                parameters: [parametroId],
                responses: {
                    200: respuesta('Categoría obtenida', ref('Categoria')),
                    404: error('No existe', 'Categoría no encontrada.')
                }
            },
            put: {
                tags: ['Categorías'],
                summary: 'Actualizar categoría (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    nombre: { type: 'string', example: 'Vegano' },
                                    descripcion: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: respuesta('Categoría actualizada', ref('Categoria')),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Categoría no encontrada.'),
                    409: error('Nombre duplicado', 'Ya existe una categoría con ese nombre.')
                }
            },
            delete: {
                tags: ['Categorías'],
                summary: 'Eliminar categoría (admin)',
                description: 'No se puede eliminar si tiene restaurantes asociados.',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                responses: {
                    204: { description: 'Categoría eliminada' },
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Categoría no encontrada.'),
                    409: error('Categoría en uso', 'La categoría tiene 3 restaurante(s) asociado(s) y no se puede eliminar.')
                }
            }
        },
        '/restaurantes': {
            get: {
                tags: ['Restaurantes'],
                summary: 'Listar restaurantes (público)',
                description: 'Devuelve solo los aprobados. Con token de admin devuelve todos y acepta el filtro aprobado.',
                parameters: [
                    { name: 'busqueda', in: 'query', schema: { type: 'string' }, example: 'parrilla' },
                    { name: 'categoria', in: 'query', schema: { type: 'string' }, description: 'Id de la categoría' },
                    { name: 'orden', in: 'query', schema: { type: 'string', enum: ['ranking', 'popularidad', 'recientes'] } },
                    { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                    { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
                    { name: 'aprobado', in: 'query', schema: { type: 'boolean' }, description: 'Solo lo aplica un admin' }
                ],
                responses: {
                    200: respuesta('Restaurantes obtenidos', ref('Paginado')),
                    400: error('Parámetros inválidos', 'Datos inválidos.')
                }
            },
            post: {
                tags: ['Restaurantes'],
                summary: 'Registrar restaurante (usuario autenticado)',
                description: 'Un usuario lo deja pendiente de aprobación; un admin lo crea ya aprobado.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['nombre', 'descripcion', 'categoriaId', 'ubicacion'],
                                properties: {
                                    nombre: { type: 'string', example: 'La Parrilla del Norte' },
                                    descripcion: { type: 'string', example: 'Carnes a la brasa con corte argentino.' },
                                    categoriaId: { type: 'string', example: '66e2a1b4c8d9e0f1a2b3c4d5' },
                                    ubicacion: { type: 'string', example: 'Calle 10 #45-30, Bogotá' },
                                    imagen: { type: 'string', example: 'https://ejemplo.com/parrilla.jpg' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: respuesta('Restaurante creado', ref('Restaurante')),
                    400: error('Datos inválidos', 'Datos inválidos.'),
                    401: error('Sin token', 'No autenticado. Envía el token en la cabecera Authorization.'),
                    404: error('Categoría inexistente', 'La categoría indicada no existe.'),
                    409: error('Nombre duplicado', 'Ya existe un restaurante con ese nombre.')
                }
            }
        },
        '/restaurantes/{id}': {
            get: {
                tags: ['Restaurantes'],
                summary: 'Detalle con platos y reseñas (público)',
                description: 'Si la petición lleva token, cada reseña incluye miReaccion.',
                parameters: [parametroId],
                responses: {
                    200: respuesta('Restaurante obtenido', ref('RestauranteDetalle')),
                    404: error('No existe', 'Restaurante no encontrado.')
                }
            },
            put: {
                tags: ['Restaurantes'],
                summary: 'Actualizar restaurante (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: ref('Restaurante') } }
                },
                responses: {
                    200: respuesta('Restaurante actualizado', ref('Restaurante')),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Restaurante no encontrado.'),
                    409: error('Nombre duplicado', 'Ya existe un restaurante con ese nombre.')
                }
            },
            delete: {
                tags: ['Restaurantes'],
                summary: 'Eliminar restaurante (admin)',
                description: 'Arrastra en una transacción sus platos, reseñas y reacciones.',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                responses: {
                    204: { description: 'Restaurante eliminado' },
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Restaurante no encontrado.')
                }
            }
        },
        '/restaurantes/{id}/aprobar': {
            patch: {
                tags: ['Restaurantes'],
                summary: 'Aprobar o retirar aprobación (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { aprobado: { type: 'boolean', default: true } }
                            }
                        }
                    }
                },
                responses: {
                    200: respuesta('Restaurante aprobado', ref('Restaurante')),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Restaurante no encontrado.')
                }
            }
        },
        '/restaurantes/{id}/platos': {
            get: {
                tags: ['Platos'],
                summary: 'Platos de un restaurante (público)',
                parameters: [parametroId],
                responses: {
                    200: respuesta('Platos obtenidos', lista('Plato')),
                    404: error('No existe', 'Restaurante no encontrado.')
                }
            },
            post: {
                tags: ['Platos'],
                summary: 'Registrar plato en un restaurante (usuario autenticado)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['nombre', 'precio'],
                                properties: {
                                    nombre: { type: 'string', example: 'Bandeja paisa' },
                                    descripcion: { type: 'string', example: 'Con chicharrón, chorizo y arepa.' },
                                    precio: { type: 'number', example: 38000 },
                                    imagen: { type: 'string', example: 'https://ejemplo.com/bandeja.jpg' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: respuesta('Plato creado', ref('Plato')),
                    400: error('Datos inválidos', 'Datos inválidos.'),
                    404: error('Restaurante inexistente', 'Restaurante no encontrado.'),
                    409: error('Nombre duplicado en el restaurante', 'Ya existe un plato con ese nombre en este restaurante.')
                }
            }
        },
        '/restaurantes/{id}/resenas': {
            get: {
                tags: ['Reseñas'],
                summary: 'Reseñas de un restaurante (público)',
                parameters: [parametroId],
                responses: {
                    200: respuesta('Reseñas obtenidas', lista('Resena')),
                    404: error('No existe', 'Restaurante no encontrado.')
                }
            }
        },
        '/platos/{id}': {
            get: {
                tags: ['Platos'],
                summary: 'Obtener un plato (público)',
                parameters: [parametroId],
                responses: {
                    200: respuesta('Plato obtenido', ref('Plato')),
                    404: error('No existe', 'Plato no encontrado.')
                }
            },
            put: {
                tags: ['Platos'],
                summary: 'Actualizar plato (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: { required: true, content: { 'application/json': { schema: ref('Plato') } } },
                responses: {
                    200: respuesta('Plato actualizado', ref('Plato')),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Plato no encontrado.'),
                    409: error('Nombre duplicado', 'Ya existe un plato con ese nombre en este restaurante.')
                }
            },
            delete: {
                tags: ['Platos'],
                summary: 'Eliminar plato (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                responses: {
                    204: { description: 'Plato eliminado' },
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Plato no encontrado.')
                }
            }
        },
        '/platos/{id}/aprobar': {
            patch: {
                tags: ['Platos'],
                summary: 'Aprobar o retirar aprobación de un plato (admin)',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: { type: 'object', properties: { aprobado: { type: 'boolean', default: true } } }
                        }
                    }
                },
                responses: {
                    200: respuesta('Plato aprobado', ref('Plato')),
                    403: error('Sin permisos', 'Se requieren permisos de administrador.'),
                    404: error('No existe', 'Plato no encontrado.')
                }
            }
        },
        '/resenas': {
            post: {
                tags: ['Reseñas'],
                summary: 'Publicar una reseña (usuario autenticado)',
                description: 'Transaccional: inserta la reseña y recalcula el ranking del restaurante. Una sola reseña por usuario y restaurante.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['restauranteId', 'comentario', 'calificacion'],
                                properties: {
                                    restauranteId: { type: 'string', example: '66e2a1b4c8d9e0f1a2b3c4d5' },
                                    comentario: { type: 'string', example: 'El mejor corte de carne que he probado.' },
                                    calificacion: { type: 'integer', minimum: 1, maximum: 5, example: 5 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: respuesta('Reseña publicada', ref('Resena')),
                    400: error('Datos inválidos', 'Datos inválidos.'),
                    401: error('Sin token', 'No autenticado. Envía el token en la cabecera Authorization.'),
                    404: error('Restaurante inexistente', 'Restaurante no encontrado.'),
                    409: error('Reseña duplicada', 'Ya has reseñado este restaurante.')
                }
            }
        },
        '/resenas/{id}': {
            put: {
                tags: ['Reseñas'],
                summary: 'Editar mi reseña (solo el autor)',
                description: 'Transaccional: actualiza la reseña y recalcula el ranking.',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    comentario: { type: 'string' },
                                    calificacion: { type: 'integer', minimum: 1, maximum: 5 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: respuesta('Reseña actualizada', ref('Resena')),
                    403: error('Reseña de otro usuario', 'Solo el autor puede editar su reseña.'),
                    404: error('No existe', 'Reseña no encontrada.')
                }
            },
            delete: {
                tags: ['Reseñas'],
                summary: 'Eliminar reseña (autor o administrador)',
                description: 'Transaccional: borra la reseña con sus reacciones y recalcula el ranking. Si un admin borra una reseña ajena queda registro en la bitácora de moderación.',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                responses: {
                    204: { description: 'Reseña eliminada' },
                    403: error('Sin permiso', 'No tienes permiso para eliminar esta reseña.'),
                    404: error('No existe', 'Reseña no encontrada.')
                }
            }
        },
        '/resenas/{id}/reaccion': {
            post: {
                tags: ['Reseñas'],
                summary: 'Dar like o dislike a una reseña',
                description: 'Transaccional. Una sola reacción activa por usuario: repetir el mismo tipo la quita, enviar el otro la cambia. No se puede reaccionar a la propia reseña.',
                security: [{ bearerAuth: [] }],
                parameters: [parametroId],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['tipo'],
                                properties: { tipo: { type: 'string', enum: ['like', 'dislike'] } }
                            }
                        }
                    }
                },
                responses: {
                    200: respuesta('Reacción registrada', ref('Resena')),
                    403: error('Reseña propia', 'No puedes reaccionar a tu propia reseña.'),
                    404: error('No existe', 'Reseña no encontrada.')
                }
            }
        }
    }
};

const montarSwagger = (app) => {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(documento, {
        customSiteTitle: `FoodieRank API v${env.version}`
    }));

    // El JSON crudo sirve para importar la especificación en Postman
    app.get('/api/docs.json', (req, res) => res.json(documento));
};

export { documento };
export default montarSwagger;
