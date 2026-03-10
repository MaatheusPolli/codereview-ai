import { expect, describe, it } from '../testRunner.js';
import { AIService } from '../../services/aiService.js';

const aiService = new AIService();

describe('AIService', async () => {
    it('should pass requirements check with mock environment', async () => {
        const errors = await aiService.checkRequirements();
        // Since we mocked window.chrome and window.ai, it should be null (no errors)
        expect(errors).toBe(null);
    });

    it('should review code and parse JSON response', async () => {
        const mockCode = `function test() { console.log('test'); }`;
        const mockContext = `# Rules\nNo console.log`;
        
        const results = await aiService.reviewCode(mockCode, 'javascript', mockContext);
        
        // Our mock returns a specific critical bug when prompt contains 'COMPANY STANDARDS'
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].category).toBe('Bugs');
        expect(results[0].severity).toBe('critical');
    });

    it('should deduplicate issues', async () => {
        const issues = [
            { line: 1, severity: 'medium', category: 'Standards', problem: 'A' },
            { line: 1, severity: 'medium', category: 'Standards', problem: 'A' }, // Duplicate
            { line: 2, severity: 'critical', category: 'Bugs', problem: 'B' }
        ];

        const deduped = aiService._deduplicate(issues);
        expect(deduped.length).toBe(2);
        // Critical should come first
        expect(deduped[0].severity).toBe('critical');
    });
});
