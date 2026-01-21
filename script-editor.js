// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 

console.log("SCRIPT V4.1 (EMAIL TEXTO) - CARREGADO");

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let editorAtual = null;
let listaDeClientes = []; 

window.onload = async () => {
    // 1. Verifica Login
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    editorAtual = user;

    // 2. BUSCA TODOS OS CLIENTES
    const { data: perfis } = await supabaseClient.from('profiles').select('*');
    if(perfis) listaDeClientes = perfis;

    // Nome do editor
    const meuPerfil = listaDeClientes.find(p => p.id === user.id);
    if(meuPerfil) document.getElementById('editor-nome').innerText = meuPerfil.nome;
    
    carregarPainel();
};

async function carregarPainel() {
    // 3. BUSCA OS PEDIDOS
    const { data: pedidos, error } = await supabaseClient
        .from('orders')
        .select('*')
        .order('data_solicitacao', { ascending: true });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    const pendentes = pedidos.filter(p => p.status === 'pendente');
    const meus = pedidos.filter(p => p.editor_id === editorAtual.id && (p.status === 'em_andamento' || p.status === 'aceito'));

    renderizarPendentes(pendentes);
    renderizarMeus(meus);
}

function getDadosCliente(idDoCliente) {
    const cliente = listaDeClientes.find(p => p.id === idDoCliente);
    return cliente || { nome: 'Desconhecido', whatsapp: '', email: '' };
}

function renderizarPendentes(lista) {
    const container = document.getElementById('lista-pendentes');
    const contador = document.getElementById('count-pendentes');
    if(contador) contador.innerText = lista.length;
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Nenhum pedido na fila.</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => {
        const cliente = getDadosCliente(pedido.client_id);
        
        return `
        <div class="card p-4 mb-4 border border-zinc-800 bg-[#161616] rounded-xl">
            <div class="flex justify-between items-start mb-2">
                <span class="badge bg-pendente text-yellow-500 bg-yellow-900/30 px-2 py-1 rounded text-xs">Novo Pedido</span>
                <span class="text-xs text-zinc-500">${new Date(pedido.data_solicitacao).toLocaleDateString()}</span>
            </div>
            <h3 class="font-bold text-lg mb-1 text-white">${pedido.titulo_ideia}</h3>
            <p class="text-xs text-blue-400 mb-2">👤 Cliente: ${cliente.nome}</p>
            <p class="text-sm text-zinc-400 mb-3 line-clamp-2">${pedido.descricao_detalhada || 'Sem descrição'}</p>
            
            <div class="flex gap-2 mt-4">
                ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="flex-1 text-center py-2 border border-zinc-700 rounded text-sm hover:bg-zinc-800 text-white">Ver Vídeo</a>` : ''}
                <button onclick="aceitarTarefa(${pedido.id})" class="flex-1 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 text-white">Aceitar Tarefa</button>
            </div>
        </div>
    `}).join('');
}

function renderizarMeus(lista) {
    const container = document.getElementById('lista-minhas');
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Você está livre!</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => {
        const cliente = getDadosCliente(pedido.client_id);
        const zapLimpo = cliente.whatsapp ? cliente.whatsapp.replace(/[^0-9]/g, '') : '';
        const linkZap = zapLimpo ? `https://wa.me/55${zapLimpo}` : '#';
        const dataEntregaValue = pedido.data_entrega ? new Date(pedido.data_entrega).toISOString().split('T')[0] : '';
        
        return `
        <div class="card p-5 border-l-4 border-blue-500 bg-[#161616] rounded-xl mb-6 shadow-lg">
            <div class="flex justify-between mb-3">
                <span class="badge bg-andamento text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full text-xs font-bold">EM PRODUÇÃO</span>
            </div>
            <h3 class="font-bold text-xl text-white mb-1">${pedido.titulo_ideia}</h3>
            <p class="text-sm text-zinc-500 mb-4">${pedido.descricao_detalhada || ''}</p>
            
            <div class="bg-zinc-900/50 p-3 rounded-lg mb-4 border border-zinc-800">
                <p class="text-xs text-zinc-400 uppercase font-bold mb-2">Dados do Cliente</p>
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">👤</div>
                    <div>
                        <p class="text-sm font-bold text-white">${cliente.nome || 'Sem Nome'}</p>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-2 items-center">
                    ${zapLimpo ? `<a href="${linkZap}" target="_blank" class="flex-1 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 text-center rounded text-xs font-bold border border-green-900 transition flex items-center justify-center gap-2">📱 WhatsApp</a>` : ''}
                    
                    <div class="flex-1 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-center rounded text-xs select-all cursor-text overflow-hidden text-ellipsis whitespace-nowrap px-2" title="Clique para copiar">
                        ${cliente.email || 'Sem Email'}
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <label class="text-xs text-zinc-400 font-bold uppercase block mb-1">📅 Prazo de Entrega</label>
                <input type="date" value="${dataEntregaValue}" onchange="atualizarPrazo(${pedido.id}, this.value)" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none">
            </div>
            
            <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-800">
                ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center rounded text-sm font-semibold transition">⬇️ Baixar Vídeo</a>` : ''}
                <button onclick="finalizarTarefa(${pedido.id})" class="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-bold text-white shadow-lg shadow-green-900/20 transition">✅ Entregar Pedido</button>
                <button onclick="abandonarTarefa(${pedido.id})" class="w-full py-2 text-red-400 hover:text-red-300 text-xs mt-1">Desistir da tarefa</button>
            </div>
        </div>
    `}).join('');
}

// --- FUNÇÕES DE AÇÃO GLOBAIS ---
window.atualizarPrazo = async function(id, novaData) {
    if(!novaData) return;
    const { error } = await supabaseClient.from('orders').update({ data_entrega: novaData }).eq('id', id);
    if(error) alert("Erro: " + error.message);
    else alert("Prazo salvo com sucesso!");
}

window.aceitarTarefa = async function(id) {
    if(!confirm("Aceitar esta tarefa?")) return;
    const { error } = await supabaseClient.from('orders').update({ status: 'em_andamento', editor_id: editorAtual.id }).eq('id', id);
    if(!error) carregarPainel();
}

window.abandonarTarefa = async function(id) {
    if(!confirm("Desistir da tarefa?")) return;
    const { error } = await supabaseClient.from('orders').update({ status: 'pendente', editor_id: null }).eq('id', id);
    if(!error) carregarPainel();
}

window.finalizarTarefa = async function(id) {
    const linkPronto = prompt("Link do vídeo pronto (Drive/WeTransfer):");
    if(!linkPronto) return;
    const { error } = await supabaseClient.from('orders').update({ status: 'finalizado', data_conclusao: new Date() }).eq('id', id);
    if(!error) { alert("Entregue!"); carregarPainel(); }
}

window.sair = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
