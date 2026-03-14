import { expect, describe, it } from '../testRunner.js';
import { ContextService } from '../../services/contextService.js';
import { View } from '../../views/view.js';
import { AIService } from '../../services/aiService.js';
import { ReviewController } from '../../controllers/reviewController.js';

describe('ContextService - Gerenciamento de Regras', () => {
    const service = new ContextService();

    it('Deve carregar regras customizadas do localStorage', async () => {
        const testLang = 'javascript';
        const customRule = 'Custom Rule Content';
        localStorage.setItem(`custom_context_${testLang}`, customRule);

        const content = await service.getContext(testLang);
        expect(content).toBe(customRule);
        
        localStorage.removeItem(`custom_context_${testLang}`);
    });

    it('Deve salvar novas regras no localStorage', () => {
        const testLang = 'sql';
        const newRule = 'Strict SQL Rules';
        service.saveCustomContext(testLang, newRule);
        
        expect(localStorage.getItem(`custom_context_${testLang}`)).toBe(newRule);
        localStorage.removeItem(`custom_context_${testLang}`);
    });
});

describe('View - Quick Fix e Manipulação de Código', () => {
    // Mock simples de elementos do DOM necessários
    document.body.innerHTML += `
        <div style="display:none">
            <textarea id="code-editor"></textarea>
            <select id="language-selector"></select>
            <select id="seniority-selector"></select>
            <button id="review-button"></button>
            <input type="file" id="file-input">
            <button id="file-upload-btn"></button>
            <div id="results-container"></div>
            <button id="export-btn"></button>
            <button id="export-pdf-btn"></button>
            <pre id="highlighting"><code id="highlighting-content"></code></pre>
            <div id="analytics-container"></div>
            <div id="history-container"></div>
            <select id="settings-language-selector"></select>
            <textarea id="custom-context-editor"></textarea>
            <button id="save-settings-btn"></button>
        </div>
    `;

    const view = new View();

    it('Deve aplicar Quick Fix extraindo código de bloco Markdown', () => {
        view.setCode('line 1\nline 2\nline 3');
        const suggestion = '```javascript\nnew line 2 content\n```';
        
        view.applyCodeFix(2, suggestion);
        
        const newCode = view.getCode();
        expect(newCode.includes('new line 2 content')).toBeTruthy();
        expect(newCode.split('\n')[1]).toBe('new line 2 content');
    });

    it('Deve aplicar Quick Fix de código inline (backticks)', () => {
        view.setCode('const x = 1;');
        view.applyCodeFix(1, 'Use `const x = 2;` instead');
        
        expect(view.getCode()).toBe('const x = 2;');
    });
});

describe('AIService - Senioridade e Localização', () => {
    const ai = new AIService();

    it('Deve enviar o expectedOutputLanguage como "en"', async () => {
        let capturedOptions = null;
        const originalCreate = window.ai.languageModel.create;
        
        window.ai.languageModel.create = async (options) => {
            capturedOptions = options;
            return { prompt: async () => '[]', destroy: () => {} };
        };

        await ai.reviewCode('code', 'javascript', 'rules', 'senior');
        
        expect(capturedOptions.expectedOutputLanguage).toBe('en');
        window.ai.languageModel.create = originalCreate;
    });

    it('Deve alterar o systemPrompt baseado na senioridade', async () => {
        let capturedPrompt = null;
        const originalCreate = window.ai.languageModel.create;
        
        window.ai.languageModel.create = async (options) => {
            capturedPrompt = options.systemPrompt;
            return { prompt: async () => '[]', destroy: () => {} };
        };

        await ai.reviewCode('code', 'javascript', 'rules', 'junior');
        expect(capturedPrompt.includes('Junior')).toBeTruthy();

        await ai.reviewCode('code', 'javascript', 'rules', 'senior');
        expect(capturedPrompt.includes('Senior')).toBeTruthy();

        window.ai.languageModel.create = originalCreate;
    });
});

describe('ReviewController - Deduplicação de Resultados', () => {
    // Mock minimalista para o controller
    const controller = new ReviewController({}, {}, {}, {}, {}, {});

    it('Deve remover duplicatas exatas entre Regex e AI', () => {
        const regexResults = [{ line: 10, category: 'Style', problem: 'Var usage', severity: 'medium' }];
        const aiResults = [{ line: 10, category: 'Style', problem: 'Var usage', severity: 'medium' }];
        
        const merged = controller._mergeResults(regexResults, aiResults);
        expect(merged.length).toBe(1);
    });

    it('Deve manter problemas diferentes na mesma linha', () => {
        const regexResults = [{ line: 5, category: 'Security', problem: 'SQL Injection', severity: 'critical' }];
        const aiResults = [{ line: 5, category: 'Performance', problem: 'Slow Query', severity: 'medium' }];
        
        const merged = controller._mergeResults(regexResults, aiResults);
        expect(merged.length).toBe(2);
    });
});
