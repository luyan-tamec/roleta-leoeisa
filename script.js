const PREFIX = "r1_";

const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');
const nome = document.getElementById('nome');
const qtd = document.getElementById('quantidade');
const tempo = document.getElementById('tempo');
const overlay = document.getElementById('resultadoOverlay');
const lista = document.getElementById('listaNomes');
const csv = document.getElementById('inputCSV');

const imagemCentro = new Image();
imagemCentro.src = 'img/centro.png';


const paletaNeutra = ["#fafafa", "#f5f5f5", "#f0f0f0", "#ebebeb", "#e0e0e0", "#d7d7d7", "#cfcfcf", "#c7c7c7", "#bdbdbd", "#b3b3b3", "#a9a9a9", "#9e9e9e", "#8f8f8f", "#858585", "#7d7d7d", "#757575", "#6e6e6e", "#666666", "#5e5e5e", "#faf8f5", "#f2eee8", "#e9e4da", "#ded7cc", "#d2cbbe", "#c7c0b4", "#bcb5a9", "#b0a99f", "#a59e95", "#9a938a", "#8f887f", "#847d75", "#7a6f6a", "#6f645e", "#645952", "#5a4f48", "#f2f4f7", "#eceff2", "#e6e9ed", "#dfe3e8", "#d9dde2", "#d1d6dc", "#ccd1d6", "#c5cbd2", "#c0c5cb", "#b8bfc7", "#b3b9c0", "#adb3ba", "#a7adb4", "#a1a7ae", "#9aa1a9", "#949aa3", "#8e959d", "#878e96", "#828992", "#7b828b", "#767d86", "#707780", "#6a717a", "#646b74", "#fbfaf8", "#f8f6f3", "#f3f1ed", "#eeeae6", "#e9e5df", "#e3ded8", "#ddd8d2", "#d7d2cc", "#cfc7c0", "#e2ae81ff", "#bdb5ae", "#5b68a7ff", "#aba39c", "#a29a93", "#84481bff", "#908781"];

let nomes = [];
let cores = [];
let angulo = 0;
let girando = false;
let vel = 0;
let dur = 5000;
let ultimo = null;
let audioCtx = null;

let vencedores = JSON.parse(localStorage.getItem(PREFIX + 'vencedores') || '[]');
let volumeTick = parseFloat(localStorage.getItem(PREFIX + 'volumeTick') || '0.12');


const somVencedor = new Audio("vencedor.mp3");
somVencedor.volume = 0.100;

function corAleatoria() {
  return `hsl(${Math.floor(Math.random() * 360)},75%,60%)`;
}

function ensureAudioContext() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended')
    audioCtx.resume();
}



function playTick() {
  try {
    ensureAudioContext();

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = 'square';
    o.frequency.setValueAtTime(1200, audioCtx.currentTime);

    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(volumeTick, audioCtx.currentTime + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);

    o.connect(g);
    g.connect(audioCtx.destination);

    o.start();
    o.stop(audioCtx.currentTime + 0.08);
  } catch (e) { }
}

const sliderTick = document.getElementById('volTick');

if (sliderTick) {
  sliderTick.value = Math.round(volumeTick * 100);

  sliderTick.oninput = e => {
    volumeTick = Math.max(0, Math.min(1, e.target.value / 300));
    localStorage.setItem(PREFIX + 'volumeTick', volumeTick);
  };
}

function playStopSound() {
  try {
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.06);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 1.25);
    setTimeout(() => {
      somVencedor.pause();
      somVencedor.currentTime = 0;
    }, 4000);
  } catch (e) { }
}

const select = document.getElementById("sons");
const inputVol = document.getElementById("input-vol");
const inputTempo = document.getElementById("tempo-msc");
const botao = document.getElementById("btn");


let musicas = [
  "musicas/musica0.mp3",
  "musicas/musica1.mp3",
  "musicas/musica2.mp3",
  "musicas/musica3.mp3",
  "musicas/musica4.mp3",
  "musicas/musica5.mp3",
  "musicas/musica6.mp3",
  "musicas/musica7.mp3",
  "musicas/musica8.mp3",
  "musicas/musica9.mp3",
  "musicas/musica10.mp3",
  "musicas/musica11.mp3",
  "musicas/musica12.mp3",
  "musicas/musica13.mp3",
  "musicas/musica14.mp3",
  "musicas/musica15.mp3",
  "musicas/musica16.mp3",
  "musicas/musica17.mp3"

]
//----------------------------------------------------------------------//
const musica = new Audio();
let musicaAtual = "";

select.addEventListener("change", function () {
  musica.src = musicas[select.value];
  musicaAtual = musica.src;
  musica.pause();
  musica.currentTime = 0;
  botao.textContent = "Play";
  musica.loop = true
  if (document.getElementById('btnMusica').textContent === '🎵 Tocar Música' ) {
    return
  } else {
    document.getElementById('btnMusica').onclick() 
  }
  

});
inputVol.addEventListener("input", function () {
  let vol = inputVol.value / 100
  musica.volume = vol
});
inputTempo.addEventListener("input", function () {
  let tempo = inputTempo.value
  musica.currentTime = tempo
});
let intervaloId = setInterval(() => {
  inputTempo.value = musica.currentTime
  inputTempo.max = musica.duration
}, 1000); 

botao.addEventListener("click", function () {
  const musicaSelecionada = musicas[select.value];

  if (musicaAtual !== musicaSelecionada) {
    musica.src = musicaSelecionada;
    musicaAtual = musicaSelecionada;
   
  }

  if (musica.paused) {
    musica.play();
    botao.textContent = "Pause";
  } else {
    musica.pause();
    botao.textContent = "Play";
    musica.currentTime=0
    
  }
});

const volSalvo = localStorage.getItem(PREFIX + 'volumeMusica');
if (volSalvo) musica.volume = parseFloat(volSalvo);
document.getElementById('volumeMusica').value = Math.round(musica.volume * 100);

let tocandoMusica = false;

document.getElementById('btnMusica').onclick = () => {
  const musicaSelecionada = musicas[select.value];

  if (musicaAtual !== musicaSelecionada) {
    musica.src = musicaSelecionada;
    musicaAtual = musicaSelecionada;

  }

  if (musica.paused) {
    musica.play();
    botao.textContent = "Pause";
    document.getElementById('btnMusica').textContent = '⏸️ Parar Música';

  } else {
    musica.pause();
    botao.textContent = "Play";
    document.getElementById('btnMusica').textContent = '🎵 Tocar Música';
    musica.currentTime= 0
  }
};

document.getElementById('volumeMusica').oninput = e => {
  const vol = Math.max(0, Math.min(1, e.target.value / 100));
  musica.volume = vol;
  localStorage.setItem(PREFIX + 'volumeMusica', vol);
};

function salvar() {
  localStorage.setItem(PREFIX + 'nomes', JSON.stringify(nomes));
  localStorage.setItem(PREFIX + 'cores', JSON.stringify(cores));
}

const modoSalvo = localStorage.getItem(PREFIX + "modoCor") || "colorido";
document.getElementById("modoCor").value = modoSalvo;

document.getElementById("modoCor").addEventListener("change", () => {
  localStorage.setItem(PREFIX + "modoCor", document.getElementById("modoCor").value);
});

let tema = localStorage.getItem(PREFIX + "tema") || "escuro";
//const btnTema = document.getElementById("btnTema");
const titulo = document.getElementById("titulo");

/*function aplicarTema() {
  if (tema === "claro") {
    document.body.classList.add("tema-claro");
    btnTema.textContent = "Tema";
  } else {
    document.body.classList.remove("tema-claro");
    btnTema.textContent = "Tema";
  }
}

if (btnTema) {
  btnTema.addEventListener("click", () => {
    tema = (tema === "claro") ? "escuro" : "claro";
    localStorage.setItem(PREFIX + "tema", tema);
    aplicarTema();
    if (titulo.textContent === "Roleta Rindo e Apoiando!!") {
      titulo.textContent = "Roleta Rindo e Apoiando!!!";

    } else {
      titulo.textContent = "Roleta Rindo e Apoiando!!";
      clearInterval(intervaloId);
      intervaloId = null;
    }
  });
}

aplicarTema();*/

const bufferCanvas = document.createElement('canvas');
const bufferCtx = bufferCanvas.getContext('2d');
let animFrameId = null;
let giroFrameId = null;

function gerarBuffer() {
  const w = canvas.width, h = canvas.height;
  bufferCanvas.width = w;
  bufferCanvas.height = h;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) / 2 - 6;
  bufferCtx.clearRect(0, 0, w, h);
  const t = nomes.length;
  if (!t) {
    bufferCtx.beginPath();
    bufferCtx.arc(cx, cy, r, 0, 2 * Math.PI);
    bufferCtx.lineWidth = 6;
    bufferCtx.strokeStyle = '#fff';
    bufferCtx.stroke();
    return;
  }
  const ap = 2 * Math.PI / t;
  for (let i = 0; i < t; i++) {
    const ini = i * ap;
    bufferCtx.beginPath();
    bufferCtx.moveTo(cx, cy);
    bufferCtx.arc(cx, cy, r, ini, ini + ap);
    bufferCtx.closePath();
    bufferCtx.fillStyle = cores[i] || corAleatoria();
    bufferCtx.fill();
    bufferCtx.strokeStyle = '#222';
    bufferCtx.lineWidth = 1;
    bufferCtx.stroke();
    bufferCtx.save();
    bufferCtx.translate(cx, cy);


    bufferCtx.rotate(ini + ap / 2);


    bufferCtx.textAlign = 'center';
    bufferCtx.textBaseline = 'middle';
    bufferCtx.fillStyle = '#000000ff';

    let nm = nomes[i] || '';


    bufferCtx.font = `bold ${nomes.length > 48 ? 11 : 15}px Arial`;
    bufferCtx.globalAlpha = nomes.length > 240 ? 0.3 : 1;


    if (nm.length > 24) nm = nm.slice(0, 21) + '...';


    bufferCtx.fillText(nm, r * 0.58, 0);

    bufferCtx.restore();

  }
  bufferCtx.beginPath();
  bufferCtx.arc(cx, cy, r, 0, 2 * Math.PI);
  bufferCtx.lineWidth = 5;
  bufferCtx.strokeStyle = '#fff';
  bufferCtx.stroke();
}