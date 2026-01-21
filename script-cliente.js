// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let userAtual = null;

// AO CARREGAR A PÁGINA
window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    userAtual = user;
    
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single();

    if(profile) {
        const nomeElemento = document.getElementById('user-name');
        if(nomeElemento) nomeElemento.innerText = profile.nome;
    }

    carregarPedidos();
};

// ENVIAR NOVO PEDIDO
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

        const btn = e.target.querySelector('button');
        const loader = document.getElementById('loading-upload');
        
        loader.style.display = 'block';
        btn.disabled = true;
        btn.innerText = "Enviando... (Aguarde)";

        try {
            // Limpa nome do arquivo
            const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const nomeArquivo = `${Date.now()}_${nomeLimpo}`; 
            
            // Upload
            const { data: videoData, error: uploadError } = await supabaseClient
                .storage
                .from('videos')
                .upload(nomeArquivo, arquivo);

            if (uploadError) throw uploadError;

            // Pega URL
            const { data: urlData } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);
            const videoUrl = urlData.publicUrl;

            // Salva no Banco
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
            loader.style.display = 'none';
        }
    });
}

// CARREGAR PEDIDOS
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
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        lista.innerHTML = '<p class="text-zinc-500">Nenhum pedido encontrado.</p>';
        return;
    }

    let html = '';
    pedidos.forEach(pedido => {
        const data = new Date(pedido.data_solicitacao).toLocaleDateString('pt-BR');
        const entrega = pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : 'A definir';
        const statusClean = pedido.status.replace('_', ' ').toUpperCase();

        html += `
            <div class="card p-6 border border-zinc-800 bg-[#161616] rounded-xl mb-4">
                <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="font-bold text-lg text-white">${pedido.titulo_ideia}</h3>
                            <span class="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-zinc-800 text-white">
                                ${statusClean}
                            </span>
                        </div>
                        <p class="text-zinc-400 text-sm">📅 Data: ${data}</p>
                        <p class="text-zinc-400 text-sm">🚚 Entrega: <span class="text-blue-400">${entrega}</span></p>
                    </div>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;
}
