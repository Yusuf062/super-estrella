"use strict";

const canvas = document.querySelector("#juego");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const capas = {
  menu: document.querySelector("#menu"),
  pausa: document.querySelector("#pausa"),
  informacion: document.querySelector("#informacion"),
  ajustes: document.querySelector("#ajustes"),
  resultado: document.querySelector("#resultado"),
};
const estadoTexto = document.querySelector("#estado");
const botonPausa = document.querySelector("#boton-pausa");
const mostrarControles = document.querySelector("#mostrar-controles");
const botonSiguiente = document.querySelector("#siguiente");
const botonRepetir = document.querySelector("#repetir");
const teclas = new Set();
const pulsaciones = new Set();

const FISICA = {
  gravedad: 420,
  gravedadHelix: 195,
  velocidad: 62,
  empuje: 42,
  salto: 170,
  paso: 1 / 120,
};

const Y_SUELO = 160;
const plataformas = [
  { x: 0, y: Y_SUELO, w: 320, h: 20 },
  { x: 64, y: 130, w: 47, h: 5 },
  { x: 128, y: 108, w: 46, h: 7 },
  { x: 190, y: 82, w: 46, h: 7 },
];
const terminal = { x: 84, y: 110, w: 16, h: 20, activo: false };
const caja = { x: 143, inicioX: 143, y: Y_SUELO - 16, w: 16, h: 16 };
const riel = { inicio: 26, fin: 242 };
const placa = { x: 216, w: 23, activa: false };
const marco = { x: 263, y: 40, w: 14, h: 76 };
const puerta = { x: 263, y: 116, w: 14, h: Y_SUELO - 116, abierta: false };
const salida = { x: 278, y: 116, w: 42, h: Y_SUELO - 116 };
const suelosHelix = [
  { x: 0, y: Y_SUELO, w: 118, h: 20 },
  { x: 206, y: Y_SUELO, w: 114, h: 20 },
  { x: 270, y: 96, w: 50, h: 6, soloDesdeArriba: true },
];
const plataformaMovil = {
  x: 84, y: 130, w: 40, h: 5, soloDesdeArriba: true,
  inicio: 84, fin: 214, velocidad: 36, direccion: 1, espera: 1,
};
const zonaGravedad = { x: 242, y: 26, w: 78, h: 134 };
const salidaHelix = { x: 281, y: 96 };
const PUNTOS_NIVEL = 1000;
const PENALIZACION_CAIDA = 50;

function crearJugador(nombre, x, color, izquierda, derecha, salto, archivo) {
  const imagen = new Image();
  imagen.src = archivo;
  return {
    nombre, inicioX: x, color, izquierda, derecha, salto, imagen,
    x, y: Y_SUELO - 24, w: 12, h: 24, vx: 0, vy: 0, enSuelo: true, direccion: 1,
  };
}

const izan = crearJugador("Izan", 29, "#36d1dc", "KeyA", "KeyD", "KeyW", "img/personaje_1.png");
const gael = crearJugador("Gael", 49, "#ff9f43", "ArrowLeft", "ArrowRight", "ArrowUp", "img/personaje_2.png");
const jugadores = [izan, gael];

let escena = "menu";
let nivel = "carguero";
let tiempo = 0;
let puntos = 0;
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

function reiniciarSala() {
  terminal.activo = false;
  caja.x = caja.inicioX;
  placa.activa = false;
  puerta.abierta = false;
  plataformaMovil.x = plataformaMovil.inicio;
  plataformaMovil.direccion = 1;
  plataformaMovil.espera = 1;
  for (const jugador of jugadores) {
    jugador.x = jugador.inicioX;
    jugador.y = Y_SUELO - jugador.h;
    jugador.vx = 0;
    jugador.vy = 0;
    jugador.enSuelo = true;
    jugador.direccion = 1;
  }
}

function empezar() {
  nivel = "carguero";
  tiempo = 0;
  puntos = 0;
  entrarEnSala();
}

function entrarEnSala() {
  reiniciarSala();
  cambiarEscena("jugando");
  actualizarObjetivo();
  document.activeElement?.blur();
}

function entrarEnHelix() {
  if (nivel !== "carguero" || escena !== "resultado") return;
  nivel = "helix";
  entrarEnSala();
}

function pausar() {
  if (escena !== "jugando") return;
  cambiarEscena("pausa");
  estadoTexto.textContent = "Partida en pausa.";
}

function continuar() {
  cambiarEscena("jugando");
  actualizarObjetivo();
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
  '<p><strong class="cian">Izan:</strong> A y D para moverse, W para saltar y E junto al terminal.</p>' +
  '<p><strong class="naranja">Gael:</strong> ← y → para moverse, ↑ para saltar. Mantén Intro mientras andas hacia la caja.</p>' +
  '<p>En el Carguero, enciende el terminal y deja la caja sobre la placa. En Helix, cruzad en la plataforma móvil y saltad en la zona violeta. Esc abre la pausa.</p>'));
abrirDesdeMenu("#creditos", () => mostrarInformacion("ÓRBITA TRES",
  '<img class="logo" src="img/logo.png" alt="Super Estrella"><p>Grupo J · Juegos en Red · URJC</p>' +
  '<p>José Antonio Najarro Camacho<br>Víctor Martín Monterrubio<br>Daniel Heredia Naranjo</p>' +
  '<p>Super Estrella · Código bajo licencia Apache 2.0.</p>'));
document.querySelector("#volver").addEventListener("click", volverAlMenu);
document.querySelector("#continuar").addEventListener("click", continuar);
document.querySelector("#reiniciar").addEventListener("click", entrarEnSala);
document.querySelector("#salir").addEventListener("click", volverAlMenu);
botonRepetir.addEventListener("click", empezar);
botonSiguiente.addEventListener("click", entrarEnHelix);
document.querySelector("#menu-resultado").addEventListener("click", volverAlMenu);
botonPausa.addEventListener("click", pausar);

const controles = new Set(["KeyA", "KeyD", "KeyW", "KeyE", "ArrowLeft", "ArrowRight", "ArrowUp", "Enter", "NumpadEnter", "Escape"]);
window.addEventListener("keydown", (evento) => {
  if (!controles.has(evento.code)) return;
  if (escena === "jugando" || (escena === "pausa" && evento.code === "Escape")) evento.preventDefault();
  if (evento.code === "Escape" && !evento.repeat) {
    if (escena === "jugando") pausar();
    else if (escena === "pausa") continuar();
    else if (["ajustes", "informacion", "resultado"].includes(escena)) volverAlMenu();
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

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(valor, maximo));
}

function moverJugador(jugador, dt, solidos) {
  const sentido = Number(teclas.has(jugador.derecha)) - Number(teclas.has(jugador.izquierda));
  const empujando = nivel === "carguero" && jugador === gael && jugador.enSuelo &&
    (teclas.has("Enter") || teclas.has("NumpadEnter"));
  jugador.vx = sentido * (empujando ? FISICA.empuje : FISICA.velocidad);
  if (sentido !== 0) jugador.direccion = sentido;
  if (pulsaciones.has(jugador.salto) && jugador.enSuelo) {
    jugador.vy = -FISICA.salto;
    jugador.enSuelo = false;
  }

  // Resolver cada eje por separado evita atravesar los sólidos.
  jugador.x = limitar(jugador.x + jugador.vx * dt, 0, canvas.width - jugador.w);
  for (const solido of solidos) {
    if (solido.soloDesdeArriba || !solapan(jugador, solido)) continue;
    if (sentido > 0) jugador.x = solido.x - jugador.w;
    else if (sentido < 0) jugador.x = solido.x + solido.w;
  }

  if (nivel === "carguero" && sentido && solapan(jugador, caja)) {
    const borde = sentido > 0 ? jugador.x + jugador.w : jugador.x - caja.w;
    if (empujando && jugador.enSuelo) {
      const x = limitar(borde, riel.inicio, riel.fin - caja.w);
      if (!solapan(izan, { ...caja, x })) caja.x = x;
    }
    jugador.x = sentido > 0 ? caja.x - jugador.w : caja.x + caja.w;
  }

  const gravedad = gravedadDe(jugador);
  jugador.vy += gravedad * dt;
  const piesAnteriores = jugador.y + jugador.h;
  jugador.y += jugador.vy * dt;
  jugador.enSuelo = false;
  for (const solido of nivel === "carguero" ? [...solidos, caja] : solidos) {
    if (solido.soloDesdeArriba && (jugador.vy <= 0 || piesAnteriores > solido.y)) continue;
    if (!solapan(jugador, solido)) continue;
    if (jugador.vy > 0) {
      jugador.y = solido.y - jugador.h;
      jugador.enSuelo = true;
    } else if (jugador.vy < 0) {
      jugador.y = solido.y + solido.h;
    }
    jugador.vy = 0;
  }
}

function gravedadDe(jugador) {
  return nivel === "helix" && jugador.x + jugador.w / 2 >= zonaGravedad.x
    ? FISICA.gravedadHelix : FISICA.gravedad;
}

function enSueloDeLaSala(jugador) {
  return jugador.enSuelo && jugador.y + jugador.h === Y_SUELO;
}

function juntoAlTerminal() {
  return izan.enSuelo && izan.y + izan.h === terminal.y + terminal.h &&
    izan.x + izan.w > terminal.x - 9 && izan.x < terminal.x + terminal.w + 9;
}

function actualizarObjetivo() {
  if (nivel === "helix") {
    const objetivo = jugadores.every(j => j.x >= suelosHelix[1].x)
      ? "Zona violeta: saltad con gravedad reducida hasta la salida superior."
      : "Laboratorio Helix: esperad a la plataforma móvil y usadla para cruzar el hueco.";
    if (estadoTexto.textContent !== objetivo) estadoTexto.textContent = objetivo;
    return;
  }
  const mensaje = !terminal.activo
    ? "Izan: sube a la primera plataforma y pulsa E junto al terminal."
    : !placa.activa
      ? "Gael: mantén Intro y empuja la caja hasta la placa amarilla."
      : "Puerta abierta: dejad la caja en la placa y cruzad los dos.";
  if (estadoTexto.textContent !== mensaje) estadoTexto.textContent = mensaje;
}

function formatearTiempo() {
  const minutos = String(Math.floor(tiempo / 60)).padStart(2, "0");
  const segundos = String(Math.floor(tiempo % 60)).padStart(2, "0");
  return `${minutos}:${segundos}`;
}

function completarSala() {
  const quedaHelix = nivel === "carguero";
  puntos += PUNTOS_NIVEL;
  document.querySelector("#titulo-resultado").textContent = quedaHelix
    ? "CARGUERO COMPLETADO" : "LABORATORIO COMPLETADO";
  document.querySelector("#resumen-resultado").textContent =
    `Tiempo total: ${formatearTiempo()} · ${puntos} puntos`;
  botonSiguiente.hidden = !quedaHelix;
  botonRepetir.hidden = quedaHelix;
  cambiarEscena("resultado");
  estadoTexto.textContent = quedaHelix
    ? "Una señal de Oris apunta al Laboratorio Helix."
    : "Los dos hermanos descubren que Oris está conectado a un sistema de control.";
  (quedaHelix ? botonSiguiente : botonRepetir).focus();
}

function actualizarPuzle() {
  if (pulsaciones.has("KeyE") && juntoAlTerminal()) terminal.activo = true;

  const centroCaja = caja.x + caja.w / 2;
  placa.activa = (centroCaja >= placa.x && centroCaja < placa.x + placa.w) ||
    jugadores.some(j => enSueloDeLaSala(j) && j.x < placa.x + placa.w && j.x + j.w > placa.x);
  const abierta = terminal.activo && placa.activa;
  if (puerta.abierta && !abierta) {
    // Al cerrarse, la puerta deja a cada jugador en el lado más cercano.
    for (const j of jugadores) {
      if (solapan(j, puerta)) {
        j.x = j.x + j.w / 2 < puerta.x + puerta.w / 2 ? puerta.x - j.w : puerta.x + puerta.w;
      }
    }
  }
  puerta.abierta = abierta;

  if (abierta && jugadores.every(j => enSueloDeLaSala(j) && j.x >= salida.x)) completarSala();
  else actualizarObjetivo();
}

function actualizar(dt) {
  tiempo += dt;
  if (nivel === "helix") actualizarHelix(dt);
  else {
    const solidos = [...plataformas, marco];
    if (!puerta.abierta) solidos.push(puerta);
    for (const jugador of jugadores) moverJugador(jugador, dt, solidos);
    actualizarPuzle();
  }
  pulsaciones.clear();
}

function moverPlataforma(dt) {
  const p = plataformaMovil;
  if (p.espera > 0) {
    p.espera -= dt;
    return;
  }
  const xAnterior = p.x;
  p.x = limitar(p.x + p.direccion * p.velocidad * dt, p.inicio, p.fin);
  if (p.x === p.inicio || p.x === p.fin) {
    p.direccion *= -1;
    p.espera = 0.85;
  }
  for (const j of jugadores) {
    // Los jugadores apoyados conservan su posición relativa a la plataforma.
    if (j.enSuelo && j.y + j.h === p.y && j.x < xAnterior + p.w && j.x + j.w > xAnterior) {
      j.x += p.x - xAnterior;
    }
  }
}

function actualizarHelix(dt) {
  moverPlataforma(dt);
  const solidos = [...suelosHelix, plataformaMovil];
  for (const j of jugadores) moverJugador(j, dt, solidos);
  if (jugadores.some(j => j.y >= canvas.height)) {
    puntos = Math.max(0, puntos - PENALIZACION_CAIDA);
    entrarEnSala();
  } else if (jugadores.every(j => j.enSuelo && j.y + j.h === salidaHelix.y && j.x >= salidaHelix.x)) {
    completarSala();
  } else {
    actualizarObjetivo();
  }
}

// Fuente pixelart: cada dígito hexadecimal codifica una fila de cuatro píxeles.
const LETRAS_PIXEL = {
  A: "699F999", D: "E99999E", E: "F88E88F", G: "788B997", I: "E44444E",
  H: "999F999", X: "9966699",
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

function dibujarNave(suelos) {
  bloque("#0b1026", 0, 0, 320, 180);
  bloque("#182139", 0, 27, 320, 135);

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

  for (const {x, y, w, h} of suelos) {
    bloque("#3a465e", x, y, w, h);
    bloque("#8290a4", x, y, w, 2);
    bloque("#202a3f", x, y + h - 2, w, 2);
    for (let junta = x + 16; junta < x + w; junta += 16) {
      bloque("#28334d", junta, y + 2, 1, h - 4);
    }
  }
}

function dibujarPuzle() {
  const cian = terminal.activo ? "#36d1dc" : "#25808d";
  const luzPlaca = placa.activa ? "#ffe66d" : "#a98a36";

  bloque(puerta.abierta ? "#1d3843" : "#19243d", salida.x - 1, salida.y, salida.w + 1, salida.h);
  for (let x = salida.x + 4; x < canvas.width; x += 8) {
    bloque(puerta.abierta ? "#294a52" : "#202c44", x, salida.y + 2, 2, salida.h - 2);
    bloque(puerta.abierta ? "#ffe66d" : "#655b42", x, 162, 4, 2);
  }

  bloque("#141c30", marco.x, marco.y, marco.w, marco.h);
  bloque("#526077", marco.x + 2, marco.y, marco.w - 4, marco.h);
  for (let y = marco.y + 7; y < puerta.y - 6; y += 12) {
    bloque("#263249", marco.x + 4, y, marco.w - 8, 6);
  }
  bloque("#766339", puerta.x - 2, puerta.y - 3, puerta.w + 4, 3);
  bloque(puerta.abierta ? "#79e4ac" : "#ff4d6d", puerta.x + 4, puerta.y - 5, 6, 2);
  if (!puerta.abierta) {
    bloque("#b4903f", puerta.x, puerta.y, puerta.w, puerta.h);
    bloque("#e2bb56", puerta.x + 2, puerta.y, puerta.w - 4, puerta.h);
    for (let y = puerta.y + 6; y < Y_SUELO; y += 8) {
      bloque("#5c4a2e", puerta.x + 3, y, puerta.w - 6, 3);
    }
  }

  bloque("#10192a", terminal.x, terminal.y, terminal.w, terminal.h);
  bloque("#435674", terminal.x + 1, terminal.y + 1, terminal.w - 2, terminal.h - 1);
  bloque("#0b1026", terminal.x + 3, terminal.y + 3, 10, 8);
  bloque(cian, terminal.x + 4, terminal.y + 4, 8, 6);
  bloque("#b3f7f4", terminal.x + 5, terminal.y + 5, 5, 1);
  bloque("#19243d", terminal.x + 4, terminal.y + 13, 8, 5);
  bloque(cian, terminal.x + 6, terminal.y + 14, 4, 2);
  if (!terminal.activo) textoPixel("E", terminal.x + 6, terminal.y - 10, "#36d1dc");

  bloque("#43495d", riel.inicio - 2, Y_SUELO - 3, 2, 3);
  bloque("#43495d", riel.fin, Y_SUELO - 3, 2, 3);
  bloque("#655633", placa.x, Y_SUELO - 3, placa.w, 3);
  bloque(luzPlaca, placa.x + 1, Y_SUELO - 3, placa.w - 2, placa.activa ? 2 : 1);
  bloque(luzPlaca, placa.x, Y_SUELO + 2, placa.w, 2);

  const x = Math.round(caja.x);
  bloque("#542e22", x, caja.y, caja.w, caja.h);
  bloque("#d37a38", x + 1, caja.y + 1, caja.w - 2, caja.h - 2);
  bloque("#ff9f43", x + 2, caja.y + 2, caja.w - 4, 2);
  bloque("#7e462c", x + 3, caja.y + 5, caja.w - 6, 7);
  bloque("#eda258", x + 4, caja.y + 7, caja.w - 8, 3);
}

function dibujarHelix() {
  const { x, y, w, h } = zonaGravedad;
  for (let fila = y + 14; fila < y + h; fila += 2) {
    bloque("#4a407e", x, fila, 1, 1);
  }
  for (let fila = 53; fila < 151; fila += 24) {
    for (const columna of [250, 264, 304]) {
      bloque("#6e58a0", columna + 2, fila, 2, 1);
      bloque("#60508e", columna + 1, fila + 1, 4, 1);
      bloque("#504679", columna, fila + 2, 6, 1);
      bloque("#60508e", columna + 2, fila + 3, 2, 4);
    }
  }
  bloque("#322b56", x + 1, 43, w - 1, 3);
  bloque("#bc9cff", x + 2, 43, w - 2, 1);

  bloque("#10182d", 118, 151, 88, 29);
  bloque("#080d1c", 118, 165, 88, 15);
  for (const borde of [108, 206]) {
    bloque("#ffbd59", borde, Y_SUELO, 10, 2);
    bloque("#8c613b", borde + 2, Y_SUELO + 3, 6, 2);
  }

  const p = plataformaMovil;
  bloque("#1a283e", p.inicio, p.y + 6, p.fin - p.inicio + p.w, 3);
  bloque("#3b526f", p.inicio, p.y + 7, p.fin - p.inicio + p.w, 1);
  const px = Math.round(p.x);
  bloque("#294865", px, p.y, p.w, p.h);
  bloque("#c3f5ff", px, p.y, p.w, 1);
  bloque("#36d1dc", px + 2, p.y + 1, p.w - 4, 2);
  bloque("#ffe66d", px + 2, p.y + 3, 4, 1);
  bloque("#ffe66d", px + p.w - 6, p.y + 3, 4, 1);

  bloque("#151c32", salidaHelix.x, salidaHelix.y - 28, 35, 28);
  bloque("#7e6a49", salidaHelix.x, salidaHelix.y - 28, 35, 2);
  bloque("#ffe66d", salidaHelix.x + 3, salidaHelix.y - 26, 2, 26);
  bloque("#ffe66d", salidaHelix.x + 30, salidaHelix.y - 26, 2, 26);
  textoPixel("SALIDA", salidaHelix.x + 3, 57, "#ffe66d");
}

function dibujarHUD() {
  bloque("#0b1026", 0, 0, 320, 23);
  bloque("#28334d", 0, 22, 320, 1);
  const marcador = `PUNTOS  ${String(puntos).padStart(4, "0")}`;
  textoPixel(`TIEMPO  ${formatearTiempo()}`, 10, 8, "#e4edf4");
  if (nivel === "helix") textoPixel("HELIX", 148, 8, "#bc9cff");
  textoPixel(marcador, canvas.width - 10 - anchoTextoPixel(marcador), 8, "#ffe66d");
}

function dibujar() {
  if (nivel === "helix") {
    dibujarNave(suelosHelix);
    dibujarHelix();
  } else {
    dibujarNave(plataformas);
    dibujarPuzle();
  }
  for (const jugador of jugadores) dibujarJugador(jugador);
  dibujarNombres();
  dibujarHUD();
}

function bucle(ahora) {
  const delta = anterior ? Math.min((ahora - anterior) / 1000, 0.1) : 0;
  anterior = ahora;
  if (escena === "jugando") {
    acumulado += delta;
    while (escena === "jugando" && acumulado >= FISICA.paso) {
      acumulado -= FISICA.paso;
      actualizar(FISICA.paso);
    }
  }
  if (["jugando", "pausa", "resultado"].includes(escena)) dibujar();
  requestAnimationFrame(bucle);
}

cambiarEscena("menu");
requestAnimationFrame(bucle);
