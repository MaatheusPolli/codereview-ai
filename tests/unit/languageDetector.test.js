import { expect, describe, it } from '../testRunner.js';
import { LanguageDetectorService } from '../../services/languageDetectorService.js';

const detector = new LanguageDetectorService();

describe('LanguageDetector', async () => {
    it('should detect by extension .js', async () => {
        const lang = await detector.detect('app.js', 'content');
        expect(lang).toBe('javascript');
    });

    it('should detect by extension .pas', async () => {
        const lang = await detector.detect('unit1.pas', 'content');
        expect(lang).toBe('pascal');
    });

    it('should detect by extension .sql', async () => {
        const lang = await detector.detect('query.sql', 'content');
        expect(lang).toBe('sql');
    });

    it('should use fallback for unknown extension', async () => {
        // Our mock returns 'js' for everything
        const lang = await detector.detect('unknown.xyz', 'console.log("hello")');
        expect(lang).toBe('javascript'); 
    });
});
