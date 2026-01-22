# 🎬 Plataforma de Gestão - Arthur Vitelbo Edições

Sistema web completo para gestão de serviços de edição de vídeo, conectando Clientes, Editores e Gestor em um fluxo automatizado.

## 🚀 Funcionalidades Principais

### 🌐 Site Institucional (Landing Page)
- Preços e Planos carregados dinamicamente do Banco de Dados.
- Carrossel de Portfólio e Depoimentos.
- Login e Cadastro de clientes.

### 👤 Área do Cliente
- **Novo Pedido:** Formulário com upload de vídeo bruto e seleção de planos.
- **Notificação:** Envio automático de alerta para o WhatsApp do Gestor via API (CallMeBot).
- **Histórico:** Acompanhamento de status (Pendente, Em Andamento, Finalizado) e download do vídeo pronto.
- **Galeria VIP:** Acesso a vídeos exclusivos protegidos.
- **Avaliação:** Sistema de estrelas e depoimentos integrado ao site principal.

### 👑 Painel do Gestor (Admin)
- **Dashboard:** KPIs de vendas, pedidos pendentes e faturamento.
- **Gestão de Usuários:** Hierarquia de cargos (Cliente <-> Editor <-> Gestor).
- **Editor de Site:** Alteração de preços dos planos e moderação de comentários públicos.
- **Galeria VIP:** Upload e remoção de vídeos exclusivos para clientes.
- **Relatórios:** Exportação de dados para Excel (.csv).

### 🎬 Área do Editor
- **Fila de Tarefas:** Visualização de pedidos pendentes disponíveis.
- **Meus Projetos:** Aceite de tarefas e gestão de prazos.
- **Entrega:** Upload do arquivo finalizado diretamente pela plataforma.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, JavaScript (ES6+), Tailwind CSS (CDN).
- **Backend (BaaS):** Supabase.
  - **Database:** PostgreSQL (Tabelas de Profiles, Orders, Plans, Comments).
  - **Auth:** Gerenciamento de sessões e segurança (RLS).
  - **Storage:** Hospedagem de vídeos brutos, entregas e avatares.
- **Notificações:** Integração com API do WhatsApp (CallMeBot).
- **Hospedagem:** Vercel.

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

O sistema utiliza as seguintes tabelas principais:

1.  **profiles:** Dados de usuários e cargos (roles).
2.  **orders:** Pedidos de edição, links de arquivos e status.
3.  **plans:** Preços e descrições dos serviços (editável).
4.  **vip_videos:** Galeria exclusiva para clientes.
5.  **public_comments:** Depoimentos e avaliações do site.

---

## ⚙️ Configuração Local

1.  Clone este repositório.
2.  Abra o arquivo `script-auth.js`, `script-cliente.js`, `script-gestor.js` e `script-editor.js`.
3.  Configure as variáveis `supabaseUrl` e `supabaseKey` com suas credenciais do projeto Supabase.
4.  Para notificações WhatsApp, configure a `callMeBotApiKey` no `script-cliente.js`.

---

## 🔒 Licença

Este projeto é de propriedade de **Arthur Vitelbo** e o uso do código para fins comerciais sem autorização é proibido.
