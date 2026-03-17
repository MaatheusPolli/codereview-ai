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

    async reviewCode(code, language, contextFileContent) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        const systemPrompt = `You are an expert SENIOR Code Reviewer.
                            
                            YOUR MISSION: Identify ALL bugs, security flaws, performance issues, and architectural improvements. 
                            Be thorough, technical, and precise. Focus on Security (Injection, XSS), Memory Leaks, Scalability, and logical flaws.

                            JSON STRUCTURE REQUIREMENTS:
                            1. "line": The line number (0 if general).
                            2. "originalLine": The problematic code snippet.
                            3. "severity": "critical", "medium", or "low".
                            4. "category": A short category (e.g., "Security").
                            5. "problem": A VERY SHORT (max 10 words) title of the issue.
                            6. "suggestion": A DETAILED explanation of WHY it is an issue AND a code block showing the fix.
                            
                            STRICT RULE: The "suggestion" field must NOT be empty. 
                            
                            JSON EXAMPLE:
                            [{"line": 10, "originalLine": "arr[i] := i * 10;", "severity": "critical", "category": "Logic", "problem": "Potential array index out of bounds", "suggestion": "The loop condition 'i <= Count' may exceed 'arr' size which is fixed at 10. This will cause a memory corruption. \\n\\n \`\`\`pascal\\n if i <= 10 then arr[i] := i * 10; \\n\`\`\`"}]`;

        const lines = code.split('\n');
        const chunkSize = 250;
        const overlap = 30;
        let allIssues = [];

        try {
            for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
                const chunk = lines.slice(i, i + chunkSize).join('\n');
                
                const modelFactory = window.ai?.languageModel || self.LanguageModel;
                const session = await modelFactory.create({ 
                    systemPrompt,
                    expectedOutputLanguage: 'en'
                });

                const reviewPrompt = `LANGUAGE/CONTEXT: ${language}\nCOMPANY RULES:\n${contextFileContent}\n\nCODE TO REVIEW:\n${chunk}\n\nReview the code and return ONLY the JSON array:`;
                
                const result = await session.prompt(reviewPrompt, { signal: this.abortController.signal });
                const issues = this._extractJSON(result);
                
                if (Array.isArray(issues)) {
                    allIssues.push(...this._normalizeIssues(issues));
                }
                
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
        
        // Find the outermost structure boundaries
        const firstBracket = text.indexOf('[');
        const firstBrace = text.indexOf('{');
        
        let start = -1;
        let end = -1;
        let isArray = false;

        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            start = firstBracket;
            end = text.lastIndexOf(']');
            isArray = true;
        } else if (firstBrace !== -1) {
            start = firstBrace;
            end = text.lastIndexOf('}');
            isArray = false;
        }

        if (start === -1 || end === -1 || end <= start) return null;

        let jsonStr = text.substring(start, end + 1).trim();

        const parseAndNormalize = (str) => {
            try {
                let parsed = JSON.parse(str);
                
                // If it's a simple array, return it
                if (Array.isArray(parsed)) return parsed;

                // If it's an object, look for known array keys
                if (parsed && typeof parsed === 'object') {
                    let items = parsed.errors || parsed.issues || parsed.results || parsed.warnings || parsed.items || null;
                    
                    // If no array found but it has properties, maybe it's a single issue object or a map
                    if (!items) {
                        if (parsed.line || parsed.problem || parsed.description) return [parsed];
                        // If it's a map of categories
                        items = Object.values(parsed).find(v => Array.isArray(v));
                    }

                    if (Array.isArray(items)) {
                        // MERGE LOGIC: If recommendations are in a separate top-level array, merge them
                        const recs = parsed.recommendations || parsed.suggestions || parsed.fixes || [];
                        if (Array.isArray(recs) && recs.length > 0) {
                            return items.map((item, idx) => {
                                // If item doesn't have a suggestion, take it from the recommendations array by index
                                if (!item.suggestion && !item.recommendation && !item.fix && recs[idx]) {
                                    return { ...item, suggestion: recs[idx] };
                                }
                                return item;
                            });
                        }
                        return items;
                    }
                }
                return parsed;
            } catch (e) {
                // Try common repairs
                try {
                    let repaired = str
                        .replace(/[\u0000-\u001F]+/g, " ") // Control chars
                        .replace(/\\'/g, "'")               // Escaped single quotes
                        .replace(/\}\s*\{/g, '}, {')        // Missing commas between objects
                        .replace(/\]\s*\[/g, '], [')        // Missing commas between arrays
                        .replace(/\n/g, " ");               // Line breaks inside strings
                    
                    let parsed = JSON.parse(repaired);
                    if (!Array.isArray(parsed) && parsed !== null) {
                        return parsed.errors || parsed.issues || parsed.results || null;
                    }
                    return parsed;
                } catch (inner) {
                    return null;
                }
            }
        };

        const result = parseAndNormalize(jsonStr);
        if (result) return result;

        // Last resort: find any array
        const altStart = text.indexOf('[');
        const altEnd = text.lastIndexOf(']');
        if (altStart !== -1 && altEnd !== -1 && altEnd > altStart) {
            return parseAndNormalize(text.substring(altStart, altEnd + 1));
        }

        return null;
    }

    _normalizeIssues(issues) {
        if (!Array.isArray(issues)) return [];

        return issues.map(issue => {
            if (typeof issue === 'string') return { problem: issue, category: 'General', severity: 'medium', line: 0 };

            // 1. Identify Severity
            const sev = (issue.severity || issue.priority || issue.level || 'medium').toString().toLowerCase();
            const normalizedSeverity = sev.includes('high') || sev.includes('crit') || sev.includes('err') ? 'critical' : 
                                     sev.includes('low') || sev.includes('info') || sev.includes('warn') ? 'low' : 'medium';

            // 2. Identify Category
            const category = issue.category || issue.pattern || issue.type || issue.group || "Standards";

            // 3. Identify Problem (Aggressive Guessing)
            let problem = issue.problem || issue.description || issue.issue || issue.message || issue.reason || issue.detail || issue.desc || issue.msg || issue.info;
            
            // If still missing, look for any string property that isn't a known metadata field
            if (!problem) {
                const metadataFields = ['category', 'pattern', 'type', 'severity', 'priority', 'level', 'line', 'linha', 'column', 'coluna', 'originalLine', 'text', 'code', 'suggestion', 'recommendation', 'fix', 'solution', 'group'];
                for (const key in issue) {
                    if (!metadataFields.includes(key) && typeof issue[key] === 'string' && issue[key].length > 10) {
                        problem = issue[key];
                        break;
                    }
                }
            }

            // 4. Identify Suggestion
            let suggestion = issue.suggestion || issue.recommendation || issue.fix || issue.solution || issue.remedy || "";
            
            // 5. Fallback: If suggestion is empty but problem is long, move problem to suggestion
            if (suggestion.length === 0 && problem.length > 50) {
                suggestion = problem;
                problem = "Issue detected";
            }

            // 6. Final Safety: Force strings and trim
            problem = String(problem || "Issue detected").trim();
            suggestion = String(suggestion || "").trim();

            return {
                line: parseInt(issue.line || issue.linha || 0),
                originalLine: String(issue.originalLine || issue.text || issue.code || "").trim(),
                severity: normalizedSeverity,
                category: String(category).trim(),
                problem: problem.length > 80 ? problem.substring(0, 77) + "..." : problem,
                suggestion: suggestion
            };
        });
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
