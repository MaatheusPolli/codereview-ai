export class ReviewController {
    constructor(aiService, regexService, contextService, languageDetectorService, historyService, view) {
        this.aiService = aiService;
        this.regexService = regexService;
        this.contextService = contextService;
        this.languageDetectorService = languageDetectorService;
        this.historyService = historyService;
        this.view = view;
        this.isReviewing = false;
        this.currentCode = '';
        this.currentFileName = '';
    }

    setupEventListeners() {
        // File input handlers
        this.view.onFileChange(async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            this.currentFileName = file.name;
            const reader = new FileReader();
            reader.onload = async (e) => {
                this.currentCode = e.target.result;
                this.view.setCode(this.currentCode);
                
                // Auto-detect language
                const language = await this.languageDetectorService.detect(this.currentFileName, this.currentCode);
                this.view.setLanguage(language);
            };
            reader.readAsText(file);
        });

        this.view.onFileButtonClick(() => {
            this.view.triggerFileInput();
        });

        // Review button handler
        this.view.onReviewSubmit(async () => {
            if (this.isReviewing) {
                this.aiService.abort();
                this.toggleLoading(false);
                return;
            }

            await this.handleReview();
        });

        // Export button handler
        this.view.onExportClick(() => {
            this.handleExport();
        });

        // Tab events
        this.view.onHistoryTabOpened(async () => {
            const analytics = await this.historyService.getAnalytics();
            const history = await this.historyService.getHistory();
            this.view.renderAnalytics(analytics);
            this.view.renderHistory(history);
        });

        this.view.onSettingsTabOpened(async () => {
            const lang = this.view.elements.settingsLanguageSelector.value;
            const context = await this.contextService.getContext(lang);
            this.view.setCustomContextValue(context);
        });

        this.view.onSaveSettings(async (lang, content) => {
            this.contextService.saveCustomContext(lang, content);
            alert(`Custom standards for ${lang} saved successfully!`);
        });

        this.view.onSettingsLanguageChange(async (lang) => {
            const context = await this.contextService.getContext(lang);
            this.view.setCustomContextValue(context);
        });
    }

    async handleReview() {
        const code = this.view.getCode();
        const language = this.view.getLanguage();

        if (!code.trim()) {
            this.view.showError(["Please provide some code to review."]);
            return;
        }

        this.toggleLoading(true);
        this.view.clearResults();

        try {
            // 1. Run Regex Engine
            const regexResults = this.regexService.run(code, language);
            
            // 2. Load Context
            const contextContent = await this.contextService.getContext(language);

            // 3. Run AI Engine
            const aiResults = await this.aiService.reviewCode(code, language, contextContent);

            // 4. Merge results
            const allIssues = this._mergeResults(regexResults, aiResults);

            // 5. Render results
            this.view.renderResults(allIssues);

            // 6. Save to history (IndexedDB)
            await this.historyService.saveReview(this.currentFileName, language, allIssues, code);

        } catch (error) {
            console.error('Error during review:', error);
            this.view.showError([`Error: ${error.message}`]);
        } finally {
            this.toggleLoading(false);
        }
    }

    _mergeResults(regexResults, aiResults) {
        const combined = [...regexResults, ...aiResults];
        // Deduplicate by line + category + problem
        const seen = new Set();
        return combined.filter(issue => {
            const key = `${issue.line}-${issue.category}-${issue.problem}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => {
            const severityOrder = { critical: 0, medium: 1, low: 2 };
            return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3) || a.line - b.line;
        });
    }

    handleExport() {
        const results = this.view.getResults();
        if (!results || results.length === 0) return;

        let markdown = `# Code Review Report\n\n`;
        markdown += `**File:** ${this.currentFileName || 'Pasted Code'}\n`;
        markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
        
        const severityIcons = { critical: '🔴', medium: '🟡', low: '🟢' };

        results.forEach(issue => {
            markdown += `### ${severityIcons[issue.severity] || ''} ${issue.severity.toUpperCase()}: ${issue.category}\n`;
            markdown += `- **Line:** ${issue.line}\n`;
            markdown += `- **Problem:** ${issue.problem}\n`;
            markdown += `- **Suggestion:** ${issue.suggestion}\n\n`;
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review-report-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    toggleLoading(isLoading) {
        this.isReviewing = isLoading;
        this.view.setReviewButtonLoading(isLoading);
    }
}
