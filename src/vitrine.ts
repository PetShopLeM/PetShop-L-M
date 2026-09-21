import "./style.css";
import { catalogoProdutos, criarCardProduto } from "./catalogo";

const mapaCategorias: Array<{ palavras: string[]; categoria: string }> = [
  { palavras: ["cão", "cao", "cachorro"], categoria: "cachorro" },
  { palavras: ["gato"], categoria: "gato" },
  { palavras: ["pássaro", "passaro"], categoria: "passaro" },
  { palavras: ["peixe"], categoria: "peixe" },
  { palavras: ["outros"], categoria: "outros" },
  { palavras: ["casa"], categoria: "casa" },
  { palavras: ["jardim"], categoria: "jardim" },
  { palavras: ["piscina"], categoria: "piscina" },
];

function categoriaDaSecao(secao: HTMLElement): string {
  const titulo =
    secao.querySelector(".titulo-secao")?.textContent?.toLowerCase() || "";

  for (const item of mapaCategorias) {
    if (item.palavras.some((palavra) => titulo.includes(palavra))) {
      return item.categoria;
    }
  }

  return "";
}

const secoes = document.querySelectorAll(".secao-vitrine");

secoes.forEach((secao) => {
  const categoria = categoriaDaSecao(secao as HTMLElement);

  if (categoria === "") {
    return;
  }

  const linha = secao.querySelector(".linha-produtos");

  if (!linha) {
    return;
  }

  // Remove os cards fixos que estavam escritos no HTML
  linha.querySelectorAll("article.card-produto").forEach((cardAntigo) => {
    cardAntigo.remove();
  });

  // Coloca no lugar os cards vindos do catálogo (com as imagens)
  const produtosDaCategoria = catalogoProdutos.filter(
    (produto) => produto.categoria === categoria
  );

  produtosDaCategoria.forEach((produto) => {
    linha.appendChild(criarCardProduto(produto));
  });
});