// ============ PREGUNTAS ============
// answer = índice de la opción correcta dentro de options (las opciones se barajan al jugar)
// time = segundos para responder
// Dentro de cada bloque van de más fácil a más difícil

const SQL_TABLE = {
  name: 'empleados',
  columns: ['id', 'nombre', 'depto', 'salario'],
  rows: [
    [1, 'Ana', 'IT', 3000],
    [2, 'Luis', 'IT', null],
    [3, 'Eva', 'Ventas', 2500],
    [4, 'Juan', null, 2000]
  ]
};

const SECTIONS = {
  sql:    { label: 'SQL',              short: 'SQL',    desc: 'Consultas trampa: mira la tabla y adivina qué devuelve.' },
  ml:     { label: 'Machine Learning', short: 'ML',     desc: 'Árboles de decisión y conceptos clave.' },
  python: { label: 'Python',           short: 'Python', desc: 'Código corto, salida con truco: ¿qué imprime?' }
};

const QUESTIONS = [
  // ---------- SQL ----------
  {
    section: 'sql', time: 25, table: true,
    prompt: '¿Qué devuelve esta consulta?',
    code: 'SELECT COUNT(*), COUNT(salario)\nFROM empleados;',
    options: ['4 | 3', '4 | 4', '3 | 3', '3 | 4'],
    answer: 0,
    explain: 'COUNT(*) cuenta filas; COUNT(columna) ignora los NULL.'
  },
  {
    section: 'sql', time: 25, table: true,
    prompt: '¿Qué devuelve esta consulta?',
    code: 'SELECT AVG(salario)\nFROM empleados;',
    options: ['2500', '1875', 'NULL', '7500'],
    answer: 0,
    explain: 'AVG ignora los NULL: (3000 + 2500 + 2000) / 3 = 2500, no / 4.'
  },
  {
    section: 'sql', time: 25, table: true,
    prompt: '¿Qué devuelve esta consulta?',
    code: "SELECT nombre\nFROM empleados\nWHERE salario = NULL;",
    options: ['0 filas', 'Luis', 'Error de sintaxis', 'Las 4 filas'],
    answer: 0,
    explain: 'Comparar con NULL usando = da UNKNOWN, nunca TRUE. Hay que usar IS NULL.'
  },
  {
    section: 'sql', time: 25, table: true,
    prompt: '¿Cuántas filas devuelve?',
    code: 'SELECT depto, COUNT(*)\nFROM empleados\nGROUP BY depto;',
    options: ['3', '2', '4', 'Error'],
    answer: 0,
    explain: 'GROUP BY trata todos los NULL como un grupo más: IT, Ventas y NULL.'
  },
  {
    section: 'sql', time: 25, table: true,
    prompt: '¿Qué devuelve esta consulta?',
    code: "SELECT COUNT(*)\nFROM empleados\nWHERE depto <> 'IT';",
    options: ['1', '2', '3', '0'],
    answer: 0,
    explain: "NULL <> 'IT' es UNKNOWN, así que Juan se queda fuera. Solo cuenta Eva."
  },

  // ---------- MACHINE LEARNING ----------
  {
    section: 'ml', time: 20,
    prompt: 'Quieres predecir el precio de venta de una casa a partir de sus metros, zona y número de habitaciones. ¿Qué tipo de problema es?',
    options: ['Regresión', 'Clasificación', 'Clustering', 'Reducción de dimensionalidad'],
    answer: 0,
    explain: 'El precio es un número continuo, así que es regresión. Si predijeras "cara / barata" sería clasificación.'
  },
  {
    section: 'ml', time: 20,
    prompt: 'Entrenas un árbol de decisión sin limitar max_depth: 100% de accuracy en train y 68% en test. ¿Qué está pasando?',
    options: ['Overfitting', 'Underfitting', 'Falta escalar las variables', 'El test está mal etiquetado'],
    answer: 0,
    explain: 'Sin límite de profundidad el árbol memoriza el train. Se controla con max_depth, min_samples_leaf o poda.'
  },
  {
    section: 'ml', time: 20,
    prompt: 'El 99% de las transacciones son legítimas. Tu modelo predice siempre "legítima" y saca un 99% de accuracy. ¿Cuál es su recall en la clase fraude?',
    options: ['0%', '99%', '1%', '50%'],
    answer: 0,
    explain: 'No detecta ni un fraude: recall = TP / (TP + FN) = 0. Con clases desbalanceadas, la accuracy engaña.'
  },
  {
    section: 'ml', time: 20,
    prompt: 'Escalas todo el dataset con la media y la desviación de todos los datos, y después separas train y test. ¿Qué problema hay?',
    options: ['Data leakage', 'Underfitting', 'Multicolinealidad', 'Ninguno'],
    answer: 0,
    explain: 'El test ha influido en el escalado, así que su información se cuela en el entrenamiento. Primero se separa y el scaler se ajusta solo con train.'
  },
  {
    section: 'ml', time: 20,
    prompt: 'Un Random Forest suele mejorar a un único árbol porque, sobre todo, reduce…',
    options: ['La varianza', 'El sesgo', 'El número de features', 'El ruido de los datos'],
    answer: 0,
    explain: 'Promediar muchos árboles decorrelados (bagging + features aleatorias) baja la varianza.'
  },

  // ---------- PYTHON ----------
  {
    section: 'python', time: 25,
    prompt: '¿Qué imprime?',
    code: 'print([x**2 for x in range(5) if x % 2])',
    options: ['[1, 9]', '[0, 4, 16]', '[1, 4, 9]', '[0, 1, 4, 9, 16]'],
    answer: 0,
    explain: 'x % 2 es truthy solo para los impares (1 y 3), y sus cuadrados son 1 y 9.'
  },
  {
    section: 'python', time: 25,
    prompt: '¿Qué imprime?',
    code: 's = sorted("data")\nprint("".join(s[::-1]))',
    options: ['tdaa', 'atad', 'aadt', 'data'],
    answer: 0,
    explain: 'sorted("data") → ["a", "a", "d", "t"]; [::-1] le da la vuelta → "tdaa".'
  },
  {
    section: 'python', time: 25,
    prompt: '¿Qué imprime?',
    code: 'print(list(zip(*[[1, 2], [3, 4]])))',
    options: ['[(1, 3), (2, 4)]', '[(1, 2), (3, 4)]', '[1, 2, 3, 4]', 'Error'],
    answer: 0,
    explain: 'El * desempaqueta las dos listas y zip las empareja: es una transposición.'
  },
  {
    section: 'python', time: 25,
    prompt: '¿Qué imprime?',
    code: 'm = [[0] * 2] * 2\nm[0][0] = 1\nprint(m)',
    options: ['[[1, 0], [1, 0]]', '[[1, 0], [0, 0]]', '[[1, 1], [0, 0]]', 'Error'],
    answer: 0,
    explain: '* 2 copia la referencia: las dos filas son la misma lista.'
  },
  {
    section: 'python', time: 25,
    prompt: '¿Qué imprime?',
    code: 'def f(x, l=[]):\n    l.append(x)\n    return l\n\nf(1)\nprint(f(2))',
    options: ['[1, 2]', '[2]', '[1]', 'Error'],
    answer: 0,
    explain: 'El valor por defecto [] se crea una sola vez y se comparte entre llamadas.'
  }
];
