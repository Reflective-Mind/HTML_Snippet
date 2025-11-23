// Global variables
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

// Debug logging function
function debugLog(message, type = 'info') {
    // Log to browser console
    console.log(message);
    
    // Check user preference for debug panel visibility
    const debugPanelHidden = localStorage.getItem('debugPanelHidden') === 'true';
    
    // Log to debug panel if it exists
    const debugPanel = document.getElementById('debugPanel');
    const debugContent = document.getElementById('debugContent');
    
    if (debugPanel && debugContent) {
        // Only show the debug panel if it's not been explicitly hidden
        if (!debugPanelHidden) {
            // Create a new log entry
            const entry = document.createElement('div');
            entry.style.borderBottom = '1px solid #333';
            entry.style.padding = '3px 0';
            
            // Set color based on type
            switch(type) {
                case 'error':
                    entry.style.color = '#ff5555';
                    break;
                case 'warn':
                    entry.style.color = '#ffcc00';
                    break;
                case 'success':
                    entry.style.color = '#55ff55';
                    break;
                default:
                    entry.style.color = '#0f0';
            }
            
            // Add timestamp
            const time = new Date().toLocaleTimeString();
            entry.textContent = `[${time}] ${message}`;
            
            // Add to debug content
            debugContent.appendChild(entry);
            
            // Scroll to bottom
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize the app
    initApp();
    console.log("Application initialized");
});

// Set up all event listeners
function setupEventListeners() {
    debugLog("Setting up event listeners");
    
    // Check and apply user's debug panel visibility preference
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const debugPanelHidden = localStorage.getItem('debugPanelHidden') === 'true';
        if (debugPanelHidden) {
            debugPanel.style.display = 'none';
        }
    }
    
    // Add keyboard shortcut to toggle debug panel (Ctrl+D)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel) {
                const isHidden = debugPanel.style.display === 'none';
                debugPanel.style.display = isHidden ? 'block' : 'none';
                // Store the preference
                localStorage.setItem('debugPanelHidden', !isHidden);
                debugLog("Debug panel toggled via keyboard shortcut");
            }
        }
    });
    
    // Add event listener for the Edit Code button
    const editCodeBtn = document.getElementById('editCodeBtn');
    if (editCodeBtn) {
        editCodeBtn.addEventListener('click', openEditor);
        debugLog("Edit Code button listener attached");
    } else {
        debugLog("Edit Code button not found", "error");
    }
    
    // Add event listeners for import/export
    const exportBtn = document.querySelector('.import-export-button[onclick="exportData()"]');
    if (exportBtn) {
        exportBtn.onclick = null; // Remove inline handler
        exportBtn.addEventListener('click', exportData);
        debugLog("Export button listener attached");
    } else {
        debugLog("Export button not found", "warn");
    }
    
    const importBtn = document.querySelector('.import-export-button[onclick="openImportModal()"]');
    if (importBtn) {
        importBtn.onclick = null; // Remove inline handler
        importBtn.addEventListener('click', openImportModal);
        debugLog("Import button listener attached");
    } else {
        debugLog("Import button not found", "warn");
    }
    
    // Add event listener for the layer selector
    const layerSelector = document.getElementById('layerSelector');
    if (layerSelector) {
        layerSelector.onchange = null; // Remove inline handler
        layerSelector.addEventListener('change', () => {
            switchLayer(layerSelector.value);
            debugLog("Layer switched to " + layerSelector.value);
        });
    } else {
        debugLog("Layer selector not found", "warn");
    }
    
    // Add event listener for the layer name input (enter key to rename)
    const layerNameInput = document.getElementById('layerNameInput');
    if (layerNameInput) {
        layerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renameCurrentLayer();
            }
        });
        
        // Set the placeholder to show the current layer name
        if (layers && layers[currentLayerIndex]) {
            layerNameInput.placeholder = `Rename: ${layers[currentLayerIndex].name}`;
        }
        
        debugLog("Layer name input listener attached");
    }
    
    // Add event listeners for layer buttons
    const addLayerBtn = document.querySelector('button[onclick="addLayer()"]');
    if (addLayerBtn) {
        addLayerBtn.onclick = null; // Remove inline handler
        addLayerBtn.addEventListener('click', addLayer);
        debugLog("Add layer button listener attached");
    }
    
    const deleteLayerBtn = document.querySelector('button[onclick="deleteLayer()"]');
    if (deleteLayerBtn) {
        deleteLayerBtn.onclick = null; // Remove inline handler
        deleteLayerBtn.addEventListener('click', deleteLayer);
        debugLog("Delete layer button listener attached");
    }
    
    // Add Rename Layer button next to Add Layer
    const renameLayerBtn = document.createElement('button');
    renameLayerBtn.textContent = 'Rename Layer';
    renameLayerBtn.addEventListener('click', renameCurrentLayer);
    
    // Insert after the Add Layer button
    if (addLayerBtn && addLayerBtn.parentNode) {
        addLayerBtn.parentNode.insertBefore(renameLayerBtn, addLayerBtn.nextSibling);
        debugLog("Rename layer button added");
    }
    
    // Add event listeners for modals
    const closeButtons = document.querySelectorAll('.close');
    if (closeButtons.length > 0) {
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modalId = this.closest('.modal').id;
                document.getElementById(modalId).style.display = 'none';
                debugLog("Modal closed: " + modalId);
            });
        });
        debugLog("Modal close button listeners attached");
    } else {
        debugLog("Modal close buttons not found", "warn");
    }
    
    // Add event listener for applying code
    const applyCodeBtn = document.querySelector('#editorActions button:last-child');
    if (applyCodeBtn) {
        applyCodeBtn.onclick = null; // Remove inline handler
        applyCodeBtn.addEventListener('click', applyCode);
        debugLog("Apply Code button listener attached");
    } else {
        debugLog("Apply Code button not found", "warn");
    }
    
    // Ensure the overlay closes the editor
    const editorOverlay = document.getElementById('editorOverlay');
    if (editorOverlay) {
        editorOverlay.onclick = null; // Remove inline handler
        editorOverlay.addEventListener('click', closeEditor);
        debugLog("Editor overlay listener attached");
    } else {
        debugLog("Editor overlay not found", "warn");
    }
    
    debugLog("All event listeners set up", "success");
}

// Run the code in the preview iframe
function runCode() {
    try {
        console.log("Running code");
        const currentTab = getCurrentTab();
        if (!currentTab) {
            console.error("No current tab found");
            return;
        }
        
        // Just update the preview with the current tab's content
        updatePreview();
        console.log("Code executed successfully");
    } catch (error) {
        console.error("Error running code:", error);
    }
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

// Server-side storage functions
function openSaveToServerModal() {
    const modal = document.getElementById('saveToServerModal');
    const saveNameInput = document.getElementById('saveName');
    
    // Generate a default name
    const defaultName = `HTML Layers ${new Date().toLocaleDateString()}`;
    saveNameInput.value = defaultName;
    
    modal.style.display = 'block';
}

function closeSaveToServerModal() {
    document.getElementById('saveToServerModal').style.display = 'none';
}

async function saveLayersToServer() {
    try {
        const saveName = document.getElementById('saveName').value.trim();
        
        if (!saveName) {
            alert('Please enter a name for your save file');
            return;
        }
        
        // Prepare the data to save
        const layersData = {
            layers: layers,
            currentLayerIndex: currentLayerIndex,
            savedAt: new Date().toISOString()
        };
        
        // Call the server API
        const response = await fetch('/api/layers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                layersData,
                name: saveName
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save to server');
        }
        
        const result = await response.json();
        closeSaveToServerModal();
        alert(`Saved successfully to server as "${saveName}"`);
    } catch (error) {
        alert(`Error saving to server: ${error.message}`);
    }
}

function openLoadFromServerModal() {
    const modal = document.getElementById('loadFromServerModal');
    modal.style.display = 'block';
    loadSavedFilesList();
}

function closeLoadFromServerModal() {
    document.getElementById('loadFromServerModal').style.display = 'none';
}

async function loadSavedFilesList() {
    const filesList = document.getElementById('savedFilesList');
    filesList.innerHTML = '<p>Loading saved files...</p>';
    
    try {
        const response = await fetch('/api/layers');
        
        if (!response.ok) {
            throw new Error('Failed to fetch saved files');
        }
        
        const savedFiles = await response.json();
        
        if (savedFiles.length === 0) {
            filesList.innerHTML = '<p>No saved files found</p>';
            return;
        }
        
        filesList.innerHTML = '';
        
        savedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'saved-file-item';
            fileItem.onclick = () => loadLayersFromServer(file.filename);
            
            const fileName = document.createElement('h3');
            fileName.textContent = file.name;
            
            const fileDate = document.createElement('div');
            fileDate.className = 'saved-file-date';
            fileDate.textContent = new Date(file.lastModified).toLocaleString();
            
            fileItem.appendChild(fileName);
            fileItem.appendChild(fileDate);
            
            filesList.appendChild(fileItem);
        });
    } catch (error) {
        filesList.innerHTML = `<p>Error loading saved files: ${error.message}</p>`;
    }
}

async function loadLayersFromServer(filename) {
    try {
        const response = await fetch(`/api/layers/${filename}`);
        
        if (!response.ok) {
            throw new Error('Failed to load file from server');
        }
        
        const data = await response.json();
        
        if (data && data.layers && Array.isArray(data.layers)) {
            // Confirm before loading
            if (confirm('Are you sure you want to load this file? Your current work will be replaced.')) {
                // Load the layers data
                layers = data.layers;
                currentLayerIndex = data.currentLayerIndex || 0;
                
                // Update UI
                updateLayerSelector();
                renderTabs();
                updatePreview();
                
                // Also save to localStorage as a backup
                saveToLocalStorage();
                
                closeLoadFromServerModal();
                alert('Successfully loaded from server');
            }
        } else {
            throw new Error('Invalid file format');
        }
    } catch (error) {
        alert(`Error loading from server: ${error.message}`);
    }
}

// Auto-save setup - Improved
function setupAutoSave() {
    // Set up MutationObserver to detect changes in the DOM
    const observer = new MutationObserver(() => {
        saveToLocalStorage();
    });
    
    // Observe the entire document for changes that might affect state
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
    
    // Listen for layer and tab changes
    const layerSelector = document.getElementById('layerSelector');
    if (layerSelector) {
        layerSelector.addEventListener('change', () => saveToLocalStorage());
    }
    
    // Also set up interval saving as a backup
    setInterval(saveToLocalStorage, 3000);
    
    // Listen for editor changes
    const htmlEditor = document.getElementById('htmlEditor');
    if (htmlEditor) {
        htmlEditor.addEventListener('input', () => saveToLocalStorage());
    }
    
    console.log("Enhanced auto-save functionality enabled with server backup");
}

// Fullscreen toggle function for Three.js and WebGL content
function toggleFullscreen() {
    const preview = document.getElementById('preview');
    const previewContainer = document.getElementById('previewContainer');
    
    if (!preview || !previewContainer) {
        console.error("Preview elements not found");
        return;
    }
    
    try {
        // Try to request fullscreen on the iframe's content first (for canvas fullscreen)
        const iframeWindow = preview.contentWindow;
        if (iframeWindow) {
            const iframeDoc = preview.contentDocument || iframeWindow.document;
            const canvas = iframeDoc.querySelector('canvas');
            
            if (canvas) {
                // Request fullscreen on the canvas inside iframe
                if (canvas.requestFullscreen) {
                    canvas.requestFullscreen();
                } else if (canvas.webkitRequestFullscreen) {
                    canvas.webkitRequestFullscreen();
                } else if (canvas.mozRequestFullScreen) {
                    canvas.mozRequestFullScreen();
                } else if (canvas.msRequestFullscreen) {
                    canvas.msRequestFullscreen();
                } else {
                    // Fallback to container fullscreen
                    requestContainerFullscreen();
                }
                return;
            }
        }
        
        // Fallback: fullscreen the preview container
        requestContainerFullscreen();
    } catch (error) {
        console.error("Error toggling fullscreen:", error);
        // Fallback to container fullscreen
        requestContainerFullscreen();
    }
}

function requestContainerFullscreen() {
    const previewContainer = document.getElementById('previewContainer');
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && !document.msFullscreenElement) {
        // Enter fullscreen
        if (previewContainer.requestFullscreen) {
            previewContainer.requestFullscreen();
        } else if (previewContainer.webkitRequestFullscreen) {
            previewContainer.webkitRequestFullscreen();
        } else if (previewContainer.mozRequestFullScreen) {
            previewContainer.mozRequestFullScreen();
        } else if (previewContainer.msRequestFullscreen) {
            previewContainer.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Add keyboard shortcut for fullscreen (F11)
document.addEventListener('keydown', function(e) {
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
});

function initApp() {
    console.log("Initializing application");
    
    // Try to restore from localStorage first
    restoreFromLocalStorage();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI components
    if (!layers || layers.length === 0) {
        console.warn("No layers found, creating default layer");
        // Create a default layer if none exists
        layers = [
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
        currentLayerIndex = 0;
    }
    
    // If the layer has no tabs, add a default tab
    const currentLayer = layers[currentLayerIndex];
    if (!currentLayer.tabs || currentLayer.tabs.length === 0) {
        console.warn("Current layer has no tabs, adding default tab");
        currentLayer.tabs = [
            {
                id: "tab1",
                name: "Untitled",
                content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>Welcome to HTML Viewer</h1>\n    <p>Edit the code to see your changes in real-time!</p>\n</body>\n</html>"
            }
        ];
        currentLayer.activeTabId = "tab1";
    }
    
    // Update the UI
    updateLayerSelector();
    renderTabs();
    updatePreview();
    
    // Setup automatic saving
    setupAutoSave();
    
    console.log("Application initialized successfully");
}

// Layer Management Functions
function addLayer() {
    const layerNameInput = document.getElementById('layerNameInput');
    const layerName = layerNameInput.value.trim() || `Layer ${layers.length + 1}`;
    layerNameInput.value = '';
    
    debugLog(`Adding new layer: ${layerName}`);
    
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
    saveToLocalStorage(); // Ensure the new layer is saved immediately
    debugLog(`Layer "${layerName}" added successfully`, "success");
}

// Add this new function to rename the current layer
function renameCurrentLayer() {
    const layerNameInput = document.getElementById('layerNameInput');
    const newName = layerNameInput.value.trim();
    
    if (!newName) {
        debugLog("Layer name cannot be empty", "warn");
        return;
    }
    
    debugLog(`Renaming current layer to: ${newName}`);
    
    // Update the current layer's name
    layers[currentLayerIndex].name = newName;
    
    // Clear the input field
    layerNameInput.value = '';
    
    // Update the UI
    updateLayerSelector();
    document.getElementById('layerSelector').value = currentLayerIndex;
    
    saveToLocalStorage();
    debugLog(`Layer renamed to "${newName}" successfully`, "success");
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
    if (!layers[layerIndex]) {
        console.error(`Layer index ${layerIndex} does not exist`);
        return;
    }
    
    // Log the layer switch but don't force the debug panel to show
    console.log(`Switching to layer ${layerIndex}: ${layers[layerIndex].name}`);
    
    // Update the current layer
    currentLayerIndex = parseInt(layerIndex);
    
    // Update the layer name input placeholder to show current name
    const layerNameInput = document.getElementById('layerNameInput');
    if (layerNameInput) {
        layerNameInput.placeholder = `Rename: ${layers[currentLayerIndex].name}`;
        layerNameInput.value = '';  // Clear the input field
    }
    
    // Update tabs display
    renderTabs();
    
    // Update the preview
    updatePreview();
    
    // Save to localStorage
    saveToLocalStorage();
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
        saveToLocalStorage(); // Save after deletion
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
        tabTitle.title = "Double-click to rename"; // Add tooltip
        
        // Add double-click event for inline renaming
        tabTitle.ondblclick = (e) => {
            e.stopPropagation();
            promptRenameTab(tab.id);
        };
        
        // Create rename button
        const tabRename = document.createElement('div');
        tabRename.className = 'tab-rename';
        tabRename.innerHTML = 'Ô£Ä'; // Pencil icon
        tabRename.title = "Rename tab";
        tabRename.onclick = (e) => {
            e.stopPropagation();
            promptRenameTab(tab.id);
        };
        
        const tabClose = document.createElement('div');
        tabClose.className = 'tab-close';
        tabClose.innerHTML = '&times;';
        tabClose.title = "Close tab";
        tabClose.onclick = (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        };
        
        tabElement.appendChild(tabTitle);
        
        // Add rename button
        tabElement.appendChild(tabRename);
        
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
    
    // Prompt for a tab name immediately
    const tabName = prompt("Enter a name for the new tab:", "Untitled");
    const validTabName = tabName && tabName.trim() !== '' ? tabName.trim() : "Untitled";
    
    currentLayer.tabs.push({
        id: newId,
        name: validTabName,
        content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>" + validTabName + "</title>\n</head>\n<body>\n    <h1>" + validTabName + "</h1>\n    <p>Start creating content in this tab!</p>\n</body>\n</html>"
    });
    
    currentLayer.activeTabId = newId;
    
    renderTabs();
    updatePreview();
    saveToLocalStorage(); // Ensure immediate save
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
    saveToLocalStorage(); // Ensure immediate save
}

function switchTab(tabId) {
    const currentLayer = layers[currentLayerIndex];
    currentLayer.activeTabId = tabId;
    
    renderTabs();
    updatePreview();
    saveToLocalStorage(); // Ensure immediate save
}

function renameCurrentTab(newName) {
    const currentTab = getCurrentTab();
    currentTab.name = newName;
    renderTabs();
    saveToLocalStorage(); // Ensure immediate save
}

// Editor Functions
function openEditor() {
    debugLog("Opening editor");
    const currentTab = getCurrentTab();
    if (!currentTab) {
        debugLog("No current tab found", "error");
        return;
    }
    
    const htmlEditor = document.getElementById('htmlEditor');
    if (htmlEditor) {
        htmlEditor.value = currentTab.content;
        document.getElementById('editorPopup').style.display = 'flex';
        document.getElementById('editorOverlay').style.display = 'block';
        document.getElementById('errorOutput').style.display = 'none';
        debugLog("Editor opened with content", "success");
    } else {
        debugLog("HTML editor element not found", "error");
    }
}

function closeEditor() {
    document.getElementById('editorPopup').style.display = 'none';
    document.getElementById('editorOverlay').style.display = 'none';
}

function applyCode() {
    const htmlEditor = document.getElementById('htmlEditor');
    const errorOutput = document.getElementById('errorOutput');
    
    if (!htmlEditor) {
        console.error("HTML editor element not found");
        return;
    }
    
    try {
        // Get the current tab
        const currentTab = getCurrentTab();
        if (!currentTab) {
            throw new Error("No current tab found");
        }
        
        // Log the code application but don't force the debug panel to show
        console.log(`Applying code to tab: ${currentTab.name}`);
        
        // Update the content
        currentTab.content = htmlEditor.value;
        
        // Update the preview
        updatePreview();
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Close the editor
        closeEditor();
        
        console.log("Code applied successfully");
    } catch (error) {
        console.error("Error applying code:", error);
        
        // Show error in the error output
        if (errorOutput) {
            errorOutput.textContent = error.message;
            errorOutput.style.display = 'block';
        }
    }
}

function updatePreview() {
    const currentTab = getCurrentTab();
    if (!currentTab) {
        console.error("No current tab found for preview update");
        return;
    }
    
    // Log the preview update but don't force the debug panel to show
    console.log(`Updating preview for tab: ${currentTab.name}`);
    
    // Get the iframe element
    const preview = document.getElementById('preview');
    if (!preview) {
        console.error("Preview iframe not found");
        return;
    }
    
    // Enhanced method for Three.js support: Use srcdoc for better script execution
    // This ensures all scripts, including external CDN scripts and ES6 modules, execute properly
    preview.srcdoc = currentTab.content;
    
    // Set up iframe load handler for Three.js compatibility checks
    preview.onload = function() {
        try {
            const iframeWindow = preview.contentWindow;
            const iframeDocument = preview.contentDocument || iframeWindow.document;
            
            // Check WebGL support and log for debugging
            const canvas = iframeDocument.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            const gl2 = canvas.getContext('webgl2');
            
            if (gl) {
                console.log("Ô£à WebGL 1.0 supported in iframe");
            } else {
                console.warn("ÔÜá´©Å WebGL 1.0 not supported in iframe");
            }
            
            if (gl2) {
                console.log("Ô£à WebGL 2.0 supported in iframe");
            } else {
                console.log("Ôä╣´©Å WebGL 2.0 not available (WebGL 1.0 may still work)");
            }
            
            // Enable fullscreen support for canvas elements
            if (iframeDocument.documentElement.requestFullscreen) {
                // Fullscreen API is available
                console.log("Ô£à Fullscreen API supported");
            }
            
            // Handle fullscreen requests from within iframe
            iframeDocument.addEventListener('fullscreenchange', function() {
                console.log("Fullscreen state changed in iframe");
            });
            
            // Support for ES6 modules - ensure module scripts execute
            const moduleScripts = iframeDocument.querySelectorAll('script[type="module"]');
            if (moduleScripts.length > 0) {
                console.log(`Ô£à Found ${moduleScripts.length} ES6 module script(s)`);
            }
            
            // Log any console errors from iframe for debugging
            const originalConsoleError = iframeWindow.console.error;
            iframeWindow.console.error = function(...args) {
                originalConsoleError.apply(iframeWindow.console, args);
                debugLog(`[IFRAME ERROR] ${args.join(' ')}`, 'error');
            };
            
            // Log WebGL context errors
            if (gl) {
                const originalGetError = gl.getError;
                gl.getError = function() {
                    const error = originalGetError.call(gl);
                    if (error !== gl.NO_ERROR) {
                        debugLog(`[WebGL Error] ${error}`, 'error');
                    }
                    return error;
                };
            }
            
            console.log("Preview updated successfully with Three.js support");
        } catch (error) {
            console.error("Error accessing iframe document:", error);
            debugLog(`Error in preview update: ${error.message}`, 'error');
        }
    };
    
    // If iframe is already loaded, trigger the onload handler
    if (preview.contentDocument && preview.contentDocument.readyState === 'complete') {
        preview.onload();
    }
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
        debugLog("Attempting to import data");
        const importString = document.getElementById('importExportTextarea').value;
        if (!importString || importString.trim() === '') {
            debugLog("Import data is empty", "warn");
            alert("Please enter valid data to import");
            return;
        }
        
        // Parse the JSON data
        let importedData;
        try {
            importedData = JSON.parse(importString);
            debugLog("JSON data parsed successfully");
        } catch (parseError) {
            debugLog("Failed to parse JSON: " + parseError.message, "error");
            alert("Error parsing JSON data: " + parseError.message);
            return;
        }
        
        // Validate the imported data structure
        if (!importedData) {
            debugLog("Imported data is null or undefined", "error");
            alert("Invalid import data: Data is empty");
            return;
        }
        
        // Check if it's the expected format with layers
        if (!importedData.layers) {
            debugLog("Imported data missing layers property", "error");
            
            // Handle possible legacy format
            if (Array.isArray(importedData)) {
                debugLog("Legacy array format detected, attempting conversion");
                importedData = { layers: importedData, currentLayerIndex: 0 };
            } else {
                alert("Invalid import data format: Missing layers array");
                return;
            }
        }
        
        // Ensure layers is an array
        if (!Array.isArray(importedData.layers)) {
            debugLog("Layers property is not an array", "error");
            alert("Invalid import data format: Layers is not an array");
            return;
        }
        
        // Ensure the array is not empty
        if (importedData.layers.length === 0) {
            debugLog("Layers array is empty", "error");
            alert("Invalid import data: No layers found");
            return;
        }
        
        // Validate each layer has the required properties
        for (let i = 0; i < importedData.layers.length; i++) {
            const layer = importedData.layers[i];
            
            if (!layer.name) {
                debugLog(`Layer at index ${i} missing name property`, "warn");
                layer.name = `Layer ${i + 1}`;
            }
            
            if (!Array.isArray(layer.tabs)) {
                debugLog(`Layer at index ${i} has invalid tabs property`, "warn");
                layer.tabs = [{
                    id: `layer${i}_tab1`,
                    name: "Untitled",
                    content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>Imported Layer</h1>\n    <p>This layer was imported but had invalid tab data.</p>\n</body>\n</html>"
                }];
            } else if (layer.tabs.length === 0) {
                debugLog(`Layer at index ${i} has empty tabs array`, "warn");
                layer.tabs.push({
                    id: `layer${i}_tab1`,
                    name: "Untitled",
                    content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>HTML Content</title>\n</head>\n<body>\n    <h1>Imported Layer</h1>\n    <p>This layer was imported but had no tabs.</p>\n</body>\n</html>"
                });
            }
            
            // Ensure each layer has an activeTabId set
            if (!layer.activeTabId || !layer.tabs.find(tab => tab.id === layer.activeTabId)) {
                debugLog(`Layer at index ${i} has invalid activeTabId`, "warn");
                layer.activeTabId = layer.tabs[0].id;
            }
        }
        
        // Everything validated, apply the import
        debugLog("Valid data found, importing...");
        layers = importedData.layers;
        currentLayerIndex = importedData.currentLayerIndex || 0;
        
        // Ensure currentLayerIndex is valid
        if (currentLayerIndex >= layers.length) {
            debugLog("Imported currentLayerIndex out of bounds, resetting to 0", "warn");
            currentLayerIndex = 0;
        }
        
        // Update UI
        updateLayerSelector();
        
        // Make sure the UI reflects the loaded data
        const layerSelector = document.getElementById('layerSelector');
        if (layerSelector) {
            layerSelector.value = currentLayerIndex;
            debugLog("Updated layer selector to index " + currentLayerIndex);
        }
        
        renderTabs();
        updatePreview();
        saveToLocalStorage();
        
        closeImportExportModal();
        debugLog("Import completed successfully", "success");
        alert("Data imported successfully!");
    } catch (error) {
        debugLog("Unhandled import error: " + error.message, "error");
        alert("Error importing data: " + error.message);
    }
}

function closeImportExportModal() {
    document.getElementById('importExportModal').style.display = 'none';
}

// Local Storage Functions - Enhanced
function saveToLocalStorage() {
    try {
        const dataToSave = {
            layers: layers,
            currentLayerIndex: currentLayerIndex
        };
        
        localStorage.setItem('htmlLayerEditorData', JSON.stringify(dataToSave));
        console.log("Auto-saved to localStorage:", new Date().toLocaleTimeString());
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
}

function restoreFromLocalStorage() {
    try {
        console.log("Attempting to restore data from localStorage");
        const savedData = localStorage.getItem('htmlLayerEditorData');
        
        if (!savedData) {
            console.warn("No saved data found in localStorage");
            return false;
        }
        
        try {
            const parsedData = JSON.parse(savedData);
            
            if (parsedData && parsedData.layers && Array.isArray(parsedData.layers)) {
                console.log("Valid data found in localStorage, restoring...");
                layers = parsedData.layers;
                currentLayerIndex = parsedData.currentLayerIndex || 0;
                
                if (currentLayerIndex >= layers.length) {
                    currentLayerIndex = 0;
                }
                
                console.log("Successfully restored data from localStorage");
                return true;
            } else {
                console.warn("Invalid data format in localStorage", parsedData);
                return false;
            }
        } catch (parseError) {
            console.error("Error parsing localStorage data:", parseError);
            return false;
        }
    } catch (error) {
        console.error("Error accessing localStorage:", error);
        return false;
    }
}

// Utility functions
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

// Initialize the app on window load
window.addEventListener('load', () => {
    // Apply settings if available
    const settings = JSON.parse(localStorage.getItem('htmlViewerSettings'));
    if (settings) {
        applySettings(settings);
    }
    
    // Check for shared data
    checkUrlForSharedData();
    
    // Initialize the app
    initApp();
});

// Add this new function for tab renaming
function promptRenameTab(tabId) {
    const currentLayer = layers[currentLayerIndex];
    const tab = currentLayer.tabs.find(tab => tab.id === tabId);
    
    if (!tab) {
        console.error("Tab not found for renaming");
        return;
    }
    
    const newName = prompt("Enter a new name for this tab:", tab.name);
    
    if (newName !== null && newName.trim() !== '') {
        tab.name = newName.trim();
        renderTabs();
        saveToLocalStorage(); // Save the renamed tab
        console.log(`Tab renamed to: ${newName}`);
    }
} 
