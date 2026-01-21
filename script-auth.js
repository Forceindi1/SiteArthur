// --- CONFIGURAÇÃO ---
// URL e KEY do Supabase (Mantenha as aspas)
const supabaseUrl = 'https://exwdgcfzqapprhzouni.supabase.co';
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG'; 
// Inicializa o cliente do Supabase
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- FUNÇÃO DE CADASTRO (CLIENTE) ---
async function registrarUsuario(email, password, nome, whatsapp) {
    // 1. Cria o usuário na autenticação
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro ao criar conta: " + error.message);
        return;
    }

    // 2. Salva os dados extras na tabela profiles
    if (data.user) {
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([
                { 
                    id: data.user.id, 
                    email: email, 
                    nome: nome, 
                    whatsapp: whatsapp, 
                    role: 'cliente'
                }
            ]);

        if (profileError) {
            console.error("Erro ao salvar perfil:", profileError);
            alert("Conta criada, mas houve um erro ao salvar dados: " + profileError.message);
        } else {
            alert("Cadastro realizado! Redirecionando para o login...");
            window.location.href = "login.html"; 
        }
    }
}

// --- FUNÇÃO DE LOGIN ---
async function fazerLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro no login: " + error.message);
    } else {
        verificarRoleERedirecionar(data.user.id);
    }
}

// --- VERIFICA SE É CLIENTE, EDITOR OU GESTOR ---
async function verificarRoleERedirecionar(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) {
        console.error("Erro ao buscar função do usuário:", error);
        window.location.href = "dashboard-cliente.html"; // Padrão seguro
        return;
    }

    if (data) {
        if (data.role === 'gestor') {
            window.location.href = "dashboard-gestor.html";
        } else if (data.role === 'editor') {
            window.location.href = "dashboard-editor.html";
        } else {
            window.location.href = "dashboard-cliente.html"; 
        }
    }
}

// --- FUNÇÃO DE SAIR ---
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
