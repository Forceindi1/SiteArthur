// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

console.log("SCRIPT CLIENTE V6.0 (PERFIL COMPLETO) - CARREGADO");

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let userAtual = null;

// AO CARREGAR
window.onload = async () => {
    // 1. Verifica Login
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }
    userAtual = user;
    
    // 2. Carrega Perfil (Nome, Foto, Whats)
    await carregarDadosPerfil();
    
    // 3. Se estiver na aba pedidos, carrega a lista
    // (Por padrão o HTML começa na aba 'novo', então não precisa forçar lista agora)
};

// --- FUNÇÕES DE PERFIL ---

async function carregarDadosPerfil() {
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userAtual.id)
        .single();

    if (error) { console.error("Erro ao carregar perfil:", error); return; }

    // Atualiza Sidebar
    document.getElementById('user-name').innerText = profile.nome || 'Cliente';
    if(profile.avatar_url) {
        document.getElementById('sidebar-avatar').src = profile.avatar_url;
    } else {
        // Avatar padrão com as iniciais
        document.getElementById('sidebar-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nome)}&background=2563eb&color=fff`;
    }

    // Preenche o Formulário da aba Perfil
    document.getElementById('perfil-nome').value = profile.nome || '';
    document.getElementById('perfil-whatsapp').value = profile.whatsapp || '';
    document.getElementById('perfil-email').value = profile.email || userAtual.email; // Email vem do auth ou profile
    
    if(profile.avatar_url) document.getElementById('preview-avatar').src = profile.avatar_url;
}

// SALVAR PERFIL
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

            // 1. Se tiver foto nova, faz upload
            if (fotoArquivo) {
                const nomeArquivo = `${userAtual.id}_${Date.now()}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('avatars')
                    .upload(nomeArquivo, fotoArquivo, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabaseClient.storage.from('avatars').getPublicUrl(nomeArquivo);
                publicAvatarUrl = data.publicUrl;
            }

            // 2. Prepara dados para atualizar
            const atualizacao = {
                nome: nome,
                whatsapp: whatsapp,
                updated_at: new Date()
            };
            if (publicAvatarUrl) atualizacao.avatar_url = publicAvatarUrl;

            // 3. Salva no Banco
            const { error: dbError } = await supabaseClient
                .from('profiles')
                .update(atualizacao)
                .eq('id', userAtual.id);

            if (dbError) throw dbError;

            alert("Perfil atualizado com sucesso!");
            await carregarDadosPerfil(); // Recarrega a sidebar e preview

        } catch (error) {
            alert("Erro ao atualizar: " + error.message);
        } finally {
            btn.disabled = false;
            loader.style.display = 'none';
        }
    });
}


// --- FUNÇÕES DE PEDIDOS (MANTIDAS IGUAIS) ---

const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const arquivo = document.getElementById('arquivo-video').files[0];

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
                status: 'pendente'
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

async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if(!lista) return;

    lista.innerHTML = '<p class="text-zinc-500">Atualizando...</p>';

    const { data: pedidos, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('client_id', userAtual.id)
        .order('data_solicitacao', { ascending: false });

    if (error || !pedidos || pedidos.length === 0) {
        lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido encontrado.</p>';
        return;
    }

    let html = '';
    pedidos.forEach(pedido => {
        const data = new Date(pedido.data_solicitacao).toLocaleDateString('pt-BR');
        const entrega = pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : 'A definir';
        const statusClean = pedido.status.replace('_', ' ').toUpperCase();

        // Botão de Download se finalizado
        let acaoExtra = '';
        if(pedido.status === 'finalizado' && pedido.link_entrega) {
            acaoExtra = `
                <div class="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg text-center">
                    <p class="text-green-400 font-bold mb-2">🎉 Seu vídeo está pronto!</p>
                    <a href="${pedido.link_entrega}" target="_blank" class="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition shadow-lg shadow-green-900/40">
                        <i class="fas fa-download mr-2"></i> Baixar Edição Final
                    </a>
                </div>
            `;
        }

        html += `
            <div class="card p-6 border border-zinc-800 bg-[#161616] rounded-xl mb-4">
                <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div class="w-full">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="font-bold text-lg text-white">${pedido.titulo_ideia}</h3>
                            <span class="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-zinc-800 text-white">
                                ${statusClean}
                            </span>
                        </div>
                        <p class="text-zinc-400 text-sm">📅 Data: ${data}</p>
                        <p class="text-zinc-400 text-sm">🚚 Entrega: <span class="text-blue-400">${entrega}</span></p>
                        ${acaoExtra}
                    </div>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;
}

// SAIR
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
