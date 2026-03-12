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
  }, 4000);
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