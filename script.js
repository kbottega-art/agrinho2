// FATORES DE EMISSÃO (base IPCC / Embrapa)
const FATORES = {
    fermentacaoEnterica: 2100,        // kg CO2e/cabeça/ano (corte médio)
    dejetosSemTratamento: 1100,        // kg CO2e/cabeça/ano
    dejetosBiodigestor: 380,           // redução significativa
    dejetosCompostagem: 550,
    nitrogenioSintetico: 6.2,          // kg CO2e/kg N
    // emissões por hectare + manejo lavoura
    plantioDiretoEmissaoHa: 0.45,      // t CO2e/ha
    convencionalEmissaoHa: 1.8,
    organicoEmissaoHa: 0.3,
    // diesel lavoura (estimativa base)
    dieselPorHa: 0.25,                 // t CO2e/ha adicional
    pastoDegradadoFator: 1.4,          // multiplicador sobre fermentação (pior manejo)
    silvipastorilReducao: 0.65,
    ilpfSequestro: 2.2                 // t CO2e/ha/ano sequestrado (ILPF madeira+solo)
};

// funcao para calcular emissão atual
function calcularEmissaoAtual(dados) {
    let totalEmissao = 0;
    // 1. Pecuária - fermentação entérica
    if (dados.numeroCabecas > 0) {
        let fatorFermentacao = FATORES.fermentacaoEnterica;
        if (dados.manejo === "pastoDegradado") fatorFermentacao *= FATORES.pastoDegradadoFator;
        if (dados.manejo === "silvipastoril") fatorFermentacao *= FATORES.silvipastorilReducao;
        totalEmissao += (dados.numeroCabecas * fatorFermentacao) / 1000; // t CO2e
        // 2. Dejetos
        let fatorDejetos = FATORES.dejetosSemTratamento;
        if (dados.tratamentoDejetos === "biodigestor") fatorDejetos = FATORES.dejetosBiodigestor;
        if (dados.tratamentoDejetos === "compostagem") fatorDejetos = FATORES.dejetosCompostagem;
        totalEmissao += (dados.numeroCabecas * fatorDejetos) / 1000;
    }
    // 3. Lavoura
    if (dados.areaPlantada > 0) {
        let emissaoLavoura = 0;
        if (dados.sistemaCultivo === "plantioDireto") emissaoLavoura = dados.areaPlantada * FATORES.plantioDiretoEmissaoHa;
        else if (dados.sistemaCultivo === "convencional") emissaoLavoura = dados.areaPlantada * FATORES.convencionalEmissaoHa;
        else emissaoLavoura = dados.areaPlantada * FATORES.organicoEmissaoHa;
        // acrescenta diesel por hectare (simplificado)
        emissaoLavoura += dados.areaPlantada * FATORES.dieselPorHa;
        totalEmissao += emissaoLavoura;
    }
    // 4. Fertilizante nitrogenado
    totalEmissao += (dados.nitrogenioKg * FATORES.nitrogenioSintetico) / 1000;
    return parseFloat(totalEmissao.toFixed(1));
}

// calcula cenário sustentável com base nas práticas marcadas
function calcularCenarioSustentavel(dados, emissaoAtual) {
    let reducao = 0;
    let emissaoSustentavel = emissaoAtual;

    // 1. Recuperação de pastagens + adoção de boas práticas reduz emissão da fermentação e dejetos
    if (dados.praticaRecuperacaoPastagem && dados.numeroCabecas > 0) {
        let reducaoPecuaria = (dados.numeroCabecas * 0.6) / 1000; // redução de 600 kg CO2e/cabeça
        reducao += reducaoPecuaria;
    }
    // 2. ILPF sequestra carbono e reduz emissão
    if (dados.praticaIlpf && dados.areaTotal > 0) {
        let sequestroIlpf = dados.areaTotal * 0.8 * FATORES.ilpfSequestro; // assume 80% da área integrada
        reducao += sequestroIlpf;
    }
    // 3. Bioinsumos reduzem N2O: diminui necessidade de fertilizante sintético
    if (dados.praticaBioinsumos && dados.nitrogenioKg > 0) {
        let reducaoN = (dados.nitrogenioKg * 0.4 * FATORES.nitrogenioSintetico) / 1000; // 40% menos N
        reducao += reducaoN;
    }
    // 4. APP reflorestado sequestro estimado
    if (dados.praticaReflorestamento && dados.areaTotal > 0) {
        reducao += dados.areaTotal * 0.25; // pequena contribuição florestal
    }
    // bônus: se biodigestor ou compostagem já incluso no atual - não repetir, mas no cenário sustentável partimos do atual
    // 5. Se não usa biodigestor, mas poderia, aplicamos bônus
    if (dados.tratamentoDejetos !== "biodigestor" && dados.numeroCabecas > 10 && dados.praticaIlpf === false) {
        let reducaoPotencialDejetos = (dados.numeroCabecas * (FATORES.dejetosSemTratamento - FATORES.dejetosBiodigestor)) / 1000;
        reducao += reducaoPotencialDejetos * 0.5; // meia adesao conservadora
    }
    emissaoSustentavel = Math.max(0, emissaoAtual - reducao);
    return { emissaoSustentavel, reducao: parseFloat(reducao.toFixed(1)) };
}

function calcularEconomiaAnual(reducaoTonCO2e) {
    // cada tonelada de CO2e evitada pode gerar ~R$ 40 (crédito conservador) + economia insumos
    let creditoCarbono = reducaoTonCO2e * 35; // R$ 35 por ton
    let economiaInsumos = reducaoTonCO2e * 18; // R$ 18/ton por menor uso de N, diesel, etc.
    return Math.round(creditoCarbono + economiaInsumos);
}

// obtém dados do formulário
function coletarDados() {
    return {
        estado: document.getElementById('estado').value,
        areaTotal: parseFloat(document.getElementById('areaTotal').value) || 0,
        tipoAtividade: document.getElementById('tipoAtividade').value,
        numeroCabecas: parseInt(document.getElementById('numeroCabecas').value) || 0,
        manejo: document.getElementById('manejoPecuaria').value,
        areaPlantada: parseFloat(document.getElementById('areaPlantada').value) || 0,
        sistemaCultivo: document.getElementById('sistemaCultivo').value,
        nitrogenioKg: parseFloat(document.getElementById('nitrogenioKg').value) || 0,
        tratamentoDejetos: document.getElementById('tratamentoDejetos').value,
        praticaRecuperacaoPastagem: document.getElementById('praticaRecuperacaoPastagem').checked,
        praticaIlpf: document.getElementById('praticaIlpf').checked,
        praticaReflorestamento: document.getElementById('praticaReflorestamento').checked,
        praticaBioinsumos: document.getElementById('praticaBioinsumos').checked
    };
}

function exibirResultados() {
    const dados = coletarDados();
    if (!dados.estado || dados.areaTotal <= 0) {
        alert("Por favor, preencha estado e área total da fazenda na etapa 1.");
        // volta etapa 1
        document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active-step'));
        document.getElementById('step1').classList.add('active-step');
        atualizarProgresso(1);
        return;
    }
    const emissaoAtual = calcularEmissaoAtual(dados);
    const sustentavel = calcularCenarioSustentavel(dados, emissaoAtual);
    const economiaAnual = calcularEconomiaAnual(sustentavel.reducao);
    const equivalenteCarros = (sustentavel.reducao / 4.6).toFixed(1); // média brasileira 4.6 tCO2e/carro/ano

    const resultadoDiv = document.querySelector('.resultado-final');
    resultadoDiv.innerHTML = `
        <div class="result-card">
            <h3>📊 Pegada de carbono atual da sua propriedade</h3>
            <div class="emissoes-total">${emissaoAtual} t CO₂e / ano</div>
            <p>🌎 Equivalente a emissões de aproximadamente <strong>${Math.round(emissaoAtual / 4.6)} carros de passeio</strong> por ano.</p>
        </div>
        <div class="reducao-box">
            <h3>🌿 Cenário com práticas sustentáveis</h3>
            <p><strong>Emissão após adoção de boas práticas:</strong> ${sustentavel.emissaoSustentavel} t CO₂e/ano</p>
            <p style="font-size:1.4rem; font-weight:bold; color:#1e6f3f;">✅ Redução potencial: ${sustentavel.reducao} t CO₂e/ano</p>
            <p>🚗 Isso equivale a tirar de circulação <strong>${equivalenteCarros} carros</strong> por ano.</p>
        </div>
        <div class="economia-box">
            <i class="fas fa-chart-line"></i> <strong>💰 Ganho econômico estimado</strong><br>
            Economia com insumos + potencial de venda de créditos de carbono: até <strong style="font-size:1.3rem;">R$ ${economiaAnual.toLocaleString('pt-BR')}/ano</strong>.
            <br><small>* Valores aproximados com base no mercado atual de carbono e redução de insumos.</small>
        </div>
        <hr>
        <div>
            <h4>📌 Recomendações personalizadas</h4>
            <ul style="margin-left: 1.4rem; margin-top:0.5rem;">
                ${dados.numeroCabecas > 30 && dados.manejo === "pastoDegradado" ? "<li>🐄 Recupere pastagens degradadas com ILPF e reduza suas emissões em até 35%.</li>" : ""}
                ${dados.nitrogenioKg > 500 ? "<li>🌱 Substitua parte do nitrogênio sintético por bioinsumos/inoculantes (ex: soja, milho consorciado).</li>" : ""}
                ${dados.tratamentoDejetos !== "biodigestor" && dados.numeroCabecas > 50 ? "<li>💨 Instale um biodigestor para tratar dejetos e gerar biogás (redução de metano e economia).</li>" : ""}
                ${!dados.praticaIlpf && dados.areaTotal > 50 ? "<li>🌳 Integre árvores à pastagem ou lavoura (ILPF) – pode sequestrar até 2 t CO₂e/ha/ano.</li>" : ""}
                <li>📋 Procure assistência técnica da Embrapa ou SENAR para acessar crédito rural com linhas verdes (ABC+).</li>
            </ul>
        </div>
    `;
    // renderiza etapa 5
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active-step'));
    document.getElementById('step5').classList.add('active-step');
    atualizarProgresso(5);
}

// Navegação entre etapas
function atualizarProgresso(stepId) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, idx) => {
        const num = idx + 1;
        if (num <= stepId) step.classList.add('active');
        else step.classList.remove('active');
    });
}

document.querySelectorAll('.next-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const nextId = btn.getAttribute('data-next');
        const currentStepDiv = btn.closest('.form-step');
        currentStepDiv.classList.remove('active-step');
        document.getElementById(`step${nextId}`).classList.add('active-step');
        atualizarProgresso(parseInt(nextId));
    });
});

document.querySelectorAll('.prev-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const prevId = btn.getAttribute('data-prev');
        const currentStepDiv = btn.closest('.form-step');
        currentStepDiv.classList.remove('active-step');
        document.getElementById(`step${prevId}`).classList.add('active-step');
        atualizarProgresso(parseInt(prevId));
    });
});

document.getElementById('calcularBtn').addEventListener('click', () => {
    exibirResultados();
});

document.getElementById('refazerBtn').addEventListener('click', () => {
    window.location.reload();
});

// iniciar progresso
atualizarProgresso(1);