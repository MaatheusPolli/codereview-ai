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

        this.view.onExportPdfClick(() => {
            this.handleExportPdf();
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

        // Quick Fix event
        window.addEventListener('fixApplied', () => {
            this.handleReview();
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

    handleExportPdf() {
        const results = this.view.getResults();
        if (!results || results.length === 0) return;

        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const fileName = this.currentFileName || 'Pasted Code';
        const date = new Date().toLocaleString();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(40, 44, 52);
        doc.text('Code Review Report', 14, 22);

        // Meta Info
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`File: ${fileName}`, 14, 30);
        doc.text(`Date: ${date}`, 14, 35);

        // Summary Statistics
        const stats = results.reduce((acc, curr) => {
            acc[curr.severity] = (acc[curr.severity] || 0) + 1;
            return acc;
        }, { critical: 0, medium: 0, low: 0 });

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Summary:', 14, 45);
        
        doc.setFontSize(10);
        doc.setTextColor(220, 53, 69); // Red
        doc.text(`Critical: ${stats.critical}`, 14, 52);
        doc.setTextColor(255, 193, 7); // Yellow
        doc.text(`Medium: ${stats.medium}`, 40, 52);
        doc.setTextColor(40, 167, 69); // Green
        doc.text(`Low: ${stats.low}`, 65, 52);

        // Table Data
        const tableBody = results.map(issue => [
            issue.line.toString(),
            issue.severity.toUpperCase(),
            issue.category,
            issue.problem
        ]);

        // @ts-ignore
        doc.autoTable({
            startY: 60,
            head: [['Line', 'Severity', 'Category', 'Problem']],
            body: tableBody,
            headStyles: { fillStyle: 'f3f4f6', textColor: [31, 41, 55], fontStyle: 'bold' },
            columnStyles: {
                1: { fontStyle: 'bold' } // Severity column
            },
            didParseCell: function(data) {
                if (data.column.index === 1 && data.section === 'body') {
                    const sev = data.cell.raw;
                    if (sev === 'CRITICAL') data.cell.styles.textColor = [220, 53, 69];
                    if (sev === 'MEDIUM') data.cell.styles.textColor = [180, 140, 0];
                    if (sev === 'LOW') data.cell.styles.textColor = [40, 167, 69];
                }
            }
        });

        // Add suggestions as a secondary list if space allows or in new pages
        let currentY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Detailed Suggestions:', 14, currentY);
        currentY += 10;

        results.forEach((issue, index) => {
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Issue #${index + 1} (Line ${issue.line}):`, 14, currentY);
            currentY += 5;
            doc.setFont(undefined, 'normal');
            
            // Clean markdown for PDF
            const cleanSuggestion = issue.suggestion.replace(/```[\s\S]*?```/g, (match) => {
                return match.replace(/```(?:\w+)?\n?|```/g, '');
            }).replace(/`([^`]+)`/g, '$1');

            const splitSuggestion = doc.splitTextToSize(cleanSuggestion, 180);
            doc.text(splitSuggestion, 14, currentY);
            currentY += (splitSuggestion.length * 5) + 5;
        });

        doc.save(`review-report-${Date.now()}.pdf`);
    }

    toggleLoading(isLoading) {
        this.isReviewing = isLoading;
        this.view.setReviewButtonLoading(isLoading);
    }
}
