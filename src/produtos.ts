import "./style.css";

// ==========================================
// CATÁLOGO DE PRODUTOS (GOOGLE SHEETS VIA API)
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

interface OfertaProduto {
  nome: string;
  precoAntigo: string;
  precoPromocional: string;
  desconto: string;
  inicio: string;
  fim: string;
}

const gradeProdutos = document.querySelector<HTMLElement>("#gradeProdutos");
const mensagemVazia = document.querySelector<HTMLElement>("#mensagemVazia");
const botoesFiltro = document.querySelectorAll<HTMLButtonElement>(".btn-filtro");

let produtosCache: ItemEstoque[] = [];
let ofertasCache: OfertaProduto[] = [];

// Remove acentos e deixa em minúsculas ("Pássaro" vira "passaro")
function normalizarCategoria(texto: string): string {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function categoriaAtual(): string {
  const parametro = new URLSearchParams(window.location.search);
  return normalizarCategoria(parametro.get("categoria") || "");
}

// Aceita variações: "roedor" encontra "Roedores", "passaro" encontra "Pássaro"
function mesmaCategoria(categoriaProduto: string, filtro: string): boolean {
  if (!filtro || filtro === "todos") return true;
  const cat = normalizarCategoria(categoriaProduto);
  if (!cat) return false;
  return cat === filtro || cat.startsWith(filtro) || filtro.startsWith(cat);
}

function escaparTextoHtml(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarPreco(valor: unknown): string {
  if (typeof valor === "number") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (texto.includes("R$")) return texto;
  const numero = Number(texto.replace(/[^\d,.]/g, "").replace(",", "."));
  if (!isNaN(numero) && numero > 0) {
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return texto;
}

// ==========================================
// OFERTAS (aba Ofertas da planilha, via /api/ofertas)
// ==========================================
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
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    const data = new Date(Math.round((Number(texto) - 25569) * 86400 * 1000));

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

// Compara o nome do card com o nome da oferta.
// Primeiro tenta match exato (ignorando acento/maiúscula);
// se não bater, aceita quando a maioria das palavras coincide
// (ex.: "Bolinha" x "Boinha" ainda casa pelas outras palavras).
function nomesParecemIguais(nomeProduto: string, nomeOferta: string): boolean {
  const a = normalizarCategoria(nomeProduto);
  const b = normalizarCategoria(nomeOferta);

  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const palavrasA = a.split(/\s+/).filter((p) => p.length > 2);
  const palavrasB = b.split(/\s+/).filter((p) => p.length > 2);

  if (palavrasA.length === 0 || palavrasB.length === 0) return false;

  const menores = palavrasA.length <= palavrasB.length ? palavrasA : palavrasB;
  const maiores = menores === palavrasA ? palavrasB : palavrasA;

  let iguais = 0;
  menores.forEach((palavra) => {
    if (
      maiores.some(
        (outra) =>
          outra === palavra ||
          (palavra.length >= 5 && outra.includes(palavra))
      )
    ) {
      iguais++;
    }
  });

  return iguais / menores.length >= 0.6;
}

function encontrarOferta(card: Element): OfertaProduto | null {
  const elNome =
    card.querySelector<HTMLElement>(".produto-nome") ||
    card.querySelector<HTMLElement>("h3, h4, strong");

  const nomeProduto = elNome ? (elNome.textContent || "").trim() : "";
  if (!nomeProduto) return null;

  for (const oferta of ofertasCache) {
    if (nomesParecemIguais(nomeProduto, oferta.nome)) {
      return oferta;
    }
  }

  return null;
}

function aplicarOferta(card: Element, oferta: OfertaProduto): void {
  if (card.querySelector(".tag-promo")) return;

  const precoEl = card.querySelector<HTMLElement>(".preco-atual");
  if (!precoEl) return;

  // Selo "Oferta"
  const tag = document.createElement("span");
  tag.className = "tag-promo";
  tag.textContent = "Oferta";
  card.insertBefore(tag, card.firstChild);

  // Preço antigo riscado
  const antigoTexto = precoVisivelLocal(oferta.precoAntigo);
  if (antigoTexto && precoEl.parentElement) {
    const antigo = document.createElement("p");
    antigo.className = "preco-antigo";
    antigo.innerHTML = `De <s>${escaparTextoHtml(antigoTexto)}</s>`;
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
}

function aplicarOfertasNosCards(): void {
  if (!gradeProdutos || ofertasCache.length === 0) return;

  gradeProdutos
    .querySelectorAll<HTMLElement>(".card-produto")
    .forEach((card) => {
      const oferta = encontrarOferta(card);
      if (oferta) {
        aplicarOferta(card, oferta);
      }
    });
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

    ofertasCache = lista
      .map((oferta: any): OfertaProduto => ({
        nome: String(oferta?.nome ?? oferta?.produto ?? "").trim(),
        precoAntigo: String(oferta?.precoAntigo ?? ""),
        precoPromocional: String(oferta?.precoPromocional ?? ""),
        desconto: String(oferta?.desconto ?? ""),
        inicio: String(oferta?.inicio ?? ""),
        fim: String(oferta?.fim ?? ""),
      }))
      .filter((oferta) => oferta.nome && ofertaAtivaLocal(oferta));

    aplicarOfertasNosCards();
  } catch {
    // Sem ofertas, a página segue normal
  }
}

// ==========================================
// RENDERIZAÇÃO
// ==========================================
function renderizarProdutos(): void {
  if (!gradeProdutos || !mensagemVazia) return;

  const filtro = categoriaAtual();

  // Marca o botão da categoria ativa
  botoesFiltro.forEach((botao) => {
    const valor = normalizarCategoria(botao.dataset.categoria || "");
    const ativo = valor === filtro || (!filtro && valor === "todos");
    botao.classList.toggle("ativo", ativo);
  });

  const filtrados = produtosCache.filter((item) =>
    mesmaCategoria(item.categoria, filtro)
  );

  if (filtrados.length === 0) {
    gradeProdutos.innerHTML = "";
    mensagemVazia.style.display = "block";
    return;
  }

  mensagemVazia.style.display = "none";

  gradeProdutos.innerHTML = filtrados
    .map((item) => {
      const preco = formatarPreco(item.preco);

      const imagem = item.imagem
        ? `<img src="${escaparTextoHtml(item.imagem)}" alt="${escaparTextoHtml(item.produto)}">`
        : `<span class="produto-emoji">🐾</span>`;

      return `
        <article class="card-produto">
          <div class="produto-imagem">${imagem}</div>
          <div class="produto-dados">
            ${item.marca ? `<span class="produto-marca">${escaparTextoHtml(item.marca)}</span>` : ""}
            <h4 class="produto-nome">${escaparTextoHtml(item.produto)}</h4>
            <p class="preco-atual">${escaparTextoHtml(preco)}</p>
          </div>
        </article>
      `;
    })
    .join("");

  // Aplica as ofertas por cima dos cards recém-criados
  aplicarOfertasNosCards();
}

async function carregarProdutos(): Promise<void> {
  try {
    const resposta = await fetch("/api/estoque");
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.erro || erro.error || "Falha ao carregar produtos.");
    }
    produtosCache = (await resposta.json()) as ItemEstoque[];
  } catch (erro) {
    console.error(erro);
    produtosCache = [];
  }

  renderizarProdutos();
}

// Clique nos filtros da própria página de produtos
botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    const valor = (botao.dataset.categoria || "todos").trim();
    const url = new URL(window.location.href);
    url.searchParams.set("categoria", valor);
    window.history.pushState({}, "", url);
    renderizarProdutos();
  });
});

// Botão voltar/avançar do navegador
window.addEventListener("popstate", renderizarProdutos);

// Atualiza as ofertas quando o usuário volta para a aba da página
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    carregarOfertas();
  }
});

carregarProdutos();
carregarOfertas();