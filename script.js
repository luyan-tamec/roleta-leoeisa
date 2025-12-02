/* PREFIXO EXCLUSIVO PARA O INDEX */
const PREFIX = "r1_";

/* elements */
const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');
const nome = document.getElementById('nome');
const qtd = document.getElementById('quantidade');
const tempo = document.getElementById('tempo');
const overlay = document.getElementById('resultadoOverlay');
const lista = document.getElementById('listaNomes');
const csv = document.getElementById('inputCSV');

const paletaNeutra = [
  "#e0e0e0", "#cfcfcf", "#bdbdbd", "#9e9e9e",
  "#8d8d8d", "#7d7d7d", "#6e6e6e", "#5e5e5e","#faf8f5", "#f2eee8", "#e9e4da", "#ded7cc",
  "#d2cbbe", "#c7c0b4", "#bcb5a9", "#b0a99f",
  "#a59e95", "#9a938a", "#8f887f", "#847d75","#f2f4f7", "#e6e9ed", "#d9dde2", "#ccd1d6",
  "#c0c5cb", "#b3b9c0", "#a7adb4", "#9aa1a9",
  "#8e959d", "#828992", "#767d86", "#6a717a"
];

/* state */
let nomes = [];
let cores = [];
let angulo = 0;             // radians
let girando = false;
let vel = 0;                // base velocity units (interpreted relative to 18ms frame)
let dur = 5000;
let ultimo = null;
let audioCtx = null;

/* vencedores */
let vencedores = JSON.parse(localStorage.getItem(PREFIX+'vencedores') || '[]');

/* som de vencedor */
const somVencedor = new Audio("vencedor.mp3");
somVencedor.volume = 0.100; // ajuste se quiser

function corAleatoria(){
  return `hsl(${Math.floor(Math.random()*360)},75%,60%)`;
}

/* audio ticks */
function ensureAudioContext(){
  if(!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended')
    audioCtx.resume();
}

function playTick(){
  try{
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1200, audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.08);
  }catch(e){}
}
/* funcao que controla o bip e o som da roleta ao parar*/
function playStopSound(){
  try{
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
  }catch(e){}
}

/* player de musica */
const musica = new Audio('musica.mp3');
musica.loop = true;

const volSalvo = localStorage.getItem(PREFIX+'volumeMusica');
if(volSalvo) musica.volume = parseFloat(volSalvo);

document.getElementById('volumeMusica').value = Math.round(musica.volume * 100);

let tocandoMusica = false;

document.getElementById('btnMusica').onclick = () => {
  if(!tocandoMusica){
    musica.currentTime = 0;
    musica.play().then(()=>{
      tocandoMusica = true;
      document.getElementById('btnMusica').textContent='⏸️ Parar Música';
    }).catch(()=>{});
  } else {
    musica.pause();
    tocandoMusica = false;
    document.getElementById('btnMusica').textContent='🎵 Tocar Música';
  }
};

document.getElementById('volumeMusica').oninput = e => {
  const vol = Math.max(0, Math.min(1, e.target.value / 100));
  musica.volume = vol;
  localStorage.setItem(PREFIX+'volumeMusica', vol);
};

/* persistencia de dados */
function salvar(){
  localStorage.setItem(PREFIX+'nomes', JSON.stringify(nomes));
  localStorage.setItem(PREFIX+'cores', JSON.stringify(cores));
}

// carregar modo salvo
const modoSalvo = localStorage.getItem(PREFIX+"modoCor") || "colorido";
document.getElementById("modoCor").value = modoSalvo;

// quando mudar, salvar no storage
document.getElementById("modoCor").addEventListener("change", () => {
  localStorage.setItem(PREFIX+"modoCor", document.getElementById("modoCor").value);
});

let tema = localStorage.getItem(PREFIX+"tema") || "escuro";
const btnTema = document.getElementById("btnTema");
const titulo = document.getElementById("titulo"); // h1

function aplicarTema(){
  if(tema === "claro"){
    document.body.classList.add("tema-claro");
    btnTema.textContent = "Tema";
  } else {
    document.body.classList.remove("tema-claro");
    btnTema.textContent = "Tema";
  }
}

if(btnTema){
  btnTema.addEventListener("click", () => {
    // alterna tema
    tema = (tema === "claro") ? "escuro" : "claro";
    localStorage.setItem(PREFIX+"tema", tema);
    aplicarTema();

    // alterna texto do H1
    if (titulo.textContent === "Roleta Rindo e Apoiando!!") {
      titulo.textContent = "Quem sao eles?";
    } else {
      titulo.textContent = "Roleta Rindo e Apoiando!!";
    }
  });
}

aplicarTema();

/* ---------------------
   Offscreen buffer setup
   --------------------- */
const bufferCanvas = document.createElement('canvas');
const bufferCtx = bufferCanvas.getContext('2d');
let animFrameId = null;   // for requestAnimationFrame loop
let giroFrameId = null;   // for active spinning loop id (same as animFrameId but kept separate for clarity)

/* generate buffer image of the wheel (called only when names/size change) */
function gerarBuffer(){
  const w = canvas.width, h = canvas.height;
  bufferCanvas.width = w;
  bufferCanvas.height = h;

  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 6;

  bufferCtx.clearRect(0,0,w,h);

  const t = nomes.length;
  if(!t){
    // empty wheel outline
    bufferCtx.beginPath();
    bufferCtx.arc(cx,cy,r,0,2*Math.PI);
    bufferCtx.lineWidth = 6;
    bufferCtx.strokeStyle = '#fff';
    bufferCtx.stroke();
    return;
  }

  const ap = 2*Math.PI / t;

  for (let i=0;i<t;i++){
    const ini = i*ap;
    bufferCtx.beginPath();
    bufferCtx.moveTo(cx,cy);
    bufferCtx.arc(cx,cy,r,ini,ini+ap);
    bufferCtx.closePath();
    bufferCtx.fillStyle = cores[i] || corAleatoria();
    bufferCtx.fill();

    bufferCtx.strokeStyle = '#222';
    bufferCtx.lineWidth = 1;
    bufferCtx.stroke();

    // text drawing
    bufferCtx.save();
    bufferCtx.translate(cx,cy);
    bufferCtx.rotate(ini + ap/2);
    bufferCtx.textAlign = 'right';
    bufferCtx.fillStyle = '#000';

    let nm = nomes[i] || '';
    bufferCtx.font = `bold ${(nm.length>18)?12:16}px Arial`;
    if(nm.length>24) nm = nm.slice(0,21) + '...';
    // position text a bit inside the rim
    bufferCtx.fillText(nm, r-45, 8);
    bufferCtx.restore();
  }

  // outer circle
  bufferCtx.beginPath();
  bufferCtx.arc(cx,cy,r,0,2*Math.PI);
  bufferCtx.lineWidth = 5;
  bufferCtx.strokeStyle = '#fff';
  bufferCtx.stroke();
}

/* efficient draw: rotate buffer onto visible canvas; optionally draw highlight wedge */
function desenhar(d = -1, b = 1){
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.rotate(angulo);
  ctx.drawImage(bufferCanvas, -w/2, -h/2);
  // draw highlight if needed (uses same rotation frame)
  if(d >= 0 && nomes.length){
    const t = nomes.length;
    const ap = 2*Math.PI / t;
    const r = Math.min(w,h)/2 - 6;
    const ini = d*ap;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,ini,ini+ap);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,0,${b})`;
    ctx.fill();

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/* tick detection - inexpensive */
function tick(){
  const t = nomes.length;
  if(!t) return;

  const ap = 2*Math.PI / t;
  const arrow = 3*Math.PI/2;

  const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
  const s = Math.floor(rel / ap);

  if(ultimo === null){
    ultimo = s;
    return;
  }

  if(s !== ultimo){
    playTick();
    ultimo = s;
  }
}

/* spin loop using requestAnimationFrame and delta-time scaling */
function girar(){
  if(nomes.length < 1){
    alert('Adicione pelo menos um nome.');
    return;
  }
  if(girando) return;

  overlay.classList.remove('mostrar');

  dur = (parseInt(tempo.value) || 5) * 1000;

  // keep same distribution as before (base number), but we'll scale with dt
  vel = Math.random()*0.35 + 0.5;
  girando = true;
  ultimo = null;

  const inicio = performance.now();
  let last = inicio;

  function loop(now){
    const delta = now - last;
    last = now;
    const d = now - inicio;

    // scale factor so behavior resembles previous setInterval(18ms) steps
    const scale = delta / 18;

    if(d < dur * 0.65){
      angulo += vel * scale;
    } else if(d < dur){
      // smooth slow down phase: reduce velocity gradually
      vel *= Math.pow(0.98, scale);
      angulo += vel * scale;
    } else {
      // finished spinning main phase
      girando = false;
      // proceed to smooth deceleration routine (suave) which uses rAF internally
      suave();
      return;
    }

    tick();
    desenhar();
    giroFrameId = requestAnimationFrame(loop);
  }

  giroFrameId = requestAnimationFrame(loop);
}

/* parar (stop) - cancels active spin loop and enters suave */
function parar(){
  if(girando){
    if(giroFrameId) cancelAnimationFrame(giroFrameId);
    girando = false;
    suave();
  }
}

/* desaceleração suave (keeps requestAnimationFrame) */
function suave(){
  // ensure vel still has some value; if not, set small random so loop runs a few frames
  if(vel <= 0) vel = 0.001;

  function step(){
    // delta-time approximation using fixed 18ms baseline
    vel *= 0.978;
    if(vel < 0.0005) vel = 0;
    angulo += vel;

    tick();
    desenhar();

    if(vel > 0){
      animFrameId = requestAnimationFrame(step);
    } else {
      // finalized stop
      if(animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      girando = false;

      const t = nomes.length;
      if(!t) return;

      const ap = 2*Math.PI / t;
      const arrow = 3*Math.PI/2;

      const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
      const i = Math.floor(rel / ap);
      const v = nomes[i];

      playStopSound();

      somVencedor.currentTime = 0;
      somVencedor.play().catch(()=>{});

      // highlight + show winner
      destacar(i);
      mostrarVencedor(v);
    }
  }
  animFrameId = requestAnimationFrame(step);
}

/* destaque animado - mantém o efeito original (pisca 3x) */
function destacar(i){
  let b = 1, desc = true, rp = 0;

  function anim(){
    desenhar(i,b);

    if(desc) b -= 0.1;
    else b += 0.1;

    if(b <= 0.3){
      desc = false;
      rp++;
    }

    if(b >= 1 && !desc){
      desc = true;
    }

    if(rp < 3)
      requestAnimationFrame(anim);
    else
      desenhar();
  }
  requestAnimationFrame(anim);
}

/* UI update */
function atualizar(){
  lista.innerHTML = '';
  nomes.forEach((nm,i)=>{
    const d = document.createElement('div');
    d.className = 'tagNome';
    d.innerHTML = `${nm} <button onclick="remover(${i})">×</button>`;
    lista.appendChild(d);
  });
}

function remover(i){
  nomes.splice(i,1);
  cores.splice(i,1);
  salvar();
  gerarBuffer();
  desenhar();
  atualizar();
}

function adicionar(){
  const n = nome.value.trim();
  let q = parseInt(qtd.value) || 1;

  const modo = localStorage.getItem(PREFIX+"modoCor") || "colorido";

  if(!n){
    alert('Digite um nome.');
    return;
  }

  for(let i = 0; i < q; i++){
    nomes.push(n);

    if(modo === "colorido"){
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
  atualizar();
}

function embaralhar(){
  // Fisher-Yates Shuffle mantendo a cor correspondente
  for(let i = nomes.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));

    // troca nomes
    const tmpNome = nomes[i];
    nomes[i] = nomes[j];
    nomes[j] = tmpNome;

    // troca cores
    const tmpCor = cores[i];
    cores[i] = cores[j];
    cores[j] = tmpCor;
  }

  salvar();
  gerarBuffer();
  desenhar();
  atualizar();
}


/* vencedores */
function atualizarVencedores(){
  const div = document.getElementById('listaVencedores');
  div.innerHTML = '';
  vencedores.slice(-20).reverse().forEach(v=>{
    const span = document.createElement('span');
    span.className = 'vencedorTag';
    span.textContent = v;
    div.appendChild(span);
  });
}

function salvarVencedores(){
  localStorage.setItem(PREFIX+'vencedores', JSON.stringify(vencedores));
  atualizarVencedores();
}

function mostrarVencedor(nm){
  overlay.textContent = ` 👉${nm}👈 `;
  overlay.classList.remove('mostrar');
  void overlay.offsetWidth;
  overlay.classList.add('mostrar');

  clearTimeout(overlay._timeoutId);
  overlay._timeoutId = setTimeout(()=>{
    overlay.classList.remove('mostrar');
    overlay.textContent = '';
  }, 4000);

  vencedores.push(nm);
  salvarVencedores();
}

/* limpar tudo */
function limpar(){
  if(!confirm('Tem certeza que deseja limpar tudo?')) return;
  nomes = [];
  cores = [];
  localStorage.removeItem(PREFIX+'nomes');
  localStorage.removeItem(PREFIX+'cores');
  gerarBuffer();
  desenhar();
  atualizar();
  overlay.classList.remove('mostrar');
}

/* CSV import/export */
document.getElementById('btnImportar').onclick = () => csv.click();

csv.addEventListener('change', () => {
  const f = csv.files[0];
  if(!f) return;

  const colIndex = parseInt(document.getElementById('colunaCSV').value);
  const reader = new FileReader();

  reader.onload = e => {
    const text = e.target.result;
    const linhas = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    const nomesImportados = [];

    for(const linha of linhas){
      const partes = linha.split(',');
      const nomeCol = (partes[colIndex] || '').trim();
      if(nomeCol) nomesImportados.push(nomeCol);
    }

    if(!nomesImportados.length){
      alert('Nenhum nome encontrado.');
      csv.value = '';
      return;
    }

    for(const nm of nomesImportados){
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
  if(!nomes.length){
    alert('Nenhum nome para exportar.');
    return;
  }

  const colIndex = parseInt(document.getElementById('colunaCSV').value);

  const linhas = nomes.map(n=>{
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

/* eventos */
document.getElementById('btnAdicionar').onclick = adicionar;
document.getElementById('btnEmbaralhar').onclick = embaralhar;
document.getElementById('btnIniciar').onclick = girar;
document.getElementById('btnParar').onclick = parar;
document.getElementById('btnLimpar').onclick = limpar;
document.getElementById('btnFullscreen').onclick = ()=>{
  if(!document.fullscreenElement)
    document.documentElement.requestFullscreen();
  else
    document.exitFullscreen();
};

document.addEventListener('fullscreenchange', ajustarCanvas);

document.getElementById('btnLimparVencedores').onclick = ()=>{
  if(!confirm('Remover todos os vencedores salvos?')) return;
  vencedores = [];
  salvarVencedores();
};

nome.addEventListener('keyup', e => {
  if(e.key === 'Enter') adicionar();
});

/* expose */
window.remover = remover;

/* init/load */
function carregar(){
  const n = JSON.parse(localStorage.getItem(PREFIX+'nomes') || '[]');
  const c = JSON.parse(localStorage.getItem(PREFIX+'cores') || '[]');

  nomes = n;
  cores = (c.length === n.length) ? c : n.map(()=>corAleatoria());

  // regenerate buffer and UI
  gerarBuffer();
  desenhar();
  atualizar();
  atualizarVencedores();
}

/* canvas sizing */
function ajustarCanvas(){
  const t = Math.min(window.innerWidth * 0.8, 700);
  // keep integer widths for crisp drawing
  const size = Math.floor(t);
  canvas.width = size;
  canvas.height = size;
  gerarBuffer();
  desenhar();
}
window.addEventListener('resize', ajustarCanvas);

/* startup */
ajustarCanvas();
carregar();



