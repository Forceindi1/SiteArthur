const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 
console.log("SCRIPT GESTOR V6.0 (PORTFOLIO MANAGER) - CARREGADO");
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const TABELA_PRECOS = { 'basico': 50.00, 'intermediario': 100.00, 'avancado': 200.00 };

let todosUsuarios = [];
let todosPedidos = [];
let planosCache = [];
let usuarioLogado = null;

window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    usuarioLogado = user;

    const { data: perfil } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (perfil.role !== 'gestor') { alert("Acesso restrito."); window.location.href = "dashboard-cliente.html"; return; }
    document.getElementById('gestor-nome').innerText = perfil.nome || 'Gestor';
    await carregarDados();
};

async function carregarDados() {
    const { data: users } = await supabaseClient.from('profiles').select('*').order('created_at', {ascending: false});
    todosUsuarios = users || [];
    const { data: orders } = await supabaseClient.from('orders').select('*').order('data_solicitacao', {ascending: false});
    todosPedidos = orders || [];
    atualizarDashboard(); renderizarTabelaCompleta(); renderizarUsuarios();
}

function atualizarDashboard() {
    document.getElementById('kpi-total').innerText = todosPedidos.length;
    document.getElementById('kpi-pendentes').innerText = todosPedidos.filter(p => p.status === 'pendente').length;
    document.getElementById('kpi-andamento').innerText = todosPedidos.filter(p => p.status === 'em_andamento' || p.status === 'aceito').length;
    document.getElementById('kpi-finalizados').innerText = todosPedidos.filter(p => p.status === 'finalizado').length;
    const recentes = todosPedidos.slice(0, 5);
    const tbody = document.getElementById('tabela-recentes');
    tbody.innerHTML = recentes.map(p => {
        const cliente = todosUsuarios.find(u => u.id === p.client_id)?.nome || '—';
        return `<tr><td class="text-zinc-500">#${p.id}</td><td class="font-bold text-white">${p.titulo_ideia}</td><td class="text-zinc-400">${cliente}</td><td><span class="badge st-${p.status}">${p.status}</span></td></tr>`;
    }).join('');
}

function renderizarTabelaCompleta() {
    document.getElementById('tabela-completa').innerHTML = todosPedidos.map(p => {
        const cliente = todosUsuarios.find(u => u.id === p.client_id)?.nome || '—';
        const editor = todosUsuarios.find(u => u.id === p.editor_id)?.nome || '—';
        return `<tr><td class="text-zinc-500 text-xs">${new Date(p.data_solicitacao).toLocaleDateString()}</td><td class="font-bold text-white">${p.titulo_ideia}</td><td class="text-zinc-400 text-sm">${cliente}</td><td class="text-blue-400 text-sm">${editor}</td><td><span class="badge st-${p.status}">${p.status.replace('_', ' ')}</span></td><td><button onclick="excluirPedido(${p.id})" class="text-red-500 font-bold text-xs border border-red-900 px-2 py-1 rounded">EXCLUIR</button> ${p.video_bruto_url ? `<a href="${p.video_bruto_url}" target="_blank" class="text-blue-500 text-xs ml-2">VER</a>` : ''}</td></tr>`;
    }).join('');
}

function renderizarUsuarios() {
    document.getElementById('lista-usuarios').innerHTML = todosUsuarios.map(u => {
        const isSelf = u.id === usuarioLogado.id;
        let roleLabel = 'Cliente'; let roleColor = 'text-zinc-500'; let border = 'border-zinc-800';
        if(u.role === 'gestor') { roleLabel = '👑 Gestor'; roleColor = 'text-purple-400'; border = 'border-purple-900 bg-purple-900/10'; }
        else if(u.role === 'editor') { roleLabel = '🎬 Editor'; roleColor = 'text-blue-400'; border = 'border-blue-900 bg-blue-900/10'; }
        let botoesCargo = '';
        if(!isSelf) {
            if(u.role === 'cliente') botoesCargo = `<button onclick="mudarCargo('${u.id}', 'editor')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded">Promover a Editor</button>`;
            else if(u.role === 'editor') botoesCargo = `<button onclick="mudarCargo('${u.id}', 'gestor')" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 rounded">Promover a Gestor</button><button onclick="mudarCargo('${u.id}', 'cliente')" class="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs py-1 rounded">Rebaixar a Cliente</button>`;
            else if(u.role === 'gestor') botoesCargo = `<button onclick="mudarCargo('${u.id}', 'editor')" class="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-xs py-1 rounded">Rebaixar a Editor</button>`;
        }
        return `<div class="bg-[#161616] border ${border} p-4 rounded-xl relative group"><div class="flex items-center gap-3 mb-3"><img src="${u.avatar_url || 'https://ui-avatars.com/api/?background=random'}" class="w-10 h-10 rounded-full object-cover"><div><p class="font-bold text-white text-sm">${u.nome || 'Sem Nome'}</p><p class="text-xs text-zinc-500 truncate w-32">${u.email}</p><p class="text-xs font-bold ${roleColor}">${roleLabel}</p></div></div><div class="flex gap-2">${botoesCargo}</div>${!isSelf ? `<button onclick="excluirUsuario('${u.id}')" class="absolute top-2 right-2 text-zinc-600 hover:text-red-500 transition"><i class="fas fa-trash"></i></button>` : ''}</div>`;
    }).join('');
}

// EDITOR SITE
window.carregarDadosSite = async function() {
    const { data: planos } = await supabaseClient.from('plans').select('*'); planosCache = planos || [];
    document.getElementById('lista-planos-editor').innerHTML = planosCache.map(p => `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800 pb-4"><div><label class="text-xs text-zinc-500">Tipo</label><input type="text" value="${p.tipo}" disabled class="opacity-50"></div><div><label class="text-xs text-zinc-500">Preço (R$)</label><input type="number" id="preco-${p.tipo}" value="${p.preco}"></div><div><label class="text-xs text-zinc-500">Descrição</label><input type="text" id="desc-${p.tipo}" value="${p.descricao}"></div></div>`).join('');
    const { data: comments } = await supabaseClient.from('public_comments').select('*').order('created_at', {ascending: false});
    document.getElementById('tabela-comentarios').innerHTML = (comments || []).map(c => `<tr class="border-b border-zinc-800"><td class="text-zinc-500 text-xs">${new Date(c.created_at).toLocaleDateString()}</td><td class="text-white font-bold">${c.nome}</td><td class="text-zinc-400 italic">"${c.comentario}"</td><td class="text-yellow-500">${'★'.repeat(c.nota)}</td><td><button onclick="apagarComentario(${c.id})" class="text-red-500 hover:text-white"><i class="fas fa-trash"></i></button></td></tr>`).join('');
}
window.salvarPlanos = async function() {
    for (const p of planosCache) {
        const novoPreco = document.getElementById(`preco-${p.tipo}`).value;
        const novaDesc = document.getElementById(`desc-${p.tipo}`).value;
        await supabaseClient.from('plans').update({ preco: novoPreco, descricao: novaDesc }).eq('tipo', p.tipo);
    }
    alert("Planos atualizados!");
}
window.apagarComentario = async function(id) { if(confirm("Apagar?")) { await supabaseClient.from('public_comments').delete().eq('id', id); window.carregarDadosSite(); } }

// --- PORTFÓLIO MANAGER (NOVO) ---
window.carregarPortfolio = async function() {
    const { data: videos } = await supabaseClient.from('portfolio').select('*').order('created_at', {ascending: false});
    document.getElementById('lista-portfolio-manager').innerHTML = (videos || []).map(v => `
        <div class="bg-zinc-900 border border-green-900/30 p-2 rounded flex justify-between items-center">
            <div class="truncate">
                <p class="font-bold text-white text-sm">${v.titulo}</p>
                <a href="${v.video_url}" target="_blank" class="text-xs text-green-400 hover:underline">Ver Vídeo</a>
            </div>
            <button onclick="removerPortfolio(${v.id})" class="text-red-500 hover:bg-red-900/20 p-2 rounded"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}
window.adicionarPortfolio = async function() {
    const titulo = document.getElementById('novo-port-titulo').value;
    const arquivo = document.getElementById('novo-port-file').files[0];
    if(!titulo || !arquivo) return alert("Preencha título e arquivo!");
    
    const btn = event.target; btn.innerText = "Enviando..."; btn.disabled = true;
    const nomeArquivo = `port_${Date.now()}_${arquivo.name.replace(/\s/g, '_')}`;
    const { error: uploadError } = await supabaseClient.storage.from('videos').upload(nomeArquivo, arquivo);
    if(uploadError) { alert("Erro upload: " + uploadError.message); btn.innerText = "Adicionar"; btn.disabled = false; return; }
    
    const { data } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);
    const { error } = await supabaseClient.from('portfolio').insert([{ titulo, video_url: data.publicUrl }]);
    
    if(error) alert("Erro banco: " + error.message);
    else { alert("Adicionado ao Portfólio!"); document.getElementById('novo-port-titulo').value = ''; document.getElementById('novo-port-file').value = ''; window.carregarPortfolio(); }
    btn.innerText = "Adicionar ao Site"; btn.disabled = false;
}
window.removerPortfolio = async function(id) { if(confirm("Remover do site?")) { await supabaseClient.from('portfolio').delete().eq('id', id); window.carregarPortfolio(); } }


// VIP MANAGER
window.carregarVipManager = async function() {
    const { data: videos } = await supabaseClient.from('vip_videos').select('*').order('created_at', {ascending: false});
    document.getElementById('lista-vip-manager').innerHTML = (videos || []).map(v => `<div class="bg-zinc-900 border border-zinc-700 p-2 rounded flex justify-between items-center"><div class="truncate"><p class="font-bold text-white text-sm">${v.titulo}</p><a href="${v.video_url}" target="_blank" class="text-xs text-blue-400 hover:underline">Ver Vídeo</a></div><button onclick="removerVip(${v.id})" class="text-red-500 hover:bg-red-900/20 p-2 rounded"><i class="fas fa-trash"></i></button></div>`).join('');
}
window.adicionarVideoVIP = async function() {
    const titulo = document.getElementById('novo-vip-titulo').value;
    const arquivo = document.getElementById('novo-vip-file').files[0];
    if(!titulo || !arquivo) return alert("Preencha título e arquivo!");
    
    const btn = event.target; btn.innerText = "Enviando..."; btn.disabled = true;
    const nomeArquivo = `vip_${Date.now()}_${arquivo.name.replace(/\s/g, '_')}`;
    const { error: uploadError } = await supabaseClient.storage.from('videos').upload(nomeArquivo, arquivo);
    if(uploadError) { alert("Erro upload: " + uploadError.message); btn.innerText = "Adicionar VIP"; btn.disabled = false; return; }
    
    const { data } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);
    const { error } = await supabaseClient.from('vip_videos').insert([{ titulo, video_url: data.publicUrl }]);
    
    if(error) alert("Erro banco: " + error.message);
    else { alert("Vídeo Adicionado!"); document.getElementById('novo-vip-titulo').value = ''; document.getElementById('novo-vip-file').value = ''; window.carregarVipManager(); }
    btn.innerText = "Adicionar VIP"; btn.disabled = false;
}
window.removerVip = async function(id) { if(confirm("Remover?")) { await supabaseClient.from('vip_videos').delete().eq('id', id); window.carregarVipManager(); } }

// GLOBAIS
window.mudarCargo = async function(id, cargo) { if(confirm(`Mudar para ${cargo}?`)) { await supabaseClient.from('profiles').update({ role: cargo }).eq('id', id); carregarDados(); } }
window.excluirUsuario = async function(id) { if(confirm("Excluir usuário?")) { await supabaseClient.from('profiles').delete().eq('id', id); carregarDados(); } }
window.excluirPedido = async function(id) { if(confirm("Excluir pedido?")) { await supabaseClient.from('orders').delete().eq('id', id); carregarDados(); } }
window.baixarRelatorio = function() {
    let csv = "ID;Cliente;Email;Telefone;Plano;Tem Capa?;Valor Cobrado (R$);Editor;Solicitado em;Concluido em;Minutos Video\n";
    todosPedidos.forEach(p => {
        const cliente = todosUsuarios.find(u => u.id === p.client_id) || {};
        const editor = todosUsuarios.find(u => u.id === p.editor_id) || {};
        let valorBase = TABELA_PRECOS[p.plano_escolhido] || 0;
        if (p.adicional_thumbnail === true) valorBase += 50.00;
        csv += `${p.id};"${cliente.nome||''}";"${cliente.email||''}";"${cliente.whatsapp||''}";${p.plano_escolhido||'N/A'};${p.adicional_thumbnail?'SIM':'NÃO'};"${valorBase.toFixed(2).replace('.',',')}";"${editor.nome||''}";${new Date(p.data_solicitacao).toLocaleDateString()};${p.data_conclusao?new Date(p.data_conclusao).toLocaleDateString():'Pendente'};${p.duracao_minutos||0}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "relatorio.csv"; link.click();
}
window.sair = async function() { await supabaseClient.auth.signOut(); window.location.href = "index.html"; }
