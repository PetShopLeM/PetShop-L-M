type Cliente = {
  linha: number;
  dono: string;
  animal: string;
  cell: string;
  endereco: string;
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const secao = $("secaoClientes");
const botao = $("botaoClientes");
const form = $<HTMLFormElement>("formNovoCliente");
const lista = $("listaClientes");
const vazio = $("clientesVazio");

// Filtros independentes do formulário de cadastro.
const filtrosClientes = document.createElement("div");
filtrosClientes.className = "filtros-agenda";
filtrosClientes.innerHTML = `
  <div class="campo-filtro">
    <label for="filtroClienteDono">Dono(a)</label>
    <input
      type="text"
      id="filtroClienteDono"
      placeholder="Filtrar por dono(a)"
    />
  </div>

  <div class="campo-filtro">
    <label for="filtroClienteAnimal">Animal</label>
    <input
      type="text"
      id="filtroClienteAnimal"
      placeholder="Filtrar por animal"
    />
  </div>

  <div class="campo-filtro">
    <label for="filtroClienteCell">Cell</label>
    <input
      type="tel"
      id="filtroClienteCell"
      placeholder="Filtrar por celular"
    />
  </div>

  <div class="campo-filtro">
    <label for="filtroClienteEndereco">Endereço</label>
    <input
      type="text"
      id="filtroClienteEndereco"
      placeholder="Filtrar por endereço"
    />
  </div>

  <button
    type="button"
    class="botao-limpar-filtros"
    data-limpar-clientes
  >
    Limpar filtros
  </button>
`;

form.insertAdjacentElement("beforebegin", filtrosClientes);

const camposFiltrosClientes: Array<[keyof Cliente, HTMLInputElement]> = [
  ["dono", $<HTMLInputElement>("filtroClienteDono")],
  ["animal", $<HTMLInputElement>("filtroClienteAnimal")],
  ["cell", $<HTMLInputElement>("filtroClienteCell")],
  ["endereco", $<HTMLInputElement>("filtroClienteEndereco")],
];

function normalizarFiltroCliente(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

camposFiltrosClientes.forEach(([, campo]) => {
  campo.addEventListener("input", desenhar);
});

filtrosClientes
  .querySelector("[data-limpar-clientes]")!
  .addEventListener("click", () => {
    camposFiltrosClientes.forEach(([, campo]) => {
      campo.value = "";
    });
    desenhar();
  });

// Popup exclusivo de Clientes, reutilizando as classes dos modais existentes.
const popupCliente = document.createElement("dialog");
popupCliente.className = "modal";
popupCliente.setAttribute("aria-label", "Novo Cliente");
popupCliente.style.setProperty("position", "fixed", "important");
popupCliente.style.setProperty("margin", "auto", "important");
popupCliente.style.setProperty("inset", "0", "important");
popupCliente.style.setProperty("width", "min(420px, calc(100vw - 32px))", "important");
popupCliente.style.setProperty("max-height", "90vh", "important");
popupCliente.style.setProperty("overflow-y", "auto", "important");
popupCliente.style.setProperty("box-sizing", "border-box", "important");
popupCliente.style.setProperty("border", "none", "important");

const fecharPopupCliente = document.createElement("button");
fecharPopupCliente.type = "button";
fecharPopupCliente.className = "modal-fechar";
fecharPopupCliente.textContent = "×";
fecharPopupCliente.setAttribute("aria-label", "Fechar cadastro de cliente");

const tituloPopupCliente = document.createElement("h3");
tituloPopupCliente.textContent = "Novo Cliente";

// Move o mesmo formulário para o popup sem duplicar campos ou eventos.
form.classList.remove("filtros-agenda");
form.querySelectorAll(".campo-filtro").forEach((campo) => {
  campo.replaceWith(...Array.from(campo.childNodes));
});
form.style.setProperty("display", "flex", "important");
form.style.setProperty("flex-direction", "column", "important");
form.style.setProperty("width", "100%", "important");

popupCliente.append(fecharPopupCliente, tituloPopupCliente, form);
document.body.append(popupCliente);

fecharPopupCliente.addEventListener("click", () => popupCliente.close());
popupCliente.addEventListener("click", (e) => {
  if (e.target !== popupCliente) return;
  const limites = popupCliente.getBoundingClientRect();
  if (
    e.clientX < limites.left || e.clientX > limites.right ||
    e.clientY < limites.top || e.clientY > limites.bottom
  ) {
    popupCliente.close();
  }
});

let clientes: Cliente[] = [];

// ==========================================
// PLANILHA (Google Sheets via /api/clientes)
// ==========================================
async function carregarClientes(): Promise<void> {
  let mensagemErro = "";

  try {
    const resposta = await fetch("/api/clientes");
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro ao carregar clientes da planilha.");
    }

    clientes = (dados.clientes || []) as Cliente[];
  } catch (erro: any) {
    console.error(erro);
    clientes = [];
    mensagemErro = erro?.message || "Erro ao carregar clientes da planilha.";
  }

  desenhar();

  if (mensagemErro) {
    vazio.textContent = mensagemErro;
  }
}

function escapar(texto: string) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

function desenhar() {
  // A linha vem da planilha, então o filtro não afeta a exclusão.
  const visiveis = clientes
    .map((c) => ({ c }))
    .filter(({ c }) =>
      camposFiltrosClientes.every(([chave, campo]) => {
        const filtro = normalizarFiltroCliente(campo.value);
        if (!filtro) return true;

        const valor = normalizarFiltroCliente(c[chave]);

        if (chave === "cell") {
          const digitos = filtro.replace(/\D/g, "");

          return digitos
            ? valor.replace(/\D/g, "").includes(digitos)
            : valor.includes(filtro);
        }

        return valor.includes(filtro);
      })
    );

  lista.innerHTML = visiveis
    .map(
      ({ c }) => `
      <tr>
        <td>${escapar(c.dono)}</td>
        <td>${escapar(c.animal)}</td>
        <td>${escapar(c.cell)}</td>
        <td>${escapar(c.endereco)}</td>
        <td class="coluna-acoes">
          <button type="button" data-remover="${c.linha}">Excluir</button>
        </td>
      </tr>`
    )
    .join("");

  vazio.style.display = visiveis.length ? "none" : "block";
  vazio.textContent = clientes.length
    ? "Nenhum cliente encontrado com os filtros atuais."
    : "Nenhum cliente cadastrado ainda.";
}

const botaoMaisOriginal = $<HTMLButtonElement>("botaoAdicionar");
const botaoMaisClientes =
  (document.getElementById("botaoAdicionarCliente") as HTMLButtonElement | null)
  ?? document.createElement("button");

botaoMaisClientes.id = "botaoAdicionarCliente";
botaoMaisClientes.type = "button";
botaoMaisClientes.className = botaoMaisOriginal.className;
botaoMaisClientes.textContent = "+";
botaoMaisClientes.setAttribute("aria-label", "Adicionar cliente");
botaoMaisClientes.title = "Adicionar cliente";
botaoMaisClientes.style.setProperty("display", "none", "important");

botaoMaisOriginal.insertAdjacentElement("afterend", botaoMaisClientes);

botaoMaisClientes.addEventListener("click", () => {
  if (!popupCliente.open) popupCliente.showModal();
  $<HTMLInputElement>("clienteDono").focus({ preventScroll: true });
});

function abrirClientes() {
  document
    .querySelectorAll(".secao-admin")
    .forEach((s) => s.classList.remove("visivel"));

  document
    .querySelectorAll(".botao-aba")
    .forEach((b) => b.classList.remove("ativo"));

  secao.classList.add("visivel");
  botao.classList.add("ativo");

  botaoMaisOriginal.style.setProperty("display", "none", "important");
  botaoMaisClientes.style.setProperty("display", "inline-flex", "important");

  // Atualiza a lista com o que está na planilha
  void carregarClientes();
}

function fecharClientes() {
  secao.classList.remove("visivel");
  botao.classList.remove("ativo");
  botaoMaisClientes.style.setProperty("display", "none", "important");

  queueMicrotask(() => {
    if (botao.classList.contains("ativo")) return;

    const emServicos = $("botaoServicos").classList.contains("ativo");

    botaoMaisOriginal.style.setProperty(
      "display",
      emServicos ? "none" : "inline-flex"
    );
  });
}

botao.addEventListener("click", abrirClientes);

// Ao clicar nas outras abas, esconde Clientes (o admin.ts cuida do resto).
document
  .querySelectorAll(".botao-aba")
  .forEach((b) => b !== botao && b.addEventListener("click", fecharClientes));

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const novo = {
    dono: $<HTMLInputElement>("clienteDono").value.trim(),
    animal: $<HTMLInputElement>("clienteAnimal").value.trim(),
    cell: $<HTMLInputElement>("clienteCell").value.trim(),
    endereco: $<HTMLInputElement>("clienteEndereco").value.trim(),
  };

  if (!novo.dono) return;

  const botaoSalvar = form.querySelector<HTMLButtonElement>(".botao-salvar");

  if (botaoSalvar) {
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
  }

  try {
    const resposta = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro ao salvar cliente na planilha.");
    }

    form.reset();
    popupCliente.close();
    await carregarClientes();
  } catch (erro: any) {
    alert(erro?.message || "Erro ao salvar cliente na planilha.");
  } finally {
    if (botaoSalvar) {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = "Adicionar cliente";
    }
  }
});

lista.addEventListener("click", async (e) => {
  const alvo = (e.target as HTMLElement).closest("[data-remover]");
  if (!alvo) return;

  const linha = Number(alvo.getAttribute("data-remover"));
  if (!linha) return;

  try {
    const resposta = await fetch(`/api/clientes?linha=${linha}`, {
      method: "DELETE",
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro ao excluir cliente da planilha.");
    }

    await carregarClientes();
  } catch (erro: any) {
    alert(erro?.message || "Erro ao excluir cliente da planilha.");
  }
});

// Carrega os clientes da planilha ao abrir o painel
void carregarClientes();