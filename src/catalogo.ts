export interface Produto {
  id: number;
  categoria: string;
  nome: string;
  marca: string;
  nota: string;
  emoji: string;
  imagem: string;
  precoAntigo?: string;
  precoAtual: string;
  precoAssinante: string;
  desconto?: string;
  tag?: string;
}

export const catalogoProdutos: Produto[] = [
// =========================
  // CACHORRO
  // =========================
  {
    id: 1,
    categoria: "cachorro",
    nome: "Adaptador para Cinto de Segurança Toh Fiji",
    marca: "Toh",
    nota: "",
    emoji: "🦮",
    imagem: "https://cobasi.vteximg.com.br/arquivos/ids/1083739-1200-1200/Adaptador-para-Cinto-de-Seguranca-Toh-Fiji-detalhes-do-mosquetao--1-.webp?v=638919008095730000",
    precoAntigo: "À vista por R$ 59,90",
    precoAtual: "R$ 54,99",
    precoAssinante: "R$ 49,49",
    desconto: "-10%",
    tag: "Oferta",
  },
  {
    id: 2,
    categoria: "cachorro",
    nome: "Brinquedo Bolinha Cordão Trançado Flicks",
    marca: "Flicks",
    nota: " ",
    emoji: "🎾",
    imagem: "https://cobasi.vtexassets.com/arquivos/ids/1065492/Brinquedo-Bolinha-Cordao-Trancado-Flicks.jpg?v=638696083311430000",
    precoAntigo: "À vista por R$ 29,90",
    precoAtual: "R$ 26,90",
    precoAssinante: "R$ 24,21",
    desconto: "-10%",
    tag: "Mais vendido",
  },

  // =========================
  // GATO
  // =========================
  {
    id: 3,
    categoria: "gato",
    nome: "Brinquedo Varinha com Penas e Guizo",
    marca: "Savana Pet",
    nota: "",
    emoji: "🪄",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsgxBEbTCowweA0siA3l3ij7eIrXlhSlwq6tyJvtOJCA&s=10",
    precoAntigo: "À vista por R$ 22,90",
    precoAtual: "R$ 19,90",
    precoAssinante: "R$ 17,91",
    desconto: "-10%",
    tag: "Oferta",
  },
  {
    id: 4,
    categoria: "gato",
    nome: "Arranhador de Sisal Torre com Bolinha",
    marca: "Pet Comfort",
    nota: "",
    emoji: "🧶",
    imagem: "https://http2.mlstatic.com/D_Q_NP_877122-MLB110172148743_042026-F-o-arranhador-para-gatos-interativo-46cm-importado-com-sisal.webp",
    precoAntigo: "À vista por R$ 89,90",
    precoAtual: "R$ 79,90",
    precoAssinante: "R$ 71,91",
    desconto: "-10%",
    tag: "Recomendado",
  },

  // =========================
  // PÁSSARO
  // =========================
  {
    id: 5,
    categoria: "passaro",
    nome: "Mistura Especial para Calopsita e Agapornis 500g",
    marca: "Nutrópica",
    nota: "",
    emoji: "🐦",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIMFwhvXkSQUmbYFyvPuS24wKewt9kxlmcPy729aW_3Q&s=10",
    precoAntigo: "À vista por R$ 34,90",
    precoAtual: "R$ 29,90",
    precoAssinante: "R$ 26,91",
    desconto: "-10%",
    tag: "Premium",
  },
  {
    id: 6,
    categoria: "passaro",
    nome: "Balanço de Madeira Natural para Gaiola",
    marca: "Bird Toys",
    nota: "",
    emoji: "🪵",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSI5Zg8EsAFJyz1iz75V_xZp5hbNY2o-1Aktx4VQh2cg&s",
    precoAntigo: "À vista por R$ 24,50",
    precoAtual: "R$ 19,50",
    precoAssinante: "R$ 17,55",
    desconto: "-10%",
  },

  // =========================
  // PEIXE
  // =========================
  {
    id: 7,
    categoria: "peixe",
    nome: "Ração para Peixes Tropicais em Flocos",
    marca: "Tetra",
    nota: "",
    emoji: "🐟",
    imagem: "",
    precoAntigo: "À vista por R$ 42,90",
    precoAtual: "R$ 38,90",
    precoAssinante: "R$ 35,01",
    desconto: "-10%",
    tag: "Importado",
  },
  {
    id: 8,
    categoria: "peixe",
    nome: "Condicionador de Água para Aquário 100ml",
    marca: "Seachem",
    nota: "",
    emoji: "🧪",
    imagem: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRY7ZVkdx_O1tQBZ_AdziCPP342eA5H93djULAeMesHNWg6svA8a51bl10aCIEymy53BOEiv7H7mi-1Dooz_82muUjNpAMe-uqog_-9GgzAhTskNGR8zWDUZ8iixwD-28wQKq57oQ&usqp=CAc",
    precoAntigo: "À vista por R$ 68,00",
    precoAtual: "R$ 59,90",
    precoAssinante: "R$ 53,91",
    desconto: "-10%",
    tag: "Essencial",
  },

  // =========================
  // OUTROS PETS
  // =========================
  {
    id: 9,
    categoria: "outros",
    nome: "Feno de Capim Seco para Roedores 500g",
    marca: "Zootekna",
    nota: "",
    emoji: "🐰",
    imagem: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRtMu0HqlzGctYzxFcZPJXQjrCZyg0Tot1x2jKp_FQipX0Oj4nU_X7LS4tgHWPz3ZVurlcDQfN0o4aHA3wb_IpYWvUJrsTJfsSLpxy36xdgUVjPuBn0JVnQSTTQ3r6R3r3Q48aORc4&usqp=CAc",
    precoAntigo: "À vista por R$ 19,90",
    precoAtual: "R$ 16,90",
    precoAssinante: "R$ 15,21",
    desconto: "-10%",
  },
  {
    id: 10,
    categoria: "outros",
    nome: "Ração para Coelho e Porquinho da Índia",
    marca: "Nutrópica",
    nota: "",
    emoji: "🥕",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqpWH1U-F6y2dh_E1Ndg4Qf8Vf1GB7iDTafa7mdlGncw&s=10",
    precoAntigo: "À vista por R$ 49,90",
    precoAtual: "R$ 44,90",
    precoAssinante: "R$ 40,41",
    desconto: "-10%",
    tag: "Mais vendido",
  },

  // =========================
  // CASA
  // =========================
  {
    id: 11,
    categoria: "casa",
    nome: "Eliminador de Odores e Manchas Pet 1L",
    marca: "Enzimac",
    nota: "",
    emoji: "🧴",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROIR8cikeeEh1yEBesYB1Ift_71aT-SZHfqkjIMq4kHg&s=10",
    precoAntigo: "À vista por R$ 38,90",
    precoAtual: "R$ 32,90",
    precoAssinante: "R$ 29,61",
    desconto: "-10%",
    tag: "Destaque",
  },
  {
    id: 12,
    categoria: "casa",
    nome: "Tapete Higiênico Ultra Absorvente",
    marca: "SuperSec",
    nota: "",
    emoji: "📦",
    imagem: "data:image/webp;base64,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",
    precoAntigo: "À vista por R$ 79,90",
    precoAtual: "R$ 69,90",
    precoAssinante: "R$ 62,91",
    desconto: "-10%",
  },

  // =========================
  // JARDIM
  // =========================
  {
    id: 13,
    categoria: "jardim",
    nome: "Graminha para Gatos e Cães",
    marca: "Pet Pira",
    nota: "",
    emoji: "🌱",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_B7Y9FI1DWjzZj11R7lBphwmD_gMpb2Wn_NJ9OTzYMg&s",
    precoAntigo: "À vista por R$ 14,90",
    precoAtual: "R$ 11,90",
    precoAssinante: "R$ 10,71",
    desconto: "-10%",
  },
  {
    id: 14,
    categoria: "jardim",
    nome: "Repelente Natural para Cães e Gatos 500ml",
    marca: "Keep Off",
    nota: "",
    emoji: "🪴",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4U2CeoKdy_zMwW08n6x7uKwsVhECruyJC1__9pGiUmA&s=10",
    precoAntigo: "À vista por R$ 45,00",
    precoAtual: "R$ 39,90",
    precoAssinante: "R$ 35,91",
    desconto: "-10%",
  },

  // =========================
  // PISCINA
  // =========================
  {
    id: 15,
    categoria: "piscina",
    nome: "Colete Salva-Vidas para Pets",
    marca: "AquaDog",
    nota: "",
    emoji: "🦺",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTO282oUs3zwCE71GGMItR8lVQmJLrIEDeD9qgSK_Py3w&s=10",
    precoAntigo: "À vista por R$ 119,90",
    precoAtual: "R$ 99,90",
    precoAssinante: "R$ 89,91",
    desconto: "-10%",
    tag: "Segurança",
  },
  {
    id: 16,
    categoria: "piscina",
    nome: "Piscina Dobrável para Banho Pet",
    marca: "Splash Pet",
    nota: "",
    emoji: "🏊",
    imagem: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQr6fj3d_5DC_M1XOREQzfm0uAkLqCLwMRy4PPnfbk0ag&s=10",
    precoAntigo: "À vista por R$ 189,90",
    precoAtual: "R$ 159,90",
    precoAssinante: "R$ 143,91",
    desconto: "-10%",
    tag: "Verão",
  },
];

export function criarImagemProduto(produto: Produto): string {
  if (produto.imagem.trim() !== "") {
    return `
      <img
        class="produto-imagem-real"
        src="${produto.imagem}"
        alt="${produto.nome}"
        loading="lazy"
      >
    `;
  }

  return `
    <span class="produto-emoji" aria-label="${produto.nome}">
      ${produto.emoji}
    </span>
  `;
}

export function criarCardProduto(
  produto: Produto,
  classeAdicional: string = ""
): HTMLElement {
  const card = document.createElement("article");

  card.className = `card-produto ${classeAdicional}`.trim();

  card.innerHTML = `
    ${produto.tag ? `<span class="tag-promo">${produto.tag}</span>` : ""}

    <div class="produto-imagem">
      ${criarImagemProduto(produto)}

      <button
        class="botao-carrinho"
        type="button"
        title="Adicionar ao carrinho"
        aria-label="Adicionar ${produto.nome} ao carrinho"
      >
        🛒
      </button>
    </div>

    <div class="produto-dados">
      <span class="produto-marca">
        ${produto.marca}
        <span class="produto-nota">${produto.nota}</span>
      </span>

      <h4 class="produto-nome">${produto.nome}</h4>

      ${
        produto.precoAntigo
          ? `<p class="preco-antigo">${produto.precoAntigo}</p>`
          : ""
      }

      <p class="preco-atual">
        ${produto.precoAtual}
        ${
          produto.desconto
            ? `<span class="badge-desconto">${produto.desconto}</span>`
            : ""
        }
      </p>

      <p class="preco-assinante">${produto.precoAssinante}</p>

      <p class="rotulo-programada">📅 Compra Programada</p>
    </div>
  `;

  const botaoCarrinho =
    card.querySelector<HTMLButtonElement>(".botao-carrinho");

  botaoCarrinho?.addEventListener("click", () => {
    alert(`${produto.nome} foi adicionado ao carrinho!`);
  });

  return card;
}