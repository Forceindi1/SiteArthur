// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

console.log("SCRIPT CLIENTE V10.0 (GALERIA VIP) - CARREGADO");

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let userAtual = null;

// --- 1. AO CARREGAR A PÁGINA (window.onload) ---
window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    userAtual = user;
    
    // Carrega tudo que precisa aparecer de início
    await carregarDadosPerfil();
    await carregarGaleriaVip(); // <--- ADICIONEI AQUI A CHAMADA!
};

// --- FUNÇÕES DE PERFIL ---
async function carregarDadosPerfil() {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userAtual.id).single();
    if(!profile) return;
    document.getElementById('user-name').innerText = profile.nome || 'Cliente';
    document.getElementById('sidebar-avatar').src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nome)}&background=2563eb&color=fff`;
    
    // Preenche inputs do perfil
    const elNome = document.getElementById('perfil-nome'); if(elNome) elNome.value = profile.nome || '';
    const elZap = document.getElementById('perfil-whatsapp'); if(elZap) elZap.value = profile.whatsapp || '';
    const elEmail = document.getElementById('perfil-email'); if(elEmail) elEmail.value = profile.email || userAtual.email;
    const elPrev = document.getElementById('preview-avatar'); if(elPrev && profile.avatar_url) elPrev.src = profile.avatar_url;
}

// --- FUNÇÃO NOVA: CARREGAR GALERIA VIP ---
// (Pode ficar aqui ou no final, tanto faz, desde que exista no arquivo)
async function carregarGaleriaVip() {
    const container = document.getElementById('lista-vip-cliente');
    if(!container) return; // Se não achar a div, para (evita erro)

    const { data: videos } = await supabaseClient.from('vip_videos').select('*').order('created_at', {ascending: false});

    if (!videos || videos.length === 0) {
        container.innerHTML = '<p class="text-zinc-500 italic">Nenhum vídeo disponível no momento.</p>';
        return;
    }

    container.innerHTML = videos.map(v => `
        <div class="card p-0 overflow-hidden group border border-zinc-800 bg-[#161616] rounded-xl">
            <div class="relative">
                <video controls class="w-full h-48 object-cover bg-black">
                    <source src="${v.video_url}" type="video/mp4">
                </video>
                <div class="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded border border-zinc-700">
                    <i class="fas fa-eye-slash text-yellow-500 mr-1"></i> Confidencial
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-white text-lg">${v.titulo}</h3>
            </div>
        </div>
    `).join('');
}

// --- FORMULÁRIO DE PEDIDO ---
const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const arquivo = document.getElementById('arquivo-video').files[0];
        const planoInput = document.querySelector('input[name="plano"]:checked');
        const planoSelecionado = planoInput ? planoInput.value : 'basico';
        const querThumbnail = document.getElementById('adicional-thumbnail')?.checked || false;

        if (!arquivo) { alert("Selecione um vídeo."); return; }

        const btn = e.target.querySelector('button');
        const loader = document.getElementById('loading-upload');
        loader.style.display = 'block';
        btn.disabled = true;
        btn.innerText = "Enviando... (Aguarde)";

        try {
            const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const nomeArquivo = `${Date.now()}_${nomeLimpo}`; 
            const { error: uploadError } = await supabaseClient.storage.from('videos').upload(nomeArquivo, arquivo);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);

            const { error: dbError } = await supabaseClient.from('orders').insert([{
                client_id: userAtual.id,
                titulo_ideia: titulo,
                descricao_detalhada: descricao,
                video_bruto_url: urlData.publicUrl,
                status: 'pendente',
                plano_escolhido: planoSelecionado,
                adicional_thumbnail: querThumbnail
            }]);

            if (dbError) throw dbError;
            alert("Pedido enviado!");
            window.location.reload(); 
        } catch (error) {
            alert("Erro: " + error.message);
            btn.disabled = false;
            btn.innerText = "Enviar Pedido";
            loader.style.display = 'none';
        }
    });
}

// --- SALVAR PERFIL ---
const formPerfil = document.getElementById('form-perfil');
if(formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('perfil-nome').value;
        const whatsapp = document.getElementById('perfil-whatsapp').value;
        const fotoArquivo = document.getElementById('input-avatar').files[0];
        const btn = e.target.querySelector('button');
        const loader = document.getElementById('loading-perfil');
        btn.disabled = true;
        loader.style.display = 'block';
        try {
            let publicAvatarUrl = null;
            if (fotoArquivo) {
                const nomeArquivo = `${userAtual.id}_${Date.now()}`;
                const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(nomeArquivo, fotoArquivo, { upsert: true });
                if (uploadError) throw uploadError;
                const { data } = supabaseClient.storage.from('avatars').getPublicUrl(nomeArquivo);
                publicAvatarUrl = data.publicUrl;
            }
            const atualizacao = { nome, whatsapp, updated_at: new Date() };
            if (publicAvatarUrl) atualizacao.avatar_url = publicAvatarUrl;
            const { error: dbError } = await supabaseClient.from('profiles').update(atualizacao).eq('id', userAtual.id);
            if (dbError) throw dbError;
            alert("Perfil atualizado!");
            await carregarDadosPerfil();
        } catch (error) { alert("Erro: " + error.message); } finally { btn.disabled = false; loader.style.display = 'none'; }
    });
}

// --- CARREGAR PEDIDOS ---
async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if(!lista) return;
    lista.innerHTML = '<p class="text-zinc-500">Atualizando...</p>';
    const { data: pedidos, error } = await supabaseClient.from('orders').select('*').eq('client_id', userAtual.id).order('data_solicitacao', { ascending: false });

    if (error || !pedidos || pedidos.length === 0) {
        lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido encontrado.</p>';
        return;
    }

    lista.innerHTML = pedidos.map(pedido => {
        const data = new Date(pedido.data_solicitacao).toLocaleDateString('pt-BR');
        const entrega = pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : 'A definir';
        const plano = pedido.plano_escolhido ? pedido.plano_escolhido.toUpperCase() : 'BÁSICO';
        const seloCapa = pedido.adicional_thumbnail ? '<span class="ml-2 px-2 py-1 rounded text-xs font-bold bg-green-900 border border-green-700 text-green-300">+ CAPA</span>' : '';
        
        let botaoDownload = '';
        if(pedido.status === 'finalizado' && pedido.link_entrega) {
            botaoDownload = `<div class="mt-4"><a href="${pedido.link_entrega}" target="_blank" class="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full">Baixar Vídeo</a></div>`;
        }

        return `
            <div class="card p-6 border border-zinc-800 bg-[#161616] rounded-xl mb-4">
                <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div class="w-full">
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 class="font-bold text-lg text-white">${pedido.titulo_ideia}</h3>
                            <span class="px-2 py-1 rounded text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">${plano}</span>
                            ${seloCapa}
                            <span class="text-xs text-blue-400 font-bold uppercase ml-auto">${pedido.status.replace('_', ' ')}</span>
                        </div>
                        <p class="text-zinc-400 text-sm">📅 Solicitado: ${data} | 🚚 Entrega: ${entrega}</p>
                        ${botaoDownload}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- SAIR ---
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
