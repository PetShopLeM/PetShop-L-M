import "./style.css";

// ==========================================
// E-MAILS AUTORIZADOS
// ==========================================
const EMAILS_AUTORIZADOS = ["petshop@lem.com"].map((email) =>
  email.trim().toLowerCase()
);

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================
const botaoAgenda = document.querySelector<HTMLButtonElement>("#botaoAgenda")!;
const botaoEstoque = document.querySelector<HTMLButtonElement>("#botaoEstoque")!;
const botaoOfertas = document.querySelector<HTMLButtonElement>("#botaoOfertas")!;
const botaoAdicionar = document.querySelector<HTMLButtonElement>("#botaoAdicionar")!;
const botaoSair = document.querySelector<HTMLButtonElement>("#botaoSair")!;

const usuarioLogadoSpan =
  document.querySelector<HTMLElement>("#usuarioLogado")!;

const secaoAgenda = document.querySelector<HTMLElement>("#secaoAgenda")!;
const secaoEstoque = document.querySelector<HTMLElement>("#secaoEstoque")!;
const secaoOfertas = document.querySelector<HTMLElement>("#secaoOfertas")!;

// ==========================================
// MODAL DE AGENDAMENTO
// ==========================================
const modalNovo = document.querySelector<HTMLDivElement>("#modalNovo")!;
const fecharModalNovo = document.querySelector<HTMLButtonElement>("#fecharModalNovo")!;
const formNovoAgendamento = document.querySelector<HTMLFormElement>("#formNovoAgendamento")!;
const listaAgendamentos = document.querySelector<HTMLElement>("#agenda-corpo")!;
const agendaVazia = document.querySelector<HTMLElement>("#agendaVazia")!;

const campoValor = formNovoAgendamento.elements.namedItem("valor") as HTMLInputElement;

// ==========================================
// MODAL DE ESTOQUE (GOOGLE SHEETS)
// ==========================================
const modalNovoEstoque = document.querySelector<HTMLDivElement>("#modalNovoEstoque")!;
const fecharModalEstoque = document.querySelector<HTMLButtonElement>("#fecharModalEstoque")!;
const formNovoEstoque = document.querySelector<HTMLFormElement>("#formNovoEstoque")!;
const tituloModalEstoque = document.querySelector<HTMLElement>("#tituloModalEstoque")!;
const campoEstoqueLinha = document.querySelector<HTMLInputElement>("#estoqueLinha")!;
const botaoSalvarEstoque = document.querySelector<HTMLButtonElement>("#botaoSalvarEstoque")!;

const listaEstoque = document.querySelector<HTMLElement>("#listaEstoque")!;
const estoqueVazio = document.querySelector<HTMLElement>("#estoqueVazio")!;
const estoqueErro = document.querySelector<HTMLElement>("#estoqueErro")!;

// ==========================================
// MODAL DE OFERTA
// ==========================================
const modalNovaOferta = document.querySelector<HTMLDivElement>("#modalNovaOferta")!;
const fecharModalOferta = document.querySelector<HTMLButtonElement>("#fecharModalOferta")!;
const formNovaOferta = document.querySelector<HTMLFormElement>("#formNovaOferta")!;
const listaOfertas = document.querySelector<HTMLElement>("#listaOfertas")!;
const ofertasVazia = document.querySelector<HTMLElement>("#ofertasVazia")!;
const botaoSalvarOferta = formNovaOferta.querySelector<HTMLButtonElement>(".botao-salvar")!;

// ==========================================
// TIPOS
// ==========================================
interface Agendamento {
  id?: number;
  dono: string;
  horario: string;
  horarioISO?: string;
  valor: string;
}

interface ItemEstoque {
  linha: number;
  produto: string;
  marca: string;
  categoria: string;
  quantidade: string | number;
  preco: string | number;
  desconto: string | number;
  percentual: string | number;
  imagem: string;
}

interface Oferta {
  id: number;
  nome: string;
  descricao: string;
  imagem: string;
  precoAntigo: string;
  precoPromocional: string;
  desconto: string;
  inicio: string;
  fim: string;
}

let abaAtual: "agenda" | "estoque" | "ofertas" = "agenda";
let editandoIndex: number | null = null;
let editandoOfertaIndex: number | null = null;
let produtosEstoqueCache: ItemEstoque[] = [];

// ==========================================
// FORMATAÇÃO E UTILITÁRIOS
// ==========================================
function limparValor(valor: string): string {
  let valorLimpo = valor.replace(/[^\d,.]/g, "");
  valorLimpo = valorLimpo.replace(",", ".");
  const partes = valorLimpo.split(".");
  if (partes.length > 2) {
    valorLimpo = partes[0] + "." + partes.slice(1).join("");
  }
  return valorLimpo;
}

function obterValorNumerico(valor: string): number {
  return Number(limparValor(valor)) || 0;
}

function formatarDinheiro(valor: string | number): string {
  const valorNumerico =
    typeof valor === "number" ? valor : obterValorNumerico(String(valor));
  return valorNumerico.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escaparTexto(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarData(data: string): string {
  if (!data) return "";
  const dataFormatada = new Date(`${data}T00:00:00`);
  if (isNaN(dataFormatada.getTime())) return data;
  return dataFormatada.toLocaleDateString("pt-BR");
}

campoValor.addEventListener("input", () => {
  campoValor.value = limparValor(campoValor.value);
});

// ==========================================
// AGENDAMENTOS
// ==========================================
function buscarAgendamentos(): Agendamento[] {
  try {
    return JSON.parse(localStorage.getItem("agendamentos") || "[]");
  } catch {
    return [];
  }
}

function salvarAgendamentos(agendamentos: Agendamento[]): void {
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
}

function migrarAgendamentosAntigos(): void {
  const agendamentos = buscarAgendamentos();
  let mudou = false;

  for (const agendamento of agendamentos as (Agendamento & { nome?: string })[]) {
    if (!agendamento.dono && agendamento.nome) {
      agendamento.dono = agendamento.nome;
      delete agendamento.nome;
      mudou = true;
    }
  }

  if (mudou) {
    salvarAgendamentos(agendamentos);
  }
}

function renderizarAgenda(): void {
  const agendamentos = buscarAgendamentos();
  listaAgendamentos.innerHTML = "";
  agendaVazia.style.display = agendamentos.length === 0 ? "block" : "none";

  agendamentos.forEach((agendamento, index) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${escaparTexto(agendamento.dono)}</td>
      <td>${escaparTexto(agendamento.horario)}</td>
      <td>${formatarDinheiro(agendamento.valor)}</td>
      <td class="coluna-acoes">
        <button class="botao-editar" data-index="${index}" type="button">Editar</button>
        <button class="botao-apagar" data-index="${index}" type="button">Apagar</button>
      </td>
    `;
    listaAgendamentos.appendChild(linha);
  });
}

// ==========================================
// OFERTAS
// ==========================================
function buscarOfertas(): Oferta[] {
  try {
    return JSON.parse(localStorage.getItem("ofertas") || "[]");
  } catch {
    return [];
  }
}

function salvarOfertas(ofertas: Oferta[]): void {
  localStorage.setItem("ofertas", JSON.stringify(ofertas));
}

// ==========================================
// AUTOCOMPLETE DA OFERTA (IMAGEM + NOME)
// ==========================================
const campoOfertaNome = document.querySelector<HTMLInputElement>("#ofertaNome")!;
const caixaSugestoesOferta = document.querySelector<HTMLDivElement>("#sugestoesOferta")!;
const campoOfertaPrecoAntigo = document.querySelector<HTMLInputElement>("#ofertaPrecoAntigo")!;
const campoOfertaPrecoPromocional = document.querySelector<HTMLInputElement>("#ofertaPrecoPromocional")!;
const campoOfertaDesconto = document.querySelector<HTMLInputElement>("#ofertaDesconto")!;

function dataHojeISO(): string {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function calcularDescontoOferta(): void {
  const antigo = obterValorNumerico(campoOfertaPrecoAntigo.value);
  const promocional = obterValorNumerico(campoOfertaPrecoPromocional.value);

  if (antigo > 0 && promocional > 0 && promocional <= antigo) {
    campoOfertaDesconto.value = String(
      Math.round(((antigo - promocional) / antigo) * 100)
    );
  }
}

function mostrarPreviewProduto(imagem: string, nome: string): void {
  const preview = document.querySelector<HTMLImageElement>("#previewProdutoOferta");
  if (!preview) return;

  if (imagem) {
    preview.src = imagem;
    preview.alt = nome;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

function fecharSugestoesOferta(): void {
  caixaSugestoesOferta.innerHTML = "";
  caixaSugestoesOferta.classList.remove("aberta");
}

function abrirSugestoesOferta(filtro: string): void {
  const filtroLimpo = filtro.trim().toLowerCase();
  caixaSugestoesOferta.innerHTML = "";

  const encontrados = produtosEstoqueCache
    .filter((item) => item.produto.trim().toLowerCase().includes(filtroLimpo))
    .slice(0, 8);

  if (encontrados.length === 0) {
    fecharSugestoesOferta();
    return;
  }

  encontrados.forEach((item) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "sugestao-item";

    botao.innerHTML = `
      ${
        item.imagem
          ? `<img src="${escaparTexto(item.imagem)}" alt="">`
          : `<span class="sugestao-sem-imagem">🐾</span>`
      }
      <span class="sugestao-nome">${escaparTexto(item.produto)}</span>
      <span class="sugestao-preco">${formatarValorPlanilha(item.preco)}</span>
    `;

    botao.addEventListener("click", () => {
      campoOfertaNome.value = item.produto;
      preencherOfertaComProduto(item.produto);
      fecharSugestoesOferta();
    });

    caixaSugestoesOferta.appendChild(botao);
  });

  caixaSugestoesOferta.classList.add("aberta");
}

function preencherOfertaComProduto(nomeProcurado: string): void {
  const nomeLimpo = nomeProcurado.trim().toLowerCase();
  if (!nomeLimpo) return;

  const produto = produtosEstoqueCache.find(
    (item) => item.produto.trim().toLowerCase() === nomeLimpo
  );
  if (!produto) return;

  const campoDescricao = document.querySelector<HTMLInputElement>("#ofertaDescricao");
  const campoImagem = document.querySelector<HTMLInputElement>("#ofertaImagem");

  if (campoDescricao) {
    campoDescricao.value = [produto.categoria, produto.marca].filter(Boolean).join(" - ");
  }
  if (campoImagem) {
    campoImagem.value = produto.imagem || "";
  }

  campoOfertaPrecoAntigo.value = formatarValorPlanilha(produto.preco);

  if (String(produto.desconto).trim() !== "") {
    campoOfertaPrecoPromocional.value = formatarValorPlanilha(produto.desconto);
  }

  const percentualPlanilha = String(produto.percentual || "").replace(",", ".");
  const percentualNumero = Number(percentualPlanilha.replace(/[^\d.]/g, ""));

  if (percentualNumero > 0) {
    campoOfertaDesconto.value = String(percentualNumero);
  } else {
    calcularDescontoOferta();
  }

  mostrarPreviewProduto(produto.imagem, produto.produto);
}

campoOfertaNome.addEventListener("input", () => {
  abrirSugestoesOferta(campoOfertaNome.value);
});

campoOfertaNome.addEventListener("focus", () => {
  abrirSugestoesOferta(campoOfertaNome.value);
});

campoOfertaNome.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    fecharSugestoesOferta();
  }
});

campoOfertaPrecoPromocional.addEventListener("input", calcularDescontoOferta);

document.addEventListener("click", (evento) => {
  const alvo = evento.target as HTMLElement;
  if (!alvo.closest(".campo-busca-produto")) {
    fecharSugestoesOferta();
  }
});

function renderizarOfertas(): void {
  const ofertas = buscarOfertas();
  listaOfertas.innerHTML = "";
  ofertasVazia.style.display = ofertas.length === 0 ? "block" : "none";

  ofertas.forEach((oferta, index) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${escaparTexto(oferta.nome)}</td>
      <td>${formatarDinheiro(oferta.precoAntigo)}</td>
      <td>${formatarDinheiro(oferta.precoPromocional)}</td>
      <td>${escaparTexto(oferta.desconto)}%</td>
      <td>${formatarData(oferta.inicio)}</td>
      <td>${formatarData(oferta.fim)}</td>
      <td class="coluna-acoes">
        <button class="botao-editar" data-index="${index}" type="button">Editar</button>
        <button class="botao-apagar" data-index="${index}" type="button">Apagar</button>
      </td>
    `;
    listaOfertas.appendChild(linha);
  });
}

// ==========================================
// ESTOQUE (GOOGLE SHEETS VIA API)
// ==========================================
function formatarValorPlanilha(valor: unknown): string {
  if (typeof valor === "number") return formatarDinheiro(valor);
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (texto.includes("R$")) return texto;
  const num = Number(limparValor(texto));
  return !isNaN(num) && num > 0 ? formatarDinheiro(num) : texto;
}

function renderizarEstoque(produtos: ItemEstoque[]): void {
  produtosEstoqueCache = produtos;
  listaEstoque.innerHTML = "";
  estoqueVazio.style.display = produtos.length === 0 ? "block" : "none";

  produtos.forEach((item) => {
    const quantidadeNumero = Number(String(item.quantidade).replace(/[^\d,-]/g, "")) || 0;

    let classeQuantidade = "estoque-ok";
    let situacao = String(item.quantidade);

    if (quantidadeNumero <= 0) {
      classeQuantidade = "estoque-esgotado";
      situacao = "Esgotado";
    } else if (quantidadeNumero <= 5) {
      classeQuantidade = "estoque-baixo";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="estoque-celula-produto">
        ${item.imagem ? `<img class="estoque-imagem" src="${escaparTexto(item.imagem)}" alt="${escaparTexto(item.produto)}">` : ""}
        <span>${escaparTexto(item.produto)}</span>
      </td>
      <td>${escaparTexto(item.marca)}</td>
      <td>${escaparTexto(item.categoria)}</td>
      <td><span class="${classeQuantidade}">${escaparTexto(situacao)}</span></td>
      <td>${formatarValorPlanilha(item.preco)}</td>
      <td>${formatarValorPlanilha(item.desconto)}</td>
      <td>${escaparTexto(String(item.percentual))}</td>
      <td class="coluna-acoes">
        <button class="botao-editar-estoque" data-linha="${item.linha}" type="button">Editar</button>
        <button class="botao-apagar-estoque" data-linha="${item.linha}" type="button">Apagar</button>
      </td>
    `;
    listaEstoque.appendChild(tr);
  });
}

async function carregarEstoque(): Promise<void> {
  estoqueErro.style.display = "none";
  estoqueErro.textContent = "";

  try {
    const resposta = await fetch("/api/estoque");
    if (!resposta.ok) {
      const erroDados = await resposta.json().catch(() => ({}));
      throw new Error(erroDados.erro || erroDados.error || "Falha ao carregar estoque.");
    }

    const produtos: ItemEstoque[] = await resposta.json();
    renderizarEstoque(produtos);
  } catch (erro: any) {
    renderizarEstoque([]);
    estoqueErro.textContent = `Aviso de conexão com o Google Planilhas: ${erro.message}`;
    estoqueErro.style.display = "block";
  }
}

// Ações de editar e apagar itens do estoque
listaEstoque.addEventListener("click", async (evento) => {
  const alvo = evento.target as HTMLElement;
  const linhaStr = alvo.dataset.linha;
  if (!linhaStr) return;
  const linha = Number(linhaStr);

  if (alvo.classList.contains("botao-apagar-estoque")) {
    if (confirm("Tem certeza que deseja apagar este item diretamente da planilha?")) {
      alvo.textContent = "...";
      try {
        const resp = await fetch(`/api/estoque?linha=${linha}`, { method: "DELETE" });
        if (!resp.ok) throw new Error("Erro ao apagar");
        await carregarEstoque();
      } catch (err: any) {
        alert("Não foi possível excluir o produto: " + err.message);
        alvo.textContent = "Apagar";
      }
    }
  }

  if (alvo.classList.contains("botao-editar-estoque")) {
    const item = produtosEstoqueCache.find((p) => p.linha === linha);
    if (!item) return;

    tituloModalEstoque.textContent = "Editar Produto no Estoque";
    campoEstoqueLinha.value = String(item.linha);

    (formNovoEstoque.elements.namedItem("produto") as HTMLInputElement).value = item.produto;
    (formNovoEstoque.elements.namedItem("marca") as HTMLInputElement).value = item.marca;
    (formNovoEstoque.elements.namedItem("categoria") as HTMLInputElement).value = item.categoria;
    (formNovoEstoque.elements.namedItem("quantidade") as HTMLInputElement).value = String(item.quantidade);
    (formNovoEstoque.elements.namedItem("preco") as HTMLInputElement).value = String(item.preco);
    (formNovoEstoque.elements.namedItem("desconto") as HTMLInputElement).value = String(item.desconto);
    (formNovoEstoque.elements.namedItem("percentual") as HTMLInputElement).value = String(item.percentual);
    (formNovoEstoque.elements.namedItem("imagem") as HTMLInputElement).value = item.imagem;

    modalNovoEstoque.classList.add("aberto");
  }
});

// Submissão do formulário de estoque (Criação e Edição)
formNovoEstoque.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = new FormData(formNovoEstoque);
  const linha = campoEstoqueLinha.value;

  const corpo = {
    linha: linha ? Number(linha) : undefined,
    produto: String(dados.get("produto") || ""),
    marca: String(dados.get("marca") || ""),
    categoria: String(dados.get("categoria") || ""),
    quantidade: String(dados.get("quantidade") || "0"),
    preco: String(dados.get("preco") || ""),
    desconto: String(dados.get("desconto") || ""),
    percentual: String(dados.get("percentual") || ""),
    imagem: String(dados.get("imagem") || ""),
  };

  botaoSalvarEstoque.disabled = true;
  botaoSalvarEstoque.textContent = "Salvando...";

  try {
    const url = "/api/estoque";
    const metodo = linha ? "PATCH" : "POST";

    const resp = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    if (!resp.ok) {
      const resErro = await resp.json().catch(() => ({}));
      throw new Error(resErro.error || "Erro ao salvar na planilha.");
    }

    formNovoEstoque.reset();
    campoEstoqueLinha.value = "";
    modalNovoEstoque.classList.remove("aberto");
    await carregarEstoque();
  } catch (err: any) {
    alert("Falha ao salvar produto: " + err.message);
  } finally {
    botaoSalvarEstoque.disabled = false;
    botaoSalvarEstoque.textContent = "Salvar na Planilha";
  }
});

fecharModalEstoque.addEventListener("click", () => {
  modalNovoEstoque.classList.remove("aberto");
  formNovoEstoque.reset();
  campoEstoqueLinha.value = "";
});

// ==========================================
// CONTROLE DAS ABAS
// ==========================================
function removerClassesDasAbas(): void {
  botaoAgenda.classList.remove("ativo");
  botaoEstoque.classList.remove("ativo");
  botaoOfertas.classList.remove("ativo");

  secaoAgenda.classList.remove("visivel");
  secaoEstoque.classList.remove("visivel");
  secaoOfertas.classList.remove("visivel");
}

function alternarAba(aba: "agenda" | "estoque" | "ofertas"): void {
  abaAtual = aba;
  removerClassesDasAbas();

  if (aba === "agenda") {
    botaoAgenda.classList.add("ativo");
    secaoAgenda.classList.add("visivel");
    botaoAdicionar.style.display = "inline-flex";
    botaoAdicionar.setAttribute("aria-label", "Adicionar agendamento");
    renderizarAgenda();
  }

  if (aba === "estoque") {
    botaoEstoque.classList.add("ativo");
    secaoEstoque.classList.add("visivel");
    botaoAdicionar.style.display = "inline-flex";
    botaoAdicionar.setAttribute("aria-label", "Adicionar produto ao estoque");
    void carregarEstoque();
  }

  if (aba === "ofertas") {
    botaoOfertas.classList.add("ativo");
    secaoOfertas.classList.add("visivel");
    botaoAdicionar.style.display = "inline-flex";
    botaoAdicionar.setAttribute("aria-label", "Adicionar oferta");
    void carregarEstoque();
    renderizarOfertas();
  }
}

botaoAgenda.addEventListener("click", () => alternarAba("agenda"));
botaoEstoque.addEventListener("click", () => alternarAba("estoque"));
botaoOfertas.addEventListener("click", () => alternarAba("ofertas"));

// Botão geral "+"
botaoAdicionar.addEventListener("click", () => {
  if (abaAtual === "agenda") {
    editandoIndex = null;
    formNovoAgendamento.reset();
    const titulo = modalNovo.querySelector("h3");
    if (titulo) titulo.textContent = "Novo Agendamento";
    modalNovo.classList.add("aberto");
  }

  if (abaAtual === "estoque") {
    formNovoEstoque.reset();
    campoEstoqueLinha.value = "";
    tituloModalEstoque.textContent = "Novo Produto no Estoque";
    modalNovoEstoque.classList.add("aberto");
  }

  if (abaAtual === "ofertas") {
    editandoOfertaIndex = null;
    formNovaOferta.reset();
    mostrarPreviewProduto("", "");
    const titulo = modalNovaOferta.querySelector("h3");
    if (titulo) titulo.textContent = "Nova Oferta";
    botaoSalvarOferta.textContent = "Salvar";
    void carregarEstoque();
    const campoInicio = document.querySelector<HTMLInputElement>("#ofertaInicio")!;
    campoInicio.value = dataHojeISO();
    modalNovaOferta.classList.add("aberto");
  }
});

fecharModalNovo.addEventListener("click", () => {
  modalNovo.classList.remove("aberto");
  editandoIndex = null;
});

// Submissão do agendamento
formNovoAgendamento.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dados = new FormData(formNovoAgendamento);
  const agendamentos = buscarAgendamentos();

  const dono = String(dados.get("dono") || "");
  const horarioBruto = String(dados.get("horario") || "");
  const valorNumerico = obterValorNumerico(String(dados.get("valor") || ""));

  const agendamentoSalvo: Agendamento = {
    id: Date.now(),
    dono,
    horario: horarioBruto ? new Date(horarioBruto).toLocaleString("pt-BR") : "",
    horarioISO: horarioBruto,
    valor: valorNumerico.toFixed(2),
  };

  if (editandoIndex !== null) {
    const agendamentoAnterior = agendamentos[editandoIndex];
    agendamentoSalvo.id = agendamentoAnterior.id;
    agendamentos[editandoIndex] = agendamentoSalvo;
  } else {
    agendamentos.push(agendamentoSalvo);
  }

  salvarAgendamentos(agendamentos);
  editandoIndex = null;
  formNovoAgendamento.reset();
  modalNovo.classList.remove("aberto");
  renderizarAgenda();
});

// Ações da lista de agendamentos
listaAgendamentos.addEventListener("click", (evento) => {
  const alvo = evento.target as HTMLElement;
  const index = Number(alvo.dataset.index);
  if (Number.isNaN(index)) return;

  if (alvo.classList.contains("botao-apagar")) {
    if (confirm("Deseja realmente apagar este agendamento?")) {
      const agendamentos = buscarAgendamentos();
      agendamentos.splice(index, 1);
      salvarAgendamentos(agendamentos);
      renderizarAgenda();
    }
  }

  if (alvo.classList.contains("botao-editar")) {
    const agendamentos = buscarAgendamentos();
    const agendamento = agendamentos[index];
    if (!agendamento) return;

    editandoIndex = index;
    (formNovoAgendamento.elements.namedItem("dono") as HTMLInputElement).value = agendamento.dono;
    campoValor.value = limparValor(agendamento.valor);
    if (agendamento.horarioISO) {
      (formNovoAgendamento.elements.namedItem("horario") as HTMLInputElement).value = agendamento.horarioISO;
    }

    const titulo = modalNovo.querySelector("h3");
    if (titulo) titulo.textContent = "Editar Agendamento";
    modalNovo.classList.add("aberto");
  }
});

// Submissão da oferta (Criação e Edição)
formNovaOferta.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dados = new FormData(formNovaOferta);

  const novaOferta: Oferta = {
    id: Date.now(),
    nome: String(dados.get("nome") || ""),
    descricao: String(dados.get("descricao") || ""),
    imagem: String(dados.get("imagem") || ""),
    precoAntigo: String(dados.get("precoAntigo") || ""),
    precoPromocional: String(dados.get("precoPromocional") || ""),
    desconto: String(dados.get("desconto") || ""),
    inicio: String(dados.get("inicio") || ""),
    fim: String(dados.get("fim") || ""),
  };

  const ofertas = buscarOfertas();

  if (editandoOfertaIndex !== null) {
    const ofertaAnterior = ofertas[editandoOfertaIndex];
    if (ofertaAnterior) {
      novaOferta.id = ofertaAnterior.id;
      ofertas[editandoOfertaIndex] = novaOferta;
    } else {
      ofertas.push(novaOferta);
    }
  } else {
    ofertas.push(novaOferta);
  }

  salvarOfertas(ofertas);
  editandoOfertaIndex = null;

  formNovaOferta.reset();
  mostrarPreviewProduto("", "");
  modalNovaOferta.classList.remove("aberto");
  renderizarOfertas();
});

fecharModalOferta.addEventListener("click", () => {
  modalNovaOferta.classList.remove("aberto");
  editandoOfertaIndex = null;
  const titulo = modalNovaOferta.querySelector("h3");
  if (titulo) titulo.textContent = "Nova Oferta";
  botaoSalvarOferta.textContent = "Salvar";
});

// Ações da lista de ofertas
listaOfertas.addEventListener("click", (evento) => {
  const alvo = evento.target as HTMLElement;
  const index = Number(alvo.dataset.index);
  if (Number.isNaN(index)) return;

  if (alvo.classList.contains("botao-apagar")) {
    if (confirm("Deseja realmente apagar esta oferta?")) {
      const ofertas = buscarOfertas();
      ofertas.splice(index, 1);
      salvarOfertas(ofertas);
      renderizarOfertas();
    }
  }

  if (alvo.classList.contains("botao-editar")) {
    const ofertas = buscarOfertas();
    const oferta = ofertas[index];
    if (!oferta) return;

    editandoOfertaIndex = index;

    (formNovaOferta.elements.namedItem("nome") as HTMLInputElement).value = oferta.nome;
    (formNovaOferta.elements.namedItem("descricao") as HTMLInputElement).value = oferta.descricao;
    (formNovaOferta.elements.namedItem("imagem") as HTMLInputElement).value = oferta.imagem;
    (formNovaOferta.elements.namedItem("precoAntigo") as HTMLInputElement).value = oferta.precoAntigo;
    (formNovaOferta.elements.namedItem("precoPromocional") as HTMLInputElement).value = oferta.precoPromocional;
    (formNovaOferta.elements.namedItem("desconto") as HTMLInputElement).value = oferta.desconto;
    (formNovaOferta.elements.namedItem("inicio") as HTMLInputElement).value = oferta.inicio;
    (formNovaOferta.elements.namedItem("fim") as HTMLInputElement).value = oferta.fim;

    mostrarPreviewProduto(oferta.imagem, oferta.nome);

    const titulo = modalNovaOferta.querySelector("h3");
    if (titulo) titulo.textContent = "Editar Oferta";
    botaoSalvarOferta.textContent = "Atualizar";
    modalNovaOferta.classList.add("aberto");
  }
});

// Sair
botaoSair.addEventListener("click", () => {
  sessionStorage.removeItem("adminLogado");
  window.location.href = "login.html";
});

// Verificação de autenticação
const usuarioLogado = sessionStorage.getItem("adminLogado")?.trim().toLowerCase();

if (!usuarioLogado || !EMAILS_AUTORIZADOS.includes(usuarioLogado)) {
  window.location.href = "login.html";
} else {
  usuarioLogadoSpan.textContent = usuarioLogado;
  migrarAgendamentosAntigos();
  alternarAba("agenda");
  renderizarAgenda();
  renderizarOfertas();
}

// ==========================================
// GARANTIA DA PRÉVIA + IMAGEM DA OFERTA
// ==========================================
(function () {
  const caixaSugestoes = document.querySelector<HTMLDivElement>("#sugestoesOferta");
  const previaOferta = document.querySelector<HTMLImageElement>("#previewProdutoOferta");
  const campoImagemOferta = document.querySelector<HTMLInputElement>("#ofertaImagem");

  if (!caixaSugestoes || !previaOferta) return;

  caixaSugestoes.addEventListener("click", (evento) => {
    const item = (evento.target as HTMLElement).closest(".sugestao-item");
    if (!item) return;

    const foto = item.querySelector<HTMLImageElement>("img");

    if (foto && foto.src) {
      previaOferta.src = foto.src;

      if (campoImagemOferta) {
        campoImagemOferta.value = foto.src;
      }
    }
  });
})();

// ==========================================
// IMAGENS NA TABELA DE OFERTAS
// ==========================================
(function () {
  const tbodyOfertas = document.querySelector<HTMLElement>("#listaOfertas");
  if (!tbodyOfertas) return;

  function buscarImagem(nomeNaTabela: string): string {
    const nomeLimpo = nomeNaTabela.trim().toLowerCase();

    // 1. Tenta pela oferta salva (campo imagem)
    try {
      const salvas: Array<{ nome: string; imagem?: string }> = JSON.parse(
        localStorage.getItem("ofertas") || "[]"
      );
      const salva = salvas.find(
        (o) => (o.nome || "").trim().toLowerCase() === nomeLimpo && o.imagem
      );
      if (salva && salva.imagem) return salva.imagem;
    } catch (erro) {
      // se der erro ao ler o localStorage, segue para o estoque
    }

    // 2. Tenta pelo produto do estoque (pelo nome)
    const produto = produtosEstoqueCache.find(
      (item) => item.produto.trim().toLowerCase() === nomeLimpo
    );
    return (produto && produto.imagem) || "";
  }

  function adicionarImagens(): void {
    tbodyOfertas.querySelectorAll("tr").forEach((tr) => {
      const primeiraCelula = tr.querySelector("td");
      if (!primeiraCelula || primeiraCelula.querySelector("img")) return;

      const nome = (primeiraCelula.textContent || "").trim();
      const url = buscarImagem(nome);
      if (!url) return;

      const img = document.createElement("img");
      img.src = url;
      img.alt = nome;
      img.className = "imagem-oferta-tabela";

      primeiraCelula.insertBefore(img, primeiraCelula.firstChild);
    });
  }

  // Roda sempre que a tabela for re-renderizada
  const observador = new MutationObserver(adicionarImagens);
  observador.observe(tbodyOfertas, { childList: true });

  // Repetições iniciais para cobrir o tempo de carregamento do estoque
  [500, 1500, 3000, 6000].forEach((atraso) => {
    window.setTimeout(adicionarImagens, atraso);
  });
})();