// CRUD genérico sobre el driver oficial. Todos los métodos aceptan una session
// opcional para poder ejecutarse dentro de una transacción.
import { ObjectId } from 'mongodb';

export default class BaseRepository {
    #coleccion;

    constructor(db, nombre) {
        this.#coleccion = db.collection(nombre);
    }

    // Las subclases la usan para sus consultas propias y agregaciones
    get coleccion() {
        return this.#coleccion;
    }

    // Devuelve null si el id no es válido, en lugar de lanzar BSONError
    static aObjectId(id) {
        if (id instanceof ObjectId) return id;
        return ObjectId.isValid(id) ? new ObjectId(id) : null;
    }

    async findAll(filtro = {}, { pagina = 1, limite = 0, orden = { creadoEn: -1 }, session } = {}) {
        const cursor = this.#coleccion.find(filtro, { session }).sort(orden);
        if (limite > 0) cursor.skip((pagina - 1) * limite).limit(limite);
        return await cursor.toArray();
    }

    async findById(id, { session } = {}) {
        const _id = BaseRepository.aObjectId(id);
        if (!_id) return null;
        return await this.#coleccion.findOne({ _id }, { session });
    }

    async findOne(filtro, { session } = {}) {
        return await this.#coleccion.findOne(filtro, { session });
    }

    async create(documento, { session } = {}) {
        const resultado = await this.#coleccion.insertOne(documento, { session });
        return { _id: resultado.insertedId, ...documento };
    }

    async update(id, datos, { session } = {}) {
        const _id = BaseRepository.aObjectId(id);
        if (!_id) return null;
        return await this.#coleccion.findOneAndUpdate(
            { _id },
            { $set: datos },
            { session, returnDocument: 'after' }
        );
    }

    async delete(id, { session } = {}) {
        const _id = BaseRepository.aObjectId(id);
        if (!_id) return false;
        const { deletedCount } = await this.#coleccion.deleteOne({ _id }, { session });
        return deletedCount === 1;
    }

    // countDocuments y no estimatedDocumentCount: este sí funciona en transacciones
    async count(filtro = {}, { session } = {}) {
        return await this.#coleccion.countDocuments(filtro, { session });
    }
}
