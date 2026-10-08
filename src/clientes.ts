type Cliente = {
  linha: number;
  dono: string;
  animal: string;
  cell: string;
  endereco: string;
  imagem: string;
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

// ==========================================
// CAMPO DE IMAGEM DO POPUP (criado aqui,
// sem precisar mexer no admin.html)
// ==========================================
const rotuloImagemCliente = document.createElement("label");
rotuloImagemCliente.htmlFor = "clienteImagem";
rotuloImagemCliente.textContent = "Imagem";

const inputImagemCliente = document.createElement("input");
inputImagemCliente.type = "file";
inputImagemCliente.id = "clienteImagem";
inputImagemCliente.accept = "image/*";

const previewImagemCliente = document.createElement("img");
previewImagemCliente.id = "previewClienteImagem";
previewImagemCliente.alt = "";
previewImagemCliente.style.setProperty("display", "none", "important");
previewImagemCliente.style.setProperty("width", "96px", "important");
previewImagemCliente.style.setProperty("height", "96px", "important");
previewImagemCliente.style.setProperty("object-fit", "cover", "important");
previewImagemCliente.style.setProperty("border-radius", "8px", "important");
previewImagemCliente.style.setProperty("margin-top", "8px", "important");

const botaoSalvarCliente = form.querySelector<HTMLButtonElement>(".botao-salvar");
if (botaoSalvarCliente) {
  form.insertBefore(rotuloImagemCliente, botaoSalvarCliente);
  form.insertBefore(inputImagemCliente, botaoSalvarCliente);
  form.insertBefore(previewImagemCliente, botaoSalvarCliente);
} else {
  form.append(rotuloImagemCliente, inputImagemCliente, previewImagemCliente);
}

// Prévia assim que o usuário escolhe o arquivo
inputImagemCliente.addEventListener("change", () => {
  const arquivo = inputImagemCliente.files?.[0] || null;

  if (!arquivo) {
    previewImagemCliente.src = "";
    previewImagemCliente.style.setProperty("display", "none", "important");
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    previewImagemCliente.src = String(leitor.result);
    previewImagemCliente.style.setProperty("display", "block", "important");
  };
  leitor.readAsDataURL(arquivo);
});

function limparPreviewImagemCliente() {
  inputImagemCliente.value = "";
  previewImagemCliente.src = "";
  previewImagemCliente.style.setProperty("display", "none", "important");
}

let clientes: Cliente[] = [];

// Estado de edição: null = novo cliente | número = linha da planilha em edição
let linhaEmEdicao: number | null = null;

function modoNovoCliente() {
  linhaEmEdicao = null;
  tituloPopupCliente.textContent = "Novo Cliente";
  if (botaoSalvarCliente) botaoSalvarCliente.textContent = "Adicionar cliente";
  form.reset();
  limparPreviewImagemCliente();
}

function modoEditarCliente(c: Cliente) {
  linhaEmEdicao = c.linha;
  tituloPopupCliente.textContent = "Editar Cliente";
  if (botaoSalvarCliente) botaoSalvarCliente.textContent = "Salvar alterações";

  $<HTMLInputElement>("clienteDono").value = c.dono;
  $<HTMLInputElement>("clienteAnimal").value = c.animal;
  $<HTMLInputElement>("clienteCell").value = c.cell;
  $<HTMLInputElement>("clienteEndereco").value = c.endereco;

  // Sem arquivo novo selecionado: se não escolher outra foto, mantém a atual
  inputImagemCliente.value = "";

  if (c.imagem) {
    previewImagemCliente.src = c.imagem;
    previewImagemCliente.style.setProperty("display", "block", "important");
  } else {
    previewImagemCliente.src = "";
    previewImagemCliente.style.setProperty("display", "none", "important");
  }
}

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

// Monta a miniatura redonda da imagem (clique abre a foto em nova aba)
function celulaImagemCliente(c: Cliente): string {
  if (!c.imagem) return "";

  return `
    <a href="${escapar(c.imagem)}" target="_blank" rel="noopener" title="Ver imagem">
      <img
        src="${escapar(c.imagem)}"
        alt="Imagem do cliente"
        style="width:44px !important; height:44px !important; object-fit:cover !important; border-radius:50% !important; cursor:pointer !important; flex-shrink:0 !important;"
      />
    </a>
  `;
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
        <td>
          <span style="display:inline-flex !important; align-items:center !important; gap:10px !important;">
            ${celulaImagemCliente(c)}
            ${escapar(c.dono)}
          </span>
        </td>
        <td>${escapar(c.animal)}</td>
        <td>${escapar(c.cell)}</td>
        <td>${escapar(c.endereco)}</td>
        <td class="coluna-acoes">
          <button type="button" data-editar="${c.linha}">Editar</button>
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
  modoNovoCliente();
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

// Envia a imagem para a API (api/upload-imagem.js), que salva no
// Supabase Storage e devolve o link público para gravar na planilha
async function enviarImagemCliente(conteudo: Blob): Promise<string> {
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
    throw new Error(dados?.erro || "Falha ao enviar a imagem do cliente.");
  }

  return String(dados.url || "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const arquivoImagem = inputImagemCliente.files?.[0] || null;

  const dadosCliente = {
    dono: $<HTMLInputElement>("clienteDono").value.trim(),
    animal: $<HTMLInputElement>("clienteAnimal").value.trim(),
    cell: $<HTMLInputElement>("clienteCell").value.trim(),
    endereco: $<HTMLInputElement>("clienteEndereco").value.trim(),
  };

  if (!dadosCliente.dono) return;

  if (botaoSalvarCliente) {
    botaoSalvarCliente.disabled = true;
    botaoSalvarCliente.textContent = "Salvando...";
  }

  try {
    // Novo cliente: grava o link (ou vazio). Em edição: só envia imagem
    // se uma foto nova foi escolhida — assim a atual é preservada.
    let imagem = "";
    if (arquivoImagem) {
      imagem = await enviarImagemCliente(arquivoImagem);
    }

    const corpo: Record<string, string> = { ...dadosCliente };

    if (linhaEmEdicao) {
      if (imagem) corpo.imagem = imagem;
    } else {
      corpo.imagem = imagem;
    }

    const resposta = await fetch(
      linhaEmEdicao ? `/api/clientes?linha=${linhaEmEdicao}` : "/api/clientes",
      {
        method: linhaEmEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      }
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro ao salvar cliente na planilha.");
    }

    modoNovoCliente();
    popupCliente.close();
    await carregarClientes();
  } catch (erro: any) {
    alert(erro?.message || "Erro ao salvar cliente na planilha.");
  } finally {
    if (botaoSalvarCliente) {
      botaoSalvarCliente.disabled = false;
      botaoSalvarCliente.textContent = linhaEmEdicao
        ? "Salvar alterações"
        : "Adicionar cliente";
    }
  }
});

lista.addEventListener("click", async (e) => {
  const alvo = e.target as HTMLElement;

  // ===== Editar =====
  const botaoEditar = alvo.closest("[data-editar]");
  if (botaoEditar) {
    const linha = Number(botaoEditar.getAttribute("data-editar"));
    const cliente = clientes.find((c) => c.linha === linha);

    if (cliente) {
      modoEditarCliente(cliente);
      if (!popupCliente.open) popupCliente.showModal();
      $<HTMLInputElement>("clienteDono").focus({ preventScroll: true });
    }
    return;
  }

  // ===== Excluir =====
  const botaoExcluir = alvo.closest("[data-remover]");
  if (!botaoExcluir) return;

  const linha = Number(botaoExcluir.getAttribute("data-remover"));
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