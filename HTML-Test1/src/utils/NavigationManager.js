/**
 * NavigationManager.js
 * Centralized utility for managing navigation across the application
 * Ensures consistent behavior between admin and user views
 */

class NavigationManager {
    constructor() {
        this.eventListeners = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the navigation manager with current app state
     * @param {Array} pages - Available pages
     * @param {boolean} isPreviewMode - Whether the app is in preview mode
     * @param {Function} onNavigate - Callback for navigation events
     */
    initialize(pages = [], isPreviewMode = false, onNavigate) {
        if (!Array.isArray(pages)) {
            console.error('NavigationManager: pages must be an array');
            return;
        }

        // Set global window functions
        window.isPreviewMode = isPreviewMode;
        
        // Create a clean implementation of getAvailablePages
        window.getAvailablePages = () => {
            // Return a clean copy with just necessary data
            return pages.map(p => ({ id: p.id, name: p.name }));
        };
        
        // Create a unified navigation function
        window.navigateToPage = (pageId) => {
            if (!pageId) {
                console.error('NavigationManager: pageId is required');
                return;
            }
            
            // Validate page exists
            if (!pages.some(p => p.id === pageId)) {
                console.error(`NavigationManager: page '${pageId}' not found`);
                return;
            }
            
            console.log(`NavigationManager: navigating to ${pageId}`);
            
            // Store the current page
            localStorage.setItem('currentPage', pageId);
            
            // Dispatch navigation event for iframe communication
            const event = new CustomEvent('navigationRequested', { 
                detail: { pageId } 
            });
            window.dispatchEvent(event);
            
            // Call the onNavigate callback
            if (typeof onNavigate === 'function') {
                onNavigate(pageId);
            }
        };
        
        // Set up event listener for navigation events
        this._setupEventListeners(onNavigate);
        
        this.isInitialized = true;
        console.log('NavigationManager: initialized');
    }
    
    /**
     * Set up event listeners for navigation events
     * @private
     */
    _setupEventListeners(onNavigate) {
        // Clean up any existing listeners
        this.cleanup();
        
        // Handler for navigation events
        const navigationHandler = (e) => {
            const pageId = e.detail?.pageId;
            if (pageId && typeof onNavigate === 'function') {
                onNavigate(pageId);
            }
        };
        
        // Store reference to the listener for cleanup
        this.eventListeners.navigation = navigationHandler;
        
        // Add event listener
        window.addEventListener('navigationRequested', navigationHandler);
    }
    
    /**
     * Update the navigation state with new pages or mode
     */
    update(pages, isPreviewMode, onNavigate) {
        // Reinitialize with new data
        this.initialize(pages, isPreviewMode, onNavigate);
    }
    
    /**
     * Clean up all event listeners and references
     */
    cleanup() {
        // Remove event listeners
        if (this.eventListeners.navigation) {
            window.removeEventListener('navigationRequested', this.eventListeners.navigation);
            delete this.eventListeners.navigation;
        }
        
        this.isInitialized = false;
        console.log('NavigationManager: cleaned up');
    }
}

// Export singleton instance
export default new NavigationManager(); 