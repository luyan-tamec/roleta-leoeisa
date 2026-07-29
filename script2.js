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

// ─── VENCEDOR PRÉ-DEFINIDO (painel admin) ─────────────────────────────────────
// Se o admin definir um nome em "Vencedor Pré-definido" e esse nome estiver na
// roleta, o giro é guiado para parar exatamente nessa fatia. Se não houver nome
// definido (ou ele não estiver na roleta), o sorteio segue 100% aleatório.
let _vencedorForcadoIndex = null;

function _verificarVencedorForcado() {
  _vencedorForcadoIndex = null;
  const cfg = (typeof adminGetConfig === "function") ? adminGetConfig() : null;
  const nomeForcado = (cfg && cfg.vencedorForcado) ? String(cfg.vencedorForcado).trim() : "";
  if (!nomeForcado) return;

  const indices = [];
  nomes.forEach((n, idx) => { if (n.toLowerCase() === nomeForcado.toLowerCase()) indices.push(idx); });

  if (!indices.length) {
    console.warn(`[vencedor pré-definido] "${nomeForcado}" está definido no painel, mas não está na roleta agora.`);
    return;
  }
  _vencedorForcadoIndex = indices[Math.floor(Math.random() * indices.length)];
  console.log(`[vencedor pré-definido] Giro será direcionado para "${nomeForcado}" (posição ${_vencedorForcadoIndex}).`);
}

// Calcula um ângulo final (em radianos, sempre à frente do ângulo atual) que faz
// a seta apontar dentro da fatia do índice desejado, com uma pequena variação
// aleatória dentro da fatia para não parecer sempre "certinho no meio".
function _calcularAnguloParaIndice(indice) {
  const t = nomes.length;
  const ap = 2 * Math.PI / t;
  const arrow = 3 * Math.PI / 2;
  const jitter = (0.15 + Math.random() * 0.7) * ap; // evita cair bem na borda da fatia
  const relAlvo = indice * ap + jitter;
  const anguloBase = arrow - relAlvo;
  const voltasExtra = 3 + Math.floor(Math.random() * 3); // 3–5 voltas extras, só de efeito visual
  const passoAteBase = ((anguloBase - angulo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return angulo + passoAteBase + voltasExtra * 2 * Math.PI;
}

// Avisa o backend para limpar o "vencedor pré-definido" já usado, para que o
// próximo giro volte a ser aleatório automaticamente.
function _consumirVencedorForcado() {
  if (typeof ADMIN_BACKEND_URL === "undefined") return;
  fetch(`${ADMIN_BACKEND_URL}/api/config/consumir-vencedor`, { method: "POST" })
    .then(r => r.json())
    .then(res => {
      if (res.ok) sessionStorage.setItem("admin_config", JSON.stringify(res.data));
    })
    .catch(() => { /* sem internet/backend fora do ar: não bloqueia a roleta */ });
}

function girar() {
  if (nomes.length < 1) {
    alert('Adiciona um nome Aê Paizao.');
    return;
  }
  const meucheckmusic = document.getElementById("meucheckmusic");
  if (meucheckmusic.checked) {
    document.getElementById("btnMusica").click();
    musica.currentTime = 5;
  }
  if (girando) return;
  overlay.classList.remove('mostrar');
  dur = (parseInt(tempo.value) || 5) * 1000;
  vel = Math.random() * 0.35 + 0.5;
  girando = true;
  ultimo = null;
  _verificarVencedorForcado();
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
  // ─── Caso 1: há um vencedor pré-definido válido → desaceleração controlada ──
  if (_vencedorForcadoIndex !== null) {
    const indiceAlvo = _vencedorForcadoIndex;
    const anguloInicial = angulo;
    const anguloAlvo = _calcularAnguloParaIndice(indiceAlvo);
    const distancia = anguloAlvo - anguloInicial;
    const duracao = 2600; // ms
    const inicio = performance.now();
    function stepControlado(now) {
      const t = Math.min((now - inicio) / duracao, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic — desacelera suave até parar
      angulo = anguloInicial + distancia * ease;
      tick();
      desenhar();
      if (t < 1) {
        animFrameId = requestAnimationFrame(stepControlado);
      } else {
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        girando = false;
        _finalizarGiro(indiceAlvo, true);
      }
    }
    animFrameId = requestAnimationFrame(stepControlado);
    return;
  }

  // ─── Caso 2: sorteio 100% aleatório (comportamento original) ────────────────
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
      _finalizarGiro(i, false);
    }
  }
  animFrameId = requestAnimationFrame(step);
}

// Código compartilhado que roda quando a roleta acabou de parar (som, destaque,
// exibição do vencedor), tanto no sorteio aleatório quanto no vencedor forçado.
function _finalizarGiro(i, foiForcado) {
  const v = nomes[i];
  playStopSound();
  somVencedor.currentTime = 0;
  somVencedor.play().catch(() => { });
  setTimeout(() => {
    musica.pause();
    musica.currentTime = 0;
    document.getElementById('btnMusica').textContent = '🎵 Tocar Música';
  }, 3000);
  setTimeout(() => {
    document.body.classList.remove('painel-oculto');
    btnMostrar.style.display = 'none';
    // Para a animação de cor da roleta (corrigido — sem localStorage)
    if (typeof pararAnimacaoRoleta === 'function') pararAnimacaoRoleta();
  }, 2000);
  destacar(i);
  mostrarVencedor(v);
  if (foiForcado) {
    _vencedorForcadoIndex = null;
    _consumirVencedorForcado();
  }
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
