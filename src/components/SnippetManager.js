import React, { useState } from 'react';

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
        html: `<!DOCTYPE html>
<div class="globe-container" style="width: 100%; height: 100%;">
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
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setShowTemplateModal(true);
    };

    const handleTemplateConfirm = () => {
        try {
            const template = SNIPPET_TEMPLATES[selectedTemplate];
            onAddSnippet({
                html: template.html,
                size: template.defaultSize
            });
            setShowTemplateModal(false);
        } catch (err) {
            onError('Failed to add template snippet');
        }
    };

    const handleCustomSnippet = () => {
        try {
            if (!customCode.trim()) {
                throw new Error('Snippet code cannot be empty');
            }
            onAddSnippet({
                html: customCode,
                size: { width: 300, height: 200 }
            });
            setCustomCode('');
            setShowCustomModal(false);
        } catch (err) {
            onError(err.message);
        }
    };

    return (
        <div className="snippet-manager">
            {/* Template Selection */}
            <div className="template-buttons">
                {Object.entries(SNIPPET_TEMPLATES).map(([key, template]) => (
                    <button
                        key={key}
                        className="btn btn-outline-primary me-2"
                        onClick={() => handleTemplateSelect(key)}
                    >
                        {template.name}
                    </button>
                ))}
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowCustomModal(true)}
                >
                    Custom HTML
                </button>
            </div>

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="modal show d-block">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Add {SNIPPET_TEMPLATES[selectedTemplate].name}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setShowTemplateModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Add this snippet to your page?</p>
                                <pre className="template-preview">
                                    {SNIPPET_TEMPLATES[selectedTemplate].html}
                                </pre>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setShowTemplateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleTemplateConfirm}
                                >
                                    Add Snippet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                ></button>
                            </div>
                            <div className="modal-body">
                                <textarea
                                    className="form-control code-editor"
                                    rows="10"
                                    value={customCode}
                                    onChange={(e) => setCustomCode(e.target.value)}
                                    placeholder="Paste your HTML code here..."
                                ></textarea>
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