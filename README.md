/* RESUMO DO BANCO DE DADOS (V1.0)
--------------------------------
Tabelas Criadas:
1. profiles (Perfis de usuário)
   - Colunas: id, email, nome, whatsapp, role (cliente/editor/gestor), avatar_url
   
2. orders (Pedidos)
   - Colunas: id, client_id, editor_id, titulo_ideia, descricao_detalhada, 
              video_bruto_url, status, data_solicitacao, data_entrega, 
              data_conclusao, link_entrega

Storage (Buckets):
1. videos (Público: Sim)
2. avatars (Público: Sim)
*/
