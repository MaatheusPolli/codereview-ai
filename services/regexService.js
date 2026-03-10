/**
 * CodeReview AI
 * @license MIT 2025 Matheus Gasparotto Polli
 */

export class RegexService {
    constructor() {
        this.rules = {
            pascal: [
                {
                    pattern: /except\s*end/gi,
                    severity: 'critical',
                    category: 'Bugs',
                    problem: 'Empty except block — exceptions silently swallowed',
                    suggestion: 'Add logging (e.g., `TLogger.Error()`) inside the except block or re-raise the exception.'
                },
                {
                    pattern: /Query\.SQL\.(Add|Text)\s*[(:=]+\s*['"`].*\+/gi,
                    severity: 'critical',
                    category: 'Security',
                    problem: 'SQL string concatenation — SQL injection risk',
                    suggestion: 'Use parameterized queries instead of concatenating strings.'
                },
                {
                    pattern: /\bwith\b.*?\bdo\b/gi,
                    severity: 'medium',
                    category: 'Standards',
                    problem: 'Avoid `with ... do` statement — makes code hard to debug and read',
                    suggestion: 'Access object properties explicitly or use a local variable/alias.'
                }
            ],
            javascript: [
                {
                    pattern: /console\.(log|warn|error)\s*\(/g,
                    severity: 'medium',
                    category: 'Standards',
                    problem: 'console statement should not reach production',
                    suggestion: 'Remove debug logs or use a formal logging service.'
                },
                {
                    pattern: /[^=!]==[^=]/g,
                    severity: 'medium',
                    category: 'Bugs',
                    problem: 'Use === instead of == for strict equality',
                    suggestion: 'Replace `==` with `===` to avoid unexpected type coercion.'
                },
                {
                    pattern: /\bvar\b/g,
                    severity: 'medium',
                    category: 'Standards',
                    problem: 'Usage of `var` detected',
                    suggestion: 'Use `let` or `const` instead for block-scoping.'
                },
                {
                    pattern: /\beval\(/g,
                    severity: 'critical',
                    category: 'Security',
                    problem: 'Usage of `eval()` is highly dangerous',
                    suggestion: 'Refactor the logic to avoid `eval()`. Use JSON.parse() or bracket notation if possible.'
                }
            ],
            sql: [
                {
                    pattern: /SELECT\s+\*\s+FROM/gi,
                    severity: 'medium',
                    category: 'Performance',
                    problem: 'SELECT * fetches all columns — specify only needed columns',
                    suggestion: 'List only the columns required for the operation (e.g., `SELECT Id, Name FROM...`).'
                },
                {
                    pattern: /(DELETE|UPDATE)\s+\w+\s+(?!.*WHERE)/gi,
                    severity: 'critical',
                    category: 'Bugs',
                    problem: 'DELETE/UPDATE without WHERE clause — affects all rows',
                    suggestion: 'Always include a `WHERE` clause to target specific records, or use a transaction.'
                },
                {
                    pattern: /INSERT\s+INTO\s+\w+\s+VALUES\s*\(/gi,
                    severity: 'medium',
                    category: 'Standards',
                    problem: 'INSERT without explicit column names',
                    suggestion: 'Explicitly list column names: `INSERT INTO Table (Col1, Col2) VALUES (Val1, Val2)`.'
                }
            ],
            xml: [
                {
                    pattern: /(password|senha|secret|key)\s*=\s*["'][^"']+["']/gi,
                    severity: 'critical',
                    category: 'Security',
                    problem: 'Hardcoded credential in config file',
                    suggestion: 'Remove credentials from XML and use a secure environment manager.'
                },
                {
                    pattern: /(localhost|127\.0\.0\.1|192\.168\.)/g,
                    severity: 'medium',
                    category: 'Standards',
                    problem: 'Local/development URL found',
                    suggestion: 'Verify if this configuration is intended for production.'
                }
            ]
        };
    }

    run(code, language) {
        const results = [];
        const lines = code.split('\n');
        const languageRules = this.rules[language] || [];

        lines.forEach((lineText, index) => {
            const lineNumber = index + 1;
            languageRules.forEach(rule => {
                rule.pattern.lastIndex = 0;
                if (rule.pattern.test(lineText)) {
                    results.push({
                        line: lineNumber,
                        severity: rule.severity,
                        category: rule.category,
                        problem: rule.problem,
                        suggestion: rule.suggestion || 'Check the rule documentation for details.'
                    });
                }
            });
        });

        return results;
    }
}
