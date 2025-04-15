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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEditors();
    setupEventListeners();
    setupConsoleOverride();
    updateTabs();
    runCode();
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