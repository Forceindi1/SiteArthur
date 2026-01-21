// Importando o cliente do Supabase via CDN (Adicione o script no HTML primeiro, veja passo 4)
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- FUNÇÃO DE CADASTRO (CLIENTE) ---
async function registrarUsuario(email, password, nome, whatsapp) {
    // 1. Cria o usuário na autenticação do Supabase
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro ao criar conta: " + error.message);
        return;
    }

    // 2. Se deu certo, cria o perfil na tabela 'profiles'
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: data.user.id, 
                    email: email, 
                    nome: nome, 
                    whatsapp: whatsapp, 
                    role: 'cliente' // Todo mundo começa como cliente
                }
            ]);

        if (profileError) {
            console.error("Erro ao salvar perfil:", profileError);
        } else {
            alert("Cadastro realizado! Faça login.");
            window.location.href = "login.html"; // Redireciona para login
        }
    }
}

// --- FUNÇÃO DE LOGIN ---
async function fazerLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro no login: " + error.message);
    } else {
        // Verifica quem é o usuário para redirecionar corretamente
        verificarRoleERedirecionar(data.user.id);
    }
}

// --- VERIFICA SE É CLIENTE, EDITOR OU GESTOR ---
async function verificarRoleERedirecionar(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (data) {
        if (data.role === 'gestor') {
            window.location.href = "dashboard-gestor.html";
        } else if (data.role === 'editor') {
            window.location.href = "dashboard-editor.html";
        } else {
            window.location.href = "dashboard-cliente.html"; // Página de pedidos do cliente
        }
    }
}

// --- FUNÇÃO DE LOGOUT ---
async function sair() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
}
