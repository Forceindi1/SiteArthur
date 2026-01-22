// --- SUBSTITUA TODO O BLOCO DO "formPedido" POR ESTE ---

const formPedido = document.getElementById('form-pedido');
if (formPedido) {
    formPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- SEU NÚMERO AQUI (DDD + NÚMERO, sem traços ou espaços) ---
        const telefoneGestor = "5511989930723"; // Ex: 5511999999999
        // -------------------------------------------------------------

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
            // 1. Upload do Vídeo
            const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const nomeArquivo = `${Date.now()}_${nomeLimpo}`; 
            
            const { error: uploadError } = await supabaseClient.storage.from('videos').upload(nomeArquivo, arquivo);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('videos').getPublicUrl(nomeArquivo);

            // 2. Salvar no Banco
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

            // --- NOTIFICAÇÃO WHATSAPP ---
            const textoMensagem = `🚀 *Novo Pedido Enviado!*\n\nOlá! Acabei de subir um vídeo na plataforma.\n\n🎬 *Título:* ${titulo}\n📄 *Plano:* ${planoSelecionado.toUpperCase()}\n👤 *Cliente:* ${userAtual.email}`;
            
            const linkZap = `https://wa.me/${telefoneGestor}?text=${encodeURIComponent(textoMensagem)}`;
            
            // Abre o WhatsApp numa nova aba
            window.open(linkZap, '_blank');

            alert("Pedido enviado com sucesso! Notificando gestor...");
            window.location.reload(); 
            
        } catch (error) {
            alert("Erro: " + error.message);
            btn.disabled = false;
            btn.innerText = "Enviar Pedido";
            loader.style.display = 'none';
        }
    });
}
