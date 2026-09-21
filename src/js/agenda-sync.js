// ==================================================================
// SINCRONIZAÇÃO BILATERAL DE AGENDAMENTOS COM A PLANILHA DO GOOGLE
// Cole abaixo a URL do Apps Script (a que termina em /exec)
// ==================================================================
const URL_PLANILHA = 'https://script.google.com/macros/s/AKfycbxCUBa4UaUtT3_TmdjudMJtgLGlpfTqp1xm73cF1_No4Ei7kg-BOurJEXcnDadBHzX0lw/exec';

function formatarData(valor) {
  const texto = String(valor ?? '');
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (partes) {
    const [, ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return texto;
}

// LÊ a planilha e desenha na tabela do painel
async function carregarAgendamentos() {
  if (!URL_PLANILHA || URL_PLANILHA.includes('COLE_A_URL')) return;
  try {
    const resposta = await fetch(URL_PLANILHA, { cache: 'no-store' });
    const json = await resposta.json();

    const corpo = document.getElementById('agenda-corpo');
    if (!corpo) return;

    const avisoVazio = document.getElementById('agendaVazia');
    const agendamentos = json.agendamentos ?? [];

    corpo.innerHTML = '';

    if (agendamentos.length === 0) {
      if (avisoVazio) avisoVazio.style.display = '';
      return;
    }
    if (avisoVazio) avisoVazio.style.display = 'none';

    for (const a of agendamentos) {
      const tr = document.createElement('tr');
      const celulas = [
        formatarData(a.data),
        a.dono ?? '',
        a.endereco ?? '',
        a.cell ?? '',
        a.servico ?? '',
        a.horario ?? '',
        a.valor ?? '',
        '—',
      ];
      celulas.forEach((texto, indice) => {
        const td = document.createElement('td');
        td.textContent = String(texto);
        if (indice === 7) td.className = 'coluna-acoes';
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    }
  } catch (erro) {
    console.error('Erro ao carregar agendamentos da planilha:', erro);
  }
}

// Faz o formulário do botão "+" também salvar na planilha
const formNovo = document.getElementById('formNovoAgendamento');
formNovo?.addEventListener('submit', () => {
  if (!URL_PLANILHA || URL_PLANILHA.includes('COLE_A_URL')) return;

  const pegar = (id) => document.getElementById(id)?.value ?? '';
  const agendamento = {
    data: pegar('novoData'),
    dono: pegar('novoDono'),
    endereco: pegar('novoEndereco'),
    cell: pegar('novoCell'),
    servico: pegar('novoServico'),
    horario: pegar('novoHorario'),
    valor: pegar('novoValor'),
  };

  fetch(URL_PLANILHA, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(agendamento),
  })
    .then(() => setTimeout(carregarAgendamentos, 1500))
    .catch((e) => console.error('Erro ao salvar agendamento na planilha:', e));
});

// Carrega ao abrir a página e repete a cada 15 segundos (sincronia bilateral)
carregarAgendamentos();
setInterval(carregarAgendamentos, 15000);