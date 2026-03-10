import { expect, describe, it } from '../testRunner.js';
import { RegexService } from '../../services/regexService.js';

const regexService = new RegexService();

describe('RegexService - Pascal', async () => {
    it('should detect empty except block', async () => {
        const code = `
        try
            DoSomething;
        except
        end;
        `;
        const result = regexService.run(code, 'pascal');
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('Bugs');
    });

    it('should detect SQL Injection pattern', async () => {
        const code = `Query.SQL.Text := 'SELECT * FROM Users WHERE Name = ' + Edit1.Text;`;
        const result = regexService.run(code, 'pascal');
        expect(result.length).toBe(1);
        expect(result[0].severity).toBe('critical');
    });
});

describe('RegexService - JavaScript', async () => {
    it('should detect console.log', async () => {
        const code = `console.log("Debug info");`;
        const result = regexService.run(code, 'javascript');
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('Standards');
    });

    it('should detect loose equality', async () => {
        const code = `if (a == b) {}`;
        const result = regexService.run(code, 'javascript');
        expect(result.length).toBe(1);
        expect(result[0].problem).toBe('Use === instead of == for strict equality');
    });
});

describe('RegexService - SQL', async () => {
    it('should detect SELECT *', async () => {
        const code = `SELECT * FROM Customers`;
        const result = regexService.run(code, 'sql');
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('Performance');
    });

    it('should detect DELETE without WHERE', async () => {
        const code = `DELETE FROM Users`;
        const result = regexService.run(code, 'sql');
        expect(result.length).toBe(1);
        expect(result[0].severity).toBe('critical');
    });
});
