// supabase-frontend.js
// Carregar dynamicamente imagens e sons do Supabase no frontend da roleta

class RoletaSupabaseLoader {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || window.location.origin;
    this.cacheTime = options.cacheTime || 5 * 60 * 1000; // 5 minutos
    this.cache = {
      imagens: null,
      sons: null,
      imagemsCacheTime: 0,
      sonsCacheTime: 0,
    };
  }

  /**
   * Carregar todas as imagens da roleta do Supabase
   * @returns {Promise<Array>}
   */
  async carregarImagens(forceRefresh = false) {
    const agora = Date.now();

    // Se tem cache válido, retornar
    if (
      !forceRefresh &&
      this.cache.imagens &&
      agora - this.cache.imagemsCacheTime < this.cacheTime
    ) {
      console.log("📸 Usando cache de imagens");
      return this.cache.imagens;
    }

    try {
      console.log("📥 Carregando imagens do Supabase...");
      const response = await fetch(`${this.apiUrl}/api/imagens-sb`);
      const data = await response.json();

      if (!data.ok || !data.imagens) {
        throw new Error("Erro ao carregar imagens");
      }

      // Armazenar em cache
      this.cache.imagens = data.imagens;
      this.cache.imagemsCacheTime = agora;

      console.log(`✅ ${data.total} imagens carregadas`);
      return data.imagens;
    } catch (error) {
      console.error("❌ Erro ao carregar imagens:", error);
      // Retornar cache antigo se houver erro
      return this.cache.imagens || [];
    }
  }

  /**
   * Carregar todos os sons/música do Supabase
   * @returns {Promise<Object>}
   */
  async carregarSons(forceRefresh = false) {
    const agora = Date.now();

    if (
      !forceRefresh &&
      this.cache.sons &&
      agora - this.cache.sonsCacheTime < this.cacheTime
    ) {
      console.log("🎵 Usando cache de sons");
      return this.cache.sons;
    }

    try {
      console.log("📥 Carregando sons do Supabase...");
      const response = await fetch(`${this.apiUrl}/api/sons-sb`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error("Erro ao carregar sons");
      }

      this.cache.sons = data.playlist;
      this.cache.sonsCacheTime = agora;

      console.log(`✅ ${data.total} sons carregados`);
      return data.playlist;
    } catch (error) {
      console.error("❌ Erro ao carregar sons:", error);
      return this.cache.sons || { musicas: [], efeitos: [], todos: [] };
    }
  }

  /**
   * Carregar imagens e sons simultaneamente
   * @returns {Promise<{imagens: Array, sons: Object}>}
   */
  async carregarTudo(forceRefresh = false) {
    try {
      const [imagens, sons] = await Promise.all([
        this.carregarImagens(forceRefresh),
        this.carregarSons(forceRefresh),
      ]);

      return { imagens, sons };
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      return {
        imagens: this.cache.imagens || [],
        sons: this.cache.sons || { musicas: [], efeitos: [], todos: [] },
      };
    }
  }

  /**
   * Obter URL de uma imagem específica
   * @param {string} nomeImagem
   * @returns {Promise<string>}
   */
  async obterURLImagem(nomeImagem) {
    const imagens = await this.carregarImagens();
    const imagem = imagens.find((img) => img.name === nomeImagem);
    return imagem ? imagem.url : null;
  }

  /**
   * Obter URL de um som específico
   * @param {string} nomeSom
   * @returns {Promise<string>}
   */
  async obterURLSom(nomeSom) {
    const dados = await this.carregarSons();
    const som = dados.todos.find((s) => s.name === nomeSom);
    return som ? som.url : null;
  }

  /**
   * Atualizar lista de imagens dinamicamente (útil para renovar sem hard refresh)
   */
  async atualizarImagens() {
    return this.carregarImagens(true);
  }

  /**
   * Atualizar lista de sons dinamicamente
   */
  async atualizarSons() {
    return this.carregarSons(true);
  }

  /**
   * Criar elemento HTML de imagem do Supabase
   * @param {Object} imagem - Objeto da imagem
   * @param {Object} options - Opções (classe, onClick, etc)
   * @returns {HTMLElement}
   */
  criarElementoImagem(imagem, options = {}) {
    const img = document.createElement("img");
    img.src = imagem.url;
    img.alt = imagem.name;
    img.title = imagem.name;

    if (options.classe) {
      img.className = options.classe;
    }

    if (options.onClick) {
      img.style.cursor = "pointer";
      img.onclick = options.onClick;
    }

    img.style.maxWidth = options.maxWidth || "100%";
    img.style.maxHeight = options.maxHeight || "100%";

    return img;
  }

  /**
   * Criar elemento HTML de áudio do Supabase
   * @param {Object} som - Objeto do som
   * @param {Object} options - Opções
   * @returns {HTMLElement}
   */
  criarElementoAudio(som, options = {}) {
    const audio = document.createElement("audio");
    audio.src = som.url;
    audio.controls = options.controls !== false;
    audio.loop = options.loop || false;
    audio.style.width = options.width || "100%";

    if (options.classe) {
      audio.className = options.classe;
    }

    // Adicionar atributo data com o nome original
    audio.dataset.nome = som.name;
    audio.dataset.displayName = som.displayName || som.name;

    return audio;
  }

  /**
   * Popular um container com imagens
   * @param {HTMLElement} container
   * @param {Array} imagens
   * @param {Object} options
   */
  async preencherContainerImagens(container, imagens = null, options = {}) {
    if (!imagens) {
      imagens = await this.carregarImagens();
    }

    container.innerHTML = "";

    if (imagens.length === 0) {
      container.innerHTML = "<p>Nenhuma imagem disponível</p>";
      return;
    }

    imagens.forEach((img) => {
      const wrapper = document.createElement("div");
      wrapper.className = options.wrapperClass || "imagem-item";

      const elemento = this.criarElementoImagem(img, {
        classe: options.imgClass || "imagem",
        onClick: options.onClick,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
      });

      wrapper.appendChild(elemento);

      if (options.mostrarNome) {
        const label = document.createElement("p");
        label.className = "imagem-nome";
        label.textContent = img.name;
        wrapper.appendChild(label);
      }

      container.appendChild(wrapper);
    });
  }

  /**
   * Popular um container com sons/playlist
   * @param {HTMLElement} container
   * @param {Object} playlist
   * @param {Object} options
   */
  async preencherContainerSons(container, playlist = null, options = {}) {
    if (!playlist) {
      playlist = await this.carregarSons();
    }

    container.innerHTML = "";

    if (!playlist.todos || playlist.todos.length === 0) {
      container.innerHTML = "<p>Nenhum som disponível</p>";
      return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = options.titulo || "🎵 Playlist";
    container.appendChild(titulo);

    const lista = document.createElement("div");
    lista.className = options.listClass || "playlist-container";

    playlist.todos.forEach((som) => {
      const item = document.createElement("div");
      item.className = options.itemClass || "playlist-item";

      const audio = this.criarElementoAudio(som, {
        controls: true,
        classe: options.audioClass || "audio-player",
      });

      const label = document.createElement("div");
      label.className = "som-info";
      label.innerHTML = `
        <span class="som-nome">${som.displayName || som.name}</span>
        <span class="som-tamanho">${(som.size / 1024).toFixed(1)} KB</span>
      `;

      item.appendChild(label);
      item.appendChild(audio);
      lista.appendChild(item);
    });

    container.appendChild(lista);
  }

  /**
   * Monitorar mudanças (polling) - Útil para atualizar em tempo real
   * @param {Function} callback - Função chamada quando há mudanças
   * @param {number} intervalo - Tempo em ms entre verificações
   */
  monitorarMudancas(callback, intervalo = 30000) {
    let ultimasImagens = JSON.stringify(this.cache.imagens);
    let ultimosSons = JSON.stringify(this.cache.sons);

    return setInterval(async () => {
      const [imagens, sons] = await Promise.all([
        this.carregarImagens(true),
        this.carregarSons(true),
      ]);

      const novasImagens = JSON.stringify(imagens);
      const novosSons = JSON.stringify(sons);

      if (novasImagens !== ultimasImagens || novosSons !== ultimosSons) {
        console.log("🔄 Mudanças detectadas!");
        callback({
          imagensChanged: novasImagens !== ultimasImagens,
          sonsChanged: novosSons !== ultimosSons,
          imagens,
          sons,
        });

        ultimasImagens = novasImagens;
        ultimosSons = novosSons;
      }
    }, intervalo);
  }
}

// Exportar para uso global
if (typeof module !== "undefined" && module.exports) {
  module.exports = RoletaSupabaseLoader;
}
