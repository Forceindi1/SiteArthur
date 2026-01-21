// --- CONFIGURAÇÃO BLINDADA ---
// O .trim() garante que não haja espaços antes ou depois do link
const supabaseUrl = 'https://exwdgcfzqapparhzouni.supabase.co';

// COLE SUA KEY AQUI DENTRO (Mantenha o .trim() no final)
const supabaseKey = 'sb_publishable_HjQcT-uXXklApasRoad4uw_fA7zIPdG';

// Console Log para Debug (Vai aparecer no seu F12 se der erro)
console.log("Tentando conectar no Supabase com:", supabaseUrl);

// Conexão
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- FUNÇÃO DE CADASTRO (CLIENTE) ---
async function registrarUsuario(email, password, nome, whatsapp) {
    console.log("Iniciando cadastro para:", email);
    
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Erro Supabase:", error);
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
            console.error("Erro Perfil:", profileError);
            alert("Erro ao salvar perfil: " + profileError.message);
        } else {
            alert("Cadastro realizado! Redirecionando...");
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
        // Se der erro, assume cliente
        window.location.href = "dashboard-cliente.html";
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
