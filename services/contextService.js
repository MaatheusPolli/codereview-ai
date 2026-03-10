export class ContextService {
    constructor() {
        this.cache = new Map();
        this.languageToFile = {
            'pascal': 'context/pascal.md',
            'javascript': 'context/javascript.md',
            'sql': 'context/sql.md',
            'xml': 'context/xml.md'
        };
    }

    async getContext(language) {
        // 1. Check localStorage for custom rules first
        const customRules = localStorage.getItem(`custom_context_${language}`);
        if (customRules) {
            return customRules;
        }

        // 2. Fallback to cache or file
        if (this.cache.has(language)) {
            return this.cache.get(language);
        }

        const fileName = this.languageToFile[language];
        if (!fileName) {
            return '';
        }

        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`Failed to load context file: ${fileName}`);
            }
            const content = await response.text();
            
            this.cache.set(language, content);
            return content;
        } catch (error) {
            console.error('Error loading context:', error);
            return '';
        }
    }

    saveCustomContext(language, content) {
        localStorage.setItem(`custom_context_${language}`, content);
        this.cache.set(language, content);
    }
}
