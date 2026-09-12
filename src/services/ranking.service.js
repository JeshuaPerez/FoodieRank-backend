// Ranking ponderado: combina calificación, likes/dislikes y fecha de la reseña.
// La fórmula completa está explicada en el README.

const M_SUAVIZADO = 5;        // reseñas "promedio" que pesan frente a las reales
const DIAS_VIDA_MEDIA = 30;   // a los 30 días la frescura de una reseña cae a ~37%
const PESO_MINIMO = 0.2;      // piso: sin él, muchos dislikes darían peso negativo
const CALIFICACION_NEUTRA = 3;

export default class RankingService {
    #resenaRepo;
    #restauranteRepo;

    constructor(resenaRepo, restauranteRepo) {
        this.#resenaRepo = resenaRepo;
        this.#restauranteRepo = restauranteRepo;
    }

    // Una reseña útil y reciente pesa más. El logaritmo evita que 100 likes
    // valgan 100 veces más que 1.
    #peso(resena, ahora) {
        const utilidad = 1 + Math.log10(1 + resena.likes) - Math.log10(1 + resena.dislikes);
        const dias = (ahora - new Date(resena.creadoEn).getTime()) / 86400000;
        const frescura = Math.exp(-dias / DIAS_VIDA_MEDIA);
        return Math.max(PESO_MINIMO, utilidad) * (0.5 + 0.5 * frescura);
    }

    // Se llama en cada alta, edición, baja o reacción, dentro de la transacción
    async recalcular(restauranteId, { session } = {}) {
        const resenas = await this.#resenaRepo.findAll({ restauranteId }, { session });

        const metricas = { totalResenas: resenas.length, promedioCalificacion: 0, rankingPonderado: 0 };

        if (resenas.length) {
            const ahora = Date.now();
            let sumaPesos = 0;
            let sumaPonderada = 0;
            let sumaCalificaciones = 0;

            for (const resena of resenas) {
                const peso = this.#peso(resena, ahora);
                sumaPesos += peso;
                sumaPonderada += resena.calificacion * peso;
                sumaCalificaciones += resena.calificacion;
            }

            // Promedio bayesiano: un restaurante con una sola reseña de 5 estrellas
            // no debe superar a otro con cincuenta de 4.5
            const puntuacion = sumaPonderada / sumaPesos;
            const promedioSistema = (await this.#resenaRepo.promedioGlobal({ session })) || CALIFICACION_NEUTRA;
            const n = resenas.length;

            metricas.promedioCalificacion = sumaCalificaciones / n;
            metricas.rankingPonderado = (n * puntuacion + M_SUAVIZADO * promedioSistema) / (n + M_SUAVIZADO);
        }

        await this.#restauranteRepo.update(restauranteId, metricas, { session });
        return metricas;
    }
}
