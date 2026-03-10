export class HistoryService {
    constructor() {
        this.dbName = 'CodeReviewDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('reviews')) {
                    db.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async saveReview(filename, language, issues, code) {
        if (!this.db) await this.init();

        // Implement retention: keep only 50 most recent
        await this._enforceRetention(50);

        const critical = issues.filter(i => i.severity === 'critical').length;
        const medium = issues.filter(i => i.severity === 'medium').length;
        const low = issues.filter(i => i.severity === 'low').length;

        const review = {
            timestamp: Date.now(),
            filename: filename || 'Pasted Code',
            language: language,
            issueCount: { critical, medium, low },
            issues: issues,
            codeSnippet: code.substring(0, 200) // first 200 chars only
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reviews'], 'readwrite');
            const store = transaction.objectStore('reviews');
            const request = store.add(review);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _enforceRetention(limit) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reviews'], 'readwrite');
            const store = transaction.objectStore('reviews');
            const countRequest = store.count();

            countRequest.onsuccess = () => {
                if (countRequest.result >= limit) {
                    // Open cursor to find the oldest (first) item
                    const cursorRequest = store.openCursor();
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            store.delete(cursor.primaryKey);
                            resolve();
                        } else {
                            resolve();
                        }
                    };
                    cursorRequest.onerror = () => reject(cursorRequest.error);
                } else {
                    resolve();
                }
            };
            countRequest.onerror = () => reject(countRequest.error);
        });
    }

    async getHistory() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['reviews'], 'readonly');
            const store = transaction.objectStore('reviews');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
            request.onerror = () => reject(request.error);
        });
    }

    async getAnalytics() {
        const history = await this.getHistory();
        
        const analytics = {
            totalReviews: history.length,
            severityStats: { critical: 0, medium: 0, low: 0 },
            languageStats: {},
            totalIssues: 0,
            timeline: history.map(h => ({
                date: new Date(h.timestamp).toLocaleDateString(),
                count: (h.issueCount.critical + h.issueCount.medium + h.issueCount.low)
            })).reverse()
        };

        history.forEach(review => {
            analytics.severityStats.critical += review.issueCount.critical;
            analytics.severityStats.medium += review.issueCount.medium;
            analytics.severityStats.low += review.issueCount.low;
            analytics.totalIssues += (review.issueCount.critical + review.issueCount.medium + review.issueCount.low);
            
            analytics.languageStats[review.language] = (analytics.languageStats[review.language] || 0) + 1;
        });

        return analytics;
    }
}
