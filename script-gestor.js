// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 

console.log("SCRIPT GESTOR V1.0 - CARREGADO");

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Variáveis Globais para guardar os dados
let todosUsuarios = [];
let todosPedidos = [];
let usuarioLogado = null;

window.onload = async () => {
    // 1. Verifica Login
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    usuarioLogado = user;

    // 2. Verifica se é GESTOR mesmo (Segurança)
    const { data: perfil } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    
    if (perfil.role !== 'gestor') {
        alert("Acesso restrito à diretoria.");
        window.location.href = "dashboard-cliente.html";
        return;
    }

    document.getElementById('gestor-nome').innerText = perfil.nome;

    // 3. Carrega Tudo
    await carregarDados();
};

async function carregarDados() {
    // Busca Usuários
    const { data: users } = await supabaseClient.from('profiles').select('*').order('created_at', {ascending: false});
    todosUsuarios = users || [];

    // Busca Pedidos
    const { data: orders } = await supabaseClient.from('orders').select('*').order('data_solicitacao', {ascending: false});
    todosPedidos = orders || [];

    atualizarDashboard();
    renderizarTabelaCompleta();
    renderizarUsuarios();
}

// --- FUNÇÕES VISUAIS ---

function atualizarDashboard() {
    // Atualiza os números dos cards
    document.getElementById('kpi-total').innerText = todosPedidos.length;
    document.getElementById('kpi-pendentes').innerText = todosPedidos.filter(p => p.status === 'pendente').length;
    document.getElementById('kpi-andamento').innerText = todosPedidos.filter(p => p.status === 'em_andamento' || p.status === 'aceito').length;
    document.getElementById('kpi-finalizados').innerText = todosPedidos.filter(p => p.status === 'finalizado').length;

    // Preenche tabela de recentes (pega os 5 primeiros)
    const recentes = todosPedidos.slice(0, 5);
    const tbody = document.getElementById('tabela-recentes');
    
    if(recentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Sem dados.</td></tr>';
        return;
    }

    tbody.innerHTML = recentes.map(p => {
        const cliente = todosUsuarios.find(u => u.id === p.client_id)?.nome || 'Desconhecido';
        return `
            <tr>
                <td class="text-zinc-500">#${p.id}</td>
                <td class="font-bold text-white">${p.titulo_ideia}</td>
                <td class="text-zinc-400">${cliente}</td>
                <td><span class="badge st-${p.status}">${p.status}</span></td>
            </tr>
        `;
    }).join('');
}

function renderizarTabelaCompleta() {
    const tbody = document.getElementById('tabela-completa');
    
    tbody.innerHTML = todosPedidos.map(p => {
        const cliente = todosUsuarios.find(u => u.id === p.client_id)?.nome || '—';
        const editor = todosUsuarios.find(u => u.id === p.editor_id)?.nome || '<span class="text-zinc-600 italic">Ninguém</span>';
        const data = new Date(p.data_solicitacao).toLocaleDateString();

        return `
            <tr>
                <td class="text-zinc-500 text-xs">${data}</td>
                <td class="font-bold text-white">${p.titulo_ideia}</td>
                <td class="text-zinc-400 text-sm">${cliente}</td>
                <td class="text-blue-400 text-sm">${editor}</td>
                <td><span class="badge st-${p.status}">${p.status.replace('_', ' ')}</span></td>
                <td>
                    <button onclick="excluirPedido(${p.id})" class="text-red-500 hover:text-red-400 text-xs font-bold border border-red-900 px-2 py-1 rounded">EXCLUIR</button>
                    ${p.video_bruto_url ? `<a href="${p.video_bruto_url}" target="_blank" class="text-blue-500 hover:text-blue-400 text-xs ml-2">VER VÍDEO</a>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function renderizarUsuarios() {
    const container = document.getElementById('lista-usuarios');
    
    container.innerHTML = todosUsuarios.map(u => {
        const isGestor = u.role === 'gestor';
        const isEditor = u.role === 'editor';
        
        // Define a cor do card baseado no cargo
        let borderClass = 'border-zinc-800';
        let roleLabel = 'Cliente';
        let roleColor = 'text-zinc-500';

        if(isGestor) { borderClass = 'border-purple-900 bg-purple-900/10'; roleLabel = '👑 Gestor'; roleColor = 'text-purple-400'; }
        else if(isEditor) { borderClass = 'border-blue-900 bg-blue-900/10'; roleLabel = '🎬 Editor'; roleColor = 'text-blue-400'; }

        return `
            <div class="bg-[#161616] border ${borderClass} p-4 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="${u.avatar_url || 'https://ui-avatars.com/api/?background=random'}" class="w-10 h-10 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-white text-sm">${u.nome || 'Sem Nome'}</p>
                        <p class="text-xs text-zinc-500">${u.email}</p>
                        <p class="text-xs font-bold ${roleColor} mt-1">${roleLabel}</p>
                    </div>
                </div>
                
                ${!isGestor ? `
                <div class="flex flex-col gap-2">
                    ${!isEditor ? 
                        `<button onclick="mudarCargo('${u.id}', 'editor')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-bold">Promover a Editor</button>` : 
                        `<button onclick="mudarCargo('${u.id}', 'cliente')" class="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs px-3 py-1 rounded">Rebaixar a Cliente</button>`
                    }
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// --- AÇÕES GLOBAIS ---

window.mudarCargo = async function(idUsuario, novoCargo) {
    if(!confirm(`Tem certeza que deseja mudar este usuário para ${novoCargo.toUpperCase()}?`)) return;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ role: novoCargo })
        .eq('id', idUsuario);

    if(error) alert("Erro: " + error.message);
    else {
        alert("Cargo atualizado!");
        carregarDados(); // Recarrega a tela
    }
}

window.excluirPedido = async function(idPedido) {
    if(!confirm("CUIDADO: Isso apagará o pedido permanentemente. Continuar?")) return;

    const { error } = await supabaseClient
        .from('orders')
        .delete()
        .eq('id', idPedido);

    if(error) alert("Erro ao excluir: " + error.message);
    else {
        carregarDados();
    }
}

window.sair = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
