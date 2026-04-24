document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const atividadeSelect = document.getElementById('atividade');
    const pecuariaBlock = document.getElementById('pecuariaBlock');
    const lavouraBlock = document.getElementById('lavouraBlock');
    const calcularBtn = document.getElementById('calcularBtn');
    
    // campos
    const bioma = document.getElementById('bioma');
    const areaInput = document.getElementById('area');
    const cabecasInput = document.getElementById('cabecas');
    const manejoPasto = document.getElementById('manejoPasto');
    const areaPlantada = document.getElementById('areaPlantada');
    const sistemaCultivo = document.getElementById('sistemaCultivo');
    const fertilizanteInput = document.getElementById('fertilizante');
    const tratamentoDejetos = document.getElementById('tratamentoDejetos');
    const praticaRecup = document.getElementById('praticaRecuperacao');
    const praticaILPF = document.getElementById('praticaILPF');
    const praticaEnergia = document.getElementById('praticaEnergiaSolar');
    const praticaBio = document.getElementById('praticaBioinsumos');

    // Abas
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    function toggleBlocks() {
        const atividade = atividadeSelect.value;
        if (atividade === 'pecuaria_corte' || atividade === 'pecuaria_leite') {
            pecuariaBlock.style.display = 'block';
            lavouraBlock.style.display = 'none';
        } else if (atividade === 'lavoura') {
            pecuariaBlock.style.display = 'none';
            lavouraBlock.style.display = 'block';
        } else if (atividade === 'ilpf') {
            pecuariaBlock.style.display = 'block';
            lavouraBlock.style.display = 'block';
        }
    }
    atividadeSelect.addEventListener('change', toggleBlocks);
    toggleBlocks();

    function calcularEmissoes() {
        const area = parseFloat(areaInput.value) || 0;
        if (area <= 0) return null;
        
        const atividade = atividadeSelect.value;
        let totalEmissao = 0;
        let breakdown = [];
        
        // 1. fermentação entérica (pecuária)
        let cabecas = parseFloat(cabecasInput.value) || 0;
        if (atividade !== 'lavoura' && cabecas > 0) {
            let fatorPece = 2.2; // t CO2e por cabeça base
            if (manejoPasto.value === 'recuperado') fatorPece = 1.8;
            if (manejoPasto.value === 'silvipastoril') fatorPece = 1.2;
            const fermentacao = cabecas * fatorPece;
            totalEmissao += fermentacao;
            breakdown.push(`Fermentação entérica (${cabecas} cabeças): ${fermentacao.toFixed(1)} t CO₂e`);
        }
        
        // 2. Dejetos
        if (cabecas > 0) {
            let fatorDejeto = 0.8;
            if (tratamentoDejetos.value === 'biodigestor') fatorDejeto = 0.2;
            if (tratamentoDejetos.value === 'compostagem') fatorDejeto = 0.4;
            const dejetos = cabecas * fatorDejeto;
            totalEmissao += dejetos;
            breakdown.push(`Dejetos animais: ${dejetos.toFixed(1)} t CO₂e`);
        }
        
        // 3. Lavoura / solo
        let areaPlant = parseFloat(areaPlantada.value) || 0;
        if (atividade !== 'pecuaria_corte' && atividade !== 'pecuaria_leite' || areaPlant > 0) {
            let fatorCultivo = 0.9; // t CO2e/ha
            if (sistemaCultivo.value === 'plantio_direto') fatorCultivo = 0.4;
            if (sistemaCultivo.value === 'organico') fatorCultivo = 0.2;
            const cultivoEmissao = areaPlant * fatorCultivo;
            totalEmissao += cultivoEmissao;
            breakdown.push(`Manejo da lavoura: ${cultivoEmissao.toFixed(1)} t CO₂e`);
        }
        
        // 4. fertilizante nitrogenado
        let fert = parseFloat(fertilizanteInput.value) || 0;
        let fN = 6.0 / 1000; // 6 kg CO2e por kg N, convertendo para t
        const emissaoFert = fert * fN;
        totalEmissao += emissaoFert;
        if (fert > 0) breakdown.push(`Fertilizantes N: ${emissaoFert.toFixed(1)} t CO₂e`);
        
        // 5. Práticas sustentáveis REDUZEM automaticamente
        let desconto = 0;
        if (praticaRecup.checked && (atividade.includes('pecuaria') || atividade === 'ilpf')) desconto += totalEmissao * 0.08;
        if (praticaILPF.checked) desconto += totalEmissao * 0.12;
        if (praticaEnergia.checked) desconto += totalEmissao * 0.03;
        if (praticaBio.checked) desconto += totalEmissao * 0.05;
        totalEmissao = Math.max(0, totalEmissao - desconto);
        
        const emissaoPorHa = area > 0 ? totalEmissao / area : 0;
        let comparativo = '', progress = 50;
        if (emissaoPorHa < 2) { comparativo = 'Abaixo da média brasileira (excelente)'; progress = 25; }
        else if (emissaoPorHa < 4) { comparativo = 'Próximo da média sustentável'; progress = 55; }
        else { comparativo = 'Acima da média (alto carbono)'; progress = 85; }
        
        return { total: totalEmissao.toFixed(1), porHa: emissaoPorHa.toFixed(1), descricaoComparativo: comparativo, progress, breakdown, area, atividade, cabecas, fert, manejoPastoVal: manejoPasto.value, praticaILPF: praticaILPF.checked, praticaBioChecked: praticaBio.checked, areaPlantada: areaPlant };
    }
    
    // IA do solo: analisa fatores de saúde e carbono no solo
    function analiseIA(emissoesObj) {
        if (!emissoesObj) return { statusText: '', diagnostico: '', melhorias: '', sugestoes: [] };
        const { total, porHa, atividade, areaPlantada, cabecas, fert, praticaILPF, praticaBioChecked, manejoPastoVal } = emissoesObj;
        let status = '', diagnostico = '', melhorias = '', sugestoes = [];
        const tCO2 = parseFloat(total);
        const haArea = parseFloat(porHa);
        
        // Análise solo baseado em emissões por ha
        if (haArea < 2.5) {
            status = '🌱 Saúde do solo: BOA (baixa pegada, carbono retido no solo)';
            diagnostico = 'Indicadores mostram que seu solo mantém bom nível de matéria orgânica e provavelmente há sequestro de carbono.';
            melhorias = 'Manter práticas de plantio direto e/ou integração. Potencial para créditos de carbono.';
        } else if (haArea < 5) {
            status = '⚠️ Saúde do solo: REGULAR (emissões moderadas)';
            diagnostico = 'Há perda de carbono orgânico em taxas médias. Solo ainda produtivo, mas há desgaste.';
            melhorias = 'Introduzir rotação de culturas e cultivo de cobertura. Reduza o uso de nitrogênio sintético.';
        } else {
            status = '🔴 Saúde do solo: CRÍTICA / DEGRADADO';
            diagnostico = 'Alta emissão de GEE, baixo carbono orgânico, solo compactado e baixa fertilidade biológica.';
            melhorias = 'Parar desmatamento, iniciar recuperação com integração lavoura-pecuária, adubação verde e bioinsumos.';
        }
        
        if (fert > 8000) sugestoes.push('Reduza fertilizante nitrogenado, substitua parcialmente por fixação biológica (ex: inoculantes).');
        if (!praticaILPF && (atividade.includes('pecuaria') || atividade === 'ilpf')) sugestoes.push('Implementar ILPF aumenta carbono no solo em até 30% e reduz emissões.');
        if (!praticaBioChecked) sugestoes.push('Utilizar bioinsumos ajuda a restaurar microbioma do solo e fixar nitrogênio natural.');
        if (manejoPastoVal === 'degradado' && atividade.includes('pecuaria')) sugestoes.push('Pasto degradado libera muito carbono. Recupere com gradagem leve + gramíneas + leguminosas.');
        if (areaPlantada > 0 && haArea > 4) sugestoes.push('Adotar sistema plantio direto e integração com árvores para melhorar matéria orgânica.');
        
        return { statusText: status, diagnostico, melhorias, sugestoes };
    }
    
    function atualizarUI() {
        const areaVal = parseFloat(areaInput.value);
        if (!areaVal || areaVal <= 0) {
            alert('Por favor, insira uma área válida (hectares).');
            return;
        }
        const resultado = calcularEmissoes();
        if (!resultado) return;
        
        // exibir aba resultado
        document.getElementById('resultadoPlaceholder').style.display = 'none';
        document.getElementById('resultadoDetalhado').style.display = 'block';
        document.getElementById('valorEmissao').innerText = resultado.total;
        document.getElementById('emisPorHa').innerText = resultado.porHa;
        document.getElementById('progressFill').style.width = resultado.progress + '%';
        document.getElementById('statusComparativo').innerText = resultado.descricaoComparativo;
        
        const lista = document.getElementById('listaFontes');
        lista.innerHTML = '';
        resultado.breakdown.forEach(f => { let li = document.createElement('li'); li.innerHTML = f; lista.appendChild(li); });
        
        // ========== IA SOLO ==========
        const iaData = analiseIA(resultado);
        const iaDiv = document.getElementById('iaMessage');
        const iaRecomDiv = document.getElementById('iaRecomendacoes');
        iaDiv.style.display = 'none';
        iaRecomDiv.style.display = 'block';
        document.getElementById('iaSoloStatus').innerHTML = iaData.statusText;
        document.getElementById('iaDiagnostico').innerHTML = `<strong>🧪 Diagnóstico:</strong> ${iaData.diagnostico}`;
        document.getElementById('iaMelhoria').innerHTML = `<strong>📈 Recomendação principal:</strong> ${iaData.melhorias}`;
        const sugestBox = document.getElementById('iaSugestoesBox');
        sugestBox.innerHTML = '<strong>🔧 Sugestões práticas IA:</strong><ul>' + iaData.sugestoes.map(s => `<li>✅ ${s}</li>`).join('') + '</ul>';
    }
    
    calcularBtn.addEventListener('click', atualizarUI);
});