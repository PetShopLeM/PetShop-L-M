import "./style.css";

const botaoMensagem = document.querySelector<HTMLButtonElement>("#botaoMensagem")!;
const modal = document.querySelector<HTMLDivElement>("#modalAgendamento")!;
const fecharModal = document.querySelector<HTMLButtonElement>("#fecharModal")!;
const formAgendamento = document.querySelector<HTMLFormElement>("#formAgendamento")!;
const camposPorte = document.querySelector<HTMLSelectElement>("#porte")!;
const campoValor = document.querySelector<HTMLInputElement>("#valor")!;

// Número do WhatsApp que vai receber a mensagem (com código do país e DDD, sem espaços ou símbolos)
const numeroWhatsapp = "5511970264824";

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

// Não deixa escolher uma data no passado
const campoData = document.querySelector<HTMLInputElement>(
  "#formAgendamento input[name='data']"
);
if (campoData) {
  campoData.min = new Date().toLocaleDateString("en-CA");
}

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
    data: dados.get("data"),
    dono: dados.get("Dono(a)"),
    animal: dados.get("animal"),
    endereco: dados.get("endereco"),
    porte: dados.get("porte"),
    raca: dados.get("raca"),
    servico: dados.get("servico"),
    valor: dados.get("valor"),
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
    `*Data:* ${dados.get("data")}\n` +
    `*Horário:* ${dados.get("horario")}\n` +
    `*Dono(a):* ${dados.get("Dono(a)")}\n` +
    `*Animal:* ${dados.get("animal")}\n` +
    `*Serviço:* ${dados.get("servico")}\n` +
    `*Endereço:* ${dados.get("endereco")}\n` +
    `*Porte:* ${dados.get("porte")}\n` +
    `*Raça:* ${dados.get("raca")}\n` +
    `*Valor:* ${dados.get("valor")}`;

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
// (agora buscam da mesma planilha via /api/ofertas)
// ==========================================
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

// Converte datas da planilha (serial do Google, dd/mm/aaaa ou aaaa-mm-dd) para aaaa-mm-dd
function converterDataParaISO(valor: string): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";

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

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  return "";
}

// Considera válida a oferta que já começou e ainda não venceu
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
    const dados = await resposta.json().catch(() => ({}));

    if (resposta.ok) {
      ofertas = (dados.ofertas || []) as OfertaAdmin[];
    }
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

carregarOfertasAdmin();

// Atualiza as ofertas quando o usuário volta para a aba da página inicial
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    carregarOfertasAdmin();
  }
});