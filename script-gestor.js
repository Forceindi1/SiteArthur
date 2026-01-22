// ... dentro do loop forEach ...

// Calcula Valor
let valorBase = TABELA_PRECOS[p.plano_escolhido] || 0;
// Soma 50 se tiver thumbnail
if (p.adicional_thumbnail) {
    valorBase += 50.00;
}
const valorFormatado = valorBase.toFixed(2).replace('.', ',');

// ... resto do código igual ...
// Dica: Adicione a coluna "Com Capa?" no CSV para saber quem pediu
csv += `${p.id},...,${p.plano_escolhido || 'N/A'},${p.adicional_thumbnail ? 'SIM' : 'NÃO'},"${valorFormatado}",...\n`;
