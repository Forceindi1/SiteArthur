// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

console.log("SCRIPT CLIENTE V8.0 (THUMBNAIL) - CARREGADO");

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let userAtual = null;

window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    userAtual = user;
    await carregarDadosPerfil();
};

async function carregarDadosPerfil() {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userAtual.id).single();
    if(!profile) return;
    document.getElementById('user-name').innerText = profile.nome || 'Cliente';
    document.getElementById('sidebar-avatar').src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nome)}&background=2563eb&color=fff`;
    document.getElementById('perfil-nome').value = profile.nome || '';
    document.getElementById('perfil-whatsapp').value = profile.whatsapp || '';
    document.getElementById('perfil-email').value = profile.email || userAtual.email;
    if(profile.avatar_url) document.getElementById('preview-avatar').src = profile.avatar_url;
}

// FORMULÁRIO DE PEDIDO
const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const arquivo = document.getElementById('arquivo-video').files[0];
        
        // DADOS NOVOS
        const planoInput = document.querySelector('input[name="plano"]:checked');
        const planoSelecionado = planoInput ? planoInput.value : 'basico';
        const querThumbnail = document.getElementById('adicional-thumbnail').checked; // <--- CAPTURA O CHECKBOX

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
                adicional_thumbnail: querThumbnail // <--- SALVA NO BANCO
            }]);

            if (dbError) throw dbError;

            alert("Pedido enviado com sucesso!");
            window.location.reload(); 
            
        } catch (error) {
            alert("Erro: " + error.message);
            btn.disabled = false;
            btn.innerText = "Enviar Pedido";
            loader.style.display = 'none';
        }
    });
}

// SALVAR PERFIL (IGUAL)
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
        // Mostra se pediu capa
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

async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
