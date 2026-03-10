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
        if (!isChrome) {
            errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary (versão recente).");
        }

        const modelFactory = window.ai?.languageModel || self.LanguageModel;

        if (!modelFactory) {
            errors.push("⚠️ As APIs nativas de IA não estão ativas.");
            errors.push("Ative as seguintes flags em chrome://flags/:");
            errors.push("- Prompt API for Gemini Nano");
            errors.push("- Enabling optimization guide on-device model -> BypassPrefRequirement");
            return errors;
        }

        try {
            const availability = await modelFactory.availability();
            if (availability === 'no') {
                errors.push(`⚠️ O seu dispositivo não suporta modelos de linguagem nativos de IA.`);
            }

            if (availability === 'after-download') {
                errors.push(`⚠️ O modelo de linguagem de IA está sendo baixado. Recarregue a página em alguns instantes.`);
                await modelFactory.create(); // Trigger download
            }
        } catch (e) {
             console.warn("Error checking AI availability:", e);
        }

        return errors.length > 0 ? errors : null;
    }

    async reviewCode(code, language, contextFileContent) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        const systemPrompt = `You are a senior code reviewer (15+ years exp).
                            Review code strictly against provided standards.
                            Respond ONLY with a JSON array of issues. No conversational text.`;

        const lines = code.split('\n');
        const chunkSize = 300;
        const overlap = 30;
        let allIssues = [];

        for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
            const chunk = lines.slice(i, i + chunkSize).join('\n');
            const issues = await this._reviewChunk(chunk, language, contextFileContent, systemPrompt);
            allIssues = [...allIssues, ...issues];
            if (lines.length <= chunkSize) break;
        }

        return this._deduplicate(allIssues);
    }

    async _reviewChunk(codeChunk, language, contextFileContent, systemPrompt) {
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts <= maxAttempts) {
            try {
                if (this.session) this.session.destroy();
                const modelFactory = window.ai?.languageModel || self.LanguageModel;
                this.session = await modelFactory.create({ systemPrompt });

                const reviewPrompt = `COMPANY STANDARDS:
                                    ${contextFileContent}

                                    CODE TO REVIEW (${language}):
                                    ${codeChunk}

                                    Return a JSON array of issues. Use Markdown in "suggestion".
                                    [
                                    {
                                        "line": <number>,
                                        "severity": "critical|medium|low",
                                        "category": "Bugs|Security|Performance|Standards|Readability",
                                        "problem": "<description>",
                                        "suggestion": "<markdown fix>"
                                    }
                                    ]`;

                const result = await this.session.prompt(reviewPrompt, {
                    signal: this.abortController.signal
                });

                const issues = this._extractJSON(result);
                if (Array.isArray(issues)) return issues;
                
                throw new Error("Invalid format");
            } catch (error) {
                if (error.name === 'AbortError') return [];
                attempts++;
                if (attempts > maxAttempts) return [];
                await new Promise(r => setTimeout(r, 500));
            } finally {
                if (this.session) {
                    this.session.destroy();
                    this.session = null;
                }
            }
        }
        return [];
    }

    _extractJSON(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                try {
                    return JSON.parse(text.substring(start, end + 1));
                } catch (inner) {
                    console.warn("JSON extraction failed:", inner);
                }
            }
        }
        return null;
    }

    _deduplicate(issues) {
        const seen = new Set();
        return issues.filter(issue => {
            const key = `${issue.line}-${issue.category}-${issue.problem}`;
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
