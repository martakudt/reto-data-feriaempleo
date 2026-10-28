<img src="icon.svg" width="64" alt="Logo de QUANTIA">

# Reto Data · QUANTIA

Juego para el stand de QUANTIA en la **Feria de Empleo de EDEM (martes 3 de noviembre)**. La gente escanea un QR, se registra y responde 15 preguntas rápidas de opción múltiple en tres rondas. Al acabar sale en un ranking en directo.

| Ronda | Preguntas | Tiempo por pregunta |
|---|---|---|
| SQL: consultas trampa sobre una tabla con `NULL` | 5 | 20 s |
| Machine Learning: árboles de decisión y conceptos clave | 5 | 15 s |
| Python: ¿qué imprime? | 5 | 20 s |

El máximo es 4:35 si se agota el tiempo en todas las preguntas. Lo normal es acabar en 2 o 3 minutos.

**Puntuación:** 100 puntos por acierto y hasta 50 más según lo rápido que se responda (máximo 2250). Si hay empate, gana quien haya tardado menos. Cada email solo puede jugar una vez.

## Pantallas

| URL | Para qué |
|---|---|
| `/` | El juego, para el móvil de cada participante |
| `/#ranking` | Ranking en directo (top 20) |
| `/#pantalla` | Para la pantalla o el portátil del stand: QR grande y top 10 en directo |
| `/admin.html` | Lista de participantes con email y LinkedIn, y descarga en CSV (solo la admin) |

## Estructura

```
├── index.html       # Vistas: portada, registro, preguntas, resultado, ranking y pantalla del stand
├── app.js           # Lógica del juego, puntuación, ranking y guardado
├── questions.js     # Las 15 preguntas (aquí se editan)
├── config.js        # Configuración de Firebase
├── styles.css       # Estilos con los tokens del Brand & Style Guide de QUANTIA
├── admin.html       # Exportación de contactos
├── firestore.rules  # Reglas de seguridad de Firestore
└── icon.svg         # Icono de la pestaña
```

HTML, CSS y JavaScript sin framework ni build, como app-gym.

## Modelo de datos (Firestore)

```
leaderboard/{id}   público: lo lee cualquiera
  name, score, correct, timeMs, createdAt

contacts/{id}      privado: solo lo lee la admin
  name, email, linkedin, score, correct, timeMs, consent, createdAt
```

`id` es un hash SHA-256 del email, así que el email nunca aparece en la colección pública. Los dos documentos se escriben en un único batch, y las reglas no permiten sobrescribirlos, que es lo que limita cada email a un intento.

## Puesta en marcha

### 1. Firebase

1. Crea un proyecto nuevo en la [consola de Firebase](https://console.firebase.google.com/).
2. Crea una base de datos **Cloud Firestore** (en la región `europe-southwest1`, Madrid, o en `eur3`).
3. Registra una **app web** y copia su configuración en [config.js](config.js).
4. Activa **Authentication → Email/Password** y crea a mano tu usuario admin en **Authentication → Users**. Copia su **UID**.
5. Pega [firestore.rules](firestore.rules) en **Firestore → Reglas**, sustituye `PON_AQUI_TU_UID` por ese UID y publícalas.
6. En **Authentication → Settings → Authorized domains**, añade `martakudt.github.io`.

Si dejas `config.js` vacío, la app funciona en **modo demo**: todo se guarda en el `localStorage` del navegador y aparece un aviso naranja abajo. Sirve para probarla sin Firebase.

### 2. En local

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

### 3. Publicar en GitHub Pages

1. Sube el repo a GitHub (`martakudt/app-edem-feriaempleo`).
2. Ve a **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. La URL será `https://martakudt.github.io/app-edem-feriaempleo/`.

### 4. El día de la feria

- Abre `https://martakudt.github.io/app-edem-feriaempleo/#pantalla` en el portátil o la pantalla del stand. El QR se genera solo con la URL de la página.
- Para un QR impreso, haz una captura de esa pantalla o genera uno con la misma URL.
- Al terminar, entra en `admin.html` y descarga el CSV. Usa `;` como separador para que Excel lo abra bien en español.

## Editar preguntas

Las preguntas están en [questions.js](questions.js). La opción correcta es la que indica `answer` (por defecto la primera). Las opciones se barajan para cada jugador, así que da igual en qué orden se escriban. Si cambias el número de preguntas, actualiza los límites de `score` (máximo 150 × nº de preguntas) y de `correct` en [firestore.rules](firestore.rules).

## Seguridad y privacidad

- La `apiKey` de Firebase no es un secreto. Lo que protege los datos son las reglas de Firestore.
- El ranking público solo muestra el nombre. El email y el LinkedIn únicamente se pueden leer con la cuenta admin.
- El registro incluye una casilla de consentimiento obligatoria. Después de la feria conviene borrar los contactos que no se vayan a usar.
- La puntuación se calcula en el navegador, así que alguien con conocimientos podría enviar una puntuación falsa (las reglas limitan los valores al rango válido). Para una feria es suficiente. Si alguien hace trampas, se borra su entrada desde la consola.
