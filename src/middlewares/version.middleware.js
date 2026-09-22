import semver from 'semver';
import env from '../config/env.js';
import { DatosInvalidosError, VersionIncompatibleError } from '../utils/errores.js';

// El cliente puede declarar con qué versión del API fue construido mandando la
// cabecera x-version. Si no la manda, no se valida nada.
const verificarVersion = (req, res, next) => {
    const solicitada = req.headers['x-version'];
    if (!solicitada) return next();

    if (!semver.valid(solicitada)) {
        return next(new DatosInvalidosError(`La versión "${solicitada}" no tiene formato semver válido (ej: 1.0.0).`));
    }

    if (!semver.satisfies(env.version, `^${solicitada}`)) {
        return next(new VersionIncompatibleError(`La versión ${solicitada} del cliente no es compatible con la versión ${env.version} del API.`));
    }

    next();
};

export default verificarVersion;
