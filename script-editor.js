// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let editorAtual = null;

// AO CARREGAR
window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    editorAtual = user;
    
    // Mostra nome do editor
    try {
        const { data: perfil } = await supabaseClient.from('profiles').select('nome').eq('id', user.id).single();
        if(perfil) document.getElementById('editor-nome').innerText = perfil.nome;
    } catch (e) { console.log("Erro perfil:", e); }
    
    carregarPainel();
};

async function carregarPainel() {
    // 1. Buscar Pedidos PENDENTES
    // Agora buscamos também o NOME do cliente (profiles:nome)
    const { data: pendentes, error: erroPendentes } = await supabaseClient
        .from('orders')
        .select('*, profiles(nome)') 
        .eq('status', 'pendente')
        .order('data_solicitacao', { ascending: true });

    if (erroPendentes) console.error("Erro pendentes:", erroPendentes);
    else renderizarPendentes(pendentes || []);

    // 2. Buscar Pedidos EM ANDAMENTO (Meus)
    // Aqui buscamos NOME, WHATSAPP e EMAIL do cliente para contato
    const { data: meus, error: erroMeus } = await supabaseClient
        .from('orders')
        .select('*, profiles(nome, whatsapp, email)')
        .eq('editor_id', editorAtual.id)
        .in('status', ['em_andamento', 'aceito']);

    if (erroMeus) console.error("Erro meus:", erroMeus);
    else renderizarMeus(meus || []);
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
            <p class="text-xs text-blue-400 mb-2">👤 Cliente: ${pedido.profiles?.nome || 'Anônimo'}</p>
            <p class="text-sm text-zinc-400 mb-3 line-clamp-2">${pedido.descricao_detalhada || 'Sem descrição'}</p>
            
            <div class="flex gap-2 mt-4">
                ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="flex-1 text-center py-2 border border-zinc-700 rounded text-sm hover:bg-zinc-800 text-white">Ver Vídeo</a>` : ''}
                <button onclick="aceitarTarefa(${pedido.id})" class="flex-1 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 text-white">Aceitar Tarefa</button>
            </div>
        </div>
    `).join('');
}

// RENDERIZA LISTA DE MINHAS TAREFAS (COM CONTATO E PRAZO)
function renderizarMeus(lista) {
    const container = document.getElementById('lista-minhas');
    
    if(lista.length === 0) {
        container.innerHTML = '<p class="text-zinc-600 italic">Você está livre!</p>';
        return;
    }

    container.innerHTML = lista.map(pedido => {
        // Prepara link do WhatsApp (remove caracteres não numéricos)
        const zapLimpo = pedido.profiles?.whatsapp?.replace(/[^0-9]/g, '') || '';
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
                        <p class="text-sm font-bold text-white">${pedido.profiles?.nome || 'Cliente'}</p>
                        <p class="text-xs text-zinc-500">${pedido.profiles?.email || ''}</p>
                    </div>
                </div>
                <div class="flex gap-2 mt-2">
                    ${zapLimpo ? `<a href="${linkZap}" target="_blank" class="flex-1 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 text-center rounded text-xs font-bold border border-green-900"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
                    <a href="mailto:${pedido.profiles?.email}" class="flex-1 py-1.5 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 text-center rounded text-xs font-bold"><i class="far fa-envelope"></i> Email</a>
                </div>
            </div>

            <div class="mb-4">
                <label class="text-xs text-zinc-400 font-bold uppercase block mb-1">Prazo de Entrega</label>
                <input type="date" 
                       value="${dataEntregaValue}" 
                       onchange="atualizarPrazo(${pedido.id}, this.value)"
                       class="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none">
            </div>
            
            <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-800">
                ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center rounded text-sm font-semibold">⬇️ Baixar Vídeo do Cliente</a>` : ''}
                <button onclick="finalizarTarefa(${pedido.id})" class="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-bold text-white shadow-lg shadow-green-900/20">✅ Entregar Pedido</button>
                <button onclick="abandonarTarefa(${pedido.id})" class="w-full py-2 text-red-400 hover:text-red-300 text-xs mt-1">Desistir da tarefa</button>
            </div>
        </div>
    `;
    }).join('');
}

// --- FUNÇÕES DE AÇÃO ---

// Atualiza a data no banco assim que você muda o calendário
async function atualizarPrazo(id, novaData) {
    if(!novaData) return;
    
    const { error } = await supabaseClient
        .from('orders')
        .update({ data_entrega: novaData })
        .eq('id', id);

    if(error) alert("Erro ao salvar prazo: " + error.message);
    else alert("Prazo atualizado para o cliente!");
}

async function aceitarTarefa(id) {
    if(!confirm("Tem certeza que assume essa responsabilidade?")) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'em_andamento', editor_id: editorAtual.id })
        .eq('id', id);

    if(error) alert("Erro: " + error.message);
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
    // Pergunta o link do vídeo pronto
    const linkPronto = prompt("Insira o link do vídeo finalizado (Drive, WeTransfer, etc):");
    if(!linkPronto) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ 
            status: 'finalizado', 
            data_conclusao: new Date(),
            // Se você quiser salvar o link da entrega no banco, precisaria criar uma coluna 'video_final_url' na tabela orders
            // Por enquanto, salvamos na descrição ou apenas mudamos o status
        })
        .eq('id', id);

    if(!error) {
        alert("Pedido entregue com sucesso!");
        carregarPainel();
    } else {
        alert("Erro: " + error.message);
    }
}

async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
