// FATORES DE EMISSÃO (base IPCC / Embrapa)
// Fatores de emissão (kg CO₂e por unidade)
const fatoresEmissao = {
    // Pecuária
    fermentacaoEnterica: 2000, // kg CO₂e/cabeça/ano
    dejetosPastoDegradado: 1500, // kg CO₂e/cabeça/ano
    dejetosPastoRecuperado: 800,
    dejetosConfinado: 2000,
    
    // Insumos
    fertilizanteN: 6, // kg CO₂e/kg N
    diesel: 2.6, // kg CO₂e/L
    
    // Biomas
    amazonia: 1.2,
    cerrado: 1.0,
    mata_atlantica: 0.9,
    pampa: 0.85,
    pantanal: 0.95,
    caatinga: 0.8,
    
    // Compensação
    arvoreSequestro: 21 // kg CO₂e/árvore/ano
};

// Função principal de cálculo
function calcularEmissoes(dados) {
    let emissaoTotal = 0;
    let detalhes = [];
    
    // 1. Emissões da pecuária
    if (dados.cabecas > 0) {
        // Fermentação entérica
        const fermentacao = dados.cabecas * fatoresEmissao.fermentacaoEnterica;
        emissaoTotal += fermentacao;
        detalhes.push(`Fermentação entérica (${dados.cabecas} cabeças): ${(fermentacao/1000).toFixed(2)} t CO₂e`);
        
        // Dejetos baseado no manejo
        let fatorDejetos;
        switch(dados.manejoPasto) {
            case 'degradado':
                fatorDejetos = fatoresEmissao.dejetosPastoDegradado;
                break;
            case 'recuperado':
                fatorDejetos = fatoresEmissao.dejetosPastoRecuperado;
                break;
            case 'confinado':
                fatorDejetos = fatoresEmissao.dejetosConfinado;
                break;
            default:
                fatorDejetos = fatoresEmissao.dejetosPastoDegradado;
        }
        const dejetos = dados.cabecas * fatorDejetos;
        emissaoTotal += dejetos;
        detalhes.push(`Manejo de dejetos: ${(dejetos/1000).toFixed(2)} t CO₂e`);
    }
    
    // 2. Fertilizantes
    if (dados.fertilizante > 0) {
        const fertilizanteEmissao = dados.fertilizante * fatoresEmissao.fertilizanteN;
        emissaoTotal += fertilizanteEmissao;
        detalhes.push(`Fertilizantes nitrogenados: ${(fertilizanteEmissao/1000).toFixed(2)} t CO₂e`);
    }
    
    // 3. Diesel
    if (dados.diesel > 0) {
        const dieselEmissao = dados.diesel * fatoresEmissao.diesel;
        emissaoTotal += dieselEmissao;
        detalhes.push(`Consumo de diesel: ${(dieselEmissao/1000).toFixed(2)} t CO₂e`);
    }
    
    // 4. Ajuste por bioma
    const fatorBioma = fatoresEmissao[dados.bioma] || 1.0;
    emissaoTotal = emissaoTotal * fatorBioma;
    
    // 5. Redução por práticas sustentáveis
    let reducaoPercentual = 0;
    if (dados.ilpf) reducaoPercentual += 25;
    if (dados.biodigestor) reducaoPercentual += 30;
    if (dados.bioinsumos) reducaoPercentual += 15;
    if (dados.energiaSolar) reducaoPercentual += 10;
    if (dados.sistemaCultivo === 'plantio_direto') reducaoPercentual += 20;
    if (dados.sistemaCultivo === 'organico') reducaoPercentual += 25;
    
    const emissaoComReducao = emissaoTotal * (1 - reducaoPercentual/100);
    
    return {
        total: emissaoComReducao / 1000, // Converter para toneladas
        reducaoPercentual,
        detalhes,
        emissaoOriginal: emissaoTotal / 1000
    };
}

// IA para análise do solo e recomendações
function iaAnaliseSolo(dados, resultado) {
    let analise = "";
    let recomendacoes = [];
    
    // Análise de carbono orgânico do solo baseada nas práticas
    let carbonoAtual = 2.5; // % média inicial
    let potencialSequestro = 0;
    
    if (dados.sistemaCultivo === 'plantio_direto') {
        carbonoAtual = 3.2;
        potencialSequestro = 0.8;
        recomendacoes.push("✅ Ótimo! O plantio direto está preservando a matéria orgânica do solo. Continue com a rotação de culturas.");
    } else if (dados.sistemaCultivo === 'organico') {
        carbonoAtual = 3.5;
        potencialSequestro = 1.0;
        recomendacoes.push("✅ Excelente! Seu manejo orgânico está promovendo alta atividade biológica e sequestro de carbono no solo.");
    } else {
        carbonoAtual = 1.8;
        potencialSequestro = 1.5;
        recomendacoes.push("⚠️ O preparo convencional está reduzindo o carbono orgânico do solo. Recomendamos transição para plantio direto.");
    }
    
    // Análise baseada na pecuária
    if (dados.cabecas > 0) {
        if (dados.manejoPasto === 'degradado') {
            carbonoAtual -= 0.5;
            potencialSequestro += 2.0;
            recomendacoes.push("🐄 Pastagem degradada detectada. A recuperação com manejo rotacionado pode sequestrar até 2 t CO₂e/ha/ano e aumentar a produtividade.");
        } else if (dados.manejoPasto === 'recuperado') {
            carbonoAtual += 0.3;
            recomendacoes.push("🌱 Bom manejo da pastagem! Considere introduzir árvores (silvipastoril) para aumentar o conforto animal e o sequestro de carbono.");
        }
    }
    
    // Análise de fertilizantes
    if (dados.fertilizante > 5000) {
        recomendacoes.push("⚠️ Alto uso de fertilizantes nitrogenados. Substitua parcialmente por bioinsumos e fixação biológica de nitrogênio. Economia potencial: R$ 15.000/ano.");
    } else if (dados.bioinsumos && dados.fertilizante < 2000) {
        recomendacoes.push("🌿 Parabéns pelo uso de bioinsumos! Você está reduzindo emissões e melhorando a saúde do solo.");
    }
    
    // Análise final da IA
    if (carbonoAtual >= 3.0) {
        analise = `Análise de Solo - IA CarbonAgro: Seu solo apresenta excelente teor de carbono orgânico (${carbonoAtual}%), indicando alta fertilidade e boa capacidade de retenção de água. A atividade microbiana está saudável, promovendo ciclagem eficiente de nutrientes. Com as práticas atuais, você está sequestrando aproximadamente ${potencialSequestro.toFixed(1)} t CO₂e/ha/ano. Continue monitorando e considere ampliar a diversificação de culturas para potencializar ainda mais os benefícios.`;
    } else if (carbonoAtual >= 2.0) {
        analise = `Análise de Solo - IA CarbonAgro: O carbono orgânico do solo está em nível médio (${carbonoAtual}%). Embora a produtividade atual seja razoável, há espaço para melhoria. Recomendamos intensificar a adição de matéria orgânica (compostagem, plantio de cobertura) e reduzir o revolvimento do solo. Potencial de sequestro adicional: ${potencialSequestro.toFixed(1)} t CO₂e/ha/ano, o que poderia gerar créditos de carbono e aumentar a resiliência da sua propriedade às secas.`;
    } else {
        analise = `Análise de Solo - IA CarbonAgro: Alerta! O carbono orgânico do solo está baixo (${carbonoAtual}%), indicando degradação. Isso compromete a fertilidade natural, aumenta a necessidade de insumos e reduz a resistência a pragas. Ações urgentes: (1) Implantar sistemas integrados (ILPF), (2) Recuperar áreas degradadas com espécies fixadoras de nitrogênio, (3) Adotar plantio direto. O potencial de recuperação é de até ${potencialSequestro.toFixed(1)} t CO₂e/ha/ano, transformando perdas em ativos ambientais e financeiros.`;
    }
    
    return { analise, recomendacoes };
}

// Função para atualizar a interface com os resultados
function atualizarResultados(resultado, dados, ia) {
    document.getElementById('totalEmissao').innerHTML = resultado.total.toFixed(2);
    document.getElementById('equivalenteCarros').innerHTML = (resultado.total * 0.22).toFixed(0);
    document.getElementById('arvoresCompensar').innerHTML = (resultado.total * 1000 / 21).toFixed(0);
    
    // IA content
    const iaContent = document.getElementById('iaContent');
    iaContent.innerHTML = `
        <p><strong>🤖 IA CarbonAgro Analisando...</strong></p>
        <p>${ia.analise}</p>
        <p style="margin-top: 1rem; font-size: 0.95rem;"><em>Baseado nos dados da propriedade e nos padrões de solo do bioma ${dados.bioma.replace('_', ' ').toUpperCase()}</em></p>
    `;
    
    // Recomendações
    const recContent = document.getElementById('recomendacoes');
    let recHtml = `<p><strong>Potencial de redução identificado: ${resultado.reducaoPercentual}%</strong></p><ul>`;
    ia.recomendacoes.forEach(rec => {
        recHtml += `<li>${rec}</li>`;
    });
    
    // Adicionar recomendações baseadas nas práticas não adotadas
    if (!dados.ilpf) {
        recHtml += `<li>🌳 Implementar ILPF pode reduzir emissões em até 25% e gerar renda com madeira</li>`;
    }
    if (!dados.biodigestor && dados.cabecas > 100) {
        recHtml += `<li>💰 Biodigestor para ${dados.cabecas} cabeças: potencial de redução de 30% nas emissões + produção de biogás</li>`;
    }
    if (dados.fertilizante > 3000 && !dados.bioinsumos) {
        recHtml += `<li>🦠 Substitua 50% do nitrogênio sintético por bioinsumos (economia de R$ ${(dados.fertilizante * 0.05).toFixed(0)}/ano)</li>`;
    }
    
    recHtml += `</ul><p style="margin-top: 1rem;"><strong>Estimativa de impacto financeiro:</strong> Adotando as recomendações acima, você pode economizar até R$ ${(dados.fertilizante * 0.08 + dados.diesel * 0.3).toFixed(0)}/ano e gerar créditos de carbono avaliados em até R$ ${(resultado.total * 40).toFixed(0)}/ano.</p>`;
    
    recContent.innerHTML = recHtml;
}

// Event listener do formulário
document.getElementById('carbonForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Coletar dados
    const dados = {
        bioma: document.getElementById('bioma').value,
        area: parseFloat(document.getElementById('area').value),
        atividade: document.getElementById('atividade').value,
        cabecas: parseFloat(document.getElementById('cabecas').value) || 0,
        manejoPasto: document.getElementById('manejoPasto').value,
        fertilizante: parseFloat(document.getElementById('fertilizante').value) || 0,
        diesel: parseFloat(document.getElementById('diesel').value) || 0,
        sistemaCultivo: document.getElementById('sistemaCultivo').value,
        ilpf: document.getElementById('ilpf').checked,
        biodigestor: document.getElementById('biodigestor').checked,
        bioinsumos: document.getElementById('bioinsumos').checked,
        energiaSolar: document.getElementById('energia_solar').checked
    };
    
    // Validação básica
    if (!dados.bioma || !dados.area || !dados.atividade) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    if (dados.cabecas === 0 && dados.fertilizante === 0 && dados.diesel === 0) {
        alert('Por favor, insira pelo menos uma atividade (pecuária ou lavoura) para calcular as emissões.');
        return;
    }
    
    // Calcular emissões
    const resultado = calcularEmissoes(dados);
    
    // Análise da IA
    const ia = iaAnaliseSolo(dados, resultado);
    
    // Mostrar resultados
    atualizarResultados(resultado, dados, ia);
    document.getElementById('results').style.display = 'block';
    
    // Scroll suave para resultados
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Reset button
document.getElementById('resetBtn').addEventListener('click', function() {
    document.getElementById('carbonForm').reset();
    document.getElementById('results').style.display = 'none';
    document.getElementById('carbonForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Validação em tempo real para campos numéricos
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
    });
});

// Mostrar/esconder campos de pecuária baseado na atividade
document.getElementById('atividade').addEventListener('change', function() {
    const pecuariaFields = document.querySelectorAll('#cabecas, #manejoPasto').forEach(field => {
        field.closest('.form-group').style.display = 'block';
    });
});