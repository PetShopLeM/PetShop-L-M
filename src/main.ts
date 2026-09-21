import "./style.css";

const botaoMensagem = document.querySelector<HTMLButtonElement>("#botaoMensagem")!;
const modal = document.querySelector<HTMLDivElement>("#modalAgendamento")!;
const fecharModal = document.querySelector<HTMLButtonElement>("#fecharModal")!;
const formAgendamento = document.querySelector<HTMLFormElement>("#formAgendamento")!;
const camposPorte = document.querySelector<HTMLSelectElement>("#porte")!;
const campoValor = document.querySelector<HTMLInputElement>("#valor")!;

// Número do WhatsApp que vai receber a mensagem (com código do país e DDD, sem espaços ou símbolos)
const numeroWhatsapp = "5511976349686";

// Tabela de preços por porte do animal
const precos: Record<string, number> = {
  pequeno: 50,
  medio: 70,
  grande: 100,
};

// Atualiza o valor automaticamente quando o porte é selecionado
camposPorte.addEventListener("change", () => {
  const precoSelecionado = precos[camposPorte.value];

  campoValor.value = precoSelecionado
    ? precoSelecionado.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "";
});

// Abrir modal
botaoMensagem.addEventListener("click", () => {
  modal.classList.add("aberto");
});

// Fechar modal pelo botão "X"
fecharModal.addEventListener("click", () => {
  modal.classList.remove("aberto");
});

// Fechar modal clicando fora dele
modal.addEventListener("click", (evento) => {
  if (evento.target === modal) {
    modal.classList.remove("aberto");
  }
});

// Envio do formulário via WhatsApp
formAgendamento.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const dados = new FormData(formAgendamento);

  const agendamentosSalvos = JSON.parse(
    localStorage.getItem("agendamentos") || "[]"
  );

  const horarioAtual = new Date().toLocaleString("pt-BR");

  agendamentosSalvos.push({
    dono: dados.get("Dono(a)"),
    endereco: dados.get("endereco"),
    porte: dados.get("porte"),
    raca: dados.get("raca"),
    valor: dados.get("valor"),
    horario: horarioAtual,
    horarioISO: "",
  });

  localStorage.setItem(
    "agendamentos",
    JSON.stringify(agendamentosSalvos)
  );

  const mensagem =
    `Olá! Gostaria de agendar um horário:\n\n` +
    `*Dono(a):* ${dados.get("Dono(a)")}\n` +
    `*Endereço:* ${dados.get("endereco")}\n` +
    `*Porte:* ${dados.get("porte")}\n` +
    `*Raça:* ${dados.get("raca")}\n` +
    `*Valor:* ${dados.get("valor")}\n` +
    `*Horário:* ${horarioAtual}`;

  const link = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(
    mensagem
  )}`;

  window.open(link, "_blank");

  formAgendamento.reset();
  campoValor.value = "";
  modal.classList.remove("aberto");
});

// ==========================================
// OFERTAS DO PAINEL ADMIN NA PÁGINA PRINCIPAL
// ==========================================
interface OfertaAdmin {
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

const secaoOfertasAdmin = document.querySelector<HTMLElement>("#secaoOfertasAdmin");
const linhaOfertasAdmin = document.querySelector<HTMLElement>("#linhaOfertasAdmin");

function escaparTextoHtml(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarPrecoTela(valor: string): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (texto.includes("R$")) return texto;

  const numero = Number(texto.replace(/[^\d,.]/g, "").replace(",", "."));
  if (!isNaN(numero) && numero > 0) {
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return texto;
}

// Considera válida a oferta que já começou e ainda não venceu
function ofertaDentroDoPeriodo(oferta: OfertaAdmin): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (oferta.inicio) {
    const inicio = new Date(`${oferta.inicio}T00:00:00`);
    if (!isNaN(inicio.getTime()) && inicio > hoje) return false;
  }

  if (oferta.fim) {
    const fim = new Date(`${oferta.fim}T00:00:00`);
    if (!isNaN(fim.getTime()) && fim < hoje) return false;
  }

  return true;
}

function renderizarOfertasAdmin(): void {
  if (!secaoOfertasAdmin || !linhaOfertasAdmin) return;

  let ofertas: OfertaAdmin[] = [];

  try {
    ofertas = JSON.parse(localStorage.getItem("ofertas") || "[]");
  } catch {
    ofertas = [];
  }

  const ativas = ofertas.filter(ofertaDentroDoPeriodo);

  if (ativas.length === 0) {
    secaoOfertasAdmin.style.display = "none";
    linhaOfertasAdmin.innerHTML = "";
    return;
  }

  secaoOfertasAdmin.style.display = "block";

  linhaOfertasAdmin.innerHTML = ativas
    .map((oferta) => {
      const precoAntigo = formatarPrecoTela(oferta.precoAntigo);
      const precoPromocional = formatarPrecoTela(oferta.precoPromocional);
      const desconto = String(oferta.desconto || "").trim();

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
            ${oferta.descricao ? `<span class="produto-marca">${escaparTextoHtml(oferta.descricao)}</span>` : ""}
            <h4 class="produto-nome">${escaparTextoHtml(oferta.nome)}</h4>
            ${precoAntigo ? `<p class="preco-antigo">De <s>${escaparTextoHtml(precoAntigo)}</s></p>` : ""}
            <p class="preco-atual">
              ${escaparTextoHtml(precoPromocional)}
              ${desconto && desconto !== "0" ? `<span class="badge-desconto">-${escaparTextoHtml(desconto)}%</span>` : ""}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

renderizarOfertasAdmin();

// Atualiza sozinho se as ofertas forem alteradas em outra aba do mesmo navegador
window.addEventListener("storage", (evento) => {
  if (evento.key === "ofertas") {
    renderizarOfertasAdmin();
  }
});