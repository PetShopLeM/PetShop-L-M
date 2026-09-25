import "./style.css";

// ==========================================
// TIPOS
// ==========================================
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
  linha: number;
  nome: string;
  descricao: string;
  imagem: string;
  precoAntigo: string;
  precoPromocional: string;
  desconto: string;
  inicio: string;
  fim: string;
}

interface Servico {
  linha: number;
  nome: string;
  descricao: string;
  preco: string;
  imagem: string;
}

interface Agendamento {
  linha: number;
  data: string;
  dono: string;
  endereco: string;
  cell: string;
  servico: string;
  horario: string;
  valor: string;
  transporte: string;
}

// ==========================================
// E-MAILS AUTORIZADOS
// ==========================================
// ⚠️ ATENÇÃO: confira se este é o MESMO e-mail que você digita
// na tela de login para entrar no painel. Se for outro, troque aqui!
const EMAILS_AUTORIZADOS: string[] = ["a@a.com"];

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================
const botaoAgenda = document.querySelector<HTMLButtonElement>("#botaoAgenda")!;
const botaoEstoque = document.querySelector<HTMLButtonElement>("#botaoEstoque")!;
const botaoOfertas = document.querySelector<HTMLButtonElement>("#botaoOfertas")!;
const botaoServicos = document.querySelector<HTMLButtonElement>("#botaoServicos")!;
const botaoAdicionar = document.querySelector<HTMLButtonElement>("#botaoAdicionar")!;
const botaoSair = document.querySelector<HTMLButtonElement>("#botaoSair")!;
const usuarioLogadoSpan =
  document.querySelector<HTMLElement>("#usuarioLogado")!;

const secaoAgenda = document.querySelector<HTMLElement>("#secaoAgenda")!;
const secaoEstoque = document.querySelector<HTMLElement>("#secaoEstoque")!;
const secaoOfertas = document.querySelector<HTMLElement>("#secaoOfertas")!;
const secaoServicos = document.querySelector<HTMLElement>("#secaoServicos")!;

const listaAgendamentos =
  document.querySelector<HTMLElement>("#agenda-corpo")!;
const agendaVazia = document.querySelector<HTMLElement>("#agendaVazia")!;

const listaEstoque = document.querySelector<HTMLElement>("#listaEstoque")!;
const estoqueVazio = document.querySelector<HTMLElement>("#estoqueVazio")!;
const estoqueErro = document.querySelector<HTMLElement>("#estoqueErro")!;

const listaOfertas = document.querySelector<HTMLElement>("#listaOfertas")!;
const ofertasVazia = document.querySelector<HTMLElement>("#ofertasVazia")!;

// Aba de serviços (sem "!" de propósito: se faltar algum ID,
// o resto do painel continua funcionando)
const listaServicos = document.querySelector<HTMLElement>("#listaServicos");
const servicosVazio = document.querySelector<HTMLElement>("#servicosVazio");
const botaoAdicionarServico = document.querySelector<HTMLButtonElement>(
  "#botaoAdicionarServico"
);
const modalNovoServico =
  document.querySelector<HTMLDivElement>("#modalNovoServico");
const fecharModalServico = document.querySelector<HTMLButtonElement>(
  "#fecharModalServico"
);
const formNovoServico = document.querySelector<HTMLFormElement>("#formNovoServico");

// ==========================================
// ESTADO GERAL
// ==========================================
let abaAtual: "agenda" | "estoque" | "ofertas" | "servicos" = "agenda";
let agendamentosCache: Agendamento[] = [];
let ofertasCache: Oferta[] = [];
let servicosCache: Servico[] = [];
let produtosEstoqueCache: ItemEstoque[] = [];
let editandoLinha: number | null = null;
let editandoOfertaIndex: number | null = null;
let editandoServicoLinha: number | null = null;

// ==========================================
// MODAL DE AGENDAMENTO
// ==========================================
const modalNovo = document.querySelector<HTMLDivElement>("#modalNovo")!;
const fecharModalNovo =
  document.querySelector<HTMLButtonElement>("#fecharModalNovo")!;
const formNovoAgendamento =
  document.querySelector<HTMLFormElement>("#formNovoAgendamento")!;
const campoValor = formNovoAgendamento.elements.namedItem(
  "valor"
) as HTMLInputElement;

// Lista de serviços (checkboxes) do agendamento
const botaoMostrarServicos = document.querySelector<HTMLButtonElement>(
  "#botaoMostrarServicos"
);
const listaServicosAgendamento = document.querySelector<HTMLDivElement>(
  "#listaServicosAgendamento"
);

// ==========================================
// MODAL DE ESTOQUE (GOOGLE SHEETS)
// ==========================================
const modalNovoEstoque =
  document.querySelector<HTMLDivElement>("#modalNovoEstoque")!;
const fecharModalEstoque = document.querySelector<HTMLButtonElement>(
  "#fecharModalEstoque"
)!;
const formNovoEstoque =
  document.querySelector<HTMLFormElement>("#formNovoEstoque")!;
const tituloModalEstoque =
  document.querySelector<HTMLElement>("#tituloModalEstoque")!;
const campoEstoqueLinha =
  document.querySelector<HTMLInputElement>("#estoqueLinha")!;
const botaoSalvarEstoque = document.querySelector<HTMLButtonElement>(
  "#botaoSalvarEstoque"
)!;

// ==========================================
// MODAL DE OFERTA
// ==========================================
const modalNovaOferta =
  document.querySelector<HTMLDivElement>("#modalNovaOferta")!;
const fecharModalOferta = document.querySelector<HTMLButtonElement>(
  "#fecharModalOferta"
)!;
const formNovaOferta =
  document.querySelector<HTMLFormElement>("#formNovaOferta")!;
const botaoSalvarOferta =
  formNovaOferta.querySelector<HTMLButtonElement>(".botao-salvar")!;
const campoImagemOferta =
  formNovaOferta.elements.namedItem("imagem") as HTMLInputElement | null ||
  formNovaOferta.querySelector<HTMLInputElement>("input[name='imagem']");
const previewImagemOferta =
  document.querySelector<HTMLImageElement>("#previewProdutoOferta");

// ==========================================
// OFERTAS (GOOGLE SHEETS) — UTILITÁRIOS
// ==========================================
function campoOferta(nome: string): HTMLInputElement | null {
  return (
    (formNovaOferta.elements.namedItem(nome) as HTMLInputElement | null) ||
    formNovaOferta.querySelector<HTMLInputElement>(`[name="${nome}"]`)
  );
}

function valorDoCampo(nome: string): string {
  return campoOferta(nome)?.value.trim() ?? "";
}

function formatarDataOferta(valor: string | number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

  // Numero de serie do Google Sheets
  if (/^\d+(\.\d+)?$/.test(texto)) {
    const ms = Math.round((Number(texto) - 25569) * 86400 * 1000);
    const data = new Date(ms);
    const dia = String(data.getUTCDate()).padStart(2, "0");
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${data.getUTCFullYear()}`;
  }

  // ISO (yyyy-mm-dd)
  const partesISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partesISO) {
    return `${partesISO[3]}/${partesISO[2]}/${partesISO[1]}`;
  }

  return texto;
}

function converterParaISO(valor: string | number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  if (/^\d+(\.\d+)?$/.test(texto)) {
    const ms = Math.round((Number(texto) - 25569) * 86400 * 1000);
    const data = new Date(ms);
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(data.getUTCDate()).padStart(2, "0");
    return `${data.getUTCFullYear()}-${mes}-${dia}`;
  }
  const partes = texto.split("/");
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return "";
}

function formatarMoedaOferta(valor: string | number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  const numero = Number(
    texto.replace("R$", "").replace(/\s/g, "").replace(",", ".")
  );
  if (!isFinite(numero)) return texto;
  return `R$ ${numero.toFixed(2).replace(".", ",")}`;
}

function formatarDescontoOferta(valor: string | number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (texto.includes("%")) return texto;
  const numero = Number(texto.replace(",", ".").replace(/[^\d.]/g, ""));
  if (isFinite(numero) && texto !== "") return `${numero}%`;
  return texto;
}

function renderizarOfertas(): void {
  const visiveis = filtrarOfertas();

  listaOfertas.innerHTML = "";

  if (visiveis.length === 0) {
    ofertasVazia.style.display = "block";
    ofertasVazia.textContent =
      ofertasCache.length > 0
        ? "Nenhuma oferta encontrada com os filtros atuais."
        : "Nenhuma oferta cadastrada ainda.";
    return;
  }

  ofertasVazia.style.display = "none";
  ofertasVazia.textContent = "Nenhuma oferta cadastrada ainda.";

  visiveis.forEach((oferta) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = oferta.nome;
    tr.appendChild(tdNome);

    const tdPrecoAntigo = document.createElement("td");
    tdPrecoAntigo.textContent = formatarMoedaOferta(oferta.precoAntigo);
    tr.appendChild(tdPrecoAntigo);

    const tdPrecoPromocional = document.createElement("td");
    tdPrecoPromocional.textContent = formatarMoedaOferta(
      oferta.precoPromocional
    );
    tr.appendChild(tdPrecoPromocional);

    const tdDesconto = document.createElement("td");
    tdDesconto.textContent = formatarDescontoOferta(oferta.desconto);
    tr.appendChild(tdDesconto);

    const tdInicio = document.createElement("td");
    tdInicio.textContent = formatarDataOferta(oferta.inicio);
    tr.appendChild(tdInicio);

    const tdFim = document.createElement("td");
    tdFim.textContent = formatarDataOferta(oferta.fim);
    tr.appendChild(tdFim);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "coluna-acoes";

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "botao-editar";
    botaoEditar.textContent = "Editar";
    botaoEditar.dataset.linha = String(oferta.linha);

    const botaoApagar = document.createElement("button");
    botaoApagar.type = "button";
    botaoApagar.className = "botao-apagar";
    botaoApagar.textContent = "Apagar";
    botaoApagar.dataset.linha = String(oferta.linha);

    tdAcoes.appendChild(botaoEditar);
    tdAcoes.appendChild(botaoApagar);
    tr.appendChild(tdAcoes);

    listaOfertas.appendChild(tr);
  });
}

async function carregarOfertas(): Promise<void> {
  try {
    listaOfertas.innerHTML =
      '<tr><td colspan="7">Carregando ofertas...</td></tr>';
    ofertasVazia.style.display = "none";

    const resposta = await fetch("/api/ofertas");
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro ao carregar ofertas da planilha.");
    }

    ofertasCache = (dados.ofertas || []) as Oferta[];
  } catch (erro) {
    console.error(erro);
    ofertasCache = [];
  }

  renderizarOfertas();
}

function preencherFormularioOferta(oferta: Oferta): void {
  const definir = (nome: string, valor: string) => {
    const campo = campoOferta(nome);
    if (campo) campo.value = valor;
  };

  definir("nome", oferta.nome);
  definir("precoAntigo", oferta.precoAntigo);
  definir("precoPromocional", oferta.precoPromocional);
  definir("desconto", oferta.desconto);
  definir("inicio", converterParaISO(oferta.inicio));
  definir("fim", converterParaISO(oferta.fim));
  definir("descricao", oferta.descricao);
  definir("imagem", oferta.imagem);
}

function abrirModalOferta(): void {
  editandoOfertaIndex = null;
  formNovaOferta.reset();
  mostrarPreviewProduto("", "");

  const titulo = modalNovaOferta.querySelector("h3");
  if (titulo) titulo.textContent = "Nova Oferta";
  botaoSalvarOferta.textContent = "Salvar";
}

// Fechar pelo X
fecharModalOferta.addEventListener("click", () => {
  modalNovaOferta.classList.remove("aberto");
  editandoOfertaIndex = null;
  const titulo = modalNovaOferta.querySelector("h3");
  if (titulo) titulo.textContent = "Nova Oferta";
  botaoSalvarOferta.textContent = "Salvar";
});

// Salvar (POST novo / PATCH edicao)
formNovaOferta.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = valorDoCampo("nome");
  if (!nome) return;

  const precoAntigo = valorDoCampo("precoAntigo");
  const precoPromocional = valorDoCampo("precoPromocional");
  let desconto = valorDoCampo("desconto");

  // Se o campo desconto ficou vazio, calcula a partir dos precos
  if (!desconto) {
    const antigo = Number(precoAntigo.replace(",", ".").replace(/[^\d.]/g, ""));
    const promo = Number(
      precoPromocional.replace(",", ".").replace(/[^\d.]/g, "")
    );
    if (isFinite(antigo) && isFinite(promo) && antigo > 0 && promo < antigo) {
      desconto = `${Math.round((1 - promo / antigo) * 100)}%`;
    }
  }

  const payload = {
    nome,
    precoAntigo,
    precoPromocional,
    desconto,
    inicio: formatarDataOferta(valorDoCampo("inicio")),
    fim: formatarDataOferta(valorDoCampo("fim")),
    descricao: valorDoCampo("descricao"),
    imagem: valorDoCampo("imagem"),
  };

  botaoSalvarOferta.disabled = true;

  try {
    if (editandoOfertaIndex === null) {
      const resposta = await fetch("/api/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados?.erro || "Erro ao salvar oferta.");
      }
    } else {
      const resposta = await fetch(`/api/ofertas?linha=${editandoOfertaIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados?.erro || "Erro ao editar oferta.");
      }
    }

    modalNovaOferta.classList.remove("aberto");
    await carregarOfertas();
  } catch (erro) {
    alert(erro instanceof Error ? erro.message : "Erro ao salvar oferta.");
  } finally {
    botaoSalvarOferta.disabled = false;
    botaoSalvarOferta.textContent = "Salvar";
  }
});

// Acoes da tabela (Editar / Apagar)
listaOfertas.addEventListener("click", async (evento) => {
  const alvo = evento.target as HTMLElement;
  const botao = alvo.closest("button");
  if (!botao) return;

  const linha = Number(botao.dataset.linha);
  if (!linha) return;

  if (botao.textContent === "Editar") {
    const oferta = ofertasCache.find((o) => o.linha === linha);
    if (!oferta) return;

    editandoOfertaIndex = linha;
    preencherFormularioOferta(oferta);
    mostrarPreviewProduto(oferta.imagem, oferta.nome);

    const titulo = modalNovaOferta.querySelector("h3");
    if (titulo) titulo.textContent = "Editar Oferta";
    botaoSalvarOferta.textContent = "Atualizar";

    modalNovaOferta.classList.add("aberto");
  }

  if (botao.textContent === "Apagar") {
    if (!confirm("Apagar esta oferta?")) return;
    try {
      const resposta = await fetch(`/api/ofertas?linha=${linha}`, {
        method: "DELETE",
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados?.erro || "Erro ao apagar oferta.");
      }
      await carregarOfertas();
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao apagar oferta.");
    }
  }
});

// Atualiza a previa da foto ao mudar o campo imagem
if (campoImagemOferta) {
  campoImagemOferta.addEventListener("change", () => {
    if (previewImagemOferta) {
      previewImagemOferta.src = campoImagemOferta.value;
    }
  });
}

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

campoValor.addEventListener("input", () => {
  campoValor.value = limparValor(campoValor.value);
});

// ==========================================
// AGENDAMENTOS (GOOGLE SHEETS VIA API)
// ==========================================
function converterDataParaInput(valor: string): string {
  const valorLimpo = (valor || "").trim();
  const partes = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valorLimpo);
  if (partes) {
    return `${partes[3]}-${partes[2].padStart(2, "0")}-${partes[1].padStart(2, "0")}`;
  }
  return valorLimpo;
}

function normalizarDataPlanilha(valor: string): string {
  const valorLimpo = (valor || "").trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valorLimpo);
  if (partes) {
    return `${partes[3]}/${partes[2]}/${partes[1]}`;
  }
  return valorLimpo;
}

async function carregarAgendamentos(): Promise<void> {
  try {
    const resposta = await fetch("/api/agendamentos");
    if (!resposta.ok) {
      const erroDados = await resposta.json().catch(() => ({}));
      throw new Error(
        erroDados.erro || erroDados.error || "Falha ao carregar agendamentos."
      );
    }

    const agendamentos: Agendamento[] = await resposta.json();
    agendamentosCache = agendamentos;
    renderizarAgenda();
  } catch (erro: any) {
    agendamentosCache = [];
    renderizarAgenda();
    console.error("Erro ao carregar agendamentos:", erro.message);
  }
}

function filtrarAgendamentos(): Agendamento[] {
  const filtroData =
    document.querySelector<HTMLInputElement>("#filtroData")?.value.trim().toLowerCase() || "";
  const filtroDono =
    document.querySelector<HTMLInputElement>("#filtroDono")?.value.trim().toLowerCase() || "";
  const filtroServico =
    document.querySelector<HTMLInputElement>("#filtroServico")?.value.trim().toLowerCase() || "";
  const filtroHorario =
    document.querySelector<HTMLInputElement>("#filtroHorario")?.value.trim().toLowerCase() || "";
  const filtroTransporte =
    document.querySelector<HTMLSelectElement>("#filtroTransporte")?.value || "";

  const temFiltro = Boolean(
    filtroData || filtroDono || filtroServico || filtroHorario || filtroTransporte
  );
  if (!temFiltro) return agendamentosCache;

  return agendamentosCache.filter((agendamento) => {
    const data = (agendamento.data || "").toLowerCase();
    const dono = (agendamento.dono || "").toLowerCase();
    const servico = (agendamento.servico || "").toLowerCase();
    const horario = (agendamento.horario || "").toLowerCase();
    const transporte = (agendamento.transporte || "").trim().toLowerCase();

    const okData = !filtroData || data.includes(filtroData);
    const okDono = !filtroDono || dono.includes(filtroDono);
    const okServico = !filtroServico || servico.includes(filtroServico);
    const okHorario = !filtroHorario || horario.includes(filtroHorario);
    const okTransporte =
      !filtroTransporte ||
      (filtroTransporte === "sim" ? transporte === "sim" : transporte !== "sim");

    return okData && okDono && okServico && okHorario && okTransporte;
  });
}

["filtroData", "filtroDono", "filtroServico", "filtroHorario"].forEach((id) => {
  document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("input", () => {
    renderizarAgenda();
  });
});

document.querySelector<HTMLSelectElement>("#filtroTransporte")?.addEventListener("change", () => {
  renderizarAgenda();
});

document.querySelector<HTMLButtonElement>("#botaoLimparFiltros")?.addEventListener("click", () => {
  ["filtroData", "filtroDono", "filtroServico", "filtroHorario"].forEach((id) => {
    const campo = document.querySelector<HTMLInputElement>(`#${id}`);
    if (campo) campo.value = "";
  });
  const select = document.querySelector<HTMLSelectElement>("#filtroTransporte");
  if (select) select.value = "";
  renderizarAgenda();
});

// ==========================================
// FILTROS DE ESTOQUE E OFERTAS
// ==========================================
function filtrarEstoque(): ItemEstoque[] {
  const filtroProduto =
    document.querySelector<HTMLInputElement>("#filtroProduto")?.value.trim().toLowerCase() || "";
  const filtroMarca =
    document.querySelector<HTMLInputElement>("#filtroMarca")?.value.trim().toLowerCase() || "";
  const filtroCategoria =
    document.querySelector<HTMLInputElement>("#filtroCategoria")?.value.trim().toLowerCase() || "";
  const filtroSituacao =
    document.querySelector<HTMLSelectElement>("#filtroSituacaoEstoque")?.value || "";

  const temFiltro = Boolean(filtroProduto || filtroMarca || filtroCategoria || filtroSituacao);
  if (!temFiltro) return produtosEstoqueCache;

  return produtosEstoqueCache.filter((item) => {
    const produto = (item.produto || "").toLowerCase();
    const marca = (item.marca || "").toLowerCase();
    const categoria = (item.categoria || "").toLowerCase();
    const quantidadeNumero =
      Number(String(item.quantidade).replace(/[^\d,-]/g, "")) || 0;

    const okProduto = !filtroProduto || produto.includes(filtroProduto);
    const okMarca = !filtroMarca || marca.includes(filtroMarca);
    const okCategoria = !filtroCategoria || categoria.includes(filtroCategoria);
    const okSituacao =
      !filtroSituacao ||
      (filtroSituacao === "zerado" ? quantidadeNumero <= 0 : quantidadeNumero > 0);

    return okProduto && okMarca && okCategoria && okSituacao;
  });
}

["filtroProduto", "filtroMarca", "filtroCategoria"].forEach((id) => {
  document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("input", () => {
    renderizarEstoque();
  });
});

document
  .querySelector<HTMLSelectElement>("#filtroSituacaoEstoque")
  ?.addEventListener("change", () => {
    renderizarEstoque();
  });

document
  .querySelector<HTMLButtonElement>("#botaoLimparFiltrosEstoque")
  ?.addEventListener("click", () => {
    ["filtroProduto", "filtroMarca", "filtroCategoria"].forEach((id) => {
      const campo = document.querySelector<HTMLInputElement>(`#${id}`);
      if (campo) campo.value = "";
    });
    const select = document.querySelector<HTMLSelectElement>("#filtroSituacaoEstoque");
    if (select) select.value = "";
    renderizarEstoque();
  });

function filtrarOfertas(): Oferta[] {
  const filtroNome =
    document.querySelector<HTMLInputElement>("#filtroOfertaNome")?.value.trim().toLowerCase() || "";
  const filtroDesconto =
    document.querySelector<HTMLInputElement>("#filtroOfertaDesconto")?.value.trim().toLowerCase() || "";
  const filtroInicio =
    document.querySelector<HTMLInputElement>("#filtroOfertaInicio")?.value.trim().toLowerCase() || "";
  const filtroFim =
    document.querySelector<HTMLInputElement>("#filtroOfertaFim")?.value.trim().toLowerCase() || "";

  const temFiltro = Boolean(filtroNome || filtroDesconto || filtroInicio || filtroFim);
  if (!temFiltro) return ofertasCache;

  return ofertasCache.filter((oferta) => {
    const nome = (oferta.nome || "").toLowerCase();
    const desconto = (oferta.desconto || "").toLowerCase();
    const inicio = (oferta.inicio || "").toLowerCase();
    const fim = (oferta.fim || "").toLowerCase();

    const okNome = !filtroNome || nome.includes(filtroNome);
    const okDesconto = !filtroDesconto || desconto.includes(filtroDesconto);
    const okInicio = !filtroInicio || inicio.includes(filtroInicio);
    const okFim = !filtroFim || fim.includes(filtroFim);

    return okNome && okDesconto && okInicio && okFim;
  });
}

["filtroOfertaNome", "filtroOfertaDesconto", "filtroOfertaInicio", "filtroOfertaFim"].forEach((id) => {
  document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("input", () => {
    renderizarOfertas();
  });
});

document
  .querySelector<HTMLButtonElement>("#botaoLimparFiltrosOfertas")
  ?.addEventListener("click", () => {
    ["filtroOfertaNome", "filtroOfertaDesconto", "filtroOfertaInicio", "filtroOfertaFim"].forEach((id) => {
      const campo = document.querySelector<HTMLInputElement>(`#${id}`);
      if (campo) campo.value = "";
    });
    renderizarOfertas();
  });

function renderizarAgenda(): void {
  const visiveis = filtrarAgendamentos();

  listaAgendamentos.innerHTML = "";
  agendaVazia.style.display = visiveis.length === 0 ? "block" : "none";

  if (visiveis.length === 0 && agendamentosCache.length > 0) {
    agendaVazia.textContent = "Nenhum agendamento encontrado com os filtros atuais.";
  } else {
    agendaVazia.textContent = "Nenhum agendamento ainda.";
  }

  visiveis.forEach((agendamento) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${escaparTexto(agendamento.data)}</td>
      <td>${escaparTexto(agendamento.dono)}</td>
      <td>${escaparTexto(agendamento.endereco)}</td>
      <td>${escaparTexto(agendamento.transporte)}</td>
      <td>${escaparTexto(agendamento.cell)}</td>
      <td>${escaparTexto(agendamento.servico)}</td>
      <td class="celula-observacao">${escaparTexto(observacoesDoServico(agendamento.servico))}</td>
      <td>${escaparTexto(agendamento.horario)}</td>
      <td>${agendamento.valor.trim() ? formatarDinheiro(agendamento.valor) : ""}</td>
      <td class="coluna-acoes">
        <button type="button" class="botao-editar" data-linha="${agendamento.linha}">Editar</button>
        <button type="button" class="botao-apagar" data-linha="${agendamento.linha}">Apagar</button>
      </td>`;
    listaAgendamentos.appendChild(linha);
  });
}

// ==========================================
// SERVIÇOS DO AGENDAMENTO (MÚLTIPLA ESCOLHA)
// ==========================================
function preencherSelectServicos(valorSelecionado: string = ""): void {
  const container = document.querySelector<HTMLDivElement>(
    "#listaServicosAgendamento"
  );

  if (!container) return;

  container.innerHTML = "";

  if (servicosCache.length === 0) {
    container.innerHTML =
      '<p class="sem-servicos">Nenhum serviço cadastrado</p>';
    return;
  }

  const valorSalvo = (valorSelecionado || "").trim();

  const servicosSalvos = valorSalvo
    .split(",")
    .map((servico) => servico.trim().toLowerCase())
    .filter(Boolean);

  servicosCache.forEach((servico) => {
    const nome = String(servico.nome || "").trim();
    if (!nome) return;

    const observacao = String(servico.descricao || "").trim();

    const rotulo = document.createElement("label");
    rotulo.className = "item-servico-agendamento";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "servico";

    // O valor continua sendo só o nome (é isso que vai para a planilha)
    checkbox.value = nome;

    if (servicosSalvos.includes(nome.toLowerCase())) {
      checkbox.checked = true;
    }

    rotulo.appendChild(checkbox);

    // Exibe "Banho (Com Hidratação)" quando há observação
    const textoExibido = observacao ? `${nome} (${observacao})` : nome;
    rotulo.appendChild(document.createTextNode(textoExibido));

    container.appendChild(rotulo);
  });
}

function obterServicosSelecionados(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      '#listaServicosAgendamento input[name="servico"]:checked'
    )
  ).map((checkbox) => checkbox.value);
}

// Botão mostrar/ocultar serviços
botaoMostrarServicos?.addEventListener("click", () => {
  if (!listaServicosAgendamento) return;

  const abriu = listaServicosAgendamento.classList.toggle("aberto");

  botaoMostrarServicos.textContent = abriu
    ? "Ocultar serviços"
    : "Mostrar serviços";
});

// ==========================================
// AUTOCOMPLETE DA OFERTA (IMAGEM + NOME)
// ==========================================
const campoOfertaNome =
  document.querySelector<HTMLInputElement>("#ofertaNome")!;
const caixaSugestoesOferta =
  document.querySelector<HTMLDivElement>("#sugestoesOferta")!;
const campoOfertaPrecoAntigo = document.querySelector<HTMLInputElement>(
  "#ofertaPrecoAntigo"
)!;
const campoOfertaPrecoPromocional = document.querySelector<HTMLInputElement>(
  "#ofertaPrecoPromocional"
)!;
const campoOfertaDesconto =
  document.querySelector<HTMLInputElement>("#ofertaDesconto")!;

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
  const preview = document.querySelector<HTMLImageElement>(
    "#previewProdutoOferta"
  );
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
          ? `<img src="${escaparTexto(item.imagem)}" alt="${escaparTexto(item.produto)}">`
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
    campoDescricao.value = [produto.categoria, produto.marca]
      .filter(Boolean)
      .join(" - ");
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

// Foto DENTRO da primeira célula, junto do nome (sem <td> extra!)
function renderizarEstoque(produtos: ItemEstoque[] | null = null): void {
  if (produtos) {
    produtosEstoqueCache = produtos;
  }

  const visiveis = filtrarEstoque();

  listaEstoque.innerHTML = "";
  estoqueVazio.style.display = visiveis.length === 0 ? "block" : "none";

  if (visiveis.length === 0 && produtosEstoqueCache.length > 0) {
    estoqueVazio.textContent = "Nenhum produto encontrado com os filtros atuais.";
  } else {
    estoqueVazio.textContent = "Nenhum produto cadastrado na planilha ainda.";
  }

  visiveis.forEach((item) => {
    const quantidadeNumero =
      Number(String(item.quantidade).replace(/[^\d,-]/g, "")) || 0;
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
        ${
          item.imagem
            ? `<img src="${escaparTexto(item.imagem)}" alt="${escaparTexto(item.produto)}" class="estoque-imagem">`
            : ""
        }
        <span>${escaparTexto(item.produto)}</span>
      </td>
      <td>${escaparTexto(item.marca)}</td>
      <td>${escaparTexto(item.categoria)}</td>
      <td class="${classeQuantidade}">${escaparTexto(situacao)}</td>
      <td>${formatarValorPlanilha(item.preco)}</td>
      <td>${formatarValorPlanilha(item.desconto)}</td>
      <td>${escaparTexto(String(item.percentual))}</td>
      <td class="coluna-acoes">
        <button type="button" class="botao-editar-estoque" data-linha="${item.linha}">Editar</button>
        <button type="button" class="botao-apagar-estoque" data-linha="${item.linha}">Apagar</button>
      </td>`;
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
        if (!resp.ok) {
          const dadosErro = await resp.json().catch(() => ({}));
          throw new Error(dadosErro.erro || `Erro ${resp.status} ao apagar`);
        }
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
// ABA SERVIÇOS (GOOGLE SHEETS VIA API)
// ==========================================
async function carregarServicos(): Promise<void> {
  try {
    const resposta = await fetch("/api/servicos");
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(dados?.erro || "Falha ao carregar serviços.");
    }

    servicosCache = (dados.servicos || []).map((servico: any) => ({
      linha: Number(servico?.linha) || 0,
      nome: String(servico?.nome ?? servico?.servico ?? ""),
      descricao: String(servico?.descricao ?? servico?.observacao ?? ""),
      preco: String(servico?.preco ?? servico?.valor ?? ""),
      imagem: String(servico?.imagem ?? ""),
    }));
  } catch (erro: any) {
    servicosCache = [];
    console.error("Erro ao carregar serviços:", erro?.message);
  }

  renderizarServicos();
}

function renderizarServicos(): void {
  if (!listaServicos) return;

  listaServicos.innerHTML = "";

  if (servicosCache.length === 0) {
    if (servicosVazio) servicosVazio.style.display = "block";
    return;
  }

  if (servicosVazio) servicosVazio.style.display = "none";

  servicosCache.forEach((servico) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = servico.nome;
    tr.appendChild(tdNome);

    const tdDescricao = document.createElement("td");
    tdDescricao.textContent = servico.descricao || "";
    tr.appendChild(tdDescricao);

    const tdPreco = document.createElement("td");
    tdPreco.textContent = formatarValorPlanilha(servico.preco);
    tr.appendChild(tdPreco);

    // Imagem vindaa da coluna D da planilha (URL)
    const tdImagem = document.createElement("td");

    if (servico.imagem) {
      const imagem = document.createElement("img");
      imagem.src = servico.imagem;
      imagem.alt = servico.nome;
      imagem.className = "imagem-servico-tabela";

      imagem.onerror = () => {
        imagem.style.display = "none";
      };

      tdImagem.appendChild(imagem);
    }

    tr.appendChild(tdImagem);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "coluna-acoes";

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "botao-editar";
    botaoEditar.textContent = "Editar";
    botaoEditar.dataset.linha = String(servico.linha);

    const botaoApagar = document.createElement("button");
    botaoApagar.type = "button";
    botaoApagar.className = "botao-apagar";
    botaoApagar.textContent = "Apagar";
    botaoApagar.dataset.linha = String(servico.linha);

    tdAcoes.appendChild(botaoEditar);
    tdAcoes.appendChild(botaoApagar);
    tr.appendChild(tdAcoes);

    listaServicos.appendChild(tr);
  });
}

// Botão flutuante "+" da aba serviços
botaoAdicionarServico?.addEventListener("click", () => {
  if (!formNovoServico || !modalNovoServico) return;

  editandoServicoLinha = null;
  formNovoServico.reset();

  const titulo = modalNovoServico.querySelector("h3");
  if (titulo) titulo.textContent = "Novo Serviço";

  modalNovoServico.classList.add("aberto");
});

fecharModalServico?.addEventListener("click", () => {
  if (!modalNovoServico || !formNovoServico) return;
  modalNovoServico.classList.remove("aberto");
  formNovoServico.reset();
  editandoServicoLinha = null;
});

// ==========================================
// IMAGEM DO SERVIÇO (ARMAZENAMENTO INTERNO)
// ==========================================
const servicoImagemArquivo =
  document.querySelector<HTMLInputElement>("#servicoImagemArquivo");
const previewImagemServico =
  document.querySelector<HTMLImageElement>("#previewImagemServico");

let arquivoImagemServico: File | null = null;

function limparImagemServico(): void {
  arquivoImagemServico = null;
  if (servicoImagemArquivo) servicoImagemArquivo.value = "";
  if (previewImagemServico) {
    previewImagemServico.src = "";
    previewImagemServico.style.display = "none";
  }
}

// Limpa a prévia ao abrir um serviço novo ou fechar o modal
botaoAdicionarServico?.addEventListener("click", limparImagemServico);
fecharModalServico?.addEventListener("click", limparImagemServico);

// Reduz a foto para no máximo 1200px e converte em JPG
// (fica leve o suficiente para enviar pela API)
async function redimensionarImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const maxLado = 1200;
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d")!;
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(bitmap, 0, 0, largura, altura);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao processar a imagem."))),
      "image/jpeg",
      0.8
    );
  });
}

// Envia a imagem para a API, que salva no Google Drive
// e devolve o link público para gravar na planilha
async function enviarImagemServico(conteudo: Blob): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Falha ao ler a imagem."));
    leitor.readAsDataURL(conteudo);
  });

  const resposta = await fetch("/api/upload-imagem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagem: base64 }),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados?.erro || "Falha ao enviar a imagem.");
  }

  return String(dados.url || "");
}

// Prévia assim que o usuário escolhe o arquivo
servicoImagemArquivo?.addEventListener("change", () => {
  const arquivo = servicoImagemArquivo.files?.[0] || null;
  arquivoImagemServico = arquivo;

  if (!previewImagemServico) return;

  if (!arquivo) {
    const campoImagem = formNovoServico?.elements.namedItem(
      "imagem"
    ) as HTMLInputElement | null;
    if (campoImagem?.value) {
      previewImagemServico.src = campoImagem.value;
      previewImagemServico.style.display = "";
    } else {
      limparImagemServico();
    }
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    if (!previewImagemServico) return;
    previewImagemServico.src = String(leitor.result);
    previewImagemServico.style.display = "";
  };
  leitor.readAsDataURL(arquivo);
});

// Prévia da imagem salva ao clicar em Editar
listaServicos?.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest("button");
  if (!botao || botao.textContent !== "Editar") return;

  const servico = servicosCache.find((s) => s.linha === Number(botao.dataset.linha));

  arquivoImagemServico = null;
  if (servicoImagemArquivo) servicoImagemArquivo.value = "";

  if (previewImagemServico) {
    if (servico?.imagem) {
      previewImagemServico.src = servico.imagem;
      previewImagemServico.style.display = "";
    } else {
      previewImagemServico.src = "";
      previewImagemServico.style.display = "none";
    }
  }
});

// Salvar serviço (POST novo / PATCH edição)
formNovoServico?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const dados = new FormData(formNovoServico);
  const botaoSalvar = formNovoServico.querySelector<HTMLButtonElement>(".botao-salvar");

  const corpo = {
    linha: editandoServicoLinha ?? undefined,
    nome: String(dados.get("nome") || "").trim(),
    preco: String(dados.get("preco") || ""),
    descricao: String(dados.get("descricao") || ""),
    imagem: String(dados.get("imagem") || "").trim(),
  };

  if (!corpo.nome) return;

  try {
    // Se o usuário escolheu um arquivo do dispositivo, envia
    // primeiro para a API (que salva no Drive e devolve o link)
    if (arquivoImagemServico) {
      if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Enviando imagem...";
      }

      const conteudo = await redimensionarImagem(arquivoImagemServico);
      corpo.imagem = await enviarImagemServico(conteudo);
    }

    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
    }

    if (editandoServicoLinha === null) {
      const resposta = await fetch("/api/servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dadosResposta = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dadosResposta?.erro || "Erro ao salvar serviço.");
      }
    } else {
      const resposta = await fetch(`/api/servicos?linha=${editandoServicoLinha}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dadosResposta = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dadosResposta?.erro || "Erro ao editar serviço.");
      }
    }

    editandoServicoLinha = null;
    formNovoServico.reset();
    limparImagemServico();
    modalNovoServico?.classList.remove("aberto");
    await carregarServicos();
  } catch (erro: any) {
    alert("Falha ao salvar serviço: " + erro.message);
  } finally {
    if (botaoSalvar) {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = "Salvar serviço";
    }
  }
});

// Ações da tabela de serviços (Editar / Apagar)
listaServicos?.addEventListener("click", async (evento) => {
  const alvo = evento.target as HTMLElement;
  const botao = alvo.closest("button");
  if (!botao || !modalNovoServico) return;

  const linha = Number(botao.dataset.linha);
  if (!linha) return;

  if (botao.textContent === "Editar") {
    const servico = servicosCache.find((s) => s.linha === linha);
    if (!servico || !formNovoServico) return;

    editandoServicoLinha = servico.linha;

    const campoNome = formNovoServico.elements.namedItem("nome") as HTMLInputElement | null;
    const campoPreco = formNovoServico.elements.namedItem("preco") as HTMLInputElement | null;
    const campoDescricao = formNovoServico.elements.namedItem("descricao") as HTMLInputElement | null;
    const campoImagem = formNovoServico.elements.namedItem("imagem") as HTMLInputElement | null;

    if (campoNome) campoNome.value = servico.nome;
    if (campoPreco) campoPreco.value = String(servico.preco ?? "");
    if (campoDescricao) campoDescricao.value = String(servico.descricao ?? "");
    if (campoImagem) campoImagem.value = servico.imagem || "";

    const titulo = modalNovoServico.querySelector("h3");
    if (titulo) titulo.textContent = "Editar Serviço";

    modalNovoServico.classList.add("aberto");
  }

  if (botao.textContent === "Apagar") {
    if (!confirm("Apagar este serviço?")) return;
    try {
      const resposta = await fetch(`/api/servicos?linha=${linha}`, {
        method: "DELETE",
      });
      const dadosResposta = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dadosResposta?.erro || "Erro ao apagar serviço.");
      }
      await carregarServicos();
    } catch (erro: any) {
      alert(erro instanceof Error ? erro.message : "Erro ao apagar serviço.");
    }
  }
});

// ==========================================
// CONTROLE DAS ABAS
// ==========================================
function removerClassesDasAbas(): void {
  botaoAgenda.classList.remove("ativo");
  botaoEstoque.classList.remove("ativo");
  botaoOfertas.classList.remove("ativo");
  botaoServicos.classList.remove("ativo");
  secaoAgenda.classList.remove("visivel");
  secaoEstoque.classList.remove("visivel");
  secaoOfertas.classList.remove("visivel");
  secaoServicos.classList.remove("visivel");
}

function alternarAba(aba: "agenda" | "estoque" | "ofertas" | "servicos"): void {
  abaAtual = aba;
  removerClassesDasAbas();

  if (aba === "agenda") {
    botaoAgenda.classList.add("ativo");
    secaoAgenda.classList.add("visivel");
    botaoAdicionar.style.display = "inline-flex";
    botaoAdicionar.setAttribute("aria-label", "Adicionar agendamento");
    void carregarAgendamentos();
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
    void carregarOfertas();
  }

  if (aba === "servicos") {
    botaoServicos.classList.add("ativo");
    secaoServicos.classList.add("visivel");
    // A aba serviços tem o botão "+" flutuante dela
    botaoAdicionar.style.display = "none";
    void carregarServicos();
  }
}

botaoAgenda.addEventListener("click", () => alternarAba("agenda"));
botaoEstoque.addEventListener("click", () => alternarAba("estoque"));
botaoOfertas.addEventListener("click", () => alternarAba("ofertas"));
botaoServicos.addEventListener("click", () => alternarAba("servicos"));

// Botão geral "+"
botaoAdicionar.addEventListener("click", () => {
  if (abaAtual === "agenda") {
    editandoLinha = null;
    formNovoAgendamento.reset();
    preencherSelectServicos();

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
    abrirModalOferta();
    void carregarEstoque();
    const campoInicio = document.querySelector<HTMLInputElement>("#ofertaInicio")!;
    campoInicio.value = dataHojeISO();
    modalNovaOferta.classList.add("aberto");
  }
});

fecharModalNovo.addEventListener("click", () => {
  modalNovo.classList.remove("aberto");
  editandoLinha = null;
});

// Submissão do agendamento (Criação e Edição na planilha)
formNovoAgendamento.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const dados = new FormData(formNovoAgendamento);

  let data = String(dados.get("data") || "");
  let horario = String(dados.get("horario") || "");

  // Se o campo de horário for datetime-local, separa data e hora
  if (horario.includes("T")) {
    const [parteData, parteHora] = horario.split("T");
    if (!data) data = parteData;
    horario = parteHora;
  }

  const valorNumerico = obterValorNumerico(String(dados.get("valor") || ""));

  const corpo = {
    linha: editandoLinha ?? undefined,
    data: normalizarDataPlanilha(data),
    dono: String(dados.get("dono") || ""),
    endereco: String(dados.get("endereco") || ""),
    transporte: String(dados.get("transporte") || ""),
    cell: String(dados.get("cell") || ""),
    servico: obterServicosSelecionados().join(", "),
    horario: horario.trim(),
    valor: formatarDinheiro(valorNumerico),
  };

  try {
    const resposta = await fetch("/api/agendamentos", {
      method: editandoLinha ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    if (!resposta.ok) {
      const erroDados = await resposta.json().catch(() => ({}));
      throw new Error(
        erroDados.erro || "Erro ao salvar agendamento na planilha."
      );
    }

    editandoLinha = null;
    formNovoAgendamento.reset();
    modalNovo.classList.remove("aberto");
    await carregarAgendamentos();
  } catch (erro: any) {
    alert("Falha ao salvar agendamento: " + erro.message);
  }
});

// Ações da lista de agendamentos
listaAgendamentos.addEventListener("click", async (evento) => {
  const alvo = evento.target as HTMLElement;
  const linhaStr = alvo.dataset.linha;
  if (!linhaStr) return;

  const linha = Number(linhaStr);

  if (alvo.classList.contains("botao-apagar")) {
    if (confirm("Deseja realmente apagar este agendamento da planilha?")) {
      alvo.textContent = "...";
      try {
        const resposta = await fetch(`/api/agendamentos?linha=${linha}`, {
          method: "DELETE",
        });
        if (!resposta.ok) throw new Error("Erro ao apagar");
        await carregarAgendamentos();
      } catch (erro: any) {
        alert("Não foi possível excluir o agendamento: " + erro.message);
        alvo.textContent = "Apagar";
      }
    }
  }

  if (alvo.classList.contains("botao-editar")) {
    const agendamento = agendamentosCache.find((a) => a.linha === linha);
    if (!agendamento) return;

    editandoLinha = agendamento.linha;

    const campoData = formNovoAgendamento.elements.namedItem(
      "data"
    ) as HTMLInputElement | null;
    if (campoData) campoData.value = converterDataParaInput(agendamento.data);

    (formNovoAgendamento.elements.namedItem("dono") as HTMLInputElement).value =
      agendamento.dono;

    const campoEndereco = formNovoAgendamento.elements.namedItem(
      "endereco"
    ) as HTMLInputElement | null;
    if (campoEndereco) campoEndereco.value = agendamento.endereco;

    const campoTransporte = formNovoAgendamento.elements.namedItem(
      "transporte"
    ) as HTMLInputElement | null;
    if (campoTransporte) campoTransporte.value = agendamento.transporte || "";

    const campoCell = formNovoAgendamento.elements.namedItem(
      "cell"
    ) as HTMLInputElement | null;
    if (campoCell) campoCell.value = agendamento.cell;

    // Marca as caixinhas dos serviços salvos neste agendamento
    preencherSelectServicos(agendamento.servico);

    const campoHorario = formNovoAgendamento.elements.namedItem(
      "horario"
    ) as HTMLInputElement | null;
    if (campoHorario) campoHorario.value = agendamento.horario;

    campoValor.value = limparValor(agendamento.valor);

    const titulo = modalNovo.querySelector("h3");
    if (titulo) titulo.textContent = "Editar Agendamento";

    modalNovo.classList.add("aberto");
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
  alternarAba("agenda");
  void carregarOfertas();
  void carregarServicos();
}

// ==========================================
// GARANTIA DA PRÉVIA + IMAGEM DA OFERTA
// ==========================================
(function () {
  const caixaSugestoes = document.querySelector<HTMLDivElement>("#sugestoesOferta");
  const previaOferta = document.querySelector<HTMLImageElement>("#previewProdutoOferta");
  const campoImagemOfertaGarantia = document.querySelector<HTMLInputElement>("#ofertaImagem");

  if (!caixaSugestoes || !previaOferta) return;

  caixaSugestoes.addEventListener("click", (evento) => {
    const item = (evento.target as HTMLElement).closest(".sugestao-item");
    if (!item) return;

    const foto = item.querySelector("img");
    if (foto && foto.src) {
      previaOferta.src = foto.src;
      if (campoImagemOfertaGarantia) {
        campoImagemOfertaGarantia.value = foto.src;
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

    // 1. Tenta pela oferta salva na planilha (campo imagem)
    const salva = ofertasCache.find(
      (o) => (o.nome || "").trim().toLowerCase() === nomeLimpo && o.imagem
    );
    if (salva && salva.imagem) return salva.imagem;

    // 2. Fallback: imagem do produto no estoque
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

// ==========================================
// OBSERVAÇÕES DOS SERVIÇOS (coluna na Agenda)
// ==========================================
let servicosObservacoesCache: Servico[] = [];

function normalizarNomeServico(texto: string): string {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function carregarObservacoesServicos(): Promise<void> {
  if (servicosObservacoesCache.length) return;

  try {
    const resp = await fetch("/api/servicos");
    if (!resp.ok) return;

    const dados = await resp.json().catch(() => null);
    if (!dados) return;

    const listaBruta: any[] = Array.isArray(dados)
      ? dados
      : Array.isArray(dados.servicos)
        ? dados.servicos
        : Object.values(dados.servicos || {});

    servicosObservacoesCache = listaBruta.map((s: any) => ({
      linha: Number(s?.linha) || 0,
      nome: String(s?.nome ?? s?.servico ?? "").trim(),
      descricao: String(s?.descricao ?? s?.observacao ?? "").trim(),
      preco: String(s?.preco ?? s?.valor ?? "").trim(),
      imagem: String(s?.imagem ?? "").trim(),
    }));
  } catch {
    // Se falhar, a coluna só fica vazia — a agenda continua funcionando
  }
}

function observacoesDoServico(textoServico: string): string {
  const texto = String(textoServico ?? "").trim();
  if (!texto || !servicosObservacoesCache.length) return "";

  const partes = texto
    .split(/,\s*|\s+e\s+/i)
    .map((parte) => parte.trim())
    .filter(Boolean);

  const observacoes: string[] = [];

  partes.forEach((parte) => {
    // 1) Se o serviço já foi salvo com a observação entre parênteses
    const comParenteses = parte.match(/\(([^)]+)\)/);
    if (comParenteses) {
      const obs = comParenteses[1].trim();
      if (obs && !observacoes.includes(obs)) observacoes.push(obs);
      return;
    }

    // 2) Procura o serviço na aba Serviços (exato primeiro, depois parcial)
    const nomeParte = normalizarNomeServico(parte);
    const encontrado =
      servicosObservacoesCache.find(
        (s) => normalizarNomeServico(s.nome) === nomeParte && s.descricao
      ) ||
      servicosObservacoesCache.find(
        (s) => normalizarNomeServico(s.nome) === nomeParte
      ) ||
      servicosObservacoesCache.find(
        (s) =>
          nomeParte.length > 3 &&
          s.descricao &&
          normalizarNomeServico(s.nome).includes(nomeParte)
      );

    if (encontrado && encontrado.descricao) {
      if (!observacoes.includes(encontrado.descricao)) {
        observacoes.push(encontrado.descricao);
      }
    }
  });

  return observacoes.join(", ");
}

// Carrega os serviços ao abrir o painel e atualiza a tabela da Agenda
carregarObservacoesServicos().then(() => {
  renderizarAgenda();
});