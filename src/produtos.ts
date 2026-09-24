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

const gradeProdutos = document.querySelector<HTMLElement>("#gradeProdutos");
const mensagemVazia = document.querySelector<HTMLElement>("#mensagemVazia");
const botoesFiltro = document.querySelectorAll<HTMLButtonElement>(".btn-filtro");

let produtosCache: ItemEstoque[] = [];

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

carregarProdutos();