// --- CONFIGURAÇÃO (COLE SUAS CHAVES AQUI) ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

// CORREÇÃO: Mudamos o nome para 'supabaseClient' para não conflitar com a biblioteca
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Variável para guardar o usuário logado
let userAtual = null;

// 1. AO CARREGAR A PÁGINA: Verifica se está logado
window.onload = async () => {
    // Usa supabaseClient daqui pra frente
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = "login.html"; // Chuta para fora se não tiver logado
        return;
    }
    
    userAtual = user;
    
    // Busca o nome do usuário para mostrar na sidebar
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single();

    if(profile) document.getElementById('user-name').innerText = profile.nome;

    // Se já estiver na aba de pedidos, carrega
    carregarPedidos();
};

// 2. FUNÇÃO: ENVIAR NOVO PEDIDO
const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', async (e) => {
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
            // Sanitiza o nome do arquivo para evitar caracteres estranhos
            const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const nomeArquivo = `${Date.now()}_${nomeLimpo}`; 
            
            const { data: videoData, error: uploadError } = await supabaseClient
                .storage
                .from('videos')
                .upload(nomeArquivo, arquivo);

            if (uploadError) throw uploadError;

            // B. Pega a URL pública do vídeo
            const { data: urlData } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);
            const videoUrl = urlData.publicUrl;

            // C. Salva no Banco de Dados (Tabela orders)
            const { error: dbError } = await supabaseClient
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
            window.location.reload(); 
            
        } catch (error) {
            alert("Erro ao enviar: " + error.message);
            console.error(error);
            btn.disabled = false;
            btn.innerText = "Enviar Pedido";
            document.getElementById('loading-upload').style.display = 'none';
        }
    });
}

// 3. FUNÇÃO: CARREGAR MEUS PEDIDOS
async function carregarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    if(!lista) return;

    lista.innerHTML = '<p class="text-zinc-500">Atualizando...</p>';

    const { data: pedidos, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('client_id', userAtual.id)
        .order('data_solicitacao', { ascending: false });

    if (error) {
        lista.innerHTML = '<p class="text-red-500">Erro ao carregar pedidos.</p>';
        console.error(error);
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido encontrado.</p>';
        return;
    }

    // Monta o HTML de cada pedido
    let html = '';
    pedidos.forEach(pedido => {
        // Formata data
        const data = new Date(pedido.data_solicitacao).toLocaleDateString('pt-BR');
        const entrega = pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : 'A definir';
        const dataAtualizacao = pedido.updated_at ? new Date(pedido.updated_at).toLocaleString('pt-BR') : data;

        html += `
            <div class="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-zinc-800 bg-[#161616] rounded-xl">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <h3 class="font-bold text-lg text-white">${pedido.titulo_ideia}</h3>
                        <span class="status-${pedido.status} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">
                            ${pedido.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p class="text-zinc-400 text-sm mb-1">📅 Solicitado em: ${data}</p>
                    <p class="text-zinc-400 text-sm">🚚 Previsão: <span class="text-blue-400">${entrega}</span></p>
                    ${pedido.video_bruto_url ? `<a href="${pedido.video_bruto_url}" target="_blank" class="text-xs text-blue-500 hover:underline mt-2 inline-block">📹 Ver vídeo enviado</a>` : ''}
                </div>
                <div class="text-right w-full md:w-auto mt-2 md:mt-0">
                    <p class="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Última atualização</p>
                    <p class="text-zinc-400 font-mono text-xs">${dataAtualizacao}</p>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;
}

// 4. FUNÇÃO SAIR
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
