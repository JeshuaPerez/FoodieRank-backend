// Datos de arranque: crea el administrador (el registro público solo crea
// usuarios, así que el admin tiene que nacer aquí) más categorías, restaurantes,
// platos y reseñas de ejemplo para poder probar el API y el frontend.
// Uso: npm run seed         -> inserta lo que falte
//      npm run seed -- --reset  -> borra las colecciones y las vuelve a crear
import { hashSync } from 'bcrypt';
import env from '../src/config/env.js';
import Database from '../src/config/db.js';
import crearIndices from '../src/config/indexes.js';
import Usuario from '../src/models/usuario.model.js';
import Categoria from '../src/models/categoria.model.js';
import Restaurante from '../src/models/restaurante.model.js';
import Plato from '../src/models/plato.model.js';
import Resena from '../src/models/resena.model.js';
import Reaccion from '../src/models/reaccion.model.js';
import UsuarioRepository from '../src/repositories/usuario.repository.js';
import CategoriaRepository from '../src/repositories/categoria.repository.js';
import RestauranteRepository from '../src/repositories/restaurante.repository.js';
import PlatoRepository from '../src/repositories/plato.repository.js';
import ResenaRepository from '../src/repositories/resena.repository.js';
import ReaccionRepository from '../src/repositories/reaccion.repository.js';
import RankingService from '../src/services/ranking.service.js';

const COLECCIONES = ['usuarios', 'categorias', 'restaurantes', 'platos', 'resenas', 'reacciones', 'moderaciones'];

const CATEGORIAS = [
    { nombre: 'Comida rápida', descripcion: 'Hamburguesas, pizzas, alitas y antojos para llevar.' },
    { nombre: 'Gourmet', descripcion: 'Cocina de autor y cortes finos.' },
    { nombre: 'Vegetariano', descripcion: 'Platos sin carne, con opciones veganas.' },
    { nombre: 'Sushi', descripcion: 'Cocina japonesa y rollos fríos o calientes.' }
];

const RESTAURANTES = [
    {
        nombre: 'La Parrilla del Norte',
        categoria: 'Gourmet',
        descripcion: 'Cortes madurados a la brasa con guarniciones de temporada y carta de vinos.',
        ubicacion: 'Calle 10 #45-30, Bogotá',
        imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947',
        platos: [
            { nombre: 'Bife de chorizo', descripcion: 'Corte de 350g con chimichurri de la casa.', precio: 62000 },
            { nombre: 'Provoleta a la parrilla', descripcion: 'Queso provolone con orégano y aceite de oliva.', precio: 28000 }
        ]
    },
    {
        nombre: 'Burger House',
        categoria: 'Comida rápida',
        descripcion: 'Hamburguesas artesanales de carne 100% res molida en el local, con pan brioche.',
        ubicacion: 'Carrera 7 #120-15, Bogotá',
        imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        platos: [
            { nombre: 'Doble tocineta', descripcion: 'Dos carnes, queso cheddar y tocineta crocante.', precio: 32000 },
            { nombre: 'Papas con queso', descripcion: 'Papas rústicas con queso fundido y cebolla.', precio: 14000 }
        ]
    },
    {
        nombre: 'Verde Raíz',
        categoria: 'Vegetariano',
        descripcion: 'Cocina vegetariana de mercado, con menú que cambia cada semana según la cosecha.',
        ubicacion: 'Calle 85 #12-40, Bogotá',
        imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        platos: [
            { nombre: 'Bowl de quinua', descripcion: 'Quinua, aguacate, garbanzo tostado y vinagreta de limón.', precio: 26000 },
            { nombre: 'Hamburguesa de lenteja', descripcion: 'Con pan integral y alioli vegano.', precio: 24000 }
        ]
    },
    {
        nombre: 'Sakura Sushi Bar',
        categoria: 'Sushi',
        descripcion: 'Barra de sushi con pescado fresco del día y rollos calientes preparados al momento.',
        ubicacion: 'Avenida 19 #104-20, Bogotá',
        imagen: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
        platos: [
            { nombre: 'Roll tempura de camarón', descripcion: 'Camarón tempura, aguacate y salsa de anguila.', precio: 38000 },
            { nombre: 'Sashimi de salmón', descripcion: 'Ocho cortes de salmón fresco.', precio: 42000 }
        ]
    },
    {
        nombre: 'Pizzería Don Vito',
        categoria: 'Comida rápida',
        descripcion: 'Pizza napolitana de masa madre horneada en horno de leña a 450 grados.',
        ubicacion: 'Calle 53 #27-11, Bogotá',
        imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
        platos: [
            { nombre: 'Margarita', descripcion: 'Tomate San Marzano, mozzarella fior di latte y albahaca.', precio: 34000 },
            { nombre: 'Diavola', descripcion: 'Salami picante y aceite de chile.', precio: 39000 }
        ]
    }
];

const USUARIOS = [
    { nombre: 'Juan Lema', email: 'juan@foodierank.com', password: 'Usuario123' },
    { nombre: 'Camila Rojas', email: 'camila@foodierank.com', password: 'Usuario123' },
    { nombre: 'Andrés Mejía', email: 'andres@foodierank.com', password: 'Usuario123' }
];

// [restaurante, autor, calificación, comentario, días de antigüedad]
const RESENAS = [
    ['La Parrilla del Norte', 'juan@foodierank.com', 5, 'El bife llegó en su punto exacto y la atención fue impecable.', 2],
    ['La Parrilla del Norte', 'camila@foodierank.com', 4, 'Muy buena carne, aunque la espera en hora pico es larga.', 10],
    ['La Parrilla del Norte', 'andres@foodierank.com', 5, 'La provoleta justifica sola la visita. Volveré con la familia.', 25],
    ['Burger House', 'juan@foodierank.com', 4, 'La doble tocineta es enorme y el pan no se deshace. Buen precio.', 5],
    ['Burger House', 'camila@foodierank.com', 3, 'Rica la hamburguesa pero las papas llegaron frías.', 18],
    ['Verde Raíz', 'camila@foodierank.com', 5, 'Por fin un sitio vegetariano donde el plato llena de verdad.', 1],
    ['Verde Raíz', 'andres@foodierank.com', 4, 'El bowl de quinua es fresco y bien servido. Buena relación precio valor.', 8],
    ['Sakura Sushi Bar', 'andres@foodierank.com', 5, 'El sashimi estaba fresquísimo y el arroz en su punto.', 3],
    ['Pizzería Don Vito', 'juan@foodierank.com', 2, 'La masa estaba cruda en el centro y tardaron 50 minutos.', 30]
];

// [restaurante, autor de la reseña, quien reacciona, tipo]
const REACCIONES = [
    ['La Parrilla del Norte', 'juan@foodierank.com', 'camila@foodierank.com', 'like'],
    ['La Parrilla del Norte', 'juan@foodierank.com', 'andres@foodierank.com', 'like'],
    ['La Parrilla del Norte', 'camila@foodierank.com', 'juan@foodierank.com', 'like'],
    ['Burger House', 'camila@foodierank.com', 'juan@foodierank.com', 'dislike'],
    ['Verde Raíz', 'camila@foodierank.com', 'andres@foodierank.com', 'like'],
    ['Sakura Sushi Bar', 'andres@foodierank.com', 'juan@foodierank.com', 'like'],
    ['Pizzería Don Vito', 'juan@foodierank.com', 'camila@foodierank.com', 'dislike']
];

const hace = (dias) => new Date(Date.now() - dias * 86400000);

const sembrar = async () => {
    const reset = process.argv.includes('--reset');
    const baseDeDatos = Database.obtenerInstancia();
    const db = await baseDeDatos.conectar();

    if (reset) {
        for (const nombre of COLECCIONES) {
            await db.collection(nombre).deleteMany({});
        }
        console.log('|--> Colecciones vaciadas (--reset).');
    }

    await crearIndices(db);

    const usuarioRepo = new UsuarioRepository(db);
    const categoriaRepo = new CategoriaRepository(db);
    const restauranteRepo = new RestauranteRepository(db);
    const platoRepo = new PlatoRepository(db);
    const resenaRepo = new ResenaRepository(db);
    const reaccionRepo = new ReaccionRepository(db);
    const ranking = new RankingService(resenaRepo, restauranteRepo);

    // Administrador
    let admin = await usuarioRepo.findByEmail(env.admin.email);
    if (!admin) {
        admin = await usuarioRepo.create(Usuario.nuevo({
            nombre: env.admin.nombre,
            email: env.admin.email,
            password: hashSync(env.admin.password, env.bcryptRondas)
        }, 'admin').aDocumento());
        console.log(`|--> Administrador creado: ${env.admin.email}`);
    }
    else console.log(`|--> El administrador ${env.admin.email} ya existía.`);

    // Usuarios de prueba
    const usuarios = new Map();
    for (const datos of USUARIOS) {
        let usuario = await usuarioRepo.findByEmail(datos.email);
        if (!usuario) {
            usuario = await usuarioRepo.create(Usuario.nuevo({
                ...datos,
                password: hashSync(datos.password, env.bcryptRondas)
            }).aDocumento());
        }
        usuarios.set(datos.email, usuario);
    }
    console.log(`|--> ${usuarios.size} usuarios de prueba listos.`);

    // Categorías
    const categorias = new Map();
    for (const datos of CATEGORIAS) {
        const documento = Categoria.nueva(datos);
        let categoria = await categoriaRepo.findByNombre(documento.nombreNormalizado);
        if (!categoria) categoria = await categoriaRepo.create(documento.aDocumento());
        categorias.set(datos.nombre, categoria);
    }
    console.log(`|--> ${categorias.size} categorías listas.`);

    // Restaurantes y platos, creados por el admin y ya aprobados
    const restaurantes = new Map();
    for (const datos of RESTAURANTES) {
        const documento = Restaurante.nuevo(
            { ...datos, categoriaId: categorias.get(datos.categoria)._id },
            admin._id,
            true
        );

        let restaurante = await restauranteRepo.findByNombre(documento.nombreNormalizado);
        if (!restaurante) restaurante = await restauranteRepo.create(documento.aDocumento());
        restaurantes.set(datos.nombre, restaurante);

        for (const plato of datos.platos) {
            const platoDoc = Plato.nuevo(plato, restaurante._id, admin._id, true);
            const existe = await platoRepo.findByNombreEnRestaurante(restaurante._id, platoDoc.nombreNormalizado);
            if (!existe) await platoRepo.create(platoDoc.aDocumento());
        }
    }
    console.log(`|--> ${restaurantes.size} restaurantes con sus platos listos.`);

    // Reseñas con fechas repartidas, para que la frescura del ranking se note
    const resenas = new Map();
    for (const [nombreRestaurante, email, calificacion, comentario, dias] of RESENAS) {
        const restaurante = restaurantes.get(nombreRestaurante);
        const autor = usuarios.get(email);

        let resena = await resenaRepo.findByUsuarioYRestaurante(autor._id, restaurante._id);
        if (!resena) {
            resena = await resenaRepo.create({
                ...Resena.nueva({ comentario, calificacion }, autor._id, restaurante._id).aDocumento(),
                creadoEn: hace(dias)
            });
        }
        resenas.set(`${nombreRestaurante}|${email}`, resena);
    }
    console.log(`|--> ${resenas.size} reseñas listas.`);

    // Reacciones: se insertan y se ajustan los contadores de la reseña
    let totalReacciones = 0;
    for (const [nombreRestaurante, emailAutor, emailReacciona, tipo] of REACCIONES) {
        const resena = resenas.get(`${nombreRestaurante}|${emailAutor}`);
        const usuario = usuarios.get(emailReacciona);

        const existe = await reaccionRepo.findByUsuarioYResena(usuario._id, resena._id);
        if (existe) continue;

        await reaccionRepo.create(Reaccion.nueva({ tipo }, usuario._id, resena._id).aDocumento());
        await resenaRepo.incrementarContadores(resena._id, {
            likes: tipo === 'like' ? 1 : 0,
            dislikes: tipo === 'dislike' ? 1 : 0
        });
        totalReacciones += 1;
    }
    console.log(`|--> ${totalReacciones} reacciones insertadas.`);

    // Con las reseñas y reacciones ya puestas, se calcula el ranking de cada uno
    for (const restaurante of restaurantes.values()) {
        const metricas = await ranking.recalcular(restaurante._id);
        console.log(`     ${restaurante.nombre}: ranking ${metricas.rankingPonderado.toFixed(4)} (${metricas.totalResenas} reseñas)`);
    }

    console.log('\n|--> Seed completado.');
    console.log(`|--> Admin: ${env.admin.email} / ${env.admin.password}`);
    console.log('|--> Usuarios de prueba: juan@foodierank.com, camila@foodierank.com, andres@foodierank.com (contraseña Usuario123)');

    await baseDeDatos.cerrar();
};

sembrar().catch(async (error) => {
    console.error(`|--> Error en el seed: ${error.message}`);
    await Database.obtenerInstancia().cerrar().catch(() => {});
    process.exit(1);
});
