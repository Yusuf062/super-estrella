"use strict";

// Primera parte: escenas básicas, entrada de teclado y físicas de plataformas.
// No usa módulos ni peticiones de red: funciona abriendo index.html directamente.
const canvas = document.querySelector("#juego");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const capas = {
  menu: document.querySelector("#menu"),
  pausa: document.querySelector("#pausa"),
  informacion: document.querySelector("#informacion"),
  ajustes: document.querySelector("#ajustes"),
};
const estadoTexto = document.querySelector("#estado");
const botonPausa = document.querySelector("#boton-pausa");
const mostrarControles = document.querySelector("#mostrar-controles");
const teclas = new Set();
const pulsaciones = new Set();

const FISICA = {
  gravedad: 420,
  velocidad: 62,
  salto: 170,
  paso: 1 / 120,
};

// Coordenadas del mundo lógico de 320 x 180 píxeles.
const plataformas = [
  { x: 0, y: 160, w: 320, h: 20 },
  { x: 70, y: 134, w: 48, h: 7 },
  { x: 148, y: 108, w: 45, h: 7 },
  { x: 226, y: 82, w: 48, h: 7 },
];

function crearJugador(nombre, x, color, izquierda, derecha, salto, archivo) {
  const imagen = new Image();
  imagen.src = archivo;
  return {
    nombre, inicioX: x, color, izquierda, derecha, salto, imagen,
    x, y: 136, w: 12, h: 24, vx: 0, vy: 0, enSuelo: false, direccion: 1,
  };
}

const jugadores = [
  crearJugador("Izan", 30, "#36d1dc", "KeyA", "KeyD", "KeyW", "img/personaje_1.png"),
  crearJugador("Gael", 50, "#ff9f43", "ArrowLeft", "ArrowRight", "ArrowUp", "img/personaje_2.png"),
];

let escena = "menu";
let tiempo = 0;
let acumulado = 0;
let anterior = 0;

function limpiarEntrada() {
  teclas.clear();
  pulsaciones.clear();
}

function cambiarEscena(nueva) {
  escena = nueva;
  limpiarEntrada();
  acumulado = 0;
  for (const [nombre, elemento] of Object.entries(capas)) {
    elemento.hidden = nombre !== nueva;
  }
  botonPausa.disabled = nueva !== "jugando";
}

function reiniciar() {
  tiempo = 0;
  for (const jugador of jugadores) {
    jugador.x = jugador.inicioX;
    jugador.y = 136;
    jugador.vx = 0;
    jugador.vy = 0;
    jugador.enSuelo = false;
    jugador.direccion = 1;
  }
}

function empezar() {
  reiniciar();
  cambiarEscena("jugando");
  estadoTexto.textContent = "Sala de entrenamiento: probad los saltos hasta la plataforma superior.";
  document.activeElement?.blur();
}

function pausar() {
  if (escena !== "jugando") return;
  cambiarEscena("pausa");
  estadoTexto.textContent = "Partida en pausa.";
}

function continuar() {
  cambiarEscena("jugando");
  estadoTexto.textContent = "Sala de entrenamiento: probad los saltos hasta la plataforma superior.";
  document.activeElement?.blur();
}

function mostrarInformacion(titulo, contenido) {
  document.querySelector("#titulo-informacion").textContent = titulo;
  document.querySelector("#texto-informacion").innerHTML = contenido;
  cambiarEscena("informacion");
  document.querySelector("#volver").focus();
}

let ultimoBotonMenu;
function abrirDesdeMenu(id, accion) {
  const boton = document.querySelector(id);
  boton.addEventListener("click", () => {
    ultimoBotonMenu = boton;
    accion();
  });
}

function volverAlMenu() {
  cambiarEscena("menu");
  estadoTexto.textContent = "Dos jugadores en el mismo teclado.";
  (ultimoBotonMenu || document.querySelector("#jugar")).focus();
}

document.querySelector("#jugar").addEventListener("click", empezar);
abrirDesdeMenu("#abrir-ajustes", () => {
  cambiarEscena("ajustes");
  mostrarControles.focus();
});
mostrarControles.addEventListener("change", () => {
  document.querySelector("#controles").hidden = !mostrarControles.checked;
});
document.querySelector("#volver-ajustes").addEventListener("click", volverAlMenu);
abrirDesdeMenu("#ayuda", () => mostrarInformacion("CÓMO JUGAR",
  '<p><strong class="cian">Izan:</strong> A y D para moverse; W para saltar.</p>' +
  '<p><strong class="naranja">Gael:</strong> flechas izquierda y derecha para moverse; flecha arriba para saltar.</p>' +
  '<p>Subid por las plataformas. Esc abre la pausa. El ratón permite utilizar los menús.</p>'));
abrirDesdeMenu("#creditos", () => mostrarInformacion("ÓRBITA TRES",
  '<img class="logo" src="img/logo.png" alt="Super Estrella"><p>Grupo J · Juegos en Red · URJC</p>' +
  '<p>José Antonio Najarro Camacho<br>Víctor Martín Monterrubio<br>Daniel Heredia Naranjo</p>' +
  '<p>Super Estrella · Código bajo licencia Apache 2.0.</p>'));
document.querySelector("#volver").addEventListener("click", volverAlMenu);
document.querySelector("#continuar").addEventListener("click", continuar);
document.querySelector("#reiniciar").addEventListener("click", empezar);
document.querySelector("#salir").addEventListener("click", volverAlMenu);
botonPausa.addEventListener("click", pausar);

const controles = new Set(["KeyA", "KeyD", "KeyW", "ArrowLeft", "ArrowRight", "ArrowUp", "Escape"]);
window.addEventListener("keydown", (evento) => {
  if (!controles.has(evento.code)) return;
  if (escena === "jugando" || escena === "pausa") evento.preventDefault();
  if (evento.code === "Escape" && !evento.repeat) {
    if (escena === "jugando") pausar();
    else if (escena === "pausa") continuar();
    else if (escena === "ajustes" || escena === "informacion") volverAlMenu();
    return;
  }
  if (escena !== "jugando") return;
  if (!teclas.has(evento.code)) pulsaciones.add(evento.code);
  teclas.add(evento.code);
});
window.addEventListener("keyup", (evento) => teclas.delete(evento.code));
window.addEventListener("blur", () => {
  limpiarEntrada();
  pausar();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    limpiarEntrada();
    pausar();
  }
});

function solapan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moverJugador(jugador, dt) {
  const sentido = Number(teclas.has(jugador.derecha)) - Number(teclas.has(jugador.izquierda));
  jugador.vx = sentido * FISICA.velocidad;
  if (sentido !== 0) jugador.direccion = sentido;
  if (pulsaciones.has(jugador.salto) && jugador.enSuelo) {
    jugador.vy = -FISICA.salto;
    jugador.enSuelo = false;
  }

  // Resolver cada eje por separado evita atravesar paredes y plataformas.
  jugador.x += jugador.vx * dt;
  jugador.x = Math.max(0, Math.min(canvas.width - jugador.w, jugador.x));
  for (const plataforma of plataformas) {
    if (!solapan(jugador, plataforma)) continue;
    if (jugador.vx > 0) jugador.x = plataforma.x - jugador.w;
    else if (jugador.vx < 0) jugador.x = plataforma.x + plataforma.w;
  }

  jugador.vy += FISICA.gravedad * dt;
  jugador.y += jugador.vy * dt;
  jugador.enSuelo = false;
  for (const plataforma of plataformas) {
    if (!solapan(jugador, plataforma)) continue;
    if (jugador.vy > 0) {
      jugador.y = plataforma.y - jugador.h;
      jugador.enSuelo = true;
    } else if (jugador.vy < 0) {
      jugador.y = plataforma.y + plataforma.h;
    }
    jugador.vy = 0;
  }
}

function actualizar(dt) {
  tiempo += dt;
  for (const jugador of jugadores) moverJugador(jugador, dt);
  pulsaciones.clear();
}

// Fuente pixelart: cada dígito hexadecimal codifica una fila de cuatro píxeles.
// Al dibujar sobre coordenadas enteras, no se amplían los bordes suavizados de fillText.
const LETRAS_PIXEL = {
  A: "699F999", E: "F88E88F", G: "788B997", I: "E44444E",
  L: "888888F", M: "9FF9999", N: "9DDBB99", O: "6999996",
  P: "E99E888", S: "788611E", T: "F444444", U: "9999996", Z: "F11248F",
  0: "6999996", 1: "4C4444E", 2: "691248F", 3: "E11611E",
  4: "99F1111", 5: "F88E11E", 6: "688E996", 7: "F112444",
  8: "6996996", 9: "6997116", ":": "0440440",
};
const ANCHO_LETRA = 4;
const PASO_LETRA = ANCHO_LETRA + 1;

function anchoTextoPixel(texto) {
  return texto.length * PASO_LETRA - 1;
}

function textoPixel(texto, x, y, color) {
  ctx.fillStyle = color;
  for (const letra of texto) {
    const filas = LETRAS_PIXEL[letra];
    if (filas) {
      for (let fila = 0; fila < filas.length; fila++) {
        const mascara = parseInt(filas[fila], 16);
        for (let columna = 0; columna < ANCHO_LETRA; columna++) {
          if (mascara & (8 >> columna)) ctx.fillRect(x + columna, y + fila, 1, 1);
        }
      }
    }
    x += PASO_LETRA;
  }
}

function dibujarJugador(jugador) {
  const x = Math.round(jugador.x);
  const y = Math.round(jugador.y);
  ctx.save();
  ctx.translate(x + jugador.w / 2, y - 8);
  ctx.scale(jugador.direccion, 1);
  if (jugador.imagen.complete && jugador.imagen.naturalWidth > 0) {
    ctx.drawImage(jugador.imagen, -16, 0, 32, 32);
  } else {
    ctx.fillStyle = jugador.color;
    ctx.fillRect(-6, 8, jugador.w, jugador.h);
  }
  ctx.restore();
}

function dibujarNombres() {
  const etiquetas = jugadores.map((jugador) => {
    const texto = jugador.nombre.toUpperCase();
    const w = anchoTextoPixel(texto);
    const x = Math.round(jugador.x + (jugador.w - w) / 2);
    const arriba = Math.round(jugador.y) - 17;
    return {
      texto, color: jugador.color, w: w + 1, h: 8,
      x: Math.max(2, Math.min(x, canvas.width - w - 2)),
      y: arriba >= 24 ? arriba : Math.round(jugador.y + jugador.h + 2),
    };
  });
  const [primera, segunda] = etiquetas;
  if (solapan(primera, segunda)) {
    segunda.y = primera.y >= 33 ? primera.y - 9 : primera.y + 9;
  }
  for (const {texto, color, x, y} of etiquetas) {
    textoPixel(texto, x + 1, y + 1, "#0b1026");
    textoPixel(texto, x, y, color);
  }
}

function bloque(color, x, y, ancho, alto) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, ancho, alto);
}

function dibujarNave() {
  bloque("#0b1026", 0, 0, 320, 180);
  bloque("#182139", 0, 27, 320, 135);

  // Placas atornilladas, juntas oscuras y luces de la nave del boceto.
  for (let y = 43; y < 160; y += 30) {
    for (let x = 0; x < 320; x += 40) {
      bloque("#28334d", x + 1, y, 38, 28);
      bloque("#34415b", x + 2, y + 1, 36, 1);
      bloque("#202b42", x + 2, y + 26, 36, 1);
      bloque("#465570", x + 4, y + 4, 2, 2);
      bloque("#182139", x + 34, y + 23, 2, 2);
    }
  }
  bloque("#28334d", 0, 25, 320, 13);
  bloque("#475570", 0, 25, 320, 2);
  bloque("#11182c", 0, 36, 320, 5);
  for (const x of [18, 93, 168, 243]) {
    bloque("#141c30", x, 28, 58, 8);
    bloque("#718198", x + 3, 30, 52, 3);
    bloque("#d1e4ed", x + 6, 30, 46, 1);
  }

  for (const {x, y, w, h} of plataformas) {
    bloque("#3a465e", x, y, w, h);
    bloque("#8290a4", x, y, w, 2);
    bloque("#202a3f", x, y + h - 2, w, 2);
    for (let junta = x + 16; junta < x + w; junta += 16) {
      bloque("#28334d", junta, y + 2, 1, h - 4);
    }
  }
}

function dibujarHUD() {
  bloque("#0b1026", 0, 0, 320, 23);
  bloque("#28334d", 0, 22, 320, 1);
  const minutos = String(Math.floor(tiempo / 60)).padStart(2, "0");
  const segundos = String(Math.floor(tiempo % 60)).padStart(2, "0");
  const puntos = "PUNTOS  0000"; // Reservado para el sistema de puntuación.
  textoPixel(`TIEMPO  ${minutos}:${segundos}`, 10, 8, "#e4edf4");
  textoPixel(puntos, canvas.width - 10 - anchoTextoPixel(puntos), 8, "#ffe66d");
}

function dibujar() {
  dibujarNave();
  for (const jugador of jugadores) dibujarJugador(jugador);
  dibujarNombres();
  dibujarHUD();
}

function bucle(ahora) {
  const delta = anterior ? Math.min((ahora - anterior) / 1000, 0.1) : 0;
  anterior = ahora;
  if (escena === "jugando") {
    acumulado += delta;
    while (acumulado >= FISICA.paso) {
      actualizar(FISICA.paso);
      acumulado -= FISICA.paso;
    }
  }
  if (escena === "jugando" || escena === "pausa") dibujar();
  requestAnimationFrame(bucle);
}

cambiarEscena("menu");
requestAnimationFrame(bucle);
