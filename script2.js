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
let angulo = 0;            // ângulo atual em radianos
let girando = false;
let vel = 0;
let dur = 5000;            //   duração do giro em ms
let iniciadoEm = 0;
let estado = 'idle';       // 'idle' | 'spinning' | 'slowing' | 'highlight'
let ultimoSetor = null;
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
    gerarRoletaEstaticaDebounced();
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
      }).catch(()=>{});
    } else {
      musica.pause();
      tocandoMusica = false;
      btnMusica.textContent = '🎵 Tocar Música';
    }
  });
}

/* audio context */
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
  if(cores.length !== nomes.length) cores = nomes.map(()=> modoCor === "colorido" ? corAleatoria() : paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);
  atualizar();
  gerarRoletaEstatica();
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
  salvar(); atualizar(); gerarRoletaEstaticaDebounced();
}
function remover(i){
  nomes.splice(i,1);
  cores.splice(i,1);
  salvar(); atualizar(); gerarRoletaEstaticaDebounced();
}
window.remover = remover;

/* atualizar lista UI - usa fragment para performance */
function atualizar(){
  lista.innerHTML = "";
  if(!nomes.length) return;
  const frag = document.createDocumentFragment();
  for(let i=0;i<nomes.length;i++){
    const nm = nomes[i];
    const d = document.createElement('div');
    d.className = 'tagNome';
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.onclick = (() => (idx => () => remover(idx))(i))();
    d.textContent = nm + ' ';
    d.appendChild(btn);
    frag.appendChild(d);
  }
  lista.appendChild(frag);
}

/* --- Offscreen static canvas (desenho pesado apenas quando lista muda) --- */
let staticCanvas = document.createElement('canvas');
let staticCtx = staticCanvas.getContext('2d');
let staticReady = false;

/* cache de labels para reduzir operações durante geração */
let labelCache = []; // cada item: {text: 'Nome...', fontSize: 16, short: 'Nom...'}

function gerarLabelCache(){
  labelCache = nomes.map(nm => {
    const short = (nm.length > 24) ? nm.slice(0,21) + '...' : nm;
    const fontSize = (nm.length > 18) ? 12 : 16;
    return { raw: nm, short, fontSize };
  });
}

/* ajustar canvas para DPI e tamanho responsivo */
function ajustarCanvas(){
  // define um tamanho visual e um tamanho real considerando devicePixelRatio
  const visual = Math.min(window.innerWidth * 0.8, 500);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = visual + 'px';
  canvas.style.height = visual + 'px';
  canvas.width = Math.round(visual * dpr);
  canvas.height = Math.round(visual * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // normaliza contexto para coordenadas CSS
  // também atualiza offscreen canvas proporção
  staticCanvas.width = canvas.width;
  staticCanvas.height = canvas.height;
  staticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // quando o tamanho muda, precisamos regenerar
  gerarRoletaEstaticaDebounced();
}
window.addEventListener('resize', debounce(ajustarCanvas, 120));

/* função debounced para não gerar estática repetidamente */
const gerarRoletaEstaticaDebounced = debounce(gerarRoletaEstatica, 120);

/* gerar a roleta no canvas offscreen - operação pesada, executada só quando lista muda */
function gerarRoletaEstatica(){
  const w = canvas.width, h = canvas.height;
  // se canvas ainda não recebeu dimensões calculadas, adie
  if(!w || !h){ staticReady = false; return; }

  const cssW = parseFloat(canvas.style.width) || w;
  const cssH = parseFloat(canvas.style.height) || h;
  const cx = cssW/2, cy = cssH/2;
  const r = Math.min(cssW, cssH)/2 - 6;

  staticCtx.clearRect(0,0,cssW,cssH);

  if(!nomes.length){
    staticReady = false;
    return;
  }

  gerarLabelCache();

  const total = nomes.length;
  const ap = 2 * Math.PI / total;

  // desenhar slices
  for (let i = 0; i < total; i++){
    const ini = i * ap;
    staticCtx.beginPath();
    staticCtx.moveTo(cx, cy);
    staticCtx.arc(cx, cy, r, ini, ini + ap);
    staticCtx.closePath();

    staticCtx.fillStyle = cores[i] || (modoCor === "colorido" ? corAleatoria() : paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);
    staticCtx.fill();

    staticCtx.lineWidth = 1;
    staticCtx.strokeStyle = '#222';
    staticCtx.stroke();

    // texto: desenhado girado diretamente no offscreen
    staticCtx.save();
    staticCtx.translate(cx, cy);
    staticCtx.rotate(ini + ap/2);

    staticCtx.textAlign = 'right';
    staticCtx.fillStyle = '#000';
    const cache = labelCache[i];
    staticCtx.font = `bold ${cache.fontSize}px Arial`;
    staticCtx.fillText(cache.short, r - 45, 8);

    staticCtx.restore();
  }

  // círculo externo
  staticCtx.beginPath();
  staticCtx.arc(cx, cy, r, 0, 2*Math.PI);
  staticCtx.lineWidth = 5;
  staticCtx.strokeStyle = (tema==='claro') ? '#000' : '#fff';
  staticCtx.stroke();

  staticReady = true;
}

/* desenhar função leve (chamada a cada frame) */
function desenhar(dest=-1, brilho=1){
  const cssW = parseFloat(canvas.style.width) || canvas.width;
  const cssH = parseFloat(canvas.style.height) || canvas.height;
  const cx = cssW/2, cy = cssH/2;
  ctx.clearRect(0,0,cssW,cssH);

  if(staticReady){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angulo);
    // drawImage com as dimensões CSS (offscreen também em CSS coords)
    ctx.drawImage(staticCanvas, -cx, -cy, cssW, cssH);
    ctx.restore();
  } else {
    // fallback: desenha um círculo vazio
    ctx.beginPath();
    const r = Math.min(cssW, cssH)/2 - 6;
    ctx.arc(cx,cy,r,0,2*Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = (tema === 'claro') ? '#000' : '#fff';
    ctx.stroke();
  }

  // borda (sempre)
  const r = Math.min(cssW, cssH)/2 - 6;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,2*Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = (tema==='claro') ? '#000' : '#fff';
  ctx.stroke();

  // destaque (overlay) — 
  if(dest >= 0 && nomes.length){
    const total = nomes.length;
    const ap = 2*Math.PI / total;
    const ini = dest * ap;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angulo + ini);
    ctx.fillStyle = `rgba(255,255,0,${brilho})`;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,0,ap);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/* tick detector otimizado (sem operações extras) */
function tickDetector(){
  if(!nomes.length) return;
  const total = nomes.length;
  const ap = 2*Math.PI / total;
  const arrow = 3*Math.PI/2; // posição fixa da seta
  const rel = ((arrow - angulo) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
  const s = Math.floor(rel / ap);
  if(ultimoSetor === null){ ultimoSetor = s; return; }
  if(s !== ultimoSetor){
    // trocou de setor -> tick
    playTick();
    ultimoSetor = s;
  }
}

/* animação principal (requestAnimationFrame) */
let rafId = null;
function iniciarLoop(){
  if(rafId) return;
  let lastTS = performance.now();
  function loop(ts){
    const dt = ts - lastTS;
    lastTS = ts;

    if(estado === 'spinning'){
      const elapsed = Date.now() - iniciadoEm;
      if(elapsed < dur*0.65){
        angulo += vel * (dt / 16.67); // escalar por delta (suaviza em variações de framerate)
      } else if(elapsed < dur){
        // desaceleração suave
        vel *= 0.995;
        angulo += vel * (dt / 16.67);
      } else {
        estado = 'slowing';
      }
      tickDetector();
      desenhar();
    } else if(estado === 'slowing'){
      // usar multiplicador para desaceleração final
      vel *= 0.986;
      if(Math.abs(vel) < 0.0005) vel = 0;
      angulo += vel * (dt / 16.67);
      tickDetector();
      desenhar();
      if(Math.abs(vel) === 0){
        // terminou
        estado = 'idle';
        girando = false;
        finalizarGiro();
      }
    } else if(estado === 'highlight'){
      // durante highlight, manter desenhando highlight animado (controlado por destacar)
      // destacar() usa requestAnimationFrame por conta própria
      desenhar();
    } else {
      // idle -> pouco trabalho, apenas desenhar se necessário
      // mas mantemos desenhar para refletir eventuais overlay
      desenhar();
    }

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
function pararLoop(){
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

/* iniciar giro */
function girar(){
  if(nomes.length < 1){ alert('Adicione pelo menos um nome.'); return; }
  if(girando) return;

  overlay.classList.remove('mostrar');
  dur = (parseInt(tempo.value) || 5) * 1000;

  // velocidade inicial aleatória (ajustada para sensação)
  vel = (Math.random()*0.35 + 0.5);
  girando = true;
  estado = 'spinning';
  iniciadoEm = Date.now();
  ultimoSetor = null;

  // garante loop ativo
  iniciarLoop();
}

/* quando o giro termina, decidir vencedor e tocar som */
function finalizarGiro(){
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

/* destacar vencedor (animação simples, roda por conta própria) */
function destacar(i){
  estado = 'highlight';
  let b = 1, d = true, rp = 0;
  function anim(){
    desenhar(i, b);

    if(d) b -= 0.1;
    else b += 0.1;

    if(b <= 0.3){
      d = false;
      rp++;
    }
    if(b >= 1 && !d) d = true;

    if(rp < 3) requestAnimationFrame(anim);
    else {
      desenhar();
      estado = 'idle';
    }
  }
  requestAnimationFrame(anim);
}

/* mostrar overlay e armazenar vencedor */
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

/* vencedores UI */
function atualizarVencedores(){
  const div = document.getElementById('listaVencedores');
  if(!div) return;
  div.innerHTML = '';
  const frag = document.createDocumentFragment();
  vencedores.slice(-20).reverse().forEach(v=>{
    const span = document.createElement('span');
    span.className='vencedorTag';
    const date = new Date(v.when);
    span.textContent = `${v.nome} — ${date.toLocaleString()}`;
    frag.appendChild(span);
  });
  div.appendChild(frag);
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

  staticReady = false;
  gerarRoletaEstaticaDebounced();
  atualizar();
  overlay.classList.remove('mostrar');
}

/* CSV import/export (otimizado) */
const btnImportar = document.getElementById('btnImportar');
if(btnImportar) btnImportar.addEventListener('click', ()=> csv.click());

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
    atualizar();
    gerarRoletaEstaticaDebounced();
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
      // força finalização imediata: cancela spinning e entra em slowing
      estado = 'slowing';
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

/* script para ler o chat (tmi) */
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

        // evitar duplicatas (case-insensitive)
        const exists = nomes.some(n => n.toLowerCase() === usuario.toLowerCase());
        if(exists) return;

        nomes.push(usuario);

        if(modoCor === "colorido")
          cores.push(corAleatoria());
        else
          cores.push(paletaNeutra[Math.floor(Math.random()*paletaNeutra.length)]);

        salvar();
        atualizar();
        gerarRoletaEstaticaDebounced();

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

/* util: debounce */
function debounce(fn, wait=100){
  let t = null;
  return function(...a){
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this, a), wait);
  };
}

/* init */
function init(){
  ajustarCanvas();
  carregar();
  iniciarLoop();
}
init();
