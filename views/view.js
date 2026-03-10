export class View {
    constructor() {
        this.elements = {
            codeEditor: document.getElementById('code-editor'),
            languageSelector: document.getElementById('language-selector'),
            reviewButton: document.getElementById('review-button'),
            fileInput: document.getElementById('file-input'),
            fileUploadBtn: document.getElementById('file-upload-btn'),
            resultsContainer: document.getElementById('results-container'),
            exportBtn: document.getElementById('export-btn'),
            highlighting: document.getElementById('highlighting'),
            highlightingContent: document.getElementById('highlighting-content'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            analyticsContainer: document.getElementById('analytics-container'),
            historyContainer: document.getElementById('history-container'),
            settingsLanguageSelector: document.getElementById('settings-language-selector'),
            customContextEditor: document.getElementById('custom-context-editor'),
            saveSettingsBtn: document.getElementById('save-settings-btn')
        };
        this.currentResults = [];
        this._initEditorSync();
        this._initLanguageListener();
        this._initTabs();
    }

    _initTabs() {
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
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
        const { codeEditor, highlighting, highlightingContent } = this.elements;

        const syncScroll = () => {
            highlighting.scrollTop = codeEditor.scrollTop;
            highlighting.scrollLeft = codeEditor.scrollLeft;
        };

        codeEditor.addEventListener('input', () => {
            this.updateHighlight();
            syncScroll();
        });

        codeEditor.addEventListener('scroll', syncScroll);
    }

    updateHighlight() {
        const { codeEditor, highlightingContent, languageSelector } = this.elements;
        let code = codeEditor.value;

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
    }

    renderResults(issues) {
        this.currentResults = issues;
        this.elements.resultsContainer.innerHTML = '';

        if (issues.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>✅ No issues found! Your code looks great.</p>
                </div>
            `;
            this.elements.exportBtn.disabled = true;
            return;
        }

        issues.forEach(issue => {
            const card = document.createElement('div');
            card.className = `issue-card ${issue.severity}`;
            
            // Basic markdown-like parsing for suggestions (bold and code blocks)
            const parsedSuggestion = this._parseMarkdown(issue.suggestion);

            card.innerHTML = `
                <div class="issue-header">
                    <span class="issue-category">${issue.category}</span>
                    <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                </div>
                <div class="issue-problem">${issue.problem}</div>
                <div class="issue-suggestion">
                    <strong>Suggestion:</strong> 
                    <div class="suggestion-content">${parsedSuggestion}</div>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                    <span class="issue-line">Line ${issue.line}</span>
                </div>
            `;
            this.elements.resultsContainer.appendChild(card);
        });

        // Trigger Prism highlighting for new code blocks
        // @ts-ignore
        if (window.Prism) {
            window.Prism.highlightAllUnder(this.elements.resultsContainer);
        }

        this.elements.exportBtn.disabled = false;
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
