// CodeReview AI - Simple Test Runner
// @license MIT 2025 Matheus Gasparotto Polli

const tests = [];
let passed = 0;
let failed = 0;

export const expect = (actual) => ({
    toBe: (expected) => {
        if (actual !== expected) throw new Error(`Expected ${expected}, but got ${actual}`);
    },
    toBeGreaterThan: (expected) => {
        if (!(actual > expected)) throw new Error(`Expected ${actual} to be greater than ${expected}`);
    },
    toBeTruthy: () => {
        if (!actual) throw new Error(`Expected ${actual} to be truthy`);
    }
});

export const describe = (name, fn) => {
    tests.push({ type: 'suite', name, fn });
};

export const it = (name, fn) => {
    tests.push({ type: 'test', name, fn });
};

// Senior Mock Environment
window.ai = {
    languageModel: {
        availability: async () => 'available',
        create: async () => ({
            prompt: async (text) => {
                if (text.includes('CODE TO REVIEW')) {
                    return JSON.stringify([{
                        line: 1,
                        severity: 'critical',
                        category: 'Bugs',
                        problem: 'Mock Issue',
                        suggestion: 'Fix it'
                    }]);
                }
                return '[]';
            },
            destroy: () => {}
        }),
        capabilities: async () => ({ available: 'readily' })
    },
    languageDetector: {
        capabilities: async () => ({ available: 'readily' }),
        create: async () => ({
            detect: async () => [{ detectedLanguage: 'en', confidence: 0.9 }]
        })
    }
};

async function run() {
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.innerHTML = '';
    passed = 0;
    failed = 0;

    for (const item of tests) {
        if (item.type === 'suite') {
            const suiteDiv = document.createElement('div');
            suiteDiv.className = 'test-group';
            suiteDiv.innerHTML = `<div class="group-header">${item.name}</div>`;
            resultsDiv.appendChild(suiteDiv);

            const suiteTests = [];
            const originalIt = window.it;
            window.it = (name, fn) => suiteTests.push({ name, fn });
            await item.fn();
            window.it = originalIt;

            for (const t of suiteTests) {
                const testDiv = document.createElement('div');
                testDiv.className = 'test-case';
                try {
                    await t.fn();
                    testDiv.innerHTML = `<span>${t.name}</span> <span class="status pass">PASS</span>`;
                    passed++;
                } catch (e) {
                    testDiv.innerHTML = `<div><span>${t.name}</span> <span class="error-msg">${e.message}</span></div> <span class="status fail">FAIL</span>`;
                    failed++;
                }
                suiteDiv.appendChild(testDiv);
            }
        }
    }

    document.getElementById('passed-count').textContent = passed;
    document.getElementById('failed-count').textContent = failed;
    const statusEl = document.getElementById('total-status');
    statusEl.textContent = failed === 0 ? 'All Systems Go' : 'Issues Found';
    statusEl.style.color = failed === 0 ? '#10b981' : '#ef4444';
}

window.describe = describe;
window.it = it;

import './unit/complete_suite.test.js';
import './unit/new_features.test.js';
document.getElementById('run-btn').addEventListener('click', run);
