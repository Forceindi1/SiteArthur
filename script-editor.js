const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 
console.log("SCRIPT EDITOR V2.0 (UPLOAD) - CARREGADO");
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let userAtual = null;
let meusPedidos = [];
let pedidosDisponiveis = [];

window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    userAtual = user;
    const { data: perfil } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (perfil.role !== 'editor' && perfil.role !== 'gestor') { alert("Área restrita."); window.location.href = "dashboard-cliente.html"; return; }
    document.getElementById('editor-nome').innerText = perfil.nome || 'Editor';
    await carregarPainel();
};

async function carregarPainel() {
    const { data: disp } = await supabaseClient.from('orders').select('*').eq('status', 'pendente').order('data_solicitacao', {ascending: true});
    pedidosDisponiveis = disp || [];
    const { data: meus } = await supabaseClient.from('orders').select('*').or(`status.eq.em_andamento,status.eq.aceito`).eq('editor_id', userAtual.id).order('data_solicitacao', {ascending: false});
    meusPedidos = meus || [];
    renderizarDisponiveis();
    renderizarMeus();
}

function renderizarDisponiveis() {
    const lista = document.getElementById('lista-disponiveis');
    if(pedidosDisponiveis.length === 0) { lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido na fila.</p>'; return; }
    lista.innerHTML = pedidosDisponiveis.map(p => `
        <div class="bg-[#161616] border border-zinc-800 p-4 rounded-xl">
            <h3 class="font-bold text-white">${p.titulo_ideia}</h3>
            <p class="text-sm text-zinc-400 mt-2">${p.descricao_detalhada}</p>
            <div class="mt-4 flex justify-between items-center">
                <span class="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300 uppercase">${p.plano_escolhido || 'Básico'}</span>
                <button onclick="aceitarPedido(${p.id})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded">Pegar Tarefa</button>
            </div>
            ${p.video_bruto_url ? `<a href="${p.video_bruto_url}" target="_blank" class="block mt-2 text-xs text-blue-400 text-center">Ver Vídeo Bruto</a>` : ''}
        </div>
    `).join('');
}

function renderizarMeus() {
    const lista = document.getElementById('lista-meus-projetos');
    if(meusPedidos.length === 0) { lista.innerHTML = '<p class="text-zinc-500">Você não tem tarefas ativas.</p>'; return; }
    lista.innerHTML = meusPedidos.map(p => `
        <div class="bg-[#161616] border border-blue-900/30 p-4 rounded-xl relative">
            <h3 class="font-bold text-white">${p.titulo_ideia}</h3>
            <p class="text-sm text-zinc-400 mt-1 mb-4">Status: <span class="text-blue-400 uppercase font-bold">${p.status.replace('_', ' ')}</span></p>
            <div id="acoes-pedido-${p.id}" class="flex flex-col gap-2">
                 <button onclick="finalizarTarefa(${p.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-sm">Entregar Pedido</button>
                 <a href="${p.video_bruto_url}" target="_blank" class="text-center text-xs text-zinc-500 hover:text-white">Baixar Bruto</a>
            </div>
        </div>
    `).join('');
}

window.aceitarPedido = async function(id) {
    if(!confirm("Pegar tarefa?")) return;
    const { error } = await supabaseClient.from('orders').update({ status: 'em_andamento', editor_id: userAtual.id }).eq('id', id);
    if(error) alert("Erro: " + error.message); else carregarPainel();
}

// UPLOAD DE ENTREGA (NOVO)
window.finalizarTarefa = function(id) {
    const divAcoes = document.getElementById(`acoes-pedido-${id}`);
    divAcoes.innerHTML = `
        <div class="bg-zinc-800 p-3 rounded border border-zinc-700 animate-fade-in">
            <p class="text-xs text-white font-bold mb-2">📤 Upload do Arquivo Final</p>
            <input type="file" id="arquivo-entrega-${id}" accept="video/*" class="w-full text-xs text-zinc-400 mb-2">
            <input type="number" id="minutos-${id}" placeholder="Duração (min)" class="w-full p-2 bg-black border border-zinc-600 rounded text-white text-xs mb-2">
            <button onclick="confirmarUpload(${id})" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-xs">Confirmar Envio</button>
            <button onclick="carregarPainel()" class="w-full text-red-400 text-xs mt-2 underline">Cancelar</button>
        </div>
    `;
}

window.confirmarUpload = async function(id) {
    const arquivo = document.getElementById(`arquivo-entrega-${id}`).files[0];
    const minutos = document.getElementById(`minutos-${id}`).value;
    if(!arquivo || !minutos) return alert("Selecione o vídeo e informe a duração!");
    
    const btn = event.target; btn.innerText = "Subindo vídeo... (Aguarde)"; btn.disabled = true;
    const nomeArquivo = `entrega_${id}_${Date.now()}_${arquivo.name.replace(/\s/g, '_')}`;
    
    const { error: upErr } = await supabaseClient.storage.from('videos').upload(nomeArquivo, arquivo);
    if(upErr) { alert("Erro upload: " + upErr.message); btn.innerText = "Tentar de novo"; btn.disabled = false; return; }
    
    const { data } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);
    
    const { error } = await supabaseClient.from('orders').update({
        status: 'finalizado',
        data_conclusao: new Date(),
        link_entrega: data.publicUrl,
        duracao_minutos: minutos
    }).eq('id', id);
    
    if(!error) { alert("Entrega realizada com sucesso!"); carregarPainel(); }
    else alert("Erro banco: " + error.message);
}

window.sair = async function() { await supabaseClient.auth.signOut(); window.location.href = "index.html"; }
