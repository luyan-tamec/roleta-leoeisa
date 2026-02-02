
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
imagemCentro.src = 'centro.png';


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

const musica = new Audio('musica.mp3');
musica.loop = true;
const volSalvo = localStorage.getItem(PREFIX + 'volumeMusica');
if (volSalvo) musica.volume = parseFloat(volSalvo);
document.getElementById('volumeMusica').value = Math.round(musica.volume * 100);

let tocandoMusica = false;

document.getElementById('btnMusica').onclick = () => {
  if (!tocandoMusica) {
    musica.currentTime = 0;
    musica.play().then(() => {
      tocandoMusica = true;
      document.getElementById('btnMusica').textContent = '⏸️ Parar Música';
    }).catch(() => { });
  } else {
    musica.pause()
    tocandoMusica = false;
    document.getElementById('btnMusica').textContent = '🎵 Tocar Música';
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
const btnTema = document.getElementById("btnTema");
const titulo = document.getElementById("titulo");

function aplicarTema() {
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

aplicarTema();

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

function desenhar(d = -1, b = 1) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angulo);
  ctx.drawImage(bufferCanvas, -w / 2, -h / 2);
  if (d >= 0 && nomes.length) {
    const t = nomes.length;
    const ap = 2 * Math.PI / t;
    const r = Math.min(w, h) / 2 - 6;
    const ini = d * ap;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, ini, ini + ap);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,0,${b})`;
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function tick() {
  const t = nomes.length;
  if (!t) return;
  const ap = 2 * Math.PI / t;
  const arrow = 3 * Math.PI / 2;
  const rel = ((arrow - angulo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const s = Math.floor(rel / ap);
  if (ultimo === null) {
    ultimo = s;
    return;
  }
  if (s !== ultimo) {
    playTick();
    ultimo = s;
  }
}

let mouseDown = false;
let iniciouArraste = false;
let startX = 0;
let startY = 0;
const LIMIAR = 130;

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  mouseDown = true;
  iniciouArraste = false;
  startX = e.clientX;
  startY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
  if (!mouseDown || girando) return;

  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);

  if (dx > LIMIAR || dy > LIMIAR) {
    iniciouArraste = true;
  }
});

canvas.addEventListener('mouseup', () => {
  if (mouseDown && iniciouArraste && !girando) {
    girar();
  }

  mouseDown = false;
  iniciouArraste = false;
});

function girar() {
  if (nomes.length < 1) {
    alert('Adicione pelo menos um nome.');
    return;
  }
  if (girando) return;
  overlay.classList.remove('mostrar');
  dur = (parseInt(tempo.value) || 5) * 1000;
  vel = Math.random() * 0.35 + 0.5;
  girando = true;
  ultimo = null;
  const inicio = performance.now();
  let last = inicio;
  function loop(now) {
    const delta = now - last;
    last = now;
    const d = now - inicio;
    const scale = delta / 18;
    if (d < dur * 0.65) {
      angulo += vel * scale;
    } else if (d < dur) {
      vel *= Math.pow(0.98, scale);
      angulo += vel * scale;
    } else {
      girando = false;
      suave();
      return;
    }
    tick();
    desenhar();
    giroFrameId = requestAnimationFrame(loop);
  }
  giroFrameId = requestAnimationFrame(loop);

}

function parar() {
  if (girando) {
    if (giroFrameId) cancelAnimationFrame(giroFrameId);
    girando = false;
    suave();
  }
}

function suave() {
  if (vel <= 0) vel = 0.001;
  function step() {
    vel *= 0.988;
    if (vel < 0.0005) vel = 0;
    angulo += vel;
    tick();
    desenhar();
    if (vel > 0) {
      animFrameId = requestAnimationFrame(step);
    } else {
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      girando = false;
      const t = nomes.length;
      if (!t) return;
      const ap = 2 * Math.PI / t;
      const arrow = 3 * Math.PI / 2;
      const rel = ((arrow - angulo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const i = Math.floor(rel / ap);
      const v = nomes[i];
      playStopSound();
      somVencedor.currentTime = 0;
      somVencedor.play().catch(() => { });
      setTimeout(() => {
        musica.pause();
        musica.currentTime = 0;
        tocandoMusica = false;
        document.getElementById('btnMusica').textContent = '🎵 Tocar Música';
      }, 3000);
      setTimeout(() => {
        document.body.classList.remove('painel-oculto');
        btnMostrar.style.display = 'none';

        timer = null;
        roleta.style.borderColor = '#f6f0f3ff';
        roleta.style.boxShadow = `0 0 0px #ffffffff`;
        roleta.style.backgroundColor = 'transparent';
        painel.style.boxShadow = `0 0 0px #ffffffff`;
        fundo.style.background = '#000000b8';

      }, 2000);
      const intervaloId = localStorage.getItem("interval")
      setTimeout(() => {
        clearInterval(intervaloId)
        intervaloId = null;

      }, 1900);
      destacar(i);
      mostrarVencedor(v);
    }
  }
  animFrameId = requestAnimationFrame(step);
}

function destacar(i) {
  let b = 1, desc = true, rp = 0;
  function anim() {
    desenhar(i, b);
    if (desc) b -= 0.1;
    else b += 0.1;
    if (b <= 0.3) {
      desc = false;
      rp++;
    }
    if (b >= 1 && !desc) {
      desc = true;
    }
    if (rp < 3)
      requestAnimationFrame(anim);
    else
      desenhar();
  }
  requestAnimationFrame(anim);
}

function atualizar() {
  lista.innerHTML = '';
  nomes.forEach((nm, i) => {
    const d = document.createElement('div');
    d.className = 'tagNome';
    d.innerHTML = `${nm} <button onclick="remover(${i})">×</button>`;
    lista.appendChild(d);
  });
}

function remover(i) {
  nomes.splice(i, 1);
  cores.splice(i, 1);
  salvar();
  gerarBuffer();
  desenhar();
  embaralhar();
  atualizar();
}

const centro = document.querySelector('.centro');

function atualizarCentro() {
  if (!centro) return;

  const total = nomes.length;

  const min = 10;
  const max = 160;

  // crescimento suave
  let tamanho = min + total * 0.6;

  // limites
  tamanho = Math.max(min, Math.min(max, tamanho));

  centro.style.width = tamanho + 'px';
  centro.style.height = tamanho + 'px';
}

function adicionar() {
  const n = nome.value.trim();
  let q = parseInt(qtd.value) || 1;
  const modo = localStorage.getItem(PREFIX + "modoCor") || "colorido";
  if (!n) {
    alert('Digite um nome.');
    return;
  }
  for (let i = 0; i < q; i++) {
    nomes.push(n);
    if (modo === "colorido") {
      cores.push(corAleatoria());
    } else {
      cores.push(paletaNeutra[Math.floor(Math.random() * paletaNeutra.length)]);
    }
  }
  nome.value = '';
  qtd.value = 1;
  salvar();
  gerarBuffer();
  desenhar();
  embaralhar();
  atualizarCentro();
  atualizar();
}
setInterval(() => {
  atualizarCentro();
}, 200);


function embaralhar() {
  for (let i = nomes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmpNome = nomes[i];
    nomes[i] = nomes[j];
    nomes[j] = tmpNome;
    const tmpCor = cores[i];
    cores[i] = cores[j];
    cores[j] = tmpCor;
  }
  salvar();
  gerarBuffer();
  desenhar();
  atualizar();
}

function atualizarVencedores() {
  const div = document.getElementById('listaVencedores');
  div.innerHTML = '';
  vencedores.slice(-20).reverse().forEach(v => {
    const span = document.createElement('span');
    span.className = 'vencedorTag';
    span.textContent = v;
    div.appendChild(span);
  });
}

function salvarVencedores() {
  localStorage.setItem(PREFIX + 'vencedores', JSON.stringify(vencedores));
  atualizarVencedores();
}

function mostrarVencedor(nm) {
  overlay.textContent = `🎉✨🎈 ${nm} 🎉✨🎈 `;
  overlay.classList.remove('mostrar');
  void overlay.offsetWidth;
  const texto = overlay.textContent.trim();
  if (nm.length > 10) {
    overlay.style.fontSize = "15px"
  } else if (nm.length <= 10) {
    overlay.style.fontSize = "30px"
  }
  overlay.classList.add('mostrar');
  clearTimeout(overlay._timeoutId);
  overlay._timeoutId = setTimeout(() => {
    overlay.classList.remove('mostrar');
    overlay.textContent = '';
  }, 400000);
  vencedores.push(nm);
  salvarVencedores();
}




function limpar() {
  if (!confirm('Tem certeza que deseja limpar tudo leozao?')) return;
  nomes = [];
  cores = [];
  localStorage.removeItem(PREFIX + 'nomes');
  localStorage.removeItem(PREFIX + 'cores');
  gerarBuffer();
  desenhar();
  atualizar();
  overlay.classList.remove('mostrar');
}

document.getElementById('btnImportar').onclick = () => csv.click();

csv.addEventListener('change', () => {
  const f = csv.files[0];
  if (!f) return;
  const colIndex = parseInt(document.getElementById('colunaCSV').value);
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const linhas = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const nomesImportados = [];
    for (const linha of linhas) {
      const partes = linha.split(',');
      const nomeCol = (partes[colIndex] || '').trim();
      if (nomeCol) nomesImportados.push(nomeCol);
    }
    if (!nomesImportados.length) {
      alert('Nenhum nome encontrado.');
      csv.value = '';
      return;
    }
    for (const nm of nomesImportados) {
      nomes.push(nm);
      cores.push(corAleatoria());
    }
    salvar();
    gerarBuffer();
    desenhar();
    atualizar();
    csv.value = '';
    alert(`🎉 Importados ${nomesImportados.length} nomes da coluna ${colIndex + 1}.`);
  };
  reader.readAsText(f);
});

document.getElementById('btnExportar').onclick = () => {
  if (!nomes.length) {
    alert('Nenhum nome para exportar.');
    return;
  }
  const colIndex = parseInt(document.getElementById('colunaCSV').value);
  const linhas = nomes.map(n => {
    const cols = Array(colIndex + 1).fill('');
    cols[colIndex] = n;
    return cols.join(',');
  });
  const csvTxt = linhas.join('\n');
  const blob = new Blob([csvTxt], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "nomes_roleta.csv";
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById('btnAdicionar').onclick = adicionar;
document.getElementById('btnEmbaralhar').onclick = embaralhar;
document.getElementById('btnIniciar').onclick = girar;
document.getElementById('btnParar').onclick = parar;
document.getElementById('btnLimpar').onclick = limpar;
document.getElementById('btnFullscreen').onclick = () => {
  if (!document.fullscreenElement)
    document.documentElement.requestFullscreen();
  else
    document.exitFullscreen();
};

document.addEventListener('fullscreenchange', ajustarCanvas);

document.getElementById('btnLimparVencedores').onclick = () => {
  if (!confirm('Remover todos os vencedores salvos?')) return;
  vencedores = [];
  salvarVencedores();
};
const adicao = document.getElementById("btnAdicionar")

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') adicionar();
});


nome.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') adicionar();
});

window.remover = remover;

function carregar() {
  const n = JSON.parse(localStorage.getItem(PREFIX + 'nomes') || '[]');
  const c = JSON.parse(localStorage.getItem(PREFIX + 'cores') || '[]');
  nomes = n;
  cores = (c.length === n.length) ? c : n.map(() => corAleatoria());
  gerarBuffer();
  desenhar();
  atualizar();
  atualizarVencedores();
}

function ajustarCanvas() {
  const t = Math.min(window.innerWidth * 0.8, 500);
  const size = Math.floor(t);
  canvas.width = size;
  canvas.height = size;
  gerarBuffer();
  desenhar();
}
window.addEventListener('resize', ajustarCanvas);

ajustarCanvas();
carregar();






