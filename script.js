const piezasContainer = document.getElementById("piezas");
const tablero = document.getElementById("tablero");
const total = 6;
const columnas = 3;
const filas = 2;

let piezas = [];
let piezaSeleccionada = null;

// Detectar base path para GitHub Pages
// En GitHub Pages: /repo-name/ → basePath = '/repo-name'
// En local: / → basePath = ''
let basePath = window.location.pathname;
if (basePath.endsWith('/')) {
  basePath = basePath.slice(0, -1);
}
// Si está en raíz (localhost o dominio), basePath es ''
if (basePath === '') {
  basePath = '';
}
console.log('basePath detectado:', basePath);

// Lista de animales (se intentará cargar desde un manifiesto); si falla, se usa peppa.png
let animalesList = [];
let lastAnimalIndex = -1;
let currentAnimalIndex = -1;
let currentImgUrl = "peppa.png";
let currentAnimalName = "Peppa";
// Índices de animales ya completados (no se deben repetir)
const usedAnimalIndices = new Set();

// Botón Siguiente nivel (se muestra al completar)
const siguienteBtn = document.createElement("button");
siguienteBtn.id = "siguiente-nivel";
siguienteBtn.textContent = "Siguiente nivel";
siguienteBtn.style.display = "none";
siguienteBtn.style.position = "fixed";
siguienteBtn.style.right = "20px";
siguienteBtn.style.bottom = "20px";
siguienteBtn.style.zIndex = 9999;
document.body.appendChild(siguienteBtn);

// Crear slots (zona de piezas y tablero) una sola vez
for (let i = 0; i < total; i++) {
  const slot = document.createElement("div");
  slot.classList.add("slot", "slot-piezas");
  slot.dataset.pos = `pieza-${i}`;
  piezasContainer.appendChild(slot);
}

for (let i = 0; i < total; i++) {
  const slot = document.createElement("div");
  slot.classList.add("slot", "slot-tablero");
  slot.dataset.pos = i;
  tablero.appendChild(slot);
}

const slotsPiezas = document.querySelectorAll(".slot-piezas");

// Cargar listado de animales desde un manifiesto JSON si existe
async function cargarListaAnimales() {
  const posibles = [
    `${basePath}/Animales/manifest.json`,
    `${basePath}/animales/manifest.json`,
    "Animales/manifest.json",
    "animales/manifest.json"
  ];
  console.log('Intentando cargar manifest desde:', posibles);
  
  for (const url of posibles) {
    try {
      console.log('Probando:', url);
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`No encontrado: ${url} (${res.status})`);
        continue;
      }
      const data = await res.json();
      console.log('Manifest cargado desde:', url, data);
      if (Array.isArray(data) && data.length) {
        // Ajustar rutas con basePath si es necesario
        animalesList = data.map(p => {
          if (p.startsWith('http')) return p; // URL absoluta
          // Si basePath existe y la ruta no lo incluye, añadirlo
          if (basePath && !p.startsWith(basePath) && !p.startsWith('/')) {
            return basePath + '/' + p;
          }
          return p;
        });
        console.log('animalesList procesada:', animalesList);
        return;
      }
    } catch (e) {
      console.log(`Error cargando ${url}:`, e.message);
    }
  }
  // Fallback simple
  console.log('Usando fallback: peppa.png');
  animalesList = ["peppa.png"];
}

function extraerNombreAnimal(ruta) {
  const partes = ruta.split("/");
  const nombreArchivo = partes[partes.length - 1];
  return nombreArchivo.replace(/\.[^.]+$/,"").replace(/[-_]/g, ' ');
}

function elegirAnimalAleatorio() {
  if (!animalesList.length) return 0;
  // construir lista de opciones excluyendo ya usados
  const opciones = [];
  for (let i = 0; i < animalesList.length; i++) {
    if (!usedAnimalIndices.has(i)) opciones.push(i);
  }
  if (opciones.length === 0) {
    return -1; // ya no hay animales disponibles
  }

  let idx;
  do {
    idx = opciones[Math.floor(Math.random() * opciones.length)];
  } while (idx === lastAnimalIndex && opciones.length > 1);
  lastAnimalIndex = idx;
  return idx;
}

function setAnimalByIndex(idx) {
  currentAnimalIndex = idx;
  currentImgUrl = animalesList[idx];
  currentAnimalName = extraerNombreAnimal(currentImgUrl);
}

// 🎯 Eventos de arrastrar
document.addEventListener("dragstart", e => {
  if (e.target.classList.contains("pieza")) {
    piezaSeleccionada = e.target;
    setTimeout(() => (e.target.style.visibility = "hidden"), 0);
  }
});

document.addEventListener("dragend", e => {
  if (e.target.classList.contains("pieza")) {
    e.target.style.visibility = "visible";
  }
});

document.querySelectorAll(".slot").forEach(slot => {
  slot.addEventListener("dragover", e => {
    e.preventDefault();
    slot.classList.add("over");
  });

  slot.addEventListener("dragleave", () => {
    slot.classList.remove("over");
  });

  slot.addEventListener("drop", e => {
    e.preventDefault();
    slot.classList.remove("over");

    const piezaOcupante = slot.querySelector(".pieza");

    // Permitir intercambio
    if (piezaOcupante) {
      const slotOrigen = piezaSeleccionada.parentNode;
      slotOrigen.appendChild(piezaOcupante);
    }

    slot.appendChild(piezaSeleccionada);

    verificarVictoria();
  });
});

// ✅ Verificar si el rompecabezas está completo
function verificarVictoria() {
  const slots = document.querySelectorAll(".slot-tablero");
  const completo = Array.from(slots).every(slot => {
    const pieza = slot.querySelector(".pieza");
    return pieza && pieza.dataset.pos == slot.dataset.pos;
  });

  if (completo) {
    mostrarFelicitacion(currentAnimalName);
  }
}

// Generar piezas para la imagen actual
function generarPiezas() {
  piezas = [];

  // obtener tamaño actual de celda (responsivo)
  const sampleSlot = slotsPiezas[0];
  const rect = sampleSlot.getBoundingClientRect();
  const piezaAncho = Math.round(rect.width) || 150;
  const piezaAlto = Math.round(rect.height) || 150;
  const bgWidth = piezaAncho * columnas;
  const bgHeight = piezaAlto * filas;

  for (let i = 0; i < total; i++) {
    const pieza = document.createElement("div");
    pieza.classList.add("pieza");
    pieza.draggable = true;

    const col = i % columnas;
    const row = Math.floor(i / columnas);

    pieza.style.backgroundImage = `url(${currentImgUrl})`;
    pieza.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    pieza.style.backgroundPosition = `${-col * piezaAncho}px ${-row * piezaAlto}px`;
    pieza.dataset.pos = i;

    // Handlers táctiles (touch)
    pieza.addEventListener('touchstart', function (ev) {
      ev.preventDefault();
      const t = ev.touches[0];
      piezaSeleccionada = pieza;
      pieza._origParent = pieza.parentNode;
      const r = pieza.getBoundingClientRect();
      pieza._offsetX = t.clientX - r.left;
      pieza._offsetY = t.clientY - r.top;
      pieza.classList.add('dragging-touch');
      pieza.style.position = 'fixed';
      pieza.style.left = r.left + 'px';
      pieza.style.top = r.top + 'px';
      pieza.style.width = piezaAncho + 'px';
      pieza.style.height = piezaAlto + 'px';
      pieza.style.zIndex = 9999;
    }, { passive: false });

    pieza.addEventListener('touchmove', function (ev) {
      if (!piezaSeleccionada) return;
      ev.preventDefault();
      const t = ev.touches[0];
      pieza.style.left = (t.clientX - pieza._offsetX) + 'px';
      pieza.style.top = (t.clientY - pieza._offsetY) + 'px';
    }, { passive: false });

    pieza.addEventListener('touchend', function (ev) {
      if (!piezaSeleccionada) return;
      ev.preventDefault();
      const t = ev.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const slot = el ? el.closest('.slot') : null;

      if (slot) {
        const piezaOcupante = slot.querySelector('.pieza');
        if (piezaOcupante) {
          pieza._origParent.appendChild(piezaOcupante);
        }
        slot.appendChild(pieza);
      } else {
        // devolver a su contenedor original
        pieza._origParent.appendChild(pieza);
      }

      // limpiar estilos temporales
      pieza.style.position = '';
      pieza.style.left = '';
      pieza.style.top = '';
      pieza.style.width = '';
      pieza.style.height = '';
      pieza.style.zIndex = '';
      pieza.classList.remove('dragging-touch');
      piezaSeleccionada = null;
      verificarVictoria();
    }, { passive: false });

    piezas.push(pieza);
  }

  // Mezclar y colocarlas en la zona de piezas
  piezas.sort(() => Math.random() - 0.5);
  slotsPiezas.forEach(slot => (slot.innerHTML = ""));
  piezas.forEach((pieza, i) => slotsPiezas[i].appendChild(pieza));
}

// 🔁 Reiniciar/arrancar juego con la imagen actual
function reiniciarJuego() {
  // Ocultar botón de siguiente mientras juega
  siguienteBtn.style.display = "none";

  // Limpiar tablero y generar piezas nuevas
  document.querySelectorAll(".slot-tablero").forEach(slot => (slot.innerHTML = ""));
  generarPiezas();
}


function mostrarFelicitacion(animalName) {
  const mensaje = document.createElement("div");
  mensaje.className = "felicitacion";
  mensaje.innerHTML = `🎉 ¡Felicidades! descubriste "<strong>${animalName}</strong>"`;
  document.body.appendChild(mensaje);

  generarConfeti(60);
  generarGlobos(12);

  // Mostrar botón Siguiente nivel
  siguienteBtn.style.display = "block";

  // Marcar el animal actual como completado para no repetirlo
  if (currentAnimalIndex >= 0) usedAnimalIndices.add(currentAnimalIndex);

  setTimeout(() => {
    mensaje.remove();
  }, 2500);
}

// Manejar click en Siguiente nivel
siguienteBtn.addEventListener("click", () => {
  const idx = elegirAnimalAleatorio();
  if (idx === -1) {
    // No quedan animales: mostrar mensaje final y ocultar botón
    mostrarFinalTodos();
    siguienteBtn.style.display = "none";
    return;
  }
  setAnimalByIndex(idx);
  reiniciarJuego();
});

function mostrarFinalTodos() {
  const msg = document.createElement('div');
  msg.className = 'felicitacion-final';
  msg.innerHTML = `🎉 ¡Felicitaciones! Completaste todos los animales disponibles.`;
  document.body.appendChild(msg);
  generarConfeti(100);
  setTimeout(() => msg.remove(), 4000);
}

// 🎊 Confeti cayendo
function generarConfeti(cantidad) {
  for (let i = 0; i < cantidad; i++) {
    const confeti = document.createElement("div");
    confeti.classList.add("confeti");
    confeti.style.left = Math.random() * 100 + "vw";
    confeti.style.top = Math.random() * -20 + "px";
    confeti.style.setProperty("--hue", Math.random() * 360);
    document.body.appendChild(confeti);
    setTimeout(() => confeti.remove(), 3000);
  }
}

// 🎈 Globos subiendo
function generarGlobos(cantidad) {
  for (let i = 0; i < cantidad; i++) {
    const globo = document.createElement("div");
    globo.classList.add("globo");
    globo.style.left = Math.random() * 100 + "vw";
    globo.style.bottom = "-60px";
    globo.style.setProperty("--hue", Math.random() * 360);
    document.body.appendChild(globo);
    setTimeout(() => globo.remove(), 3000);
  }
}

// Inicialización: cargar lista de animales y arrancar juego
window.addEventListener('DOMContentLoaded', async () => {
  await cargarListaAnimales();
  const idx = elegirAnimalAleatorio();
  setAnimalByIndex(idx);
  reiniciarJuego();
});
