/* PREFIXO EXCLUSIVO PARA O INDEX2 */
const PREFIX = "r2_";

/* elementos */
const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');
const nome = document.getElementById('nome');
const qtd = document.getElementById('quantidade');
const tempo = document.getElementById('tempo');
const overlay = document.getElementById('resultadoOverlay');
const lista = document.getElementById('listaNomes');
const csv = document.getElementById('inputCSV');

const twitchChannelInput = document.getElementById('twitchChannel');
const twitchKeywordInput = document.getElementById('twitchKeyword');
const btnToggleTwitch = document.getElementById('btnToggleTwitch');
const twitchStatus = document.getElementById('twitchStatus');

/* estado */
let nomes = [];
let cores = [];
let angulo = 0;
let girando = false;
let vel = 0;
let intv;
let dur = 5000;
let ultimo = null;
let audioCtx = null;

let clientTMI = null;
let twitchConnected = false;

/* paleta neutra */
const paletaNeutra = [
  "#e0e0e0", "#cfcfcf", "#bdbdbd", "#9e9e9e",
  "#8d8d8d", "#7d7d7d", "#6e6e6e", "#5e5e5e","#faf8f5", "#f2eee8", "#e9e4da", "#ded7cc",
  "#d2cbbe", "#c7c0b4", "#bcb5a9", "#b0a99f",
  "#a59e95", "#9a938a", "#8f887f", "#847d75","#f2f4f7", "#e6e9ed", "#d9dde2", "#ccd1d6",
  "#c0c5cb", "#b3b9c0", "#a7adb4", "#9aa1a9",
  "#8e959d", "#828992", "#767d86", "#6a717a"
];

/* vencedores */
let vencedores = JSON.parse(localStorage.getItem(PREFIX+'vencedores') || '[]');

/* modo de cor salvo */
let modoCor = localStorage.getItem(PREFIX+"modoCor") || "colorido";
const modoCorSelect = document.getElementById("modoCor");

if (modoCorSelect) {
  modoCorSelect.value = modoCor;
  modoCorSelect.addEventListener("change", () => {
    modoCor = modoCorSelect.value;
    localStorage.setItem(PREFIX+"modoCor", modoCor);
  });
}

/* tema */
let tema = localStorage.getItem(PREFIX+"tema") || "escuro";
const btnTema = document.getElementById("btnTema");

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
    tema = (tema === "claro") ? "escuro" : "claro";
    localStorage.setItem(PREFIX+"tema", tema);
    aplicarTema();
  });
}
aplicarTema();

/* volumes independentes */
let volTick = parseFloat(localStorage.getItem(PREFIX+"volTick") || 0.6);
let volFinal = parseFloat(localStorage.getItem(PREFIX+"volFinal") || 0.8);
let volMusica = parseFloat(localStorage.getItem(PREFIX+"volMusica") || 0.5);

const sliderVolTick = document.getElementById("volTick");
const sliderVolFinal = document.getElementById("volFinal");
const sliderVolMusica = document.getElementById("volMusica");

if(sliderVolTick) sliderVolTick.value = volTick * 100;
if(sliderVolFinal) sliderVolFinal.value = volFinal * 100;
if(sliderVolMusica) sliderVolMusica.value = volMusica * 100;

if(sliderVolTick)
  sliderVolTick.oninput = e => {
    volTick = e.target.value / 100;
    localStorage.setItem(PREFIX+"volTick", volTick);
  };

if(sliderVolFinal)
  sliderVolFinal.oninput = e => {
    volFinal = e.target.value / 100;
    localStorage.setItem(PREFIX+"volFinal", volFinal);
  };

if(sliderVolMusica)
  sliderVolMusica.oninput = e => {
    volMusica = e.target.value / 100;
    musica.volume = volMusica;
    localStorage.setItem(PREFIX+"volMusica", volMusica);
  };

/* música de fundo */
const musica = new Audio('musica2.mp3');
musica.loop = true;
musica.volume = volMusica;

let tocandoMusica = false;
const btnMusica = document.getElementById('btnMusica');

if(btnMusica){
  btnMusica.addEventListener('click', () => {
    if(!tocandoMusica){
      musica.currentTime = 0;
      musica.play().then(()=>{
        tocandoMusica = true;
        btnMusica.textContent = '⏸ Parar Música';
      });
    } else {
      musica.pause();
      tocandoMusica = false;
      btnMusica.textContent = '🎵 Tocar Música';
    }
  });
}

/* áudio */
function ensureAudioContext(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}

function playTick(){
  try{
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1200, audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(volTick, audioCtx.currentTime + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.08);
  }catch(e){}
}

function playStopSound(){
  try{
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.06);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(volFinal, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 1.25);
  }catch(e){}
}

/* randoizador de cor */
function corAleatoria(){
  return `hsl(${Math.floor(Math.random()*360)},75%,60%)`;
}

/* persistência */
function salvar(){
  localStorage.setItem(PREFIX+'nomes', JSON.stringify(nomes));
  localStorage.setItem(PREFIX+'cores', JSON.stringify(cores));
  localStorage.setItem(PREFIX+"modoCor", modoCor);
}

function carregar(){
  nomes = JSON.parse(localStorage.getItem(PREFIX+'nomes') || '[]');
  cores = JSON.parse(localStorage.getItem(PREFIX+'cores') || '[]');
  if(cores.length !== nomes.length) cores = nomes.map(()=>corAleatoria());
  atualizar();
  desenhar();
  atualizarVencedores();
}

/* adicionar / remover */
function adicionar(){
  const n = nome.value.trim();
  let q = parseInt(qtd.value) || 1;
  if(!n){ alert("Digite um nome."); return; }

  for(let i=0;i<q;i++){
    nomes.push(n);

    if(modoCor === "colorido") cores.push(corAleatoria());
    else cores.push(paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);
  }

  nome.value=''; qtd.value=1;
  salvar(); atualizar(); desenhar();
}

function remover(i){
  nomes.splice(i,1);
  cores.splice(i,1);
  salvar(); atualizar(); desenhar();
}
window.remover = remover;

/* atualizar lista UI */
function atualizar(){
  lista.innerHTML = "";
  nomes.forEach((nm,i)=>{
    const d = document.createElement('div');
    d.className = 'tagNome';
    d.innerHTML = `${nm} <button onclick="remover(${i})">×</button>`;
    lista.appendChild(d);
  });
}

/* desenho da roleta */
function desenhar(dest=-1, brilho=1){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 6;

  ctx.clearRect(0,0,w,h);

  if(!nomes.length){
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,2*Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = (tema === 'claro') ? '#000' : '#fff';
    ctx.stroke();
    return;
  }

  const total = nomes.length;
  const ap = 2*Math.PI / total;

  for(let i=0;i<total;i++){
    const ini = angulo + i*ap;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,ini,ini+ap);
    ctx.closePath();

    ctx.fillStyle = (i===dest)?`rgba(255,255,0,${brilho})`:cores[i];
    ctx.fill();

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(ini + ap/2);
    ctx.textAlign='right';
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
  ctx.strokeStyle = (tema==='claro') ? '#000' : '#fff';
  ctx.stroke();
}

/* tick detector */
function tick(){
  if(!nomes.length) return;

  const total = nomes.length;
  const ap = 2*Math.PI / total;
  const arrow = 3*Math.PI/2;

  const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
  const s = Math.floor(rel / ap);

  if(ultimo === null){ ultimo = s; return; }

  if(s !== ultimo){
    playTick();
    ultimo = s;
  }
}

/* girar */
function girar(){
  if(nomes.length < 1){ alert('Adicione pelo menos um nome.'); return; }
  if(girando) return;

  overlay.classList.remove('mostrar');
  dur = (parseInt(tempo.value) || 5) * 1000;

  vel = Math.random()*0.35 + 0.5;
  girando = true;
  ultimo = null;

  const ini = Date.now();

  intv = setInterval(()=>{
    const d = Date.now() - ini;

    if(d < dur*0.65) angulo += vel;
    else if(d < dur){ vel *= 0.98; angulo += vel; }
    else { clearInterval(intv); suave(); return; }

    tick();
    desenhar();
  }, 18);
}

function suave(){
  let step = () => {
    vel *= 0.96;
    if(vel < 0.0005) vel = 0;

    angulo += vel;
    tick();
    desenhar();

    if(vel > 0) requestAnimationFrame(step);
    else {
      girando = false;

      const total = nomes.length;
      const ap = 2*Math.PI / total;
      const arrow = 3*Math.PI/2;

      const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
      const i = Math.floor(rel / ap);
      const v = nomes[i];

      playStopSound();
      destacar(i);
      mostrarVencedor(v);
    }
  };

  requestAnimationFrame(step);
}

function destacar(i){
  let b=1,d=true,rp=0;

  function anim(){
    desenhar(i,b);

    if(d) b -= 0.1;
    else b += 0.1;

    if(b <= 0.3){
      d = false;
      rp++;
    }
    if(b >= 1 && !d) d = true;

    if(rp < 3) requestAnimationFrame(anim);
    else desenhar();
  }

  requestAnimationFrame(anim);
}

/* vencedores */
function mostrarVencedor(nm){
  overlay.textContent = ` 👉${nm}👈 `;
  overlay.classList.remove('mostrar');
  void overlay.offsetWidth;
  overlay.classList.add('mostrar');

  clearTimeout(overlay._timeoutId);

  overlay._timeoutId = setTimeout(()=>{
    overlay.classList.remove('mostrar');
    overlay.textContent='';
  }, 4000);

  vencedores.push({nome: nm, when: new Date().toISOString()});
  salvarVencedores();
}

function atualizarVencedores(){
  const div = document.getElementById('listaVencedores');
  if(!div) return;

  div.innerHTML = '';

  vencedores.slice(-20).reverse().forEach(v=>{
    const span = document.createElement('span');
    span.className='vencedorTag';

    const date = new Date(v.when);
    span.textContent = `${v.nome} — ${date.toLocaleString()}`;

    div.appendChild(span);
  });
}

function salvarVencedores(){
  localStorage.setItem(PREFIX+'vencedores', JSON.stringify(vencedores));
  atualizarVencedores();
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

/* CSV import/export */
const btnImportar = document.getElementById('btnImportar');

if(btnImportar)
  btnImportar.addEventListener('click', ()=> csv.click());

csv.addEventListener('change', () => {
  const f = csv.files[0];
  if(!f) return;

  const colIndex = parseInt(document.getElementById('colunaCSV').value);
  const reader = new FileReader();

  reader.onload = e => {
    const linhas = e.target.result.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    const importados = [];

    for(const linha of linhas){
      const partes = linha.split(',');
      const nomeCol = (partes[colIndex] || '').trim();
      if(nomeCol) importados.push(nomeCol);
    }

    if(!importados.length){
      alert('Nenhum nome encontrado.');
      csv.value='';
      return;
    }

    for(const nm of importados){
      nomes.push(nm);
      if(modoCor === "colorido") cores.push(corAleatoria());
      else cores.push(paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);
    }

    salvar();
    desenhar();
    atualizar();
    csv.value='';

    alert(`🎉 Importados ${importados.length} nomes.`);
  };

  reader.readAsText(f);
});

const btnExportar = document.getElementById('btnExportar');

if(btnExportar)
  btnExportar.addEventListener('click', ()=>{

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

    const blob = new Blob([linhas.join('\n')], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "nomes_roleta.csv";
    a.click();

    URL.revokeObjectURL(url);
});

/* botões */
const btnAdicionar = document.getElementById('btnAdicionar');
if(btnAdicionar) btnAdicionar.addEventListener('click', adicionar);

const btnIniciar = document.getElementById('btnIniciar');
if(btnIniciar) btnIniciar.addEventListener('click', girar);

const btnParar = document.getElementById('btnParar');
if(btnParar)
  btnParar.addEventListener('click', ()=>{
    if(girando){
      clearInterval(intv);
      suave();
    }
  });

const btnLimpar = document.getElementById('btnLimpar');
if(btnLimpar) btnLimpar.addEventListener('click', limpar);

const btnLimparVencedores = document.getElementById('btnLimparVencedores');
if(btnLimparVencedores)
  btnLimparVencedores.addEventListener('click', ()=>{
    if(!confirm('Remover todos os vencedores salvos?')) return;
    vencedores = [];
    salvarVencedores();
  });

nome.addEventListener('keyup', e => {
  if(e.key === 'Enter') adicionar();
});

/* fullscreen */
const btnFullscreen = document.getElementById('btnFullscreen');

if(btnFullscreen)
  btnFullscreen.addEventListener('click', ()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

document.addEventListener('fullscreenchange', ajustarCanvas);

/* canvas resizing */
function ajustarCanvas(){
  const t = Math.min(window.innerWidth * 0.8, 700);
  canvas.width = t;
  canvas.height = t;
  desenhar();
}
window.addEventListener('resize', ajustarCanvas);

/* script para ler o chat */

function connectTwitch(channel, keyword){
  if(!channel){
    setTwitchStatus("Informe um canal válido.");
    return;
  }

  if(!keyword){
    setTwitchStatus("Informe uma palavra-chave.");
    return;
  }

  if(clientTMI){
    try{ clientTMI.disconnect(); }catch(e){}
    clientTMI = null;
  }

  try {

    clientTMI = new tmi.Client({
      connection: { reconnect: true, secure: true },
      channels: [ channel ]
    });

    /* listeners ANTES de conectar */
    clientTMI.on('message', (chan, tags, message, self) => {
      if(self) return;
      if(!message) return;

      const kw = keyword.toLowerCase();
      if(!kw) return;

      if(message.toLowerCase().includes(kw)){
        const usuario = (tags['display-name'] || tags['username'] || '').trim();
        if(!usuario) return;

        const lower = usuario.toLowerCase();
        if(['streamelements','nightbot','moobot','streamlabs'].includes(lower))
          return;

        if(nomes.includes(usuario)) return;

        nomes.push(usuario);

        if(modoCor === "colorido")
          cores.push(corAleatoria());
        else
          cores.push(paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);

        salvar();
        atualizar();
        desenhar();

        console.log("Adicionado via Twitch:", usuario);
      }
    });

    clientTMI.connect().then(()=>{
      twitchConnected = true;
      btnToggleTwitch.textContent = 'Desconectar Twitch';
      setTwitchStatus(`Conectado: ${channel}`);
    }).catch(err=>{
      setTwitchStatus('Erro ao conectar');
      console.error(err);
    });

  } catch(e){
    setTwitchStatus('Erro (console)');
    console.error(e);
  }
}

function disconnectTwitch(){
  if(clientTMI){
    try{ clientTMI.disconnect(); }catch(e){}
    clientTMI = null;
  }
  twitchConnected = false;
  setTwitchStatus("Desconectado");
  btnToggleTwitch.textContent = 'Conectar Twitch';
}

function setTwitchStatus(txt){
  twitchStatus.textContent = txt;
}

/* botão conectar */
if(btnToggleTwitch){

  btnToggleTwitch.addEventListener('click', ()=>{

    const channel = (twitchChannelInput.value || '').trim();
    const keyword = (twitchKeywordInput.value || '').trim();

    if(!twitchConnected){

      localStorage.setItem(PREFIX+'twitchChannel', channel);
      localStorage.setItem(PREFIX+'twitchKeyword', keyword);

      connectTwitch(channel, keyword);
    } else {
      disconnectTwitch();
    }

  });

  const savedChan = localStorage.getItem(PREFIX+'twitchChannel') || '';
  const savedKw = localStorage.getItem(PREFIX+'twitchKeyword') || '';

  twitchChannelInput.value = savedChan;
  twitchKeywordInput.value = savedKw;

  if(savedChan && savedKw)
    setTwitchStatus("Pronto — pressione Conectar");
  else
    setTwitchStatus("Desconectado");
}

/* init */
function init(){
  ajustarCanvas();
  carregar();
}
init();
