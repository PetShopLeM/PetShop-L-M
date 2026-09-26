import "./style.css";

// ==========================================
// ELEMENTOS PRINCIPAIS
// ==========================================
const botaoMensagem = document.querySelector<HTMLButtonElement>("#botaoMensagem");
const modal = document.querySelector<HTMLDivElement>("#modalAgendamento");
const fecharModal = document.querySelector<HTMLButtonElement>("#fecharModal");
const formAgendamento = document.querySelector<HTMLFormElement>("#formAgendamento");
const campoValor = document.querySelector<HTMLInputElement>("#valor");
const campoData = document.querySelector<HTMLInputElement>(
  "#formAgendamento input[name='data']"
);
const listaServicosAgendamento = document.querySelector<HTMLDivElement>(
  "#listaServicosAgendamento"
);
const botaoBanho = document.querySelector<HTMLButtonElement>("#botaoBanho");
const botaoTosa = document.querySelector<HTMLButtonElement>("#botaoTosa");
const botaoOutrosServicos = document.querySelector<HTMLButtonElement>(
  "#botaoOutrosServicos"
);
const botaoMostrarServicos = document.querySelector<HTMLButtonElement>(
  "#botaoMostrarServicos"
);

// Número do WhatsApp que vai receber a mensagem (com código do país e DDD, sem espaços ou símbolos)
const numeroWhatsapp = "5511970264824";

// ==========================================
// TIPOS
// ==========================================
interface OpcaoServico {
  id: string;
  categoria: string;
  nome: string;
  preco: number;
}

interface OfertaAdmin {
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

// ==========================================
// OPÇÕES PADRÃO (fallback)
// Usadas somente se a planilha não responder.
// Quando a planilha responde, os valores vêm de lá
// (Banho = colunas F/G, Tosa = colunas I/J da aba Serviços).
// ==========================================
const servicosBanhoPadrao: OpcaoServico[] = [
  { id: "banho-pequeno", categoria: "Banho", nome: "Pequeno", preco: 50 },
  { id: "banho-medio", categoria: "Banho", nome: "Médio", preco: 60 },
  { id: "banho-grande", categoria: "Banho", nome: "Grande", preco: 80 },
  { id: "banho-pelo-curto", categoria: "Banho", nome: "Pelo Curto", preco: 150 },
  { id: "banho-pelo-medio", categoria: "Banho", nome: "Pelo Médio", preco: 160 },
  { id: "banho-pelo-longo", categoria: "Banho", nome: "Pelo Longo", preco: 180 },
];

const servicosTosaPadrao: OpcaoServico[] = [
  { id: "tosa-pequeno", categoria: "Tosa", nome: "Pequeno", preco: 0 }, // planilha está com R$ 0,00
  { id: "tosa-medio", categoria: "Tosa", nome: "Médio", preco: 60 },
  { id: "tosa-grande", categoria: "Tosa", nome: "Grande", preco: 80 },
  { id: "tosa-pelo-curto", categoria: "Tosa", nome: "Pelo Curto", preco: 150 },
  { id: "tosa-pelo-medio", categoria: "Tosa", nome: "Pelo Médio", preco: 160 },
  { id: "tosa-pelo-longo", categoria: "Tosa", nome: "Pelo Longo", preco: 180 },
];

let servicosBanho: OpcaoServico[] = servicosBanhoPadrao;
let servicosTosa: OpcaoServico[] = servicosTosaPadrao;
let servicosDaPlanilha: OpcaoServico[] = [];

// Guarda os serviços selecionados mesmo quando o usuário troca de categoria
const servicosSelecionados = new Map<string, OpcaoServico>();

// Categoria atualmente aberta
let categoriaAtual = "";

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Converte valores como "R$ 50,00", "1.234,56", "50" em número
function converterPrecoParaNumero(valor: unknown): number {
  let texto = String(valor ?? "").trim();

  if (!texto) return 0;

  texto = texto
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  if (temVirgula && temPonto) {
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (temVirgula) {
    texto = texto.replace(",", ".");
  } else if (temPonto) {
    const partes = texto.split(".");
    if (partes.length === 2 && partes[1].length === 3 && partes[0].length <= 3) {
      texto = texto.replace(".", "");
    }
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarTexto(texto: string): string {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function criarId(categoria: string, nome: string, linha?: number): string {
  if (linha) return `${categoria.toLowerCase()}-linha-${linha}`;
  const base = normalizarTexto(nome).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${categoria.toLowerCase()}-${base || "opcao"}`;
}

// Transforma as linhas da planilha (porte + valor) em opções do modal
function mapearPortes(lista: any, categoria: string): OpcaoServico[] {
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item: any, indice: number): OpcaoServico => {
      const nome = String(item?.porte ?? item?.nome ?? "").trim();
      const preco = converterPrecoParaNumero(item?.valor ?? item?.preco ?? 0);

      return {
        id: criarId(categoria, nome, Number(item?.linha) || indice + 2),
        categoria,
        nome,
        preco,
      };
    })
    .filter((servico) => servico.nome);
}

function obterServicosDaCategoria(categoria: string): OpcaoServico[] {
  if (categoria === "Banho") return servicosBanho;
  if (categoria === "Tosa") return servicosTosa;
  if (categoria === "Outros") return servicosDaPlanilha;
  return [];
}

function atualizarBotoesAtivos(botaoSelecionado?: HTMLButtonElement): void {
  document
    .querySelectorAll<HTMLButtonElement>(".botao-tipo-servico")
    .forEach((botao) => botao.classList.remove("ativo"));

  botaoSelecionado?.classList.add("ativo");
}

// ==========================================
// VALOR TOTAL
// ==========================================
function atualizarValorTotal(): void {
  if (!campoValor) return;

  let total = 0;

  servicosSelecionados.forEach((servico) => {
    total += servico.preco;
  });

  campoValor.value = formatarMoeda(total);
}

// ==========================================
// RENDERIZAÇÃO DOS SERVIÇOS
// ==========================================
function renderizarServicos(
  servicos: OpcaoServico[],
  categoria: string,
  botaoSelecionado?: HTMLButtonElement
): void {
  if (!listaServicosAgendamento) return;

  categoriaAtual = categoria;

  listaServicosAgendamento.innerHTML = "";
  listaServicosAgendamento.classList.add("aberto");

  atualizarBotoesAtivos(botaoSelecionado);

  if (servicos.length === 0) {
    const mensagem = document.createElement("p");
    mensagem.className = "sem-servicos";
    mensagem.textContent =
      categoria === "Outros"
        ? "Nenhum serviço cadastrado na planilha."
        : "Nenhuma opção disponível.";

    listaServicosAgendamento.appendChild(mensagem);
    return;
  }

  const titulo = document.createElement("p");
  titulo.className = "titulo-lista-servicos";
  titulo.textContent =
    categoria === "Outros" ? "Escolha um serviço:" : `Opções de ${categoria}:`;

  listaServicosAgendamento.appendChild(titulo);

  servicos.forEach((servico) => {
    const rotulo = document.createElement("label");
    rotulo.className = "item-servico-agendamento";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "servico";
    checkbox.value =
      categoria === "Outros" ? servico.nome : `${categoria} - ${servico.nome}`;
    checkbox.dataset.id = servico.id;
    checkbox.dataset.preco = String(servico.preco);
    checkbox.checked = servicosSelecionados.has(servico.id);

    const nome = document.createElement("span");
    nome.className = "nome-servico-agendamento";
    nome.textContent = checkbox.value;

    const preco = document.createElement("span");
    preco.className = "preco-item-servico";
    preco.textContent = formatarMoeda(servico.preco);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        servicosSelecionados.set(servico.id, servico);
      } else {
        servicosSelecionados.delete(servico.id);
      }

      atualizarValorTotal();
    });

    rotulo.appendChild(checkbox);
    rotulo.appendChild(nome);
    rotulo.appendChild(preco);

    listaServicosAgendamento.appendChild(rotulo);
  });

  atualizarValorTotal();
}

// ==========================================
// BOTÕES BANHO, TOSA E OUTROS
// ==========================================
botaoBanho?.addEventListener("click", () => {
  renderizarServicos(servicosBanho, "Banho", botaoBanho);
});

botaoTosa?.addEventListener("click", () => {
  renderizarServicos(servicosTosa, "Tosa", botaoTosa);
});

botaoOutrosServicos?.addEventListener("click", () => {
  renderizarServicos(servicosDaPlanilha, "Outros", botaoOutrosServicos);
});

// Compatibilidade com o botão antigo "Mostrar serviços"
botaoMostrarServicos?.addEventListener("click", () => {
  if (!listaServicosAgendamento) return;

  renderizarServicos(servicosDaPlanilha, "Outros", botaoMostrarServicos);
});

// ==========================================
// CARREGAR SERVIÇOS DA PLANILHA
// (lista principal + tabelas de Banho e Tosa)
// ==========================================
async function carregarServicosAgendamento(): Promise<void> {
  try {
    const resposta = await fetch("/api/servicos");

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const dados: any = await resposta.json().catch(() => ({}));

    const listaBruta: any[] = Array.isArray(dados)
      ? dados
      : Array.isArray(dados.servicos)
        ? dados.servicos
        : [];

    servicosDaPlanilha = listaBruta
      .map((servico: any, indice: number): OpcaoServico => {
        const nome = String(
          servico?.nome ?? servico?.servico ?? servico?.serviço ?? ""
        ).trim();

        const observacao = String(
          servico?.descricao ?? servico?.observacao ?? servico?.observação ?? ""
        ).trim();

        const preco = converterPrecoParaNumero(
          servico?.preco ?? servico?.valor ?? servico?.valores ?? servico?.preço ?? 0
        );

        const nomeCompleto = observacao ? `${nome} (${observacao})` : nome;

        return {
          id: `planilha-${indice}-${normalizarTexto(nome)}`,
          categoria: "Outros",
          nome: nomeCompleto,
          preco,
        };
      })
      .filter((servico) => servico.nome);

    // Atualiza Banho e Tosa com os valores da planilha
    const banhoDaPlanilha = mapearPortes(dados.banho, "Banho");
    const tosaDaPlanilha = mapearPortes(dados.tosa, "Tosa");

    if (banhoDaPlanilha.length > 0) servicosBanho = banhoDaPlanilha;
    if (tosaDaPlanilha.length > 0) servicosTosa = tosaDaPlanilha;

    // Se o usuário já estava vendo uma categoria, re-renderiza com os valores novos
    if (categoriaAtual === "Banho" && banhoDaPlanilha.length > 0) {
      renderizarServicos(servicosBanho, "Banho", botaoBanho);
    } else if (categoriaAtual === "Tosa" && tosaDaPlanilha.length > 0) {
      renderizarServicos(servicosTosa, "Tosa", botaoTosa);
    } else if (categoriaAtual === "Outros") {
      renderizarServicos(servicosDaPlanilha, "Outros", botaoOutrosServicos);
    }
  } catch (erro) {
    console.error("Não foi possível carregar os serviços:", erro);

    // Banho e Tosa mantêm os valores padrão; a lista "Outros" fica vazia
    servicosDaPlanilha = [];

    if (categoriaAtual === "Outros" && listaServicosAgendamento) {
      listaServicosAgendamento.innerHTML =
        '<p class="sem-servicos">Não foi possível carregar os serviços da planilha.</p>';
    }
  }
}

carregarServicosAgendamento();

// ==========================================
// DATA MÍNIMA DO AGENDAMENTO
// ==========================================
if (campoData) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  campoData.min = `${ano}-${mes}-${dia}`;
}

// ==========================================
// ABRIR E FECHAR MODAL
// ==========================================
botaoMensagem?.addEventListener("click", () => {
  modal?.classList.add("aberto");
});

fecharModal?.addEventListener("click", () => {
  modal?.classList.remove("aberto");
});

modal?.addEventListener("click", (evento) => {
  if (evento.target === modal) {
    modal.classList.remove("aberto");
  }
});

// ==========================================
// ENVIO DO AGENDAMENTO PELO WHATSAPP
// ==========================================
formAgendamento?.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const dados = new FormData(formAgendamento);

  const servicosMarcados = Array.from(servicosSelecionados.values());

  const servicosSelecionadosTexto =
    servicosMarcados.length > 0
      ? servicosMarcados
          .map((servico) => {
            const nome =
              servico.categoria === "Outros"
                ? servico.nome
                : `${servico.categoria} - ${servico.nome}`;

            return `${nome} - ${formatarMoeda(servico.preco)}`;
          })
          .join("\n")
      : "Não informado";

  const nomesServicos =
    servicosMarcados.length > 0
      ? servicosMarcados
          .map((servico) =>
            servico.categoria === "Outros"
              ? servico.nome
              : `${servico.categoria} - ${servico.nome}`
          )
          .join(", ")
      : "";

  const valorTotal = servicosMarcados.reduce(
    (total, servico) => total + servico.preco,
    0
  );

  const valorFormatado = formatarMoeda(valorTotal);

  let agendamentosSalvos: any[] = [];

  try {
    const salvos = JSON.parse(
      localStorage.getItem("agendamentos") || "[]"
    );

    if (Array.isArray(salvos)) {
      agendamentosSalvos = salvos;
    }
  } catch {
    agendamentosSalvos = [];
  }

  const horarioAtual = new Date().toLocaleString("pt-BR");

  agendamentosSalvos.push({
    data: dados.get("data"),
    dono:
      dados.get("Dono(a)") || dados.get("dono") || dados.get("nome"),
    endereco: dados.get("endereco"),
    transporte: dados.get("transporte"),
    cell:
      dados.get("cell") ||
      dados.get("celular") ||
      dados.get("telefone"),
    servico: nomesServicos,
    servicosDetalhados: servicosMarcados,
    valor: valorFormatado,
    horario: dados.get("horario"),
    horarioISO: "",
    enviadoEm: horarioAtual,
  });

  localStorage.setItem(
    "agendamentos",
    JSON.stringify(agendamentosSalvos)
  );

  const mensagem =
    `Olá! Gostaria de agendar um horário:\n\n` +
    `*Data:* ${dados.get("data") || "Não informado"}\n` +
    `*Horário:* ${dados.get("horario") || "Não informado"}\n` +
    `*Dono(a) e animal:* ${
      dados.get("Dono(a)") || dados.get("dono") || dados.get("nome") || "Não informado"
    }\n` +
    `*Endereço:* ${dados.get("endereco") || "Não informado"}\n` +
    `*Transporte:* ${dados.get("transporte") || "Não informado"}\n` +
    `*Celular:* ${
      dados.get("cell") || dados.get("celular") || dados.get("telefone") || "Não informado"
    }\n` +
    `*Serviço(s):*\n${servicosSelecionadosTexto}\n` +
    `*Valor total:* ${valorFormatado}`;

  const link =
    `https://wa.me/${numeroWhatsapp}?text=` +
    encodeURIComponent(mensagem);

  window.open(link, "_blank");

  formAgendamento.reset();

  servicosSelecionados.clear();
  categoriaAtual = "";

  if (campoValor) {
    campoValor.value = formatarMoeda(0);
  }

  if (listaServicosAgendamento) {
    listaServicosAgendamento.innerHTML = "";
    listaServicosAgendamento.classList.remove("aberto");
  }

  document
    .querySelectorAll<HTMLButtonElement>(".botao-tipo-servico")
    .forEach((botao) => botao.classList.remove("ativo"));

  if (botaoMostrarServicos) {
    botaoMostrarServicos.textContent = "Mostrar serviços";
  }

  modal?.classList.remove("aberto");
});

// ==========================================
// OFERTAS DO PAINEL ADMINISTRATIVO
// ==========================================
const secaoOfertasAdmin = document.querySelector<HTMLElement>("#secaoOfertasAdmin");
const linhaOfertasAdmin = document.querySelector<HTMLElement>("#linhaOfertasAdmin");

function escaparTextoHtml(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarPrecoTela(valor: string): string {
  const texto = String(valor ?? "").trim();

  if (!texto) return "";
  if (/R\$/i.test(texto)) return texto;

  const numero = converterPrecoParaNumero(texto);

  if (numero > 0) return formatarMoeda(numero);

  return texto;
}

function converterDataParaISO(valor: string): string {
  const texto = String(valor ?? "").trim();

  if (!texto) return "";

  // Data serial do Google Sheets
  if (/^\d+(\.\d+)?$/.test(texto)) {
    const milissegundos = Math.round((Number(texto) - 25569) * 86400 * 1000);
    const data = new Date(milissegundos);

    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(data.getUTCDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  // Data no formato dd/mm/aaaa
  const partes = texto.split("/");

  if (partes.length === 3) {
    const dia = partes[0].padStart(2, "0");
    const mes = partes[1].padStart(2, "0");
    const ano = partes[2];

    return `${ano}-${mes}-${dia}`;
  }

  // Data no formato aaaa-mm-dd
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  return "";
}

function ofertaDentroDoPeriodo(oferta: OfertaAdmin): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicioISO = converterDataParaISO(oferta.inicio);

  if (inicioISO) {
    const inicio = new Date(`${inicioISO}T00:00:00`);
    if (!isNaN(inicio.getTime()) && inicio > hoje) return false;
  }

  const fimISO = converterDataParaISO(oferta.fim);

  if (fimISO) {
    const fim = new Date(`${fimISO}T00:00:00`);
    if (!isNaN(fim.getTime()) && fim < hoje) return false;
  }

  return true;
}

async function carregarOfertasAdmin(): Promise<void> {
  if (!secaoOfertasAdmin || !linhaOfertasAdmin) return;

  let ofertas: OfertaAdmin[] = [];

  try {
    const resposta = await fetch("/api/ofertas");
    const dados: any = await resposta.json().catch(() => ({}));

    if (resposta.ok) {
      ofertas = Array.isArray(dados)
        ? dados
        : Array.isArray(dados.ofertas)
          ? dados.ofertas
          : [];
    }
  } catch {
    ofertas = [];
  }

  const ofertasAtivas = ofertas.filter(ofertaDentroDoPeriodo);

  if (ofertasAtivas.length === 0) {
    secaoOfertasAdmin.style.display = "none";
    linhaOfertasAdmin.innerHTML = "";
    return;
  }

  secaoOfertasAdmin.style.display = "block";

  linhaOfertasAdmin.innerHTML = ofertasAtivas
    .map((oferta) => {
      const precoAntigo = formatarPrecoTela(oferta.precoAntigo);
      const precoPromocional = formatarPrecoTela(oferta.precoPromocional);
      const desconto = String(oferta.desconto || "").replace("%", "").trim();

      const imagem = oferta.imagem
        ? `<img src="${escaparTextoHtml(oferta.imagem)}" alt="${escaparTextoHtml(oferta.nome)}">`
        : `<span class="produto-emoji">🐾</span>`;

      return `
        <article class="card-produto card-oferta-admin">
          <span class="tag-promo">Oferta</span>

          <div class="produto-imagem">
            ${imagem}
          </div>

          <div class="produto-dados">
            ${
              oferta.descricao
                ? `<span class="produto-marca">${escaparTextoHtml(oferta.descricao)}</span>`
                : ""
            }

            <h4 class="produto-nome">${escaparTextoHtml(oferta.nome)}</h4>

            ${
              precoAntigo
                ? `<p class="preco-antigo">De <s>${escaparTextoHtml(precoAntigo)}</s></p>`
                : ""
            }

            <p class="preco-atual">
              ${escaparTextoHtml(precoPromocional)}

              ${
                desconto && desconto !== "0"
                  ? `<span class="badge-desconto">-${escaparTextoHtml(desconto)}%</span>`
                  : ""
              }
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

carregarOfertasAdmin();

// Atualiza ofertas e serviços quando o usuário volta para a aba da página
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    carregarOfertasAdmin();
    carregarServicosAgendamento();
  }
});

// ==========================================
// OFERTAS NA PÁGINA DE PRODUTOS (produtos.html)
// Sobrepõe a oferta nos cards já renderizados,
// sem depender de como os produtos são montados.
// ==========================================
(function aplicarOfertasNosProdutos() {
  if (!window.location.pathname.toLowerCase().includes("produtos")) {
    return;
  }

  interface OfertaProduto {
    nome: string;
    precoAntigo: string;
    precoPromocional: string;
    desconto: string;
    inicio: string;
    fim: string;
  }

  let ofertas: OfertaProduto[] = [];
  const cardsComOferta = new WeakSet<Element>();

  function normalizarLocal(texto: string): string {
    return String(texto || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function paraNumeroLocal(valor: unknown): number {
    let texto = String(valor ?? "").trim();

    if (!texto) return 0;

    texto = texto
      .replace(/\s/g, "")
      .replace(/R\$/gi, "")
      .replace(/[^\d,.-]/g, "");

    if (!texto) return 0;

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
      } else {
        texto = texto.replace(/,/g, "");
      }
    } else if (temVirgula) {
      texto = texto.replace(",", ".");
    } else if (temPonto) {
      const partes = texto.split(".");
      if (partes.length === 2 && partes[1].length === 3 && partes[0].length <= 3) {
        texto = texto.replace(".", "");
      }
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  }

  function moedaLocal(valor: number): string {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function precoVisivelLocal(valor: string): string {
    const texto = String(valor ?? "").trim();

    if (!texto) return "";
    if (/R\$/i.test(texto)) return texto;

    const numero = paraNumeroLocal(texto);
    return numero > 0 ? moedaLocal(numero) : texto;
  }

  function dataISOLocal(valor: string): string {
    const texto = String(valor ?? "").trim();

    if (!texto) return "";

    // Data serial do Google Sheets
    if (/^\d+(\.\d+)?$/.test(texto)) {
      const data = new Date(
        Math.round((Number(texto) - 25569) * 86400 * 1000)
      );

      return (
        `${data.getUTCFullYear()}-` +
        `${String(data.getUTCMonth() + 1).padStart(2, "0")}-` +
        `${String(data.getUTCDate()).padStart(2, "0")}`
      );
    }

    // dd/mm/aaaa
    const partes = texto.split("/");
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
    }

    // aaaa-mm-dd
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : "";
  }

  function ofertaAtivaLocal(oferta: OfertaProduto): boolean {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioISO = dataISOLocal(oferta.inicio);
    if (inicioISO) {
      const inicio = new Date(`${inicioISO}T00:00:00`);
      if (!isNaN(inicio.getTime()) && inicio > hoje) return false;
    }

    const fimISO = dataISOLocal(oferta.fim);
    if (fimISO) {
      const fim = new Date(`${fimISO}T00:00:00`);
      if (!isNaN(fim.getTime()) && fim < hoje) return false;
    }

    return true;
  }

  async function carregarOfertas(): Promise<void> {
    try {
      const resposta = await fetch("/api/ofertas");
      const dados: any = await resposta.json().catch(() => ({}));

      if (!resposta.ok) return;

      const lista: any[] = Array.isArray(dados)
        ? dados
        : Array.isArray(dados.ofertas)
          ? dados.ofertas
          : [];

      ofertas = lista
        .map((oferta: any): OfertaProduto => ({
          nome: String(oferta?.nome ?? oferta?.produto ?? "").trim(),
          precoAntigo: String(
            oferta?.precoAntigo ?? oferta?.preco_antigo ?? ""
          ),
          precoPromocional: String(
            oferta?.precoPromocional ?? oferta?.preco_promocional ?? ""
          ),
          desconto: String(oferta?.desconto ?? ""),
          inicio: String(oferta?.inicio ?? ""),
          fim: String(oferta?.fim ?? ""),
        }))
        .filter((oferta) => oferta.nome && ofertaAtivaLocal(oferta));

      processarCards();
    } catch {
      // Sem ofertas, a página segue normal
    }
  }

  function nomeDoProduto(card: Element): string {
    const el =
      card.querySelector<HTMLElement>(".produto-nome") ||
      card.querySelector<HTMLElement>("h3, h4, strong");

    return el ? (el.textContent || "").trim() : "";
  }

  function encontrarPrecoEl(card: Element): HTMLElement | null {
    const direto = card.querySelector<HTMLElement>(
      ".preco-atual, .preco-produto, .produto-preco, .card-preco"
    );
    if (direto) return direto;

    // Procura o último elemento de texto que contenha "R$ ..."
    const todos = Array.from(card.querySelectorAll<HTMLElement>("*"));
    for (let i = todos.length - 1; i >= 0; i--) {
      const el = todos[i];
      const texto = (el.textContent || "").trim();
      if (/r\$\s?\d/i.test(texto) && el.children.length === 0) {
        return el;
      }
    }

    return null;
  }

  function encontrarOferta(card: Element): OfertaProduto | null {
    const nomeProduto = normalizarLocal(nomeDoProduto(card));
    if (!nomeProduto) return null;

    for (const oferta of ofertas) {
      const nomeComparar = normalizarLocal(oferta.nome);
      if (!nomeComparar) continue;

      if (
        nomeProduto.includes(nomeComparar) ||
        nomeComparar.includes(nomeProduto)
      ) {
        return oferta;
      }
    }

    return null;
  }

  function aplicarOferta(card: Element, oferta: OfertaProduto): void {
    if (cardsComOferta.has(card)) return;
    if (card.querySelector(".tag-promo")) {
      cardsComOferta.add(card);
      return;
    }

    const precoEl = encontrarPrecoEl(card);
    if (!precoEl) return;

    // Selo "Oferta"
    const tag = document.createElement("span");
    tag.className = "tag-promo";
    tag.textContent = "Oferta";
    card.insertBefore(tag, card.firstChild);

    // Preço antigo riscado
    const precoAntigoTexto = precoVisivelLocal(oferta.precoAntigo);
    if (precoAntigoTexto && precoEl.parentElement) {
      const antigo = document.createElement("p");
      antigo.className = "preco-antigo";
      antigo.innerHTML = `De <s>${precoAntigoTexto}</s>`;
      precoEl.parentElement.insertBefore(antigo, precoEl);
    }

    // Preço promocional
    const promoTexto = precoVisivelLocal(oferta.precoPromocional);
    if (promoTexto) {
      precoEl.textContent = promoTexto;
    }

    // Selo de desconto
    const desconto = String(oferta.desconto || "").replace("%", "").trim();
    if (desconto && desconto !== "0") {
      const badge = document.createElement("span");
      badge.className = "badge-desconto";
      badge.textContent = `-${desconto}%`;
      precoEl.appendChild(badge);
    }

    cardsComOferta.add(card);
  }

  function processarCards(): void {
    if (ofertas.length === 0) return;

    const cards = document.querySelectorAll<HTMLElement>(
      ".card-produto, .produto-card, .item-produto"
    );

    cards.forEach((card) => {
      const oferta = encontrarOferta(card);
      if (oferta) {
        aplicarOferta(card, oferta);
      }
    });
  }

  // Os cards são criados por JavaScript quando a categoria carrega,
  // então observamos o DOM para aplicar a oferta em cards novos também
  const observador = new MutationObserver(() => processarCards());
  observador.observe(document.body, { childList: true, subtree: true });

  carregarOfertas();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      carregarOfertas();
    }
  });
})();