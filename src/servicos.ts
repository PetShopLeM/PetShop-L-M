import "./style.css";

// ==========================================
// CATÁLOGO DE SERVIÇOS (GOOGLE SHEETS VIA API)
// ==========================================
interface Servico {
  linha: number;
  nome: string;
  descricao: string;
  preco: string;
  imagem: string;
}

const listaServicos = document.querySelector<HTMLElement>("#listaServicos");
const servicosVazio = document.querySelector<HTMLElement>("#servicosVazio");

// ------------------------------------------
// FORMATAÇÃO DE PREÇO
// ------------------------------------------
function formatarDinheiro(valor: string | number): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

  const numero = Number(texto.replace(/[^\d,.-]/g, "").replace(",", "."));
  if (Number.isNaN(numero)) return texto;

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ------------------------------------------
// MONTAGEM DOS CARTÕES
// ------------------------------------------
function criarCartao(servico: Servico): HTMLElement {
  const cartao = document.createElement("article");
  cartao.className = "cartao-servico";

  const preco = formatarDinheiro(servico.preco);

  cartao.innerHTML = `
    ${
      servico.imagem?.trim()
        ? `<img src="${servico.imagem.trim()}" alt="${servico.nome ?? ""}" loading="lazy" />`
        : `<div class="servico-sem-imagem">🐾</div>`
    }
    <div class="cartao-servico-conteudo">
      <h3>${servico.nome ?? ""}</h3>
      ${servico.descricao?.trim() ? `<p>${servico.descricao}</p>` : ""}
      ${preco ? `<span class="cartao-servico-preco">${preco}</span>` : ""}
    </div>
  `;

  // Se a URL da imagem estiver quebrada, mostra o no lugar
  const imagem = cartao.querySelector("img");
  if (imagem) {
    imagem.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "servico-sem-imagem";
      placeholder.textContent = "🐾";
      imagem.replaceWith(placeholder);
    });
  }

  return cartao;
}

// ------------------------------------------
// CARREGAMENTO
// ------------------------------------------
async function carregarServicos(): Promise<void> {
  if (!listaServicos) return;

  try {
    const resposta = await fetch("/api/servicos");
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const dados = await resposta.json();
    const servicos: Servico[] = Array.isArray(dados) ? dados : dados.servicos ?? [];

    listaServicos.innerHTML = "";

    if (!servicos.length) {
      listaServicos.style.display = "none";
      if (servicosVazio) servicosVazio.style.display = "";
      return;
    }

    if (servicosVazio) servicosVazio.style.display = "none";

    for (const servico of servicos) {
      listaServicos.appendChild(criarCartao(servico));
    }
  } catch (erro) {
    console.error("Erro ao carregar serviços:", erro);
    if (servicosVazio) {
      servicosVazio.textContent =
        "Não foi possível carregar os serviços agora. Tente novamente mais tarde.";
      servicosVazio.style.display = "";
    }
  }
}

carregarServicos();