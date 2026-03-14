export class View {
    constructor() {
        this.elements = {
            codeEditor: document.getElementById('code-editor'),
            languageSelector: document.getElementById('language-selector'),
            senioritySelector: document.getElementById('seniority-selector'),
            reviewButton: document.getElementById('review-button'),
            fileInput: document.getElementById('file-input'),
            fileUploadBtn: document.getElementById('file-upload-btn'),
            editorContainer: document.querySelector('.editor-container'),
            resultsContainer: document.getElementById('results-container'),
            exportBtn: document.getElementById('export-btn'),
            exportPdfBtn: document.getElementById('export-pdf-btn'),
            filtersContainer: document.getElementById('filters-container'),
            filterPills: document.querySelectorAll('.filter-pill'),
            highlighting: document.getElementById('highlighting'),
            highlightingContent: document.getElementById('highlighting-content'),
            lineNumbers: document.getElementById('line-numbers'),
            minimap: document.getElementById('minimap'),
            minimapContent: document.getElementById('minimap-content'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            analyticsContainer: document.getElementById('analytics-container'),
            historyContainer: document.getElementById('history-container'),
            settingsLanguageSelector: document.getElementById('settings-language-selector'),
            customContextEditor: document.getElementById('custom-context-editor'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            resultsLanguageSelector: document.getElementById('results-language-selector')
        };
        this.currentResults = [];
        this._initEditorSync();
        this._initLanguageListener();
        this._initTabs();
        this._initDragAndDrop();
        this._initTheme();
        this._initResultsLanguage();
    }

    _initResultsLanguage() {
        const savedLang = localStorage.getItem('resultsLanguage') || 'pt';
        this.elements.resultsLanguageSelector.value = savedLang;

        this.elements.resultsLanguageSelector.addEventListener('change', (e) => {
            localStorage.setItem('resultsLanguage', e.target.value);
        });
    }

    getResultsLanguage() {
        return this.elements.resultsLanguageSelector.value;
    }

    _initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        this.elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    _initDragAndDrop() {
        const { editorContainer } = this.elements;

        editorContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editorContainer.classList.add('drag-over');
        });

        editorContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editorContainer.classList.remove('drag-over');
        });

        editorContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editorContainer.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                // Trigger the same callback as file input
                const event = { target: { files: files } };
                this._fileChangeCallback?.(event);
            }
        });
    }

    _initTabs() {
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Initialize Filter Listeners
        this.elements.filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.elements.filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this._applySeverityFilter(pill.getAttribute('data-severity'));
            });
        });
    }

    _applySeverityFilter(severity) {
        const cards = this.elements.resultsContainer.querySelectorAll('.issue-card');
        cards.forEach(card => {
            if (severity === 'all' || card.classList.contains(severity)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    _updateFilterCounts(issues) {
        const counts = issues.reduce((acc, curr) => {
            acc[curr.severity] = (acc[curr.severity] || 0) + 1;
            acc.all++;
            return acc;
        }, { all: 0, critical: 0, medium: 0, low: 0 });

        this.elements.filterPills.forEach(pill => {
            const sev = pill.getAttribute('data-severity');
            const countEl = pill.querySelector('.count');
            if (countEl) countEl.textContent = counts[sev] || 0;
        });

        this.elements.filtersContainer.style.display = issues.length > 0 ? 'flex' : 'none';
    }

    switchTab(tabName) {
        this.elements.tabBtns.forEach(b => b.classList.remove('active'));
        this.elements.tabContents.forEach(c => c.classList.remove('active'));

        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Special trigger for history tab
        if (tabName === 'history') {
            this.dispatchEvent('historyTabOpened');
        }
        // Special trigger for settings tab
        if (tabName === 'settings') {
            this.dispatchEvent('settingsTabOpened');
        }
    }

    onApplyFix(callback) {
        window.addEventListener('applyFix', (e) => callback(e.detail));
    }

    applyCodeFix(issue) {
        const code = this.elements.codeEditor.value;
        const lines = code.split('\n');
        const { line: lineNum, originalLine, suggestion } = issue;
        
        let targetIndex = lineNum - 1;

        // 1. Anchor Check: If originalLine is provided, try to find it
        if (originalLine) {
            const cleanOriginal = originalLine.split('\n')[0].trim(); // Take first line if AI sends multiple
            
            // Check if current line matches
            if (lines[targetIndex]?.trim() !== cleanOriginal) {
                // Search nearby first (+/- 20 lines)
                let found = false;
                for (let i = Math.max(0, targetIndex - 20); i < Math.min(lines.length, targetIndex + 20); i++) {
                    if (lines[i].trim().includes(cleanOriginal) || cleanOriginal.includes(lines[i].trim())) {
                        targetIndex = i;
                        found = true;
                        break;
                    }
                }

                // Global search as last resort
                if (!found) {
                    const globalIndex = lines.findIndex(l => l.trim().includes(cleanOriginal));
                    if (globalIndex !== -1) targetIndex = globalIndex;
                }
            }
        }

        if (targetIndex < 0 || targetIndex >= lines.length) return false;

        // 2. Extract clean code from suggestion
        let newCodeSnippet = suggestion || "";
        if (!newCodeSnippet) return false;

        const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/;
        const inlineCodeRegex = /`([^`]+)`/;
        
        const blockMatch = suggestion.match(codeBlockRegex);
        const inlineMatch = suggestion.match(inlineCodeRegex);
        
        if (blockMatch) {
            newCodeSnippet = blockMatch[1].trim();
        } else if (inlineMatch) {
            newCodeSnippet = inlineMatch[1].trim();
        }

        // 3. Preserve original indentation
        const originalTextLine = lines[targetIndex];
        const indentationMatch = originalTextLine.match(/^(\s*)/);
        const indentation = indentationMatch ? indentationMatch[0] : "";

        // 4. Apply fix (handling multi-line suggestions)
        const fixLines = newCodeSnippet.split('\n').map((l, i) => {
            // Apply indentation to subsequent lines of the fix
            return (i > 0 && !l.startsWith(' ')) ? indentation + l : l;
        });

        // Replace one line with N lines
        lines.splice(targetIndex, 1, ...fixLines);

        this.setCode(lines.join('\n'));
        return true;
    }

    dispatchEvent(name) {
        const event = new CustomEvent(name);
        window.dispatchEvent(event);
    }

    renderAnalytics(analytics) {
        this.elements.analyticsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${analytics.totalReviews}</div>
                <div class="stat-label">Total Reviews</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--critical)">${analytics.severityStats.critical}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--medium)">${analytics.severityStats.medium}</div>
                <div class="stat-label">Medium Issues</div>
            </div>
        `;
    }

    renderHistory(history) {
        this.elements.historyContainer.innerHTML = '';
        if (history.length === 0) {
            this.elements.historyContainer.innerHTML = '<p class="empty-state">No history found.</p>';
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info">
                    <span class="history-filename">${item.filename}</span>
                    <span class="history-meta">${item.language} • ${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-badges">
                    <span class="severity-badge critical">${item.issueCount.critical}</span>
                    <span class="severity-badge medium">${item.issueCount.medium}</span>
                </div>
            `;
            this.elements.historyContainer.appendChild(div);
        });
    }

    onSettingsTabOpened(callback) {
        window.addEventListener('settingsTabOpened', callback);
    }

    onHistoryTabOpened(callback) {
        window.addEventListener('historyTabOpened', callback);
    }

    onSaveSettings(callback) {
        this.elements.saveSettingsBtn.addEventListener('click', () => {
            const language = this.elements.settingsLanguageSelector.value;
            const content = this.elements.customContextEditor.value;
            callback(language, content);
        });
    }

    onSettingsLanguageChange(callback) {
        this.elements.settingsLanguageSelector.addEventListener('change', (e) => {
            callback(e.target.value);
        });
    }

    setCustomContextValue(content) {
        this.elements.customContextEditor.value = content;
    }

    _initLanguageListener() {
        this.elements.languageSelector.addEventListener('change', () => {
            this.updateHighlight();
        });
    }

    _initEditorSync() {
        const { codeEditor, highlighting, lineNumbers, minimap } = this.elements;

        const syncScroll = () => {
            highlighting.scrollTop = codeEditor.scrollTop;
            highlighting.scrollLeft = codeEditor.scrollLeft;
            lineNumbers.scrollTop = codeEditor.scrollTop;
            
            // Minimap scrolls proportionally (slower than main editor)
            const scrollPercent = codeEditor.scrollTop / (codeEditor.scrollHeight - codeEditor.clientHeight);
            minimap.scrollTop = scrollPercent * (minimap.scrollHeight - minimap.clientHeight);
        };

        codeEditor.addEventListener('input', () => {
            this.updateHighlight();
            syncScroll();
            this._updateActiveLine();
        });

        codeEditor.addEventListener('scroll', syncScroll);

        // Add listeners for cursor movement
        codeEditor.addEventListener('click', () => this._updateActiveLine());
        codeEditor.addEventListener('keyup', () => this._updateActiveLine());
        codeEditor.addEventListener('focus', () => this._updateActiveLine());
    }

    _updateActiveLine() {
        const { codeEditor, lineNumbers } = this.elements;
        const code = codeEditor.value;
        const cursorPosition = codeEditor.selectionStart;
        
        // Calculate current line index
        const lineIndex = code.substr(0, cursorPosition).split("\n").length - 1;

        // Remove old active class
        const prevActive = lineNumbers.querySelector('.active-line');
        if (prevActive) prevActive.classList.remove('active-line');

        // Add new active class
        const currentLineElement = lineNumbers.children[lineIndex];
        if (currentLineElement) {
            currentLineElement.classList.add('active-line');
        }
    }

    updateHighlight() {
        const { codeEditor, highlightingContent, languageSelector, lineNumbers, minimapContent } = this.elements;
        let code = codeEditor.value;

        // Update Line Numbers
        const lines = code.split('\n');
        lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');

        // Update Minimap
        minimapContent.textContent = code;

        // Ensure there's a character at the end for proper scrolling/highlighting of empty lines
        if (code[code.length - 1] === "\n") code += " ";

        highlightingContent.textContent = code;
        highlightingContent.className = `language-${languageSelector.value}`;

        // @ts-ignore
        if (window.Prism) {
            window.Prism.highlightElement(highlightingContent);
        }
    }

    getCode() {
        return this.elements.codeEditor.value;
    }

    getLanguage() {
        return this.elements.languageSelector.value;
    }

    getSeniority() {
        return this.elements.senioritySelector.value;
    }

    setCode(code) {
        this.elements.codeEditor.value = code;
        this.updateHighlight();
    }

    setLanguage(language) {
        this.elements.languageSelector.value = language;
        this.updateHighlight();
    }

    triggerFileInput() {
        this.elements.fileInput.click();
    }

    onFileChange(callback) {
        this._fileChangeCallback = callback;
        this.elements.fileInput.addEventListener('change', callback);
    }

    onFileButtonClick(callback) {
        this.elements.fileUploadBtn.addEventListener('click', callback);
    }

    onReviewSubmit(callback) {
        this.elements.reviewButton.addEventListener('click', callback);
    }

    onExportClick(callback) {
        this.elements.exportBtn.addEventListener('click', callback);
    }

    setReviewButtonLoading(isLoading) {
        if (isLoading) {
            this.elements.reviewButton.disabled = true;
            this.elements.reviewButton.innerHTML = `<span class="loading-spinner"></span> Reviewing...`;
        } else {
            this.elements.reviewButton.disabled = false;
            this.elements.reviewButton.innerHTML = `🚀 Review Code`;
        }
    }

    clearResults() {
        this.currentResults = [];
        this.elements.resultsContainer.innerHTML = '';
        this.elements.exportBtn.disabled = true;
        this.elements.exportPdfBtn.disabled = true;
        this._updateFilterCounts([]);
    }

    renderResults(issues) {
        this.currentResults = issues;
        this.elements.resultsContainer.innerHTML = '';
        this._updateFilterCounts(issues);

        if (issues.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>✅ No issues found! Your code looks great.</p>
                </div>
            `;
            this.elements.exportBtn.disabled = true;
            this.elements.exportPdfBtn.disabled = true;
            return;
        }

        issues.forEach(issue => {
            const card = document.createElement('div');
            card.className = `issue-card ${issue.severity || 'low'}`;
            
            // Safe access to properties to avoid 'undefined' on screen
            const category = issue.category || 'Issue';
            const severity = issue.severity || 'low';
            const problem = issue.problem || 'Potential issue detected.';
            const suggestion = issue.suggestion || '';
            const line = issue.line || '?';

            const parsedSuggestion = this._parseMarkdown(suggestion);

            card.innerHTML = `
                <div class="issue-header">
                    <span class="issue-category">${category}</span>
                    <span class="severity-badge ${severity}">${severity}</span>
                </div>
                <div class="issue-problem">${problem}</div>
                <div class="issue-suggestion">
                    <strong>Suggestion:</strong> 
                    <div class="suggestion-content">${parsedSuggestion}</div>
                </div>
                <div class="issue-footer">
                    <span class="issue-line">Line ${line}</span>
                    <button class="btn btn-sm btn-fix">🛠️ Apply Fix</button>
                </div>
            `;

            const fixBtn = card.querySelector('.btn-fix');
            fixBtn.addEventListener('click', () => {
                const success = this.applyCodeFix(issue);
                if (success) {
                    // Notify controller that code changed and we need a clean state
                    const event = new CustomEvent('fixApplied');
                    window.dispatchEvent(event);
                }
            });

            this.elements.resultsContainer.appendChild(card);
        });

        // Trigger Prism highlighting for new code blocks
        // @ts-ignore
        if (window.Prism) {
            window.Prism.highlightAllUnder(this.elements.resultsContainer);
        }

        this.elements.exportBtn.disabled = false;
        this.elements.exportPdfBtn.disabled = false;
    }

    onExportPdfClick(callback) {
        this.elements.exportPdfBtn.addEventListener('click', callback);
    }

    _parseMarkdown(text) {
        if (!text) return "";
        
        // Escape HTML
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Code blocks: ```language ... ```
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const languageClass = lang ? `language-${lang}` : 'language-none';
            return `<pre class="${languageClass}"><code>${code.trim()}</code></pre>`;
        });

        // Inline code: `...`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold: **...**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        return html;
    }

    getResults() {
        return this.currentResults;
    }

    showError(errors) {
        this.elements.resultsContainer.innerHTML = '';
        errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error;
            this.elements.resultsContainer.appendChild(errorDiv);
        });
    }
}
