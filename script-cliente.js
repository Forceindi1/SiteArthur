// --- CONFIGURAÇÃO (COLE SUAS CHAVES AQUI TAMBÉM) ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variável para guardar o usuário logado
let userAtual = null;

// 1. AO CARREGAR A PÁGINA: Verifica se está logado
window.onload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = "login.html"; // Chuta para fora se não tiver logado
        return;
    }
    
    userAtual = user;
    
    // Busca o nome do usuário para mostrar na sidebar
    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single();
    if(profile) document.getElementById('user-name').innerText = profile.nome;

    // Se já estiver na aba de pedidos, carrega
    carregarPedidos();
};

// 2. FUNÇÃO: ENVIAR NOVO PEDIDO
document.getElementById('form-pedido').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const arquivo = document.getElementById('arquivo-video').files[0];

    if (!arquivo) {
        alert("Por favor, selecione um vídeo.");
        return;
    }

    // Mostra loading
    document.getElementById('loading-upload').style.display = 'block';
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Enviando vídeo... (Aguarde)";

    try {
        // A. Upload do Vídeo para o Storage 'videos'
        const nomeArquivo = `${Date.now()}_${arquivo.name}`; // Nome único
        const { data: videoData, error: uploadError } = await supabase
            .storage
            .from('videos')
            .upload(nomeArquivo, arquivo);

        if (uploadError) throw uploadError;

        // B. Pega a URL pública do vídeo
        const { data: urlData } = supabase.storage.from('videos').getPublicUrl(nomeArquivo);
        const videoUrl = urlData.publicUrl;

        // C. Salva no Banco de Dados (Tabela orders)
        const { error: dbError } = await supabase
            .from('orders')
            .insert([
                {
                    client_id: userAtual.id,
                    titulo_ideia: titulo,
                    descricao_detalhada: descricao,
                    video_bruto_url: videoUrl,
                    status: 'pendente'
                }
            ]);

        if (dbError) throw dbError;

        alert("Pedido enviado com sucesso!");
        window.location.reload(); // Recarrega para limpar
        
    } catch (error) {
        alert("Erro ao enviar: " + error.message);
        console.error(error);
        btn.disabled = false;
        btn.innerText = "Enviar Pedido";
        document.getElementById('loading-upload').style.display = 'none';
    }
});

// 3. FUNÇÃO: CARREGAR MEUS PEDIDOS
async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    lista.innerHTML = '<p class="text-zinc-500">Atualizando...</p>';

    const { data: pedidos, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', userAtual.id)
        .order('data_solicitacao', { ascending: false });

    if (error) {
        lista.innerHTML = '<p class="text-red-500">Erro ao carregar pedidos.</p>';
        return;
    }

    if (pedidos.length === 0) {
        lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido encontrado.</p>';
        return;
    }

    // Monta o HTML de cada pedido
    let html = '';
    pedidos.forEach(pedido => {
        // Formata data
        const data = new Date(pedido.data_solicitacao).toLocaleDateString('pt-BR');
        const entrega = pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : 'A definir';

        html += `
            <div class="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <h3 class="font-bold text-lg text-white">${pedido.titulo_ideia}</h3>
                        <span class="status-${pedido.status}">${pedido.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <p class="text-zinc-400 text-sm mb-1">📅 Solicitado em: ${data}</p>
                    <p class="text-zinc-400 text-sm">🚚 Previsão de Entrega: <span class="text-blue-400">${entrega}</span></p>
                    ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="text-xs text-blue-500 hover:underline mt-2 block">Ver vídeo enviado</a>` : ''}
                </div>
                <div class="text-right">
                    <p class="text-xs text-zinc-600 uppercase tracking-widest mb-1">Última atualização</p>
                    <p class="text-zinc-400 font-mono text-sm">${new Date(pedido.updated_at || pedido.data_solicitacao).toLocaleString('pt-BR')}</p>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;
}

// 4. FUNÇÃO SAIR
async function sair() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
}
