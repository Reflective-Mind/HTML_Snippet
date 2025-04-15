// Global variables
let htmlEditor, cssEditor, jsEditor;
let isAutoRunEnabled = true;
let currentSnippetId = null;
let currentTabId = 'tab-0';
let tabs = [{
    id: 'tab-0',
    name: 'Untitled',
    html: '',
    css: '',
    js: ''
}];

// App state
let currentLayerIndex = 0;
let layers = [
    {
        name: "Layer 1",
        tabs: [
            {
                id: "tab1",
                name: "Untitled",
                content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>Welcome to HTML Viewer</h1>\n    <p>Edit the code to see your changes in real-time!</p>\n</body>\n</html>"
            }
        ],
        activeTabId: "tab1"
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEditors();
    setupEventListeners();
    setupConsoleOverride();
    updateTabs();
    runCode();
    initApp();
});

// Set up the code editors using CodeMirror
function setupEditors() {
    // HTML Editor
    htmlEditor = CodeMirror(document.getElementById('html-editor'), {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // CSS Editor
    cssEditor = CodeMirror(document.getElementById('css-editor'), {
        mode: 'css',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // JavaScript Editor
    jsEditor = CodeMirror(document.getElementById('js-editor'), {
        mode: 'javascript',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // Set up editor change events
    htmlEditor.on('change', debounce(() => {
        saveCurrentTab();
        if (isAutoRunEnabled) runCode();
    }, 1000));

    cssEditor.on('change', debounce(() => {
        saveCurrentTab();
        if (isAutoRunEnabled) runCode();
    }, 1000));

    jsEditor.on('change', debounce(() => {
        saveCurrentTab();
        if (isAutoRunEnabled) runCode();
    }, 1000));
}

// Set up all event listeners
function setupEventListeners() {
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const activeTab = tab.dataset.tab;
            
            // Update active state for tabs
            document.querySelectorAll('.panel-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            // Update active state for editor containers
            document.querySelectorAll('.editor-container').forEach(container => {
                container.classList.remove('active');
            });
            document.getElementById(`${activeTab}-editor`).classList.add('active');
            
            // Refresh the editor to fix any display issues
            if (activeTab === 'html') htmlEditor.refresh();
            if (activeTab === 'css') cssEditor.refresh();
            if (activeTab === 'js') jsEditor.refresh();
        });
    });

    // Device preview buttons
    document.querySelectorAll('.device-button').forEach(button => {
        button.addEventListener('click', () => {
            const device = button.dataset.device;
            
            document.querySelectorAll('.device-button').forEach(b => {
                b.classList.remove('active');
            });
            button.classList.add('active');
            
            const previewContainer = document.querySelector('.preview-container');
            previewContainer.classList.remove('desktop', 'tablet', 'mobile');
            previewContainer.classList.add(device);
        });
    });

    // Run code button
    document.getElementById('runBtn').addEventListener('click', runCode);

    // Auto-run toggle
    const autoRunToggle = document.getElementById('autoRunToggle');
    autoRunToggle.addEventListener('click', () => {
        isAutoRunEnabled = !isAutoRunEnabled;
        autoRunToggle.classList.toggle('active', isAutoRunEnabled);
    });

    // Clear console button
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);

    // New tab button
    document.getElementById('newTabBtn').addEventListener('click', createNewTab);

    // Save button
    document.getElementById('saveBtn').addEventListener('click', openSaveModal);

    // Load button
    document.getElementById('loadBtn').addEventListener('click', openLoadModal);

    // Share button
    document.getElementById('shareBtn').addEventListener('click', openShareModal);

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

    // Modal close buttons
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });

    // Save snippet button
    const saveModal = document.getElementById('saveModal');
    saveModal.querySelector('.save-btn').addEventListener('click', saveSnippet);

    // Settings save button
    const settingsModal = document.getElementById('settingsModal');
    settingsModal.querySelector('.save-btn').addEventListener('click', saveSettings);

    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

    // Social share buttons
    document.getElementById('shareTwitterBtn').addEventListener('click', () => shareOnSocial('twitter'));
    document.getElementById('shareFacebookBtn').addEventListener('click', () => shareOnSocial('facebook'));
    document.getElementById('shareEmailBtn').addEventListener('click', () => shareOnSocial('email'));

    // Resizable panels
    setupResizablePanels();
}

// Run the code in the preview iframe
function runCode() {
    const previewIframe = document.getElementById('preview-iframe');
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    // Create a complete HTML document
    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                ${css}
            </style>
        </head>
        <body>
            ${html}
            <script>
                // Override console methods to capture logs
                (function(){
                    const oldLog = console.log;
                    const oldWarn = console.warn;
                    const oldError = console.error;
                    const oldInfo = console.info;
                    
                    console.log = function() {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'log',
                            args: Array.from(arguments)
                        }, '*');
                        oldLog.apply(console, arguments);
                    };
                    
                    console.warn = function() {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'warn',
                            args: Array.from(arguments)
                        }, '*');
                        oldWarn.apply(console, arguments);
                    };
                    
                    console.error = function() {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'error',
                            args: Array.from(arguments)
                        }, '*');
                        oldError.apply(console, arguments);
                    };
                    
                    console.info = function() {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'info',
                            args: Array.from(arguments)
                        }, '*');
                        oldInfo.apply(console, arguments);
                    };
                    
                    window.onerror = function(message, source, lineno, colno, error) {
                        window.parent.postMessage({
                            type: 'error',
                            message,
                            source,
                            lineno,
                            colno
                        }, '*');
                        return false;
                    };
                })();
                
                // User's JavaScript code
                ${js}
            </script>
        </body>
        </html>
    `;

    // Set the iframe content
    previewIframe.srcdoc = fullHtml;
}

// Override the console to capture logs from the iframe
function setupConsoleOverride() {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'console') {
            const method = event.data.method || 'log';
            const args = event.data.args || [];
            logToConsole(method, ...args);
        } else if (event.data && event.data.type === 'error') {
            logToConsole('error', `${event.data.message} (line ${event.data.lineno}, col ${event.data.colno})`);
        }
    });
}

// Log messages to the console output
function logToConsole(method, ...args) {
    const consoleLog = document.getElementById('console-log');
    const logItem = document.createElement('div');
    logItem.className = `console-log-item ${method}`;
    
    // Format arguments to string
    let content = '';
    args.forEach((arg, index) => {
        if (typeof arg === 'object') {
            try {
                content += JSON.stringify(arg, null, 2);
            } catch (e) {
                content += String(arg);
            }
        } else {
            content += String(arg);
        }
        
        if (index < args.length - 1) {
            content += ' ';
        }
    });
    
    logItem.textContent = content;
    consoleLog.appendChild(logItem);
    
    // Scroll to bottom
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Clear the console output
function clearConsole() {
    document.getElementById('console-log').innerHTML = '';
}

// Create a new tab
function createNewTab() {
    const tabId = `tab-${Date.now()}`;
    tabs.push({
        id: tabId,
        name: 'Untitled',
        html: '',
        css: '',
        js: ''
    });
    
    switchToTab(tabId);
    updateTabs();
}

// Switch to a specific tab
function switchToTab(tabId) {
    currentTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);
    
    if (tab) {
        htmlEditor.setValue(tab.html);
        cssEditor.setValue(tab.css);
        jsEditor.setValue(tab.js);
        
        // Update UI
        document.querySelectorAll('#tabsContainer .tab').forEach(tabEl => {
            tabEl.classList.remove('active');
        });
        
        const tabEl = document.querySelector(`#tabsContainer .tab[data-id="${tabId}"]`);
        if (tabEl) {
            tabEl.classList.add('active');
        }
    }
}

// Save the current tab content
function saveCurrentTab() {
    const tab = tabs.find(t => t.id === currentTabId);
    
    if (tab) {
        tab.html = htmlEditor.getValue();
        tab.css = cssEditor.getValue();
        tab.js = jsEditor.getValue();
    }
}

// Update the tabs UI
function updateTabs() {
    const tabsContainer = document.getElementById('tabsContainer');
    tabsContainer.innerHTML = '';
    
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.id === currentTabId ? 'active' : ''}`;
        tabEl.dataset.id = tab.id;
        
        const tabTitle = document.createElement('span');
        tabTitle.textContent = tab.name;
        tabEl.appendChild(tabTitle);
        
        // Only show the close button if there is more than one tab
        if (tabs.length > 1) {
            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(tab.id);
            });
            tabEl.appendChild(closeBtn);
        }
        
        tabEl.addEventListener('click', () => {
            switchToTab(tab.id);
        });
        
        tabsContainer.appendChild(tabEl);
    });
}

// Close a tab
function closeTab(tabId) {
    if (tabs.length <= 1) return;
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    
    if (tabIndex !== -1) {
        tabs.splice(tabIndex, 1);
        
        // If we closed the current tab, switch to another tab
        if (currentTabId === tabId) {
            const newTabIndex = Math.min(tabIndex, tabs.length - 1);
            switchToTab(tabs[newTabIndex].id);
        }
        
        updateTabs();
    }
}

// Open the save modal
function openSaveModal() {
    const saveModal = document.getElementById('saveModal');
    const snippetNameInput = document.getElementById('snippetName');
    const snippetDescriptionInput = document.getElementById('snippetDescription');
    
    // Set default values
    snippetNameInput.value = tabs.find(t => t.id === currentTabId)?.name || 'Untitled';
    snippetDescriptionInput.value = '';
    
    saveModal.classList.add('show');
}

// Save the current snippet to the server
async function saveSnippet() {
    const saveModal = document.getElementById('saveModal');
    const snippetNameInput = document.getElementById('snippetName');
    const snippetDescriptionInput = document.getElementById('snippetDescription');
    
    const name = snippetNameInput.value.trim();
    const description = snippetDescriptionInput.value.trim();
    
    if (!name) {
        alert('Please enter a name for your snippet.');
        return;
    }
    
    const tab = tabs.find(t => t.id === currentTabId);
    
    if (tab) {
        try {
            // Update tab name
            tab.name = name;
            updateTabs();
            
            // Save to server
            const response = await fetch('/api/snippets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    html: tab.html,
                    css: tab.css,
                    js: tab.js
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save snippet.');
            }
            
            const data = await response.json();
            currentSnippetId = data.name;
            
            saveModal.classList.remove('show');
            
            // Show success message
            alert('Snippet saved successfully!');
        } catch (error) {
            alert('Error saving snippet: ' + error.message);
        }
    }
}

// Open the load modal and load snippets from the server
async function openLoadModal() {
    const loadModal = document.getElementById('loadModal');
    const snippetsList = loadModal.querySelector('.snippets-list');
    
    // Clear the list
    snippetsList.innerHTML = '';
    
    try {
        // Fetch snippets from server
        const response = await fetch('/api/snippets');
        
        if (!response.ok) {
            throw new Error('Failed to load snippets.');
        }
        
        const snippets = await response.json();
        
        if (snippets.length === 0) {
            snippetsList.innerHTML = '<p>No saved snippets found.</p>';
        } else {
            // Create snippet items
            snippets.forEach(snippet => {
                const snippetItem = document.createElement('div');
                snippetItem.className = 'snippet-item';
                
                const title = document.createElement('h3');
                title.textContent = snippet.name;
                snippetItem.appendChild(title);
                
                if (snippet.description) {
                    const description = document.createElement('p');
                    description.textContent = snippet.description;
                    snippetItem.appendChild(description);
                }
                
                const date = document.createElement('div');
                date.className = 'snippet-item-date';
                date.textContent = new Date(snippet.createdAt).toLocaleDateString();
                snippetItem.appendChild(date);
                
                snippetItem.addEventListener('click', () => {
                    loadSnippet(snippet.name);
                    loadModal.classList.remove('show');
                });
                
                snippetsList.appendChild(snippetItem);
            });
        }
    } catch (error) {
        snippetsList.innerHTML = `<p>Error loading snippets: ${error.message}</p>`;
    }
    
    loadModal.classList.add('show');
}

// Load a snippet from the server
async function loadSnippet(name) {
    try {
        const response = await fetch(`/api/snippets/${name}`);
        
        if (!response.ok) {
            throw new Error('Failed to load snippet.');
        }
        
        const snippet = await response.json();
        
        // Create a new tab for the snippet
        const tabId = `tab-${Date.now()}`;
        tabs.push({
            id: tabId,
            name: snippet.name,
            html: snippet.html || '',
            css: snippet.css || '',
            js: snippet.js || ''
        });
        
        switchToTab(tabId);
        updateTabs();
        runCode();
        
        currentSnippetId = snippet.name;
    } catch (error) {
        alert('Error loading snippet: ' + error.message);
    }
}

// Open the share modal
function openShareModal() {
    const shareModal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    
    // Generate share link
    const tab = tabs.find(t => t.id === currentTabId);
    if (tab) {
        const data = {
            html: tab.html,
            css: tab.css,
            js: tab.js
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(data));
        const url = `${window.location.origin}/?data=${encodedData}`;
        
        shareLink.value = url;
    }
    
    shareModal.classList.add('show');
}

// Copy the share link to the clipboard
function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    
    alert('Link copied to clipboard!');
}

// Share on social media
function shareOnSocial(platform) {
    const shareLink = document.getElementById('shareLink').value;
    const encodedLink = encodeURIComponent(shareLink);
    const title = encodeURIComponent(`Check out my HTML/CSS/JS creation!`);
    
    let url;
    
    switch (platform) {
        case 'twitter':
            url = `https://twitter.com/intent/tweet?text=${title}&url=${encodedLink}`;
            break;
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
            break;
        case 'email':
            url = `mailto:?subject=${title}&body=${encodedLink}`;
            break;
    }
    
    if (url) {
        window.open(url, '_blank');
    }
}

// Open the settings modal
function openSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    
    // Load current settings
    const themeSelect = document.getElementById('themeSelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const lintingCheckbox = document.getElementById('lintingCheckbox');
    const autoCloseBracketsCheckbox = document.getElementById('autoCloseBracketsCheckbox');
    const lineNumbersCheckbox = document.getElementById('lineNumbersCheckbox');
    
    // Load settings from localStorage if available
    const settings = JSON.parse(localStorage.getItem('htmlViewerSettings')) || {};
    
    themeSelect.value = settings.theme || 'monokai';
    fontSizeSelect.value = settings.fontSize || '14';
    lintingCheckbox.checked = settings.linting !== false;
    autoCloseBracketsCheckbox.checked = settings.autoCloseBrackets !== false;
    lineNumbersCheckbox.checked = settings.lineNumbers !== false;
    
    settingsModal.classList.add('show');
}

// Save the settings
function saveSettings() {
    const settingsModal = document.getElementById('settingsModal');
    
    const themeSelect = document.getElementById('themeSelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const lintingCheckbox = document.getElementById('lintingCheckbox');
    const autoCloseBracketsCheckbox = document.getElementById('autoCloseBracketsCheckbox');
    const lineNumbersCheckbox = document.getElementById('lineNumbersCheckbox');
    
    const settings = {
        theme: themeSelect.value,
        fontSize: fontSizeSelect.value,
        linting: lintingCheckbox.checked,
        autoCloseBrackets: autoCloseBracketsCheckbox.checked,
        lineNumbers: lineNumbersCheckbox.checked
    };
    
    // Apply settings
    applySettings(settings);
    
    // Save settings to localStorage
    localStorage.setItem('htmlViewerSettings', JSON.stringify(settings));
    
    settingsModal.classList.remove('show');
}

// Apply settings to the editors
function applySettings(settings) {
    // Load theme CSS if not already loaded
    if (settings.theme && settings.theme !== 'monokai') {
        loadThemeCSS(settings.theme);
    }
    
    // Apply settings to editors
    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        // Theme
        editor.setOption('theme', settings.theme);
        
        // Line numbers
        editor.setOption('lineNumbers', settings.lineNumbers);
        
        // Auto close brackets
        editor.setOption('autoCloseBrackets', settings.autoCloseBrackets);
        
        // Font size
        const editorEl = editor.getWrapperElement();
        editorEl.style.fontSize = `${settings.fontSize}px`;
    });
}

// Load a CodeMirror theme CSS
function loadThemeCSS(theme) {
    const link = document.querySelector(`link[href*="theme/${theme}"]`);
    
    if (!link) {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.9/theme/${theme}.min.css`;
        document.head.appendChild(newLink);
    }
}

// Set up resizable panels
function setupResizablePanels() {
    const resizer = document.getElementById('horizontal-resizer');
    const editorPanel = document.getElementById('editor-panel');
    
    let isResizing = false;
    
    resizer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    function startResize(e) {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
    }
    
    function resize(e) {
        if (!isResizing) return;
        
        // Calculate the width as a percentage of the parent
        const containerWidth = resizer.parentElement.offsetWidth;
        const newWidth = (e.clientX / containerWidth) * 100;
        
        // Limit the width to a reasonable range
        if (newWidth > 10 && newWidth < 90) {
            editorPanel.style.width = `${newWidth}%`;
            
            // Refresh the editors to fix rendering issues
            htmlEditor.refresh();
            cssEditor.refresh();
            jsEditor.refresh();
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.body.style.cursor = '';
    }
}

// Check for shared data in the URL
function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
        try {
            const decodedData = JSON.parse(decodeURIComponent(data));
            
            // Create a new tab for the shared data
            const tabId = `tab-${Date.now()}`;
            tabs.push({
                id: tabId,
                name: 'Shared Snippet',
                html: decodedData.html || '',
                css: decodedData.css || '',
                js: decodedData.js || ''
            });
            
            switchToTab(tabId);
            updateTabs();
            runCode();
            
            // Remove the data from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Error parsing shared data:', error);
        }
    }
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the app
window.addEventListener('load', () => {
    // Apply settings if available
    const settings = JSON.parse(localStorage.getItem('htmlViewerSettings'));
    if (settings) {
        applySettings(settings);
    }
    
    // Check for shared data
    checkForSharedData();
});

function initApp() {
    // Try to restore data from localStorage
    restoreFromLocalStorage();
    
    // Initialize the tabs for the current layer
    renderTabs();
    updatePreview();
    
    // Check for data in URL hash (for shared snippets)
    checkUrlForSharedData();
    
    // Set up auto-save to localStorage
    setInterval(saveToLocalStorage, 5000);
}

// Layer Management Functions
function addLayer() {
    const layerNameInput = document.getElementById('layerNameInput');
    const layerName = layerNameInput.value.trim() || `Layer ${layers.length + 1}`;
    layerNameInput.value = '';
    
    layers.push({
        name: layerName,
        tabs: [
            {
                id: `layer${layers.length}_tab1`,
                name: "Untitled",
                content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>New Layer</h1>\n    <p>Start creating content in this layer!</p>\n</body>\n</html>"
            }
        ],
        activeTabId: `layer${layers.length}_tab1`
    });
    
    updateLayerSelector();
    
    // Switch to the new layer
    currentLayerIndex = layers.length - 1;
    document.getElementById('layerSelector').value = currentLayerIndex;
    
    renderTabs();
    updatePreview();
    saveToLocalStorage();
}

function updateLayerSelector() {
    const selector = document.getElementById('layerSelector');
    selector.innerHTML = '';
    
    layers.forEach((layer, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = layer.name;
        selector.appendChild(option);
    });
}

function switchLayer(layerIndex) {
    currentLayerIndex = parseInt(layerIndex);
    renderTabs();
    updatePreview();
}

function deleteLayer() {
    if (layers.length <= 1) {
        alert("You cannot delete the only layer.");
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${layers[currentLayerIndex].name}"?`)) {
        layers.splice(currentLayerIndex, 1);
        
        if (currentLayerIndex >= layers.length) {
            currentLayerIndex = layers.length - 1;
        }
        
        updateLayerSelector();
        document.getElementById('layerSelector').value = currentLayerIndex;
        
        renderTabs();
        updatePreview();
        saveToLocalStorage();
    }
}

// Tab Management Functions
function renderTabs() {
    const tabsContainer = document.getElementById('tabsContainer');
    tabsContainer.innerHTML = '';
    
    const currentLayer = layers[currentLayerIndex];
    
    currentLayer.tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${tab.id === currentLayer.activeTabId ? 'active' : ''}`;
        tabElement.setAttribute('data-tab-id', tab.id);
        
        const tabTitle = document.createElement('div');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = tab.name;
        
        const tabClose = document.createElement('div');
        tabClose.className = 'tab-close';
        tabClose.innerHTML = '&times;';
        tabClose.onclick = (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        };
        
        tabElement.appendChild(tabTitle);
        
        // Only add close button if there's more than one tab
        if (currentLayer.tabs.length > 1) {
            tabElement.appendChild(tabClose);
        }
        
        tabElement.onclick = () => switchTab(tab.id);
        
        tabsContainer.appendChild(tabElement);
    });
    
    // Add "New Tab" button
    const newTabButton = document.createElement('div');
    newTabButton.className = 'tab';
    newTabButton.innerHTML = '+';
    newTabButton.style.minWidth = '30px';
    newTabButton.style.justifyContent = 'center';
    newTabButton.onclick = addTab;
    
    tabsContainer.appendChild(newTabButton);
}

function getCurrentTab() {
    const currentLayer = layers[currentLayerIndex];
    return currentLayer.tabs.find(tab => tab.id === currentLayer.activeTabId);
}

function addTab() {
    const currentLayer = layers[currentLayerIndex];
    const newId = `layer${currentLayerIndex}_tab${Date.now()}`;
    
    currentLayer.tabs.push({
        id: newId,
        name: "Untitled",
        content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>New Tab</h1>\n    <p>Start creating content in this tab!</p>\n</body>\n</html>"
    });
    
    currentLayer.activeTabId = newId;
    
    renderTabs();
    updatePreview();
    saveToLocalStorage();
}

function closeTab(tabId) {
    const currentLayer = layers[currentLayerIndex];
    
    if (currentLayer.tabs.length <= 1) {
        alert("You cannot close the only tab.");
        return;
    }
    
    const tabIndex = currentLayer.tabs.findIndex(tab => tab.id === tabId);
    currentLayer.tabs.splice(tabIndex, 1);
    
    // If the active tab was closed, activate another tab
    if (currentLayer.activeTabId === tabId) {
        currentLayer.activeTabId = currentLayer.tabs[0].id;
    }
    
    renderTabs();
    updatePreview();
    saveToLocalStorage();
}

function switchTab(tabId) {
    const currentLayer = layers[currentLayerIndex];
    currentLayer.activeTabId = tabId;
    
    renderTabs();
    updatePreview();
    saveToLocalStorage();
}

function renameCurrentTab(newName) {
    const currentTab = getCurrentTab();
    currentTab.name = newName;
    renderTabs();
    saveToLocalStorage();
}

// Editor Functions
function openEditor() {
    const currentTab = getCurrentTab();
    document.getElementById('htmlEditor').value = currentTab.content;
    document.getElementById('editorPopup').style.display = 'flex';
    document.getElementById('editorOverlay').style.display = 'block';
    document.getElementById('errorOutput').style.display = 'none';
}

function closeEditor() {
    document.getElementById('editorPopup').style.display = 'none';
    document.getElementById('editorOverlay').style.display = 'none';
}

function applyCode() {
    try {
        const htmlContent = document.getElementById('htmlEditor').value;
        const currentTab = getCurrentTab();
        currentTab.content = htmlContent;
        
        updatePreview();
        closeEditor();
        saveToLocalStorage();
    } catch (error) {
        document.getElementById('errorOutput').style.display = 'block';
        document.getElementById('errorOutput').textContent = error.message;
    }
}

function updatePreview() {
    const preview = document.getElementById('preview');
    const currentTab = getCurrentTab();
    
    // Set content to the iframe
    preview.srcdoc = currentTab.content;
}

// Clipboard Functions
function copyToClipboard() {
    const htmlEditor = document.getElementById('htmlEditor');
    htmlEditor.select();
    document.execCommand('copy');
    
    // Flash effect to indicate copy
    const originalColor = htmlEditor.style.backgroundColor;
    htmlEditor.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    setTimeout(() => {
        htmlEditor.style.backgroundColor = originalColor;
    }, 300);
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('htmlEditor').value = text;
    } catch (error) {
        alert("Could not access clipboard. Use Ctrl+V instead.");
    }
}

// Import/Export Functions
function exportData() {
    const dataToExport = {
        layers: layers,
        currentLayerIndex: currentLayerIndex
    };
    
    const exportString = JSON.stringify(dataToExport);
    
    // Show the export modal
    const modal = document.getElementById('importExportModal');
    document.getElementById('modalTitle').textContent = 'Export Data';
    document.getElementById('modalDescription').textContent = 'Copy the code below to save your layers and tabs:';
    document.getElementById('importExportTextarea').value = exportString;
    document.getElementById('confirmButton').textContent = 'Copy to Clipboard';
    document.getElementById('confirmButton').onclick = copyExportedData;
    
    modal.style.display = 'block';
}

function copyExportedData() {
    const textarea = document.getElementById('importExportTextarea');
    textarea.select();
    document.execCommand('copy');
    
    // Flash effect
    textarea.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    setTimeout(() => {
        textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    }, 300);
    
    // Close modal
    setTimeout(closeImportExportModal, 1000);
}

function openImportModal() {
    const modal = document.getElementById('importExportModal');
    document.getElementById('modalTitle').textContent = 'Import Data';
    document.getElementById('modalDescription').textContent = 'Paste your exported data below:';
    document.getElementById('importExportTextarea').value = '';
    document.getElementById('confirmButton').textContent = 'Import';
    document.getElementById('confirmButton').onclick = importData;
    
    modal.style.display = 'block';
}

function importData() {
    try {
        const importString = document.getElementById('importExportTextarea').value;
        const importedData = JSON.parse(importString);
        
        if (importedData && importedData.layers && Array.isArray(importedData.layers)) {
            layers = importedData.layers;
            currentLayerIndex = importedData.currentLayerIndex || 0;
            
            if (currentLayerIndex >= layers.length) {
                currentLayerIndex = 0;
            }
            
            updateLayerSelector();
            document.getElementById('layerSelector').value = currentLayerIndex;
            
            renderTabs();
            updatePreview();
            saveToLocalStorage();
            
            closeImportExportModal();
        } else {
            alert("Invalid import data format.");
        }
    } catch (error) {
        alert("Error importing data: " + error.message);
    }
}

function closeImportExportModal() {
    document.getElementById('importExportModal').style.display = 'none';
}

// Local Storage Functions
function saveToLocalStorage() {
    try {
        const dataToSave = {
            layers: layers,
            currentLayerIndex: currentLayerIndex
        };
        
        localStorage.setItem('htmlLayerEditorData', JSON.stringify(dataToSave));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
}

function restoreFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('htmlLayerEditorData');
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            if (parsedData && parsedData.layers && Array.isArray(parsedData.layers)) {
                layers = parsedData.layers;
                currentLayerIndex = parsedData.currentLayerIndex || 0;
                
                if (currentLayerIndex >= layers.length) {
                    currentLayerIndex = 0;
                }
                
                updateLayerSelector();
                document.getElementById('layerSelector').value = currentLayerIndex;
            }
        }
    } catch (error) {
        console.error("Error restoring from localStorage:", error);
    }
}

// Share functionality via URL hash
function checkUrlForSharedData() {
    if (window.location.hash) {
        try {
            const hashData = window.location.hash.substring(1); // Remove the # character
            const decodedData = decodeURIComponent(hashData);
            const sharedData = JSON.parse(decodedData);
            
            if (confirm("Would you like to load the shared HTML content?")) {
                // Create a new tab with the shared content
                const currentLayer = layers[currentLayerIndex];
                const newId = `layer${currentLayerIndex}_tab${Date.now()}`;
                
                currentLayer.tabs.push({
                    id: newId,
                    name: sharedData.name || "Shared Content",
                    content: sharedData.content
                });
                
                currentLayer.activeTabId = newId;
                
                renderTabs();
                updatePreview();
                saveToLocalStorage();
                
                // Remove the hash to prevent reloading on refresh
                history.replaceState(null, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Error loading shared data:", error);
        }
    }
}

function shareCurrentTab() {
    const currentTab = getCurrentTab();
    
    const shareData = {
        name: currentTab.name,
        content: currentTab.content
    };
    
    const shareString = JSON.stringify(shareData);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(shareString)}`;
    
    prompt("Share this link:", shareUrl);
}

// Server Integration Functions
async function openSaveModal() {
    const saveModal = document.getElementById('saveModal');
    document.getElementById('snippetName').value = getCurrentTab().name;
    document.getElementById('snippetDescription').value = '';
    saveModal.style.display = 'block';
}

function closeSaveModal() {
    document.getElementById('saveModal').style.display = 'none';
}

async function saveSnippet() {
    const name = document.getElementById('snippetName').value.trim();
    const description = document.getElementById('snippetDescription').value.trim();
    const currentTab = getCurrentTab();
    
    if (!name) {
        alert('Please enter a name for your snippet');
        return;
    }
    
    try {
        const response = await fetch('/api/snippets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                content: currentTab.content,
                type: 'html'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            closeSaveModal();
            alert(`Snippet "${name}" saved successfully!`);
            
            // Update the name of the current tab
            if (name !== currentTab.name) {
                renameCurrentTab(name);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error saving snippet');
        }
    } catch (error) {
        alert(`Failed to save snippet: ${error.message}`);
    }
}

async function openLoadModal() {
    const loadModal = document.getElementById('loadModal');
    const snippetsList = document.getElementById('snippetsList');
    snippetsList.innerHTML = '<p>Loading snippets...</p>';
    
    loadModal.style.display = 'block';
    
    try {
        const response = await fetch('/api/snippets');
        
        if (response.ok) {
            const snippets = await response.json();
            renderSnippetsList(snippets);
        } else {
            throw new Error('Failed to fetch snippets');
        }
    } catch (error) {
        snippetsList.innerHTML = `<p>Error loading snippets: ${error.message}</p>`;
    }
}

function closeLoadModal() {
    document.getElementById('loadModal').style.display = 'none';
}

function renderSnippetsList(snippets) {
    const snippetsList = document.getElementById('snippetsList');
    
    if (!snippets || snippets.length === 0) {
        snippetsList.innerHTML = '<p>No snippets found</p>';
        return;
    }
    
    snippetsList.innerHTML = '';
    
    snippets.forEach(snippet => {
        const snippetItem = document.createElement('div');
        snippetItem.className = 'snippet-item';
        snippetItem.onclick = () => loadSnippet(snippet._id);
        
        const snippetTitle = document.createElement('h3');
        snippetTitle.textContent = snippet.name;
        
        const snippetDesc = document.createElement('p');
        snippetDesc.textContent = snippet.description || 'No description';
        
        const snippetDate = document.createElement('div');
        snippetDate.className = 'snippet-item-date';
        snippetDate.textContent = new Date(snippet.createdAt).toLocaleDateString();
        
        snippetItem.appendChild(snippetTitle);
        snippetItem.appendChild(snippetDesc);
        snippetItem.appendChild(snippetDate);
        
        snippetsList.appendChild(snippetItem);
    });
}

async function loadSnippet(id) {
    try {
        const response = await fetch(`/api/snippets/${id}`);
        
        if (response.ok) {
            const snippet = await response.json();
            
            // Create a new tab with the loaded content
            const currentLayer = layers[currentLayerIndex];
            const newId = `layer${currentLayerIndex}_tab${Date.now()}`;
            
            currentLayer.tabs.push({
                id: newId,
                name: snippet.name,
                content: snippet.content
            });
            
            currentLayer.activeTabId = newId;
            
            renderTabs();
            updatePreview();
            saveToLocalStorage();
            closeLoadModal();
        } else {
            throw new Error('Failed to load snippet');
        }
    } catch (error) {
        alert(`Failed to load snippet: ${error.message}`);
    }
} 