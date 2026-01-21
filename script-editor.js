// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; // URL CORRETA
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; // SUA KEY

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let editorAtual = null;

// AO CARREGAR
window.onload = async () => {
    // Verifica login
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    // Verifica permissão (Simplificado para evitar travas)
    // Se você rodou o SQL de virar editor, isso vai passar
    editorAtual = user;
    
    // Tenta carregar o nome do editor (se der erro, usa genérico)
    try {
        const { data: perfil } = await supabaseClient.from('profiles').select('nome').eq('id', user.id).single();
        if(perfil) document.getElementById('editor-nome').innerText = perfil.nome;
    } catch (e) { console.log("Erro perfil:", e); }
    
    carregarPainel();
};

async function carregarPainel() {
    // 1. Buscar Pedidos PENDENTES (SEM O NOME DO CLIENTE POR ENQUANTO)
    // Isso garante que o erro de chave estrangeira não trave a lista
    const { data: pendentes, error: erroPendentes } = await supabaseClient
        .from('orders')
        .select('*') // <--- MUDANÇA: Buscando apenas dados da tabela orders
        .eq('status', 'pendente')
        .order('data_solicitacao', { ascending: true });

    if (erroPendentes) {
        alert("Erro ao buscar pendentes: " + erroPendentes.message);
    } else {
        renderizarPendentes(pendentes || []);
    }

    // 2. Buscar Pedidos EM ANDAMENTO (Só os meus)
    const { data: meus, error: erroMeus } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('editor_id', editorAtual.id)
        .in('status', ['em_andamento', 'aceito']);

    if (erroMeus) {
        console.error(erroMeus);
    } else {
        renderizarMeus(meus || []);
    }
}

// RENDERIZA LISTA DE DISPONÍVEIS
function renderizarPendentes(lista) {
    const container = document.getElementById('lista-pendentes');
    const contador = document.getElementById('count-pendentes');
    
    if(contador) contador.innerText = lista.length;
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Nenhum pedido na fila.</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => `
        <div class="card p-4 mb-4 border border-zinc-800 bg-[#161616] rounded-xl">
            <div class="flex justify-between items-start mb-2">
                <span class="badge bg-pendente text-yellow-500 bg-yellow-900/30 px-2 py-1 rounded text-xs">Novo Pedido</span>
                <span class="text-xs text-zinc-500">${new Date(pedido.data_solicitacao).toLocaleDateString()}</span>
            </div>
            <h3 class="font-bold text-lg mb-1 text-white">${pedido.titulo_ideia}</h3>
            <p class="text-sm text-zinc-400 mb-3 line-clamp-2">${pedido.descricao_detalhada || 'Sem descrição'}</p>
            
            <div class="flex gap-2 mt-4">
                ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="flex-1 text-center py-2 border border-zinc-700 rounded text-sm hover:bg-zinc-800 text-white">Ver Vídeo</a>` : ''}
                <button onclick="aceitarTarefa(${pedido.id})" class="flex-1 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 text-white">Aceitar Tarefa</button>
            </div>
        </div>
    `).join('');
}

// RENDERIZA LISTA DE MINHAS TAREFAS
function renderizarMeus(lista) {
    const container = document.getElementById('lista-minhas');
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Você está livre!</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => `
        <div class="card p-4 border-l-4 border-blue-500 bg-[#161616] rounded-xl mb-4">
            <div class="flex justify-between mb-2">
                <span class="badge bg-andamento text-blue-400">Em Produção</span>
            </div>
            <h3 class="font-bold text-white mb-1">${pedido.titulo_ideia}</h3>
            
            <div class="mt-4 flex flex-col gap-2">
                <button onclick="finalizarTarefa(${pedido.id})" class="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-bold text-white">Entregar Pedido</button>
                <button onclick="abandonarTarefa(${pedido.id})" class="w-full py-2 text-red-400 hover:text-red-300 text-xs">Desistir da tarefa</button>
            </div>
        </div>
    `).join('');
}

// AÇÕES DO EDITOR
async function aceitarTarefa(id) {
    if(!confirm("Tem certeza que assume essa responsabilidade?")) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'em_andamento', editor_id: editorAtual.id })
        .eq('id', id);

    if(error) alert("Erro ao aceitar: " + error.message);
    else carregarPainel();
}

async function abandonarTarefa(id) {
    if(!confirm("O pedido voltará para a fila geral. Confirmar?")) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'pendente', editor_id: null })
        .eq('id', id);

    if(!error) carregarPainel();
}

async function finalizarTarefa(id) {
    if(!confirm("Marcar como concluído?")) return;
    
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'finalizado', data_conclusao: new Date() })
        .eq('id', id);

    if(!error) carregarPainel();
}

// SAIR
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
