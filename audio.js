"use strict";

const musica = {
  menu: new Audio("audio/menu.ogg"),
  partida: new Audio("audio/partida.ogg"),
};
const efectos = Object.fromEntries(Object.entries({ salto: 4, terminal: 1, puerta: 2 })
  .map(([nombre, cantidad]) => [nombre,
    Array.from({ length: cantidad }, () => new Audio(`audio/${nombre}.ogg`))]));
const botonAudio = document.querySelector("#activar-audio");
let audioActivado = false;
let pistaActual;

for (const pista of Object.values(musica)) pista.loop = true;
botonAudio.hidden = false;

function ajustarAudio(nivelMusica, nivelEfectos) {
  for (const pista of Object.values(musica)) pista.volume = nivelMusica;
  for (const grupo of Object.values(efectos)) {
    for (const clip of grupo) clip.volume = nivelEfectos;
  }
}

function actualizarMusica(escena) {
  if (!audioActivado || document.hidden) return;
  const pista = ["jugando", "pausa", "resultado"].includes(escena) ? musica.partida : musica.menu;
  if (pistaActual && pistaActual !== pista) {
    pistaActual.pause();
    pistaActual.currentTime = 0;
  }
  pistaActual = pista;
  if (escena === "pausa" || escena === "resultado") {
    pista.pause();
    return;
  }

  if (pista.paused) pista.play().catch(error => {
    if (error.name === "NotAllowedError" && pista === pistaActual) {
      audioActivado = false;
      botonAudio.hidden = false;
    }
  });
}

function activarAudio(escena) {
  audioActivado = true;
  botonAudio.hidden = true;
  actualizarMusica(escena);
}

function pausarAudio() {
  pistaActual?.pause();
  for (const grupo of Object.values(efectos)) for (const clip of grupo) clip.pause();
}

function sonar(nombre) {
  if (!audioActivado || document.hidden) return;
  const grupo = efectos[nombre];
  const clip = grupo.find(sonido => sonido.paused || sonido.ended) || grupo[0];
  if (!clip.volume) return;
  clip.currentTime = 0;
  clip.play().catch(() => {});
}
