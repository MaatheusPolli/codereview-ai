export class LanguageDetectorService {
    constructor() {
        this.extensionMap = {
            'pas': 'pascal',
            'pp': 'pascal',
            'js': 'javascript',
            'ts': 'javascript',
            'sql': 'sql',
            'xml': 'xml',
            'config': 'xml'
        };
    }

    async detect(fileName, content) {
        // 1. Detect by extension (Highest confidence)
        const ext = fileName.split('.').pop().toLowerCase();
        if (this.extensionMap[ext]) {
            return this.extensionMap[ext];
        }

        // 2. Heuristic detection by content patterns
        const snippet = content.slice(0, 2000);
        
        if (/\b(procedure|function|begin|end\.|interface|implementation|unit)\b/i.test(snippet)) {
            return 'pascal';
        }
        
        if (/\b(SELECT|FROM|WHERE|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE)\b/i.test(snippet)) {
            return 'sql';
        }
        
        if (/\b(const|let|var|function|async|await|import|export|=>)\b/.test(snippet)) {
            return 'javascript';
        }
        
        if (/<[\s\S]*?>/.test(snippet) && (snippet.includes('<?xml') || snippet.includes('xmlns'))) {
            return 'xml';
        }

        // 3. Chrome Native Language Detection API (Horizon 1 - fallback)
        // Note: This is mainly for natural languages, but we use it as an extra signal
        const detectorFactory = window.ai?.languageDetector || self.LanguageDetector;
        if (detectorFactory) {
            try {
                const capabilities = await detectorFactory.capabilities();
                if (capabilities.available !== 'no') {
                    const detector = await detectorFactory.create();
                    const results = await detector.detect(content.slice(0, 1000));
                    if (results.length > 0) {
                        console.log('Native Language Detection:', results[0]);
                        // If it detects something very strongly that is not code, we might just default to javascript
                    }
                }
            } catch (e) {
                console.warn('Native Language Detection failed:', e);
            }
        }

        return 'javascript'; // Default
    }
}
