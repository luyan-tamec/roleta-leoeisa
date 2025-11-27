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
let angulo = 0;
let girando = false;
let vel = 0;
let intv;
let dur = 5000;
let ultimo = null;
let audioCtx = null;

/* vencedores */
let vencedores = JSON.parse(localStorage.getItem(PREFIX+'vencedores') || '[]');

/* som de vencedor */
const somVencedor = new Audio("vencedor.mp3");
somVencedor.volume = 1.0; // ajuste se quiser

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

/* persistence */
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


function carregar(){
  const n = JSON.parse(localStorage.getItem(PREFIX+'nomes') || '[]');
  const c = JSON.parse(localStorage.getItem(PREFIX+'cores') || '[]');

  nomes = n;
  cores = (c.length === n.length) ? c : n.map(()=>corAleatoria());

  desenhar();
  atualizar();
  atualizarVencedores();
}

/* canvas sizing */
function ajustarCanvas(){
  const t = Math.min(window.innerWidth * 0.8, 700);
  canvas.width = t;
  canvas.height = t;
  desenhar();
}

window.addEventListener('resize', ajustarCanvas);

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
  desenhar();
  atualizar();
}

/* desenho da roleta */
function desenhar(d=-1,b=1){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 6;

  ctx.clearRect(0,0,w,h);

  const t = nomes.length;
  if(!t){
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,2*Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    return;
  }

  const ap = 2*Math.PI / t;

  for(let i=0;i<t;i++){
    const ini = angulo + i*ap;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,ini,ini+ap);
    ctx.closePath();
    ctx.fillStyle = (i===d)?`rgba(255,255,0,${b})`:cores[i];
    ctx.fill();

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(ini + ap/2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    
    let nm = nomes[i];
    ctx.font = `bold ${(nm.length>18)?12:16}px Arial`;
    if(nm.length>24) nm = nm.slice(0,21) + '...';
    ctx.fillText(nm, r-45, 8);

    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,2*Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

/* tick deteccao */
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

/* girar */
function girar(){
  if(nomes.length < 1){
    alert('Adicione pelo menos um nome.');
    return;
  }
  if(girando) return;

  overlay.classList.remove('mostrar');

  dur = (parseInt(tempo.value) || 5) * 1000;

  vel = Math.random()*0.35 + 0.5;
  girando = true;
  ultimo = null;

  const ini = Date.now();

  intv = setInterval(()=>{
    const d = Date.now() - ini;
    if(d < dur*0.65){
      angulo += vel;
    } else if(d < dur){
      vel *= 0.98;
      angulo += vel;
    } else {
      clearInterval(intv);
      suave();
      return;
    }
    tick();
    desenhar();
  }, 18);
}

/* desaceleração suave */
function suave(){
  let step = ()=>{
    vel *= 0.986;
    if(vel < 0.0005) vel = 0;
    angulo += vel;

    tick();
    desenhar();

    if(vel > 0){
      requestAnimationFrame(step);
    } else {
      girando = false;

      const t = nomes.length;
      const ap = 2*Math.PI / t;
      const arrow = 3*Math.PI/2;

      const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
      const i = Math.floor(rel / ap);
      const v = nomes[i];

      playStopSound();

      somVencedor.currentTime = 0;
      somVencedor.play().catch(()=>{});
      
      destacar(i);
      mostrarVencedor(v);
    }
  };
  requestAnimationFrame(step);
}

/* destaque animado */
function destacar(i){
  let b = 1, d = true, rp = 0;

  function anim(){
    desenhar(i,b);

    if(d) b -= 0.1;
    else b += 0.1;

    if(b <= 0.3){
      d = false;
      rp++;
    }

    if(b >= 1 && !d){
      d = true;
    }

    if(rp < 3)
      requestAnimationFrame(anim);
    else
      desenhar();
  }
  requestAnimationFrame(anim);
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
  desenhar();
  atualizar();
  overlay.classList.remove('mostrar');
}

/* CSV */
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
document.getElementById('btnIniciar').onclick = girar;
document.getElementById('btnParar').onclick = ()=>{
  if(girando){
    clearInterval(intv);
    suave();
  }
};
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

/* init */
ajustarCanvas();
carregar();
