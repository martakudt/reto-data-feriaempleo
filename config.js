// ============ FIREBASE CONFIG ============
// Configuración de la app web de Firebase (Configuración del proyecto → Tus apps).
// Si apiKey está vacía, la app funciona en modo demo y guarda todo en el localStorage del navegador.
const firebaseConfig = {
  apiKey: "AIzaSyBP7cvrEUk5TJFYeizqeNycXr_jphfhs40",
  authDomain: "reto-data-edem.firebaseapp.com",
  projectId: "reto-data-edem",
  storageBucket: "reto-data-edem.firebasestorage.app",
  messagingSenderId: "829395802803",
  appId: "1:829395802803:web:e558e3aff0f4be3d1f6ec6"
};

// Modo preview: si es true, solo la admin puede entrar (pide login) y firestore.rules bloquea al resto.
// El día de la feria: ponlo a false y cambia isOpen() a true en firestore.rules.
const PREVIEW = true;

// Opciones del registro. Si las cambias, cámbialas también en firestore.rules (validProfile).
const INTERESTS = ['Data Analyst', 'Data Science / ML', 'IA / LLMs', 'Data Engineering', 'Aún no lo sé'];
const STATUSES = ['Estudiando', 'Busco prácticas', 'Busco empleo', 'Trabajando'];
