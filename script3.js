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

// ===== IMPORTAR FILMES DA API =====

async function abrirModalFilmes() {
  let filmes = [];

  try {
    const res = await fetch("https://leoeisa-cmgn.onrender.com/filmes");
    filmes = await res.json();
  } catch (e) {
    alert("Erro ao buscar filmes. Verifique a conexão.");
    return;
  }

  // Cria o modal
  const overlay = document.createElement("div");
  overlay.id = "modalFilmesOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);
    z-index:9999;display:flex;align-items:center;justify-content:center;
  `;

  overlay.innerHTML = `
    <div style="
      background:#1a1a1a;border:2px solid #d108ac;border-radius:20px;
      padding:24px;width:min(95vw,480px);max-height:85vh;
      display:flex;flex-direction:column;gap:12px;
    ">
      <h2 style="margin:0;color:#fff;text-align:center;font-size:1.1rem;">🎬 Importar Filmes para a Roleta</h2>

      <div style="display:flex;gap:8px;align-items:center;">
        <input id="filmeSearch" type="text" placeholder="Pesquisar filme..." style="
          flex:1;padding:8px 12px;border-radius:10px;border:none;
          background:#333;color:#fff;font-size:13px;outline:none;
        ">
        <select id="filmeCategoria" style="
          padding:8px;border-radius:10px;border:none;
          background:#333;color:#fff;font-size:13px;
        ">
          <option value="">Todas categorias</option>
          ${[...new Set(filmes.map(f => f.category))].sort()
            .map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`)
            .join("")}
        </select>
      </div>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label style="color:#ccc;font-size:13px;">Quantidade:</label>
        <input id="filmeQtd" type="number" min="1" max="${filmes.length}" value="5" style="
          width:70px;padding:6px 10px;border-radius:10px;border:none;
          background:#333;color:#fff;font-size:13px;text-align:center;
        ">
        <button id="btnSelecionarTodos" style="
          padding:6px 12px;border-radius:10px;background:#555;
          color:#fff;font-size:12px;border:none;cursor:pointer;
        ">✅ Selecionar tudo</button>
        <button id="btnDesmarcarTodos" style="
          padding:6px 12px;border-radius:10px;background:#555;
          color:#fff;font-size:12px;border:none;cursor:pointer;
        ">❌ Desmarcar tudo</button>
      </div>

      <div id="filmeListaScroll" style="
        overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:6px;
        max-height:340px;padding-right:4px;
      "></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="btnCancelarFilmes" style="
          padding:10px 18px;border-radius:12px;background:#444;
          color:#fff;border:none;cursor:pointer;font-weight:700;
        ">Cancelar</button>
        <button id="btnConfirmarFilmes" style="
          padding:10px 18px;border-radius:12px;background:#d108ac;
          color:#fff;border:none;cursor:pointer;font-weight:700;
        ">🎬 Adicionar à Roleta</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const lista = document.getElementById("filmeListaScroll");
  const searchInput = document.getElementById("filmeSearch");
  const categoriaSelect = document.getElementById("filmeCategoria");
  const qtdInput = document.getElementById("filmeQtd");

  let selecionados = new Set();
  let qtdPorFilme = {}; // id -> quantidade de vezes na roleta

  function renderLista() {
    const busca = searchInput.value.toLowerCase();
    const cat = categoriaSelect.value;
    const filtrados = filmes.filter(f =>
      (!busca || f.title.toLowerCase().includes(busca)) &&
      (!cat || f.category === cat)
    );

    lista.innerHTML = "";
    filtrados.forEach(f => {
      if (!qtdPorFilme[f.id]) qtdPorFilme[f.id] = 1;
      const marcado = selecionados.has(f.id);
      const item = document.createElement("div");
      item.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:8px 12px;
        border-radius:10px;cursor:pointer;
        background:${marcado ? "rgba(209,8,172,0.25)" : "rgba(255,255,255,0.05)"};
        border:1px solid ${marcado ? "#d108ac" : "transparent"};
        transition:background 0.15s;
      `;

      // checkbox + nome + ano/cat
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = marcado;
      check.style.cssText = "accent-color:#d108ac;width:16px;height:16px;cursor:pointer;flex-shrink:0;";

      const titulo = document.createElement("span");
      titulo.style.cssText = "color:#fff;font-size:13px;flex:1;";
      titulo.textContent = f.title;

      const info = document.createElement("span");
      info.style.cssText = "color:#888;font-size:11px;white-space:nowrap;";
      info.textContent = `${f.year} · ${f.category}`;

      // controle de quantidade por filme
      const controle = document.createElement("div");
      controle.style.cssText = "display:flex;align-items:center;gap:4px;flex-shrink:0;";
      controle.innerHTML = `
        <button class="btn-preset" data-v="1"  style="padding:3px 7px;border-radius:8px;background:#444;color:#fff;font-size:11px;border:none;cursor:pointer;">1x</button>
        <button class="btn-preset" data-v="10" style="padding:3px 7px;border-radius:8px;background:#444;color:#fff;font-size:11px;border:none;cursor:pointer;">10x</button>
        <button class="btn-preset" data-v="20" style="padding:3px 7px;border-radius:8px;background:#444;color:#fff;font-size:11px;border:none;cursor:pointer;">20x</button>
        <input class="qtd-custom" type="number" min="1" value="${qtdPorFilme[f.id]}" style="
          width:46px;padding:3px 6px;border-radius:8px;border:1px solid #d108ac;
          background:#222;color:#d108ac;font-size:12px;font-weight:700;text-align:center;
        ">
      `;

      // Presets
      controle.querySelectorAll(".btn-preset").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const v = parseInt(btn.dataset.v);
          qtdPorFilme[f.id] = v;
          controle.querySelector(".qtd-custom").value = v;
          controle.querySelectorAll(".btn-preset").forEach(b => b.style.background = "#444");
          btn.style.background = "#d108ac";
        });
      });

      // Input livre
      controle.querySelector(".qtd-custom").addEventListener("click", e => e.stopPropagation());
      controle.querySelector(".qtd-custom").addEventListener("input", e => {
        const v = Math.max(1, parseInt(e.target.value) || 1);
        qtdPorFilme[f.id] = v;
        controle.querySelectorAll(".btn-preset").forEach(b => b.style.background = "#444");
      });

      item.appendChild(check);
      item.appendChild(titulo);
      item.appendChild(info);
      item.appendChild(controle);

      item.addEventListener("click", () => {
        if (selecionados.has(f.id)) selecionados.delete(f.id);
        else selecionados.add(f.id);
        renderLista();
      });

      lista.appendChild(item);
    });
  }

  renderLista();
  searchInput.addEventListener("input", renderLista);
  categoriaSelect.addEventListener("change", renderLista);

  document.getElementById("btnSelecionarTodos").onclick = () => {
    const busca = searchInput.value.toLowerCase();
    const cat = categoriaSelect.value;
    filmes.filter(f =>
      (!busca || f.title.toLowerCase().includes(busca)) &&
      (!cat || f.category === cat)
    ).forEach(f => selecionados.add(f.id));
    renderLista();
  };

  document.getElementById("btnDesmarcarTodos").onclick = () => {
    selecionados.clear();
    renderLista();
  };

  document.getElementById("btnConfirmarFilmes").onclick = () => {
    const modo = localStorage.getItem(PREFIX + "modoCor") || "colorido";
    let fonte = selecionados.size > 0
      ? filmes.filter(f => selecionados.has(f.id))
      : filmes;

    // Se nenhum selecionado, pega quantidade aleatória
    if (selecionados.size === 0) {
      const qtd = Math.min(parseInt(qtdInput.value) || 5, fonte.length);
      fonte = [...fonte].slice(0, qtd);
    }

    let adicionados = 0;
    for (const f of fonte) {
      const vezes = qtdPorFilme[f.id] || 1;
      for (let i = 0; i < vezes; i++) {
        nomes.push(f.title);
        cores.push(modo === "colorido" ? corAleatoria() : paletaNeutra[Math.floor(Math.random() * paletaNeutra.length)]);
      }
      adicionados++;
    }

    salvar();
    gerarBuffer();
    desenhar();
    embaralhar();
    atualizarCentro();
    atualizar();
    document.body.removeChild(overlay);
    alert(`✅ ${adicionados} filme(s) adicionado(s)!`);
  };

  document.getElementById("btnCancelarFilmes").onclick = () => {
    document.body.removeChild(overlay);
  };

  overlay.addEventListener("click", e => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

document.getElementById("btnFilmes").addEventListener("click", abrirModalFilmes);
