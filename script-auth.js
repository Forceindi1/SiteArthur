// --- CONFIGURAÇÃO ---
// Substitua pelos seus dados REAIS do Supabase
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co'; 
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

// CORREÇÃO AQUI: Mudamos o nome da variável para 'supabaseClient' para não dar conflito
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- FUNÇÃO DE CADASTRO (CLIENTE) ---
async function registrarUsuario(email, password, nome, whatsapp) {
    // Usa 'supabaseClient' em vez de 'supabase'
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Erro ao criar conta: " + error.message);
        return;
    }

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
            alert("Conta criada, mas houve um erro ao salvar perfil: " + profileError.message);
        } else {
            alert("Cadastro realizado com sucesso! Você será redirecionado.");
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
        console.error("Erro ao buscar role:", error);
        // Se der erro, assume cliente por segurança ou manda pro login
        window.location.href = "dashboard-cliente.html";
        return;
    }

    if (data) {
        if (data.role === 'gestor') {
            window.location.href = "dashboard-gestor.html"; // Ainda vamos criar
        } else if (data.role === 'editor') {
            window.location.href = "dashboard-editor.html"; // Ainda vamos criar
        } else {
            window.location.href = "dashboard-cliente.html"; 
        }
    }
}

// --- FUNÇÃO DE LOGOUT ---
async function sair() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}
