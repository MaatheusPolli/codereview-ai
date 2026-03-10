import { AIService } from './services/aiService.js';
import { RegexService } from './services/regexService.js';
import { ContextService } from './services/contextService.js';
import { LanguageDetectorService } from './services/languageDetectorService.js';
import { HistoryService } from './services/historyService.js';
import { View } from './views/view.js';
import { ReviewController } from './controllers/reviewController.js';

(async function main() {
    // Initialize services and view
    const aiService = new AIService();
    const regexService = new RegexService();
    const contextService = new ContextService();
    const languageDetectorService = new LanguageDetectorService();
    const historyService = new HistoryService();
    const view = new View();
    
    // Check requirements
    const errors = await aiService.checkRequirements();
    if (errors) {
        view.showError(errors);
        // Continue but show errors in result panel
    }

    // Initialize controller and setup event listeners
    const controller = new ReviewController(
        aiService, 
        regexService, 
        contextService, 
        languageDetectorService, 
        historyService,
        view
    );
    controller.setupEventListeners();

    console.log('CodeReview AI initialized successfully');
})();
