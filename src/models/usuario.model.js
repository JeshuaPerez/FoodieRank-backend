// Forma del documento de usuario y qué campos salen hacia el cliente.
import { normalizar } from '../utils/texto.js';

const ROLES = ['usuario', 'admin'];

// El rol nunca se toma del body: el registro público siempre crea "usuario"
const nuevoUsuario = ({ nombre, email, password }, rol = 'usuario') => ({
    nombre: nombre.trim(),
    email: normalizar(email),
    password,
    rol: ROLES.includes(rol) ? rol : 'usuario',
    creadoEn: new Date()
});

// La contraseña jamás se expone
const usuarioPublico = (usuario) => usuario && ({
    id: usuario._id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    creadoEn: usuario.creadoEn
});

export { ROLES, nuevoUsuario, usuarioPublico };
