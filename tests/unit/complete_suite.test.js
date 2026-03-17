import { expect, describe, it } from '../testRunner.js';
import { RegexService } from '../../services/regexService.js';
import { LanguageDetectorService } from '../../services/languageDetectorService.js';
import { HistoryService } from '../../services/historyService.js';
import { AIService } from '../../services/aiService.js';

describe('RegexService - Validação de Regras', () => {
    const service = new RegexService();

    it('Deve detectar bloco except vazio em Pascal (Erro Crítico)', () => {
        const code = 'try PerformAction; except end;';
        const results = service.run(code, 'pascal');
        expect(results.length).toBe(1);
        expect(results[0].severity).toBe('critical');
    });

    it('Deve detectar uso de with ... do em Pascal (Aviso Médio)', () => {
        const code = 'with Form1 do begin Caption := "Test"; end;';
        const results = service.run(code, 'pascal');
        expect(results.some(r => r.problem.includes('with'))).toBeTruthy();
    });

    it('Deve detectar var em JavaScript (Aviso Médio)', () => {
        const code = 'var x = 10;';
        const results = service.run(code, 'javascript');
        expect(results.some(r => r.problem.includes('var'))).toBeTruthy();
    });

    it('Deve detectar eval() em JavaScript (Erro Crítico)', () => {
        const code = 'eval("alert(1)");';
        const results = service.run(code, 'javascript');
        expect(results.some(r => r.severity === 'critical')).toBeTruthy();
    });

    it('Deve detectar INSERT sem colunas em SQL (Aviso Médio)', () => {
        const code = 'INSERT INTO Tabela VALUES (1, 2);';
        const results = service.run(code, 'sql');
        expect(results.some(r => r.problem.includes('explicit column names'))).toBeTruthy();
    });
});

describe('LanguageDetectorService - Detecção Heurística', () => {
    const detector = new LanguageDetectorService();

    it('Deve identificar Pascal pelo conteúdo (procedure)', async () => {
        const lang = await detector.detect('sem_extensao', 'procedure TForm1.Click; begin end;');
        expect(lang).toBe('pascal');
    });

    it('Deve identificar SQL pelo conteúdo (SELECT)', async () => {
        const lang = await detector.detect('sem_extensao', 'SELECT Name FROM Users;');
        expect(lang).toBe('sql');
    });

    it('Deve identificar JavaScript pelo conteúdo (async function)', async () => {
        const lang = await detector.detect('sem_extensao', 'async function test() { await op(); }');
        expect(lang).toBe('javascript');
    });
});

describe('HistoryService - Retenção de Dados', () => {
    const history = new HistoryService();

    it('Deve deletar o item mais antigo ao atingir o limite de 50', async () => {
        let deletedId = null;
        // Mock de DB para simular limite atingido
        history.db = {
            transaction: () => ({
                objectStore: () => ({
                    count: () => ({ onsuccess: function() { this.result = 50; this.onsuccess(); } }),
                    openCursor: () => ({ onsuccess: function() { 
                        this.result = { primaryKey: 101, delete: () => { deletedId = 101; } }; 
                        this.onsuccess({ target: this }); 
                    } }),
                    delete: (id) => { deletedId = id; }
                })
            })
        };

        await history._enforceRetention(50);
        expect(deletedId).toBe(101); // Validou que o ID 101 (mais antigo) foi deletado
    });
});

describe('AIService - Gerenciamento de Chunks', () => {
    const ai = new AIService();

    it('Deve fragmentar código de 600 linhas em 2 chunks de 500 (com overlap)', async () => {
        const largeCode = Array(600).fill('// line').join('\n');
        let promptCalls = 0;

        // Mock temporário para contar chamadas de prompt
        const originalPrompt = window.ai.languageModel.create;
        window.ai.languageModel.create = async () => ({
            prompt: async () => { promptCalls++; return '[]'; },
            destroy: () => {}
        });

        await ai.reviewCode(largeCode, 'javascript', 'Company rules');
        
        expect(promptCalls).toBe(2);
        window.ai.languageModel.create = originalPrompt; // Restaura mock original
    });

    it('Deve extrair JSON de markdown e normalizar chaves complexas', async () => {
        const originalCreate = window.ai.languageModel.create;
        window.ai.languageModel.create = async () => ({
            prompt: async () => '```json\n{\n  "errors": [\n    {\n      "pattern": "Forbidden Patterns",\n      "description": "SQL concat",\n      "line": "10",\n      "priority": "high"\n    }\n  ]\n}\n```',
            destroy: () => {}
        });

        const results = await ai.reviewCode('test', 'javascript', 'rules');
        expect(results.length).toBe(1);
        expect(results[0].category).toBe('Forbidden Patterns');
        expect(results[0].problem).toBe('SQL concat');
        expect(results[0].line).toBe(10);
        expect(results[0].severity).toBe('critical');

        window.ai.languageModel.create = originalCreate;
    });

    it('Deve tratar erros de JSON malformado da IA graciosamente', async () => {
        const originalCreate = window.ai.languageModel.create;
        window.ai.languageModel.create = async () => ({
            prompt: async () => 'Texto puro que não é JSON',
            destroy: () => {}
        });

        const results = await ai.reviewCode('test', 'javascript', 'rules');
        expect(Array.isArray(results)).toBeTruthy();
        expect(results.length).toBe(0); // Deve retornar array vazio em vez de crashar

        window.ai.languageModel.create = originalCreate;
    });
});
