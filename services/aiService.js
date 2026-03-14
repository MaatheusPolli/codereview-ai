/**
 * CodeReview AI - AI Service (Gemini Nano Integration)
 * @license MIT 2025 Matheus Gasparotto Polli
 */

export class AIService {
    constructor() {
        this.session = null;
        this.abortController = null;
    }

    async checkRequirements() {
        const errors = [];
        // @ts-ignore
        const isChrome = !!window.chrome;
        if (!isChrome) errors.push("⚠️ Este recurso só funciona no Google Chrome (versão recente).");

        const modelFactory = window.ai?.languageModel || self.LanguageModel;
        if (!modelFactory) {
            errors.push("⚠️ APIs nativas de IA inativas. Ative as flags no chrome://flags/.");
            return errors;
        }

        try {
            const options = { expectedOutputLanguage: 'en' };
            const availability = await modelFactory.availability(options);
            if (availability === 'no') errors.push(`⚠️ Hardware não suporta IA nativa.`);
            if (availability === 'after-download') {
                errors.push(`⏳ Baixando modelo de IA. Recarregue em instantes.`);
                await modelFactory.create(options);
            }
        } catch (e) { console.warn("AI Check error:", e); }

        return errors.length > 0 ? errors : null;
    }

    async reviewCode(code, language, contextFileContent, seniority = 'senior', outputLanguage = 'pt') {
        this.abortController?.abort();
        this.abortController = new AbortController();

        const prompts = {
            junior: `You are a Junior Code Reviewer. Focus on syntax errors and basic naming conventions.`,
            mid: `You are a Mid-Level Code Reviewer. Focus on performance, DRY principle, and proper error handling.`,
            senior: `You are a Staff/Senior Code Reviewer. Focus on Scalability, Security, Architecture, and edge cases.`
        };

        const targetLang = outputLanguage === 'pt' ? 'Portuguese (Brazil)' : 'English';
        
        const systemPrompt = `${prompts[seniority] || prompts.senior}
                            IMPORTANT: You must respond in ${targetLang}. 
                            Descriptions and suggestions MUST be in ${targetLang}.
                            IGNORE comments (lines starting with //, --, #, /*).
                            Respond ONLY with a JSON array of issues. No conversational text.
                            
                            Format:
                            [
                            {
                                "line": <number>,
                                "originalLine": "exact text of line",
                                "severity": "critical|medium|low",
                                "category": "Bugs|Security|Performance|Standards|Readability",
                                "problem": "description",
                                "suggestion": "code"
                            }
                            ]`;

        const lines = code.split('\n');
        const chunkSize = 250;
        const overlap = 30;
        let allIssues = [];

        try {
            // Process sequentially for maximum stability
            for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
                const chunk = lines.slice(i, i + chunkSize).join('\n');
                
                // Recreate session for each chunk to ensure clean context (Standard stability approach)
                const modelFactory = window.ai?.languageModel || self.LanguageModel;
                const session = await modelFactory.create({ 
                    systemPrompt,
                    expectedOutputLanguage: 'en' // ALWAYS 'en' to satisfy Chrome safety, regardless of prompt language
                });

                const reviewPrompt = `COMPANY STANDARDS:\n${contextFileContent}\n\nCODE TO REVIEW (${language}):\n${chunk}\n\nReturn JSON:`;
                
                const result = await session.prompt(reviewPrompt, { signal: this.abortController.signal });
                const issues = this._extractJSON(result);
                if (Array.isArray(issues)) allIssues.push(...issues);
                
                session.destroy();
                if (lines.length <= chunkSize) break;
            }

            return this._deduplicate(allIssues);
        } catch (error) {
            if (error.name === 'AbortError') return [];
            console.error("AI Review failed:", error);
            return [];
        }
    }

    _extractJSON(text) {
        if (!text) return null;
        
        // Find the array boundaries
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        
        if (start === -1 || end === -1 || end <= start) return null;

        let jsonStr = text.substring(start, end + 1).trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            try {
                // Common repairs
                let repaired = jsonStr
                    .replace(/[\u0000-\u001F]+/g, " ") // Control chars
                    .replace(/"`"/g, '"`')             // AI quote error
                    .replace(/\}\s*\{/g, '}, {')       // Missing commas
                    .replace(/\n/g, " ");              // Line breaks inside strings
                
                return JSON.parse(repaired);
            } catch (inner) {
                console.warn("JSON Parse Error:", inner, "Raw text:", text);
                return null;
            }
        }
    }

    _deduplicate(issues) {
        const seen = new Set();
        return issues.filter(issue => {
            const key = `${issue.line}-${issue.problem}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => {
            const order = { critical: 0, medium: 1, low: 2 };
            return (order[a.severity] || 3) - (order[b.severity] || 3) || a.line - b.line;
        });
    }

    abort() { this.abortController?.abort(); }
}
