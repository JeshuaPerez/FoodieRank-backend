// Utilidad genérica para convertir un arreglo de objetos en texto CSV.
// No sabe nada de reseñas ni restaurantes: solo transforma filas en columnas,
// igual que texto.js no sabe qué entidad está normalizando.

const escaparCampo = (valor) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    // Se envuelve en comillas si el campo trae coma, comilla o salto de línea
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

// columnas: [{ titulo, valor: (fila) => contenidoDeLaCelda }]
const aCsv = (filas, columnas) => {
    const cabecera = columnas.map((columna) => columna.titulo).join(',');
    const lineas = filas.map((fila) =>
        columnas.map((columna) => escaparCampo(columna.valor(fila))).join(',')
    );

    // El BOM al inicio evita que Excel en Windows muestre mal los acentos
    // (por ejemplo "Calificación") al abrir el archivo directamente.
    return '﻿' + [cabecera, ...lineas].join('\r\n');
};

export { aCsv };
