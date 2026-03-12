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
    alert('Adiciona um nome Aê Paizao.');
    return;
  }
  const meucheckmusic = document.getElementById("meucheckmusic")
  if (meucheckmusic.checked) {
    document.getElementById("btnMusica").click()
    musica.currentTime = 5;
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
      let intervaloId = localStorage.getItem("interval")
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