import React, { useState, useCallback } from 'react';

// Move the templates to a separate file in the future for better maintainability
const SNIPPET_TEMPLATES = {
    'nav-menu': {
        name: 'Navigation Menu',
        html: `<div class="navigation-menu" style="padding: 10px; background: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div id="nav-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
            <script>
                (function() {
                    const navContainer = document.getElementById('nav-buttons');
                    
                    function createButtons() {
                        if (!navContainer) return;
                        
                        try {
                            // Get pages from parent window
                            const pages = window.parent.getAvailablePages();
                            if (!pages || !Array.isArray(pages)) return;
                            
                            // Get current page from localStorage
                            const currentPage = window.parent.localStorage.getItem('currentPage') || 'home';
                            
                            // Clear existing buttons
                            navContainer.innerHTML = '';
                            
                            // Create buttons for each page
                            pages.forEach(page => {
                                const btn = document.createElement('button');
                                btn.className = 'btn btn-outline-primary';
                                if (page.id === currentPage) {
                                    btn.classList.add('active');
                                }
                                btn.textContent = page.name;
                                btn.onclick = () => {
                                    window.parent.navigateToPage(page.id);
                                };
                                btn.style.margin = '5px';
                                navContainer.appendChild(btn);
                            });
                        } catch (error) {
                            console.error('Error creating navigation buttons:', error);
                            navContainer.innerHTML = '<div class="alert alert-danger">Failed to load navigation</div>';
                        }
                    }

                    // Create buttons initially
                    createButtons();
                    
                    // Update buttons every 2 seconds
                    setInterval(createButtons, 2000);
                })();
            </script>
        </div>`,
        defaultSize: { width: 600, height: 80 }
    },
    'nav-button': {
        name: 'Navigation Button',
        html: `<div class="nav-button-container" style="padding: 10px;">
            <button class="btn btn-primary nav-button" data-page="home" style="min-width: 120px;">
                Go to Home
            </button>
            <div class="edit-overlay" style="display: none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ddd; padding: 10px; border-radius: 4px; z-index: 1000; min-width: 200px;">
                <select class="form-select mb-2" onchange="
                    const btn = this.closest('.nav-button-container').querySelector('.nav-button');
                    btn.setAttribute('data-page', this.value);
                    btn.textContent = 'Go to ' + this.options[this.selectedIndex].text;
                ">
                </select>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="
                        const btn = this.closest('.nav-button-container').querySelector('.nav-button');
                        btn.className = 'btn btn-outline-primary nav-button';
                    ">Outline</button>
                    <button class="btn btn-primary" onclick="
                        const btn = this.closest('.nav-button-container').querySelector('.nav-button');
                        btn.className = 'btn btn-primary nav-button';
                    ">Solid</button>
                </div>
            </div>
            <script>
                (function() {
                    const container = document.currentScript.parentElement;
                    const button = container.querySelector('.nav-button');
                    const overlay = container.querySelector('.edit-overlay');
                    const select = overlay.querySelector('select');

                    // Function to populate pages in select
                    function populatePages() {
                        fetch('/api/pages')
                            .then(response => response.json())
                            .then(pages => {
                                select.innerHTML = pages.map(page => 
                                    '<option value="' + page.id + '">' + page.name + '</option>'
                                ).join('');
                                button.textContent = 'Go to ' + select.options[0].text;
                            })
                            .catch(console.error);
                    }

                    // Show edit overlay on double click (admin mode only)
                    button.addEventListener('dblclick', (e) => {
                        if (window.isPreviewMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
                        if (overlay.style.display === 'block') {
                            populatePages();
                        }
                    });

                    // Handle navigation on click
                    button.addEventListener('click', (e) => {
                        if (!window.isPreviewMode) return;
                        e.preventDefault();
                        const pageId = button.getAttribute('data-page');
                        if (pageId && window.navigateToPage) {
                            window.navigateToPage(pageId);
                        }
                    });

                    // Hide overlay when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!container.contains(e.target)) {
                            overlay.style.display = 'none';
                        }
                    });

                    // Initial setup
                    populatePages();
                })();
            </script>
        </div>`,
        defaultSize: { width: 150, height: 60 }
    },
    'blank': {
        name: 'Blank Snippet',
        html: '<div class="custom-snippet"></div>',
        defaultSize: { width: 300, height: 200 }
    },
    'globe': {
        name: '3D Globe',
        html: `<div class="globe-container" style="width: 100%; height: 100%;">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // Globe initialization code here
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.querySelector('.globe-container').appendChild(renderer.domElement);
        // ... rest of the globe code
    </script>
</div>`,
        defaultSize: { width: 600, height: 400 }
    },
    'ai-chat': {
        name: 'AI Chat',
        html: `<div class="ai-chat" data-api="mistral">
    <div class="chat-messages"></div>
    <div class="chat-input">
        <input type="text" placeholder="Ask me anything...">
        <button onclick="sendMessage()">Send</button>
    </div>
    <script>
        const apiKey = process.env.MISTRAL_API_KEY;
        async function sendMessage() {
            // AI chat implementation
        }
    </script>
</div>`,
        defaultSize: { width: 400, height: 500 }
    }
};

const SnippetManager = ({ onAddSnippet, onError }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('blank');
    const [customCode, setCustomCode] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);

    // Validate HTML code for safety and structure
    const validateHtml = useCallback((htmlCode) => {
        if (!htmlCode || typeof htmlCode !== 'string') {
            throw new Error('HTML code must be a non-empty string');
        }
        
        // Check for basic HTML validity (presence of opening/closing tags)
        if (!htmlCode.includes('>')) {
            throw new Error('Invalid HTML structure: missing tag closure');
        }
        
        // Make sure custom code has a containing element
        let formattedCode = htmlCode.trim();
        
        // Check if code has a container element
        const hasContainer = formattedCode.includes('<div') || 
            formattedCode.includes('<section') || 
            formattedCode.includes('<article');
        
        // If no container, wrap in a div
        if (!hasContainer) {
            formattedCode = `<div class="custom-snippet">${formattedCode}</div>`;
        }
        
        return formattedCode;
    }, []);

    // Handle template selection with better error handling
    const handleTemplateSelect = useCallback((template) => {
        try {
            if (!template || typeof template !== 'string') {
                throw new Error('Invalid template selection');
            }
            
            console.log(`Selecting template: ${template}`);
            
            // Get the template data
            const templateData = SNIPPET_TEMPLATES[template];
            if (!templateData) {
                throw new Error(`Template not found: ${template}`);
            }
            
            // Validate template HTML
            validateHtml(templateData.html);
            
            console.log(`Adding template: ${template} (${templateData.name})`);
            
            // Add the snippet directly without showing modal
            onAddSnippet({
                html: templateData.html,
                size: templateData.defaultSize
            });
            
        } catch (err) {
            console.error('Error adding template:', err);
            onError(`Failed to add template: ${err.message}`);
        }
    }, [onAddSnippet, onError, validateHtml]);

    // Handle custom snippet creation with improved validation
    const handleCustomSnippet = useCallback(() => {
        try {
            if (!customCode.trim()) {
                throw new Error('Snippet code cannot be empty');
            }
            
            // Validate and format custom code
            const formattedCode = validateHtml(customCode.trim());
            
            console.log('Adding custom snippet');
            onAddSnippet({
                html: formattedCode,
                size: { width: 300, height: 200 }
            });
            setCustomCode('');
            setShowCustomModal(false);
        } catch (err) {
            console.error('Error adding custom snippet:', err);
            onError(err.message);
        }
    }, [customCode, onAddSnippet, onError, validateHtml]);

    return (
        <div className="snippet-manager">
            {/* Template Selection */}
            <div className="template-buttons">
                {Object.entries(SNIPPET_TEMPLATES).map(([key, template]) => (
                    <button
                        key={key}
                        className="btn btn-outline-primary me-2"
                        onClick={() => handleTemplateSelect(key)}
                        title={`Add ${template.name} snippet`}
                    >
                        {template.name}
                    </button>
                ))}
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowCustomModal(true)}
                    title="Add custom HTML code"
                >
                    Custom HTML
                </button>
            </div>

            {/* Custom Code Modal */}
            {showCustomModal && (
                <div className="modal show d-block">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add Custom HTML</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setShowCustomModal(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <small className="text-muted">
                                        Enter your custom HTML code below. Make sure it's properly formatted.
                                    </small>
                                </div>
                                <textarea
                                    className="form-control code-editor"
                                    rows="10"
                                    value={customCode}
                                    onChange={(e) => setCustomCode(e.target.value)}
                                    placeholder="Paste your HTML code here..."
                                    aria-label="Custom HTML editor"
                                />
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setShowCustomModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleCustomSnippet}
                                    disabled={!customCode.trim()}
                                >
                                    Add Snippet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SnippetManager; 