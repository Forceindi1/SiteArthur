// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; // <--- URL CORRETA AQUI
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; // <--- KEY AQUI

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let editorAtual = null;

// AO CARREGAR
window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    // Verifica se é EDITOR mesmo (Segurança)
    const { data: perfil } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    
    if (perfil.role !== 'editor' && perfil.role !== 'gestor') {
        alert("Acesso negado. Apenas editores.");
        window.location.href = "dashboard-cliente.html";
        return;
    }

    editorAtual = user;
    document.getElementById('editor-nome').innerText = perfil.nome;
    
    carregarPainel();
};

async function carregarPainel() {
    // 1. Buscar Pedidos PENDENTES (Mural Geral)
    const { data: pendentes } = await supabaseClient
        .from('orders')
        .select('*, profiles(nome)') // Traz o nome do cliente junto
        .eq('status', 'pendente')
        .order('data_solicitacao', { ascending: true });

    renderizarPendentes(pendentes || []);

    // 2. Buscar Pedidos EM ANDAMENTO (Só os meus)
    const { data: meus } = await supabaseClient
        .from('orders')
        .select('*, profiles(nome)')
        .eq('editor_id', editorAtual.id)
        .in('status', ['em_andamento', 'aceito']);

    renderizarMeus(meus || []);
}

// RENDERIZA LISTA DE DISPONÍVEIS
function renderizarPendentes(lista) {
    const container = document.getElementById('lista-pendentes');
    document.getElementById('count-pendentes').innerText = lista.length;
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Nenhum pedido na fila.</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => `
        <div class="card p-4">
            <div class="flex justify-between items-start mb-2">
                <span class="badge bg-pendente">Novo Pedido</span>
                <span class="text-xs text-zinc-500">${new Date(pedido.data_solicitacao).toLocaleDateString()}</span>
            </div>
            <h3 class="font-bold text-lg mb-1">${pedido.titulo_ideia}</h3>
            <p class="text-sm text-zinc-400 mb-3 line-clamp-2">${pedido.descricao_detalhada}</p>
            <p class="text-xs text-blue-400 mb-4">👤 Cliente: ${pedido.profiles?.nome || 'Anônimo'}</p>
            
            <div class="flex gap-2">
                <a href="${pedido.video_bruto_url}" target="_blank" class="flex-1 text-center py-2 border border-zinc-700 rounded text-sm hover:bg-zinc-800">Ver Vídeo</a>
                <button onclick="aceitarTarefa(${pedido.id})" class="flex-1 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700">Aceitar Tarefa</button>
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
        <div class="card p-4 border-l-4 border-blue-500">
            <div class="flex justify-between mb-2">
                <span class="badge bg-andamento">Em Produção</span>
            </div>
            <h3 class="font-bold text-white mb-1">${pedido.titulo_ideia}</h3>
            
            <div class="mt-4 flex flex-col gap-2">
                <button onclick="abrirEntrega(${pedido.id})" class="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-bold">Finalizar / Entregar</button>
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

    if(!error) carregarPainel();
    else alert("Erro ao aceitar: " + error.message);
}

async function abandonarTarefa(id) {
    if(!confirm("O pedido voltará para a fila geral. Confirmar?")) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'pendente', editor_id: null }) // Volta a ser de ninguém
        .eq('id', id);

    if(!error) carregarPainel();
}

// SAIR
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
