import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import env from './env.js';
import UsuarioRepository from '../repositories/usuario.repository.js';

// El token se lee de la cabecera Authorization: Bearer <token>. El sub del
// payload se resuelve contra la base, así un usuario eliminado pierde el acceso
// aunque su token siga sin expirar.
const configurarPassport = (db) => {
    const usuarioRepo = new UsuarioRepository(db);

    const opciones = {
        secretOrKey: env.jwtSecret,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
    };

    passport.use(new Strategy(opciones, async (payload, done) => {
        try {
            const usuario = await usuarioRepo.findById(payload.sub);
            if (!usuario) return done(null, false);

            delete usuario.password;
            done(null, usuario);
        }
        catch (error) {
            done(error, false);
        }
    }));

    return passport;
};

export default configurarPassport;
