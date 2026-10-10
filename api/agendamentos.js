// dotenv é opcional: o vercel dev já carrega o .env.local sozinho
try {
  require("dotenv").config({ path: ".env.local" });
} catch (e) {}

const crypto = require("crypto");

// ==========================================
// CONFIGURAÇÃO
// ==========================================
const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_AGENDAMENTOS ||
  process.env.GOOGLE_SPREADSHEET_ID_ESTOQUE ||
  "";

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME_AGENDAMENTOS || "Agendamentos";

// Aba dos clientes (dono, animal e foto)
const SHEET_NAME_CLIENTES = process.env.GOOGLE_SHEET_NAME_CLIENTES || "Clientes";

// Ordem das colunas na planilha (aba Agendamentos):
// A Data | B Dono | C Endereço | D Cell | E Serviço
// F Horário | G Valor | H Transporte | I Aniversário | J Imagem

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
}

function normalizar(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function abaFormatada(titulo) {
  return `'${String(titulo).replace(/'/g, "''")}'`;
}

function codificarRange(range) {
  return encodeURIComponent(range)
    .replace(/%27/g, "'")
    .replace(/%21/g, "!")
    .replace(/%20/g, " ");
}

// ==========================================
// AUTENTICAÇÃO NO GOOGLE
// ==========================================
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!email) throw new Error("Variavel GOOGLE_SERVICE_ACCOUNT_EMAIL nao configurada.");
  if (!privateKey) throw new Error("Variavel GOOGLE_PRIVATE_KEY nao configurada.");

  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: agora + 3600,
      iat: agora,
    })
  );

  const assinatura = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(privateKey);

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(assinatura)}`,
    }),
  });

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.error_description || "Falha ao autenticar no Google.");
  }
  return dados.access_token;
}

// ==========================================
// HELPERS DA API DO GOOGLE SHEETS
// ==========================================
async function chamarSheets(token, url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (e) {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem =
      (dados && (dados.error?.message || dados.error_description || dados.error)) ||
      texto ||
      `Google respondeu ${resposta.status}`;
    throw new Error(`Google respondeu ${resposta.status}: ${String(mensagem).slice(0, 200)}`);
  }

  return dados || {};
}

async function localizarAba(token, base) {
  const meta = await chamarSheets(token, base);
  const alvo = normalizar(SHEET_NAME);

  const aba = (meta.sheets || []).find(
    (s) => normalizar(s.properties?.title) === alvo
  );

  if (!aba) {
    const disponiveis = (meta.sheets || [])
      .map((s) => s.properties?.title)
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Aba "${SHEET_NAME}" nao encontrada. Abas disponiveis: ${disponiveis || "nenhuma"}.`
    );
  }

  return aba.properties.title;
}

function montarLinha(corpo) {
  const c = corpo || {};
  return [
    String(c.data || ""),
    String(c.dono || ""),
    String(c.endereco || ""),
    String(c.cell || ""),
    String(c.servico || ""),
    String(c.horario || ""),
    String(c.valor || ""),
    String(c.transporte || ""),
    String(c.aniversario || ""),
    String(c.imagem || ""),
  ];
}

// ==========================================
// FOTO AUTOMÁTICA DO ANIMAL (aba Clientes)
// ==========================================
function separarDonoAnimal(texto) {
  const partes = String(texto || "").split(/[-–—]/);
  const dono = normalizar(partes[0] || "");
  const animal = normalizar(partes.slice(1).join(" ") || "");
  const completo = normalizar(texto).replace(/^[\s\-–—]+|[\s\-–—]+$/g, "");
  return { dono, animal, completo };
}

// Distância de edição entre dois nomes (quantas letras mudam)
function distancia(a, b) {
  const dp = [];
  for (let i = 0; i <= a.length; i++) {
    dp[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = i === 0
        ? j
        : Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
    }
  }
  return dp[a.length][b.length];
}

// Aceita nomes iguais, contidos um no outro, ou com 1-2 letras de diferença
function nomesParecidos(a, b) {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const tolerancia = Math.min(a.length, b.length) <= 6 ? 1 : 2;
  return distancia(a, b) <= tolerancia;
}

function encontrarCliente(clientes, textoDono) {
  const { dono, animal, completo } = separarDonoAnimal(textoDono);

  // 1) Dono + animal ("Dono - Animal")
  let achado = clientes.find(
    (c) => nomesParecidos(c._dono, dono) && nomesParecidos(c._animal, animal)
  );
  if (achado) return achado;

  // 2) Ordem invertida ("Sol - Vih" → cadastro Viih / Sol)
  achado = clientes.find(
    (c) => nomesParecidos(c._dono, animal) && nomesParecidos(c._animal, dono)
  );
  if (achado) return achado;

  // 3) O texto inteiro é o nome do animal
  if (completo) {
    achado = clientes.find((c) => nomesParecidos(c._animal, completo));
    if (achado) return achado;
  }

  // 4) Dono parecido + animal citado no texto ("Deusa - Billy e Zoe")
  if (animal) {
    achado = clientes.find(
      (c) => nomesParecidos(c._dono, dono) && c._animal && animal.includes(c._animal)
    );
    if (achado) return achado;
  }

  // 5) Apenas o dono parecido
  achado = clientes.find((c) => nomesParecidos(c._dono, dono));
  if (achado) return achado;

  // 6) Apenas o animal aparecendo no texto
  achado = clientes.find(
    (c) => c._animal && (completo.includes(c._animal) || nomesParecidos(c._animal, animal))
  );
  if (achado) return achado;

  console.log(`[fotos] Sem correspondencia para dono="${dono}" animal="${animal}"`);
  return null;
}

// Monta a lista de planilhas candidatas a ter a aba de Clientes
function idsPlanilhasParaClientes() {
  const lista = [];
  const adicionar = (id, origem) => {
    if (id && !lista.some((item) => item.id === id)) {
      lista.push({ id: String(id).trim(), origem });
    }
  };

  adicionar(process.env.GOOGLE_SPREADSHEET_ID_CLIENTES, "GOOGLE_SPREADSHEET_ID_CLIENTES");
  adicionar(process.env.GOOGLE_SPREADSHEETS_ID_CLIENTES, "GOOGLE_SPREADSHEETS_ID_CLIENTES");

  // Qualquer outra variável de planilha do projeto (ex.: a usada pela api/clientes.js)
  for (const [chave, valor] of Object.entries(process.env)) {
    if (/SPREADSHEET.*ID/i.test(chave) && valor) adicionar(valor, chave);
  }

  // Por último, a própria planilha de agendamentos (a aba Clientes pode morar nela)
  adicionar(SPREADSHEET_ID, "planilha de agendamentos (fallback)");

  return lista.slice(0, 6);
}

// Detecta onde ficam as colunas de dono, animal e imagem na aba Clientes
function detectarLayout(linhas) {
  let indiceCabecalho = -1;
  for (let i = 0; i < Math.min(linhas.length, 6); i++) {
    const textos = (linhas[i] || []).map(normalizar);
    const temDono = textos.some((t) => t.includes("dono") || t === "nomes" || t === "nome");
    const temAnimal = textos.some((t) => t.includes("animal") || t.includes("pet"));
    if (temDono && temAnimal) {
      indiceCabecalho = i;
      break;
    }
  }

  if (indiceCabecalho === -1) {
    return {
      primeiraLinhaDados: 2,
      colunaDono: 0,
      colunaAnimal: 1,
      colunaImagem: 4,
      descricao: { padrao: "fixo: dono=A, animal=B, imagem=E, dados a partir da linha 3" },
    };
  }

  const cabecalho = (linhas[indiceCabecalho] || []).map(normalizar);
  const procurar = (padroes) => {
    for (const padrao of padroes) {
      const idx = cabecalho.findIndex((t) => t && t.includes(padrao));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const colunaDono = Math.max(0, procurar(["dono", "nome"]));
  const colunaAnimal = Math.max(0, procurar(["animal", "pet"]));
  let colunaImagem = procurar(["imagem", "foto", "avatar"]);
  if (colunaImagem === -1) colunaImagem = 4;

  const letra = (i) => String.fromCharCode(65 + i);
  return {
    primeiraLinhaDados: indiceCabecalho + 1,
    colunaDono,
    colunaAnimal,
    colunaImagem,
    descricao: {
      cabecalhoNaLinha: indiceCabecalho + 1,
      dono: `${letra(colunaDono)} (${cabecalho[colunaDono] || "?"})`,
      animal: `${letra(colunaAnimal)} (${cabecalho[colunaAnimal] || "?"})`,
      imagem: `${letra(colunaImagem)} (${cabecalho[colunaImagem] || "?"})`,
    },
  };
}

// Procura a aba Clientes nas planilhas do projeto e carrega os cadastros
async function carregarClientes(token) {
  const diagnostico = { tentativas: [], abaUsada: null, erroGeral: null };
  const candidatos = idsPlanilhasParaClientes();

  if (candidatos.length === 0) {
    diagnostico.erroGeral = "Nenhuma planilha configurada nas variaveis de ambiente.";
    return { clientes: [], diagnostico };
  }

  for (const candidato of candidatos) {
    const tentativa = {
      origem: candidato.origem,
      id: candidato.id,
      abas: [],
      erro: null,
    };

    try {
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${candidato.id}`;
      const meta = await chamarSheets(token, base);
      tentativa.abas = (meta.sheets || [])
        .map((s) => s.properties?.title)
        .filter(Boolean);

      const abaClientes = tentativa.abas.find(
        (t) => normalizar(t) === normalizar(SHEET_NAME_CLIENTES)
      );
      if (!abaClientes) {
        tentativa.erro = `Aba "${SHEET_NAME_CLIENTES}" nao encontrada`;
        diagnostico.tentativas.push(tentativa);
        continue;
      }

      const url = `${base}/values/${codificarRange(
        `${abaFormatada(abaClientes)}!A1:J`
      )}?majorDimension=ROWS`;
      const dados = await chamarSheets(token, url);
      const linhas = (dados.values || []).map((linha) =>
        (linha || []).map((c) => String(c === undefined || c === null ? "" : c).trim())
      );

      const layout = detectarLayout(linhas);
      const clientes = [];
      for (let i = layout.primeiraLinhaDados; i < linhas.length; i++) {
        const celula = (idx) =>
          linhas[i][idx] === undefined ? "" : String(linhas[i][idx]).trim();
        const dono = celula(layout.colunaDono);
        const animal = celula(layout.colunaAnimal);
        const imagem = celula(layout.colunaImagem);
        if (!dono && !animal) continue;
        clientes.push({
          dono,
          animal,
          imagem,
          _dono: normalizar(dono),
          _animal: normalizar(animal),
        });
      }

      tentativa.abaEncontrada = abaClientes;
      diagnostico.tentativas.push(tentativa);
      diagnostico.abaUsada = {
        origem: candidato.origem,
        planilha: candidato.id,
        aba: abaClientes,
        layout: layout.descricao,
        clientesCarregados: clientes.length,
        nomes: clientes.map(
          (c) =>
            `${c._dono || "?"} / ${c._animal || "?"}${c.imagem ? " (com foto)" : " (sem foto)"}`
        ),
        primeirasLinhasBrutas: linhas.slice(0, 6),
      };

      console.log(`[fotos] Clientes carregados: ${clientes.length} (aba ${abaClientes})`);
      return { clientes, diagnostico };
    } catch (e) {
      tentativa.erro = e.message;
      diagnostico.tentativas.push(tentativa);
      console.log(`[fotos] Falha na planilha ${candidato.origem}: ${e.message}`);
    }
  }

  diagnostico.erroGeral = "Nenhuma planilha com aba de Clientes funcionou.";
  return { clientes: [], diagnostico };
}

// ==========================================
// HANDLER
// ==========================================
module.exports = async (req, res) => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error("GOOGLE_SPREADSHEET_ID_AGENDAMENTOS nao configurado.");
    }

    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const aba = await localizarAba(token, base);

    // ================= GET (listar) =================
    if (req.method === "GET") {
      const url = `${base}/values/${codificarRange(`${abaFormatada(aba)}!A:J`)}?majorDimension=ROWS`;
      const dados = await chamarSheets(token, url);
      const valores = dados.values || [];

      const agendamentos = valores
        .slice(1) // pula o cabeçalho
        .map((colunas, indice) => ({
          linha: indice + 2,
          data: String(colunas[0] || ""),
          dono: String(colunas[1] || ""),
          endereco: String(colunas[2] || ""),
          cell: String(colunas[3] || ""),
          servico: String(colunas[4] || ""),
          horario: String(colunas[5] || ""),
          valor: String(colunas[6] || ""),
          transporte: String(colunas[7] || ""),
          aniversario: String(colunas[8] || ""),
          imagem: String(colunas[9] || ""),
        }))
        .filter((a) =>
          [a.data, a.dono, a.servico, a.horario].some((v) => v.trim() !== "")
        );

      // Completa a foto do animal com base na aba Clientes
      const { clientes, diagnostico } = await carregarClientes(token);
      const cruzamento = [];

      for (const agendamento of agendamentos) {
        if (String(agendamento.imagem || "").trim() !== "") continue;

        const cliente = encontrarCliente(clientes, agendamento.dono);
        cruzamento.push({
          dono: agendamento.dono,
          resultado: cliente
            ? cliente.imagem
              ? `match: ${cliente.dono} / ${cliente.animal} → foto aplicada`
              : `match: ${cliente.dono} / ${cliente.animal}, mas o cadastro está SEM foto`
            : "nenhum cadastro deu match",
        });

        if (cliente && cliente.imagem) {
          agendamento.imagem = cliente.imagem;
          console.log(
            `[fotos] Foto aplicada a "${agendamento.dono}" via cliente "${cliente.dono} / ${cliente.animal}"`
          );
        }
      }

      // Modo diagnóstico: /api/agendamentos?debug=1
      if (req.query && req.query.debug === "1") {
        res.status(200).json({
          debug: {
            planilhaAgendamentos: {
              id: SPREADSHEET_ID,
              aba: aba,
              temVariavelClientes: !!process.env.GOOGLE_SPREADSHEET_ID_CLIENTES,
            },
            clientes: diagnostico,
            cruzamento,
          },
          agendamentos,
        });
        return;
      }

      res.status(200).json(agendamentos);
      return;
    }

    // ================= POST (criar) =================
    if (req.method === "POST") {
      const valores = [montarLinha(req.body)];

      const url =
        `${base}/values/${codificarRange(`${abaFormatada(aba)}!A:J`)}:append` +
        `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      await chamarSheets(token, url, {
        method: "POST",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= PATCH (editar) =================
    if (req.method === "PATCH") {
      const linha = Number(req.query?.linha || req.body?.linha || 0);
      if (!linha || linha < 2) throw new Error("Linha invalida para edicao.");

      const valores = [montarLinha(req.body)];

      const url = `${base}/values/${codificarRange(
        `${abaFormatada(aba)}!A${linha}:J${linha}`
      )}?valueInputOption=USER_ENTERED`;

      await chamarSheets(token, url, {
        method: "PUT",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= DELETE (apagar) =================
    if (req.method === "DELETE") {
      const linha = Number(req.query?.linha || req.body?.linha || 0);
      if (!linha || linha < 2) throw new Error("Linha invalida para exclusao.");

      const meta = await chamarSheets(token, `${base}?fields=sheets.properties`);
      const abaEncontrada = (meta.sheets || []).find(
        (s) => normalizar(s.properties?.title) === normalizar(SHEET_NAME)
      );
      if (!abaEncontrada) throw new Error(`Aba "${SHEET_NAME}" nao encontrada na planilha.`);

      await chamarSheets(token, `${base}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: abaEncontrada.properties.sheetId,
                  dimension: "ROWS",
                  startIndex: linha - 1,
                  endIndex: linha,
                },
              },
            },
          ],
        }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (erro) {
    res.status(500).json({ erro: erro.message || "Erro inesperado." });
  }
};