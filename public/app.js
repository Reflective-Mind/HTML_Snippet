// State management
let currentPage = localStorage.getItem('currentPage') || 'home';
let token = localStorage.getItem('token');
let userRole = localStorage.getItem('userRole');
let isPreviewMode = false;
let isDragging = false;
let isResizing = false;
let updateTimeout = null;
let navButtons = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginFormContainer = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const publicView = document.getElementById('public-view');
const pagesNav = document.getElementById('pages-nav');
const content = document.getElementById('content');
const publicContent = document.getElementById('public-content');
const adminToolbar = document.getElementById('admin-toolbar');

// Toggle between login and register forms
function toggleRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Show appropriate view based on authentication
async function updateView() {
    console.log('Updating view. Token:', !!token, 'Role:', userRole, 'Current Page:', currentPage);
    
    if (!token) {
        try {
            console.log('No token, attempting to load default page');
            const response = await fetch('/api/pages');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const pages = await response.json();
            console.log('Available pages:', pages);
            
            const defaultPage = pages.find(p => p.isDefault) || pages.find(p => p.id === 'home') || pages[0];
            console.log('Selected default page:', defaultPage);
            
            if (defaultPage) {
                loginFormContainer.style.display = 'none';
                adminPanel.style.display = 'none';
                publicView.style.display = 'block';
                adminToolbar.style.display = 'none';
                
                publicView.innerHTML = `
                    <div class="text-end p-2">
                        <button class="btn btn-outline-primary btn-sm" onclick="showLoginForm()">Login</button>
                    </div>
                    <div id="public-content"></div>
                `;
                
                await loadPublicPage(defaultPage.id);
            } else {
                throw new Error('No pages available');
            }
        } catch (error) {
            console.error('Error loading default page:', error);
            loginFormContainer.style.display = 'block';
            adminPanel.style.display = 'none';
            publicView.style.display = 'none';
            adminToolbar.style.display = 'none';
            showAlert('Error loading page: ' + error.message, 'danger');
        }
        return;
    }

    loginFormContainer.style.display = 'none';
    
    // Show navigation buttons for all authenticated users
    const isAdmin = userRole === 'admin';
    const navButtons = await getNavigationButtons();
    
    if (isAdmin) {
        adminPanel.style.display = 'block';
        publicView.style.display = 'none';
        adminToolbar.style.display = 'flex';
        document.getElementById('addNavBtn').style.display = 'inline-block';
        isPreviewMode = false;
        await loadPages();
        await loadPageContent(currentPage);
    } else {
        adminPanel.style.display = 'none';
        publicView.style.display = 'block';
        adminToolbar.style.display = 'none';
        
        publicView.innerHTML = `
            <div class="bg-light p-2 d-flex justify-content-between align-items-center" style="position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: transparent !important;">
                <div class="nav-buttons">
                    ${navButtons}
                </div>
                <div class="d-flex align-items-center">
                    <span class="me-3">Welcome, ${localStorage.getItem('username') || 'User'}</span>
                    <button class="btn btn-danger btn-sm rounded-circle" style="width: 32px; height: 32px; padding: 0; margin: 8px;" onclick="logout()" title="Logout">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div id="public-content" style="padding-top: 48px;"></div>
        `;
        
        const pages = await makeRequest('/api/pages');
        const defaultPage = pages.find(p => p.isDefault) || pages[0];
        if (defaultPage) {
            await loadPublicPage(defaultPage.id);
        } else {
            showAlert('No pages available', 'warning');
        }
    }
}

// Helper function to get navigation buttons HTML
async function getNavigationButtons() {
    try {
        const pages = await makeRequest('/api/pages');
        return pages.map(page => {
            // Randomly assign either futuristic or neon style for demo
            const buttonStyle = Math.random() > 0.5 ? 'futuristic' : 'neon';
            const pulseEffect = Math.random() > 0.7 ? ' pulse' : '';
            
            return `
                <button 
                    class="nav-button ${buttonStyle}${pulseEffect}" 
                    onclick="navigateToPage('${page.id}')"
                >
                    ${page.name}
                </button>
            `;
        }).join('');
    } catch (error) {
        console.error('Error getting navigation buttons:', error);
        return '';
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        const data = await response.json();
        
        // Store all user data
        token = data.token;
        userRole = data.role;
        currentPage = data.defaultPage || 'home';
        
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('currentPage', currentPage);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('username', data.username);
        
        console.log('Login successful:', {
            username: data.username,
            role: userRole,
            defaultPage: currentPage
        });

        // Update view based on user role
        if (userRole === 'admin') {
            showAdminPanel();
            loadAdminDashboard();
        } else {
            showPublicView();
            loadPublicPage(currentPage);
        }

        return true;
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message, 'danger');
        return false;
    }
}

async function loadAdminDashboard() {
    try {
        const response = await makeRequest('/api/admin');
        if (response.ok) {
            const data = await response.json();
            renderAdminDashboard(data);
        } else {
            throw new Error('Failed to load admin dashboard');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showAlert('Failed to load admin dashboard', 'error');
    }
}

function renderAdminDashboard(data) {
    // Clear existing dashboard elements first
    const existingDashboard = document.querySelector('.admin-stats');
    if (existingDashboard) {
        existingDashboard.remove();
    }

    // Create new dashboard container
    const dashboard = document.createElement('div');
    dashboard.className = 'admin-stats';
    dashboard.innerHTML = `
        <h2>Dashboard Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Total Users</span>
                <span class="stat-value">${data.stats.users}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Pages</span>
                <span class="stat-value">${data.stats.pages}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settings</span>
                <span class="stat-value">${data.stats.settings}</span>
            </div>
        </div>
    `;

    // Insert the dashboard at the beginning of the content area
    const contentArea = document.getElementById('content');
    contentArea.insertBefore(dashboard, contentArea.firstChild);
}

function showAdminPanel() {
    // Clear existing content
    loginFormContainer.style.display = 'none';
    publicView.style.display = 'none';
    
    // Clear any existing dashboard content
    const content = document.getElementById('content');
    if (content) {
        content.innerHTML = '';
    }
    
    // Show admin panel and toolbar
    adminToolbar.style.display = 'flex';
    adminPanel.style.display = 'block';
    
    // Load fresh admin dashboard data
    loadAdminDashboard();
    loadPages();
}

function showPublicView() {
    loginFormContainer.style.display = 'none';
    adminToolbar.style.display = 'none';
    adminPanel.style.display = 'none';
    publicView.style.display = 'block';
}

// Register function
async function register(email, password) {
    try {
        const username = document.getElementById('regUsername').value.trim();
        
        if (!username) {
            throw new Error('Username is required');
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        showAlert('Registration successful! Please login.', 'success');
        toggleRegister(); // Switch back to login form
        
        // Clear the registration form
        document.getElementById('regEmail').value = '';
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.', 'danger');
    }
}

// API calls with error handling
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                token = null;
                userRole = null;
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                updateView();
                throw new Error('Session expired. Please login again.');
            }
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function getCurrentPage() {
    return await makeRequest(`/api/pages/${currentPage}`);
}

async function updatePage(pageData) {
    return await makeRequest(`/api/pages/${currentPage}`, {
        method: 'PUT',
        body: JSON.stringify(pageData)
    });
}

async function loadPageContent(pageId) {
    try {
        const page = await makeRequest(`/api/pages/${pageId}`);
        if (!page) {
            throw new Error('Page not found');
        }

        // Update current page
        currentPage = pageId;
        
        // Render content
        renderSnippets(page.snippets || [], page.navButtons || []);

        // Update page navigation buttons
        const pageButtons = pagesNav.querySelectorAll('.page-button');
        pageButtons.forEach(btn => {
            const isActive = btn.textContent.trim().toLowerCase() === pageId.toLowerCase();
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-primary', !isActive);
        });
    } catch (error) {
        showAlert(`Failed to load page: ${error.message}`, 'danger');
        console.error('Page loading error:', error);
    }
}

async function switchPage(pageId) {
    try {
        if (isDragging || isResizing) return;
        
        currentPage = pageId;
        await loadPageContent(pageId);
        
        const buttons = pagesNav.querySelectorAll('.page-button');
        buttons.forEach(btn => {
            const isActive = btn.textContent.trim() === pageId;
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-primary', !isActive);
        });
    } catch (error) {
        showAlert(`Failed to switch page: ${error.message}`, 'danger');
    }
}

async function loadPages() {
    try {
        const pages = await makeRequest('/api/pages');
        if (!pages || !Array.isArray(pages)) {
            throw new Error('Invalid pages data received');
        }
        window.availablePages = pages; // Store pages for navigation buttons
        renderPages(pages);
        return pages;
    } catch (error) {
        showAlert(`Failed to load pages: ${error.message}`, 'danger');
        console.error('Load pages error:', error);
        if (error.message.includes('Session expired')) {
            return [];
        }
    }
}

async function createPage(name) {
    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        
        // Check if page exists first
        const pages = await loadPages();
        if (pages.some(p => p.id === id)) {
            throw new Error('Page with this ID already exists');
        }

        const response = await makeRequest('/api/pages', {
            method: 'POST',
            body: JSON.stringify({
                id,
                name,
                snippets: []
            })
        });

        showAlert('Page created successfully!', 'success');
        await loadPages(); // Refresh the page list
        return response;
    } catch (error) {
        showAlert(`Failed to create page: ${error.message}`, 'danger');
        throw error;
    }
}

function showCreatePageModal() {
    const modalHtml = `
        <div class="modal fade" id="createPageModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Create New Page</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="newPageName">Page Name:</label>
                            <input type="text" class="form-control" id="newPageName" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmCreatePage">Create</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('createPageModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Get modal element
    const modalElement = document.getElementById('createPageModal');
    const modal = new bootstrap.Modal(modalElement);

    // Handle create button click
    document.getElementById('confirmCreatePage').addEventListener('click', async () => {
        const nameInput = document.getElementById('newPageName');
        const name = nameInput.value.trim();

        if (name) {
            try {
                await createPage(name);
                modal.hide();
            } catch (error) {
                // Error is already handled in createPage function
            }
        } else {
            showAlert('Please enter a page name', 'warning');
        }
    });

    // Show modal
    modal.show();

    // Focus on input
    modalElement.addEventListener('shown.bs.modal', () => {
        document.getElementById('newPageName').focus();
    });

    // Clean up on modal hide
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });
}

// Update the event listener for the Add Page button
document.getElementById('addPageBtn').addEventListener('click', () => {
    showCreatePageModal();
});

async function addSnippet(html) {
    try {
        const page = await getCurrentPage();
        const newSnippet = {
            id: Date.now(),
            html,
            position: { x: 20, y: 20 },
            size: { width: 400, height: 300 }
        };
        
        const updatedSnippets = [...(page.snippets || []), newSnippet];
        await updatePage({ ...page, snippets: updatedSnippets });
        await loadPageContent(currentPage);
        showAlert('Snippet added successfully', 'success');
    } catch (error) {
        showAlert(`Failed to add snippet: ${error.message}`, 'danger');
    }
}

async function editSnippet(snippetId) {
    try {
        const page = await getCurrentPage();
        const snippet = page.snippets.find(s => s.id === snippetId);
        if (!snippet) throw new Error('Snippet not found');

        const newHtml = prompt('Edit HTML:', snippet.html);
        if (newHtml === null) return;

        const updatedSnippets = page.snippets.map(s => 
            s.id === snippetId ? { ...s, html: newHtml } : s
        );
        
        await updatePage({ ...page, snippets: updatedSnippets });
        await loadPageContent(currentPage);
        showAlert('Snippet updated successfully', 'success');
    } catch (error) {
        showAlert(`Failed to edit snippet: ${error.message}`, 'danger');
    }
}

async function deleteSnippet(snippetId) {
    try {
        if (!confirm('Are you sure you want to delete this snippet?')) return;
        
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        const updatedSnippets = page.snippets.filter(s => s.id !== snippetId);
        await updatePage({ ...page, snippets: updatedSnippets });
        await loadPageContent(currentPage);
        showAlert('Snippet deleted successfully', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showAlert(`Failed to delete snippet: ${error.message}`, 'danger');
    }
}

function renderPages(pages) {
    pagesNav.innerHTML = pages.map(page => `
        <button 
            class="btn ${currentPage === page.id ? 'btn-primary' : 'btn-outline-primary'} page-button"
            onclick="switchPage('${page.id}')"
        >
            ${page.name}
        </button>
    `).join('');
}

function renderSnippets(snippets = [], navButtons = []) {
    const container = isPreviewMode ? publicContent : content;
    
    // First render snippets
    container.innerHTML = snippets.map(snippet => `
        <div class="snippet" id="snippet-${snippet.id}" 
            style="left: ${snippet.position?.x || 0}px; top: ${snippet.position?.y || 0}px; 
                   width: ${snippet.size?.width || 400}px; height: ${snippet.size?.height || 300}px;">
            <div class="snippet-content">
                <iframe
                    id="frame-${snippet.id}"
                    style="width: 100%; height: 100%; border: none;"
                    srcdoc="${snippet.html.replace(/"/g, '&quot;')}"
                    sandbox="allow-scripts allow-same-origin allow-modals"
                ></iframe>
            </div>
            ${!isPreviewMode ? `
                <div class="snippet-controls">
                    <button class="btn btn-sm btn-primary" onclick="editSnippet(${snippet.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSnippet(${snippet.id})">Delete</button>
                </div>
                <div class="resize-handle"></div>
            ` : ''}
        </div>
    `).join('');

    // Then render navigation buttons
    renderNavigationButtons(navButtons);

    if (!isPreviewMode) {
        setupDragAndResize();
    }
}

// Debounce function for position/size updates
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(updateTimeout);
            func(...args);
        };
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(later, wait);
    };
}

// Throttle function for frequent updates
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounced update functions
const debouncedUpdatePosition = debounce(async (snippetId, position) => {
    try {
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        const updatedSnippets = page.snippets.map(s => 
            s.id === snippetId ? { ...s, position } : s
        );

        await updatePage({ ...page, snippets: updatedSnippets });
    } catch (error) {
        console.error('Position update error:', error);
        showAlert('Failed to save position', 'danger');
    }
}, 500);

const debouncedUpdateSize = debounce(async (snippetId, size) => {
    try {
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        const updatedSnippets = page.snippets.map(s => 
            s.id === snippetId ? { ...s, size } : s
        );

        await updatePage({ ...page, snippets: updatedSnippets });
    } catch (error) {
        console.error('Size update error:', error);
        showAlert('Failed to save size', 'danger');
    }
}, 500);

function setupDragAndResize() {
    const snippets = document.querySelectorAll('.snippet');
    snippets.forEach(snippet => {
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startWidth, startHeight, initialX, initialY;

        const onMouseMove = (e) => {
            if (isDragging) {
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                const newX = Math.max(0, initialX + dx);
                const newY = Math.max(0, initialY + dy);
                
                snippet.style.left = `${newX}px`;
                snippet.style.top = `${newY}px`;
                
                // Debounce the position update
                debouncedUpdatePosition(
                    parseInt(snippet.id.split('-')[1]),
                    { x: newX, y: newY }
                );
            } else if (isResizing) {
                e.preventDefault();
                const width = startWidth + (e.clientX - startX);
                const height = startHeight + (e.clientY - startY);
                
                if (width > 200 && height > 100) {
                    snippet.style.width = `${width}px`;
                    snippet.style.height = `${height}px`;
                    
                    // Debounce the size update
                    debouncedUpdateSize(
                        parseInt(snippet.id.split('-')[1]),
                        { width, height }
                    );
                }
            }
        };

        const onMouseUp = () => {
            if (isDragging || isResizing) {
                isDragging = false;
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        snippet.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) {
                isResizing = true;
                startWidth = snippet.offsetWidth;
                startHeight = snippet.offsetHeight;
                startX = e.clientX;
                startY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            } else if (!e.target.closest('.snippet-controls')) {
                isDragging = true;
                initialX = snippet.offsetLeft;
                initialY = snippet.offsetTop;
                startX = e.clientX;
                startY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        });
    });
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Event Handlers
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'danger');
        return;
    }
    
    await register(email, password);
});

document.getElementById('addSnippetBtn').addEventListener('click', () => {
    const html = prompt('Enter HTML code for the snippet:');
    if (html) addSnippet(html);
});

document.getElementById('previewBtn').addEventListener('click', async () => {
    isPreviewMode = !isPreviewMode;
    window.isPreviewMode = isPreviewMode;
    const previewBtn = document.getElementById('previewBtn');
    const adminToolbar = document.getElementById('admin-toolbar');
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    const addPageBtn = document.getElementById('addPageBtn');
    const addNavBtn = document.getElementById('addNavBtn');
    
    previewBtn.textContent = isPreviewMode ? 'Exit Preview' : 'Preview';
    
    addSnippetBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    addPageBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    addNavBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    
    try {
        const page = await getCurrentPage();
        
        if (isPreviewMode) {
            adminPanel.style.display = 'none';
            publicView.style.display = 'block';
            await loadPublicPage(currentPage);
        } else {
            adminPanel.style.display = 'block';
            publicView.style.display = 'none';
            await loadPageContent(currentPage);
        }
    } catch (error) {
        console.error('Error toggling preview mode:', error);
        showAlert('Failed to toggle preview mode', 'danger');
    }
});

document.getElementById('logoutBtn').addEventListener('click', logout);

// Update the navigation functions
function navigateToPage(pageId) {
    console.log('Navigating to page:', pageId);
    if (isPreviewMode || !userRole) {
        loadPublicPage(pageId);
    } else {
        switchPage(pageId);
    }
}

function getAvailablePages() {
    // Return the cached pages or fetch them if not available
    if (!window.availablePages) {
        fetch('/api/pages')
            .then(response => response.json())
            .then(pages => {
                window.availablePages = pages;
                return pages;
            })
            .catch(error => {
                console.error('Error fetching pages:', error);
                return [];
            });
    }
    return window.availablePages || [];
}

async function loadPublicPage(pageId) {
    try {
        console.log('Loading public page:', pageId);
        const response = await fetch(`/api/pages/${pageId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const page = await response.json();
        console.log('Loaded page data:', page);

        // Update current page
        currentPage = pageId;
        localStorage.setItem('currentPage', pageId);
        
        const container = document.getElementById('public-content');
        if (!container) {
            throw new Error('Public content container not found');
        }

        // Clear existing content
        container.innerHTML = '';

        // Add navigation bar for authenticated users
        if (token) {
            const navBar = document.createElement('div');
            navBar.className = 'bg-light p-2 d-flex justify-content-between align-items-center';
            navBar.style.position = 'fixed';
            navBar.style.top = '0';
            navBar.style.left = '0';
            navBar.style.right = '0';
            navBar.style.zIndex = '1000';
            
            // Get all available pages for navigation
            const pages = await makeRequest('/api/pages');
            const navButtons = pages.map(p => `
                <button 
                    class="btn ${p.id === pageId ? 'btn-primary' : 'btn-outline-primary'} btn-sm me-2"
                    onclick="navigateToPage('${p.id}')"
                >
                    ${p.name}
                </button>
            `).join('');
            
            navBar.innerHTML = `
                <div class="nav-buttons">
                    ${navButtons}
                </div>
                <div class="d-flex align-items-center">
                    <span class="me-3">Welcome, ${localStorage.getItem('username') || 'User'}</span>
                    <button class="btn btn-danger btn-sm" onclick="logout()">Logout</button>
                </div>
            `;
            
            container.appendChild(navBar);
            container.style.paddingTop = '60px';
        }
        
        // Render snippets
        if (page.snippets && Array.isArray(page.snippets)) {
            page.snippets.forEach(snippet => {
                const snippetDiv = document.createElement('div');
                snippetDiv.className = 'snippet';
                snippetDiv.style.position = 'absolute';
                snippetDiv.style.left = `${snippet.position?.x || 0}px`;
                snippetDiv.style.top = `${snippet.position?.y || 0}px`;
                snippetDiv.style.width = `${snippet.size?.width || 400}px`;
                snippetDiv.style.height = `${snippet.size?.height || 300}px`;
                
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.srcdoc = snippet.html;
                iframe.sandbox = 'allow-scripts allow-same-origin allow-modals';
                
                snippetDiv.appendChild(iframe);
                container.appendChild(snippetDiv);
            });
        }

        // Render custom navigation buttons
        if (page.navButtons && Array.isArray(page.navButtons)) {
            page.navButtons.forEach(navData => {
                const navButton = document.createElement('div');
                navButton.className = 'draggable-nav-button';
                navButton.style.position = 'absolute';
                navButton.style.left = `${navData.position?.x || 20}px`;
                navButton.style.top = `${navData.position?.y || 20}px`;
                navButton.style.zIndex = '100';

                const button = document.createElement('button');
                button.className = `btn ${navData.style || 'btn-primary'} nav-button`;
                button.textContent = navData.text || 'Go to Home';
                button.onclick = (e) => {
                    e.preventDefault();
                    navigateToPage(navData.targetPage);
                };

                navButton.appendChild(button);
                container.appendChild(navButton);
            });
        }

    } catch (error) {
        console.error('Failed to load public page:', error);
        showAlert('Failed to load page: ' + error.message, 'danger');
    }
}

// Expose functions to iframe context
window.navigateToPage = navigateToPage;
window.getAvailablePages = getAvailablePages;
window.isPreviewMode = isPreviewMode;

// Initialize
updateView();

// Add settings button to admin toolbar
if (adminToolbar) {
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn btn-secondary me-2';
    settingsBtn.textContent = 'Settings';
    settingsBtn.onclick = showSettingsModal;
    adminToolbar.querySelector('.container-fluid div').appendChild(settingsBtn);
}

// Settings management functions
async function showSettingsModal() {
    try {
        const response = await fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settings = await response.json();

        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Admin Settings</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>Note:</strong> Some settings (MongoDB URI, PORT) require server restart to take effect.
                        </div>
                        <form id="settingsForm">
                            ${settings.map(setting => `
                                <div class="mb-3">
                                    <label class="form-label">
                                        ${setting.key}
                                        <small class="text-muted">${setting.description || ''}</small>
                                    </label>
                                    <div class="input-group">
                                        <input type="${setting.key.includes('KEY') || setting.key.includes('SECRET') ? 'password' : 'text'}"
                                               class="form-control"
                                               name="${setting.key}"
                                               value="${setting.value}"
                                               required>
                                        ${setting.key.includes('KEY') || setting.key.includes('SECRET') ? `
                                            <button type="button" class="btn btn-outline-secondary toggle-password">
                                                👁️
                                            </button>
                                        ` : ''}
                                    </div>
                                    <small class="text-muted">
                                        Last updated: ${new Date(setting.lastUpdated).toLocaleString()}
                                        ${setting.updatedBy ? `by ${setting.updatedBy}` : ''}
                                    </small>
                                </div>
                            `).join('')}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                        <button type="button" class="btn btn-primary" onclick="saveSettings(this.closest('.modal'))">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add toggle password visibility handlers
        modal.querySelectorAll('.toggle-password').forEach(btn => {
            btn.onclick = function() {
                const input = this.previousElementSibling;
                input.type = input.type === 'password' ? 'text' : 'password';
                this.textContent = input.type === 'password' ? '👁️' : '🔒';
            };
        });

    } catch (error) {
        console.error('Error showing settings:', error);
        showAlert('Failed to load settings', 'danger');
    }
}

async function saveSettings(modal) {
    try {
        const form = modal.querySelector('#settingsForm');
        const formData = new FormData(form);
        const updates = [];

        for (const [key, value] of formData.entries()) {
            updates.push(
                fetch(`/api/admin/settings/${key}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value })
                })
            );
        }

        await Promise.all(updates);
        modal.remove();
        showAlert('Settings updated successfully', 'success');

        // Show restart notice if necessary settings were changed
        const changedKeys = Array.from(formData.keys());
        if (changedKeys.includes('MONGODB_URI') || changedKeys.includes('PORT')) {
            showAlert('Some changes require server restart to take effect', 'warning');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Failed to save settings', 'danger');
    }
}

// Add function to show login form
function showLoginForm() {
    loginFormContainer.style.display = 'block';
    publicView.style.display = 'none';
}

// Update logout function
function logout() {
    token = null;
    userRole = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
    updateView();
}

// Navigation functions
window.appNavigation = {
    navigateToPage: async function(pageId) {
        try {
            console.log('Navigating to page:', pageId);
            const response = await fetch(`/api/pages/${pageId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const page = await response.json();
            console.log('Loading page:', page);
            
            if (!page) {
                throw new Error('Page not found');
            }

            // Update current page
            currentPage = pageId;

            // Update view based on mode
            if (isPreviewMode || !userRole) {
                await loadPublicPage(pageId);
            } else {
                await loadPageContent(pageId);
            }

            // Update page navigation buttons active state
            const pageButtons = pagesNav.querySelectorAll('.page-button');
            pageButtons.forEach(btn => {
                const isActive = btn.textContent.trim().toLowerCase() === pageId.toLowerCase();
                btn.classList.toggle('btn-primary', isActive);
                btn.classList.toggle('btn-outline-primary', !isActive);
            });

        } catch (error) {
            console.error('Navigation error:', error);
            showAlert('Failed to navigate: ' + error.message, 'danger');
        }
    },

    getPages: async function() {
        try {
            const response = await fetch('/api/pages');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching pages:', error);
            return [];
        }
    }
};

// Function to create draggable navigation buttons
function createDraggableNavButton(navData = null) {
    const container = document.createElement('div');
    container.className = 'draggable-nav-button';
    container.style.position = 'absolute';
    container.style.left = `${navData?.position?.x || 20}px`;
    container.style.top = `${navData?.position?.y || 20}px`;
    container.style.cursor = isPreviewMode ? 'pointer' : 'move';
    container.style.zIndex = '100';
    container.dataset.navId = navData?.id || Date.now().toString();

    const button = document.createElement('button');
    button.className = `nav-button ${navData?.style || 'futuristic'}`;
    button.textContent = navData?.text || 'Go to Home';
    button.dataset.targetPage = navData?.targetPage || 'home';
    
    // Add delete button (only visible in editor mode)
    if (!isPreviewMode) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm delete-nav-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-10px';
        deleteBtn.style.right = '-10px';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.padding = '0';
        deleteBtn.style.display = 'none';
        
        container.appendChild(deleteBtn);

        // Show/hide delete button on hover
        container.addEventListener('mouseenter', () => {
            deleteBtn.style.display = 'block';
        });
        container.addEventListener('mouseleave', () => {
            deleteBtn.style.display = 'none';
        });

        // Delete button click handler
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete this navigation button?')) {
                await deleteNavButton(container.dataset.navId);
            }
        });
    }

    container.appendChild(button);

    // Navigation handling for both preview and editor modes
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetPage = button.dataset.targetPage;
        await window.appNavigation.navigateToPage(targetPage);
    });

    // Add drag functionality (only in editor mode)
    if (!isPreviewMode) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialX = parseInt(container.style.left) || 0;
        let initialY = parseInt(container.style.top) || 0;

        const dragStart = (e) => {
            if (e.target === button || e.target === container) {
                isDragging = true;
                startX = e.clientX - initialX;
                startY = e.clientY - initialY;
                container.style.zIndex = '1000';
            }
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                const newX = e.clientX - startX;
                const newY = e.clientY - startY;
                
                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
                
                initialX = newX;
                initialY = newY;
            }
        };

        const dragEnd = async () => {
            if (isDragging) {
                isDragging = false;
                container.style.zIndex = '100';
                
                try {
                    const page = await getCurrentPage();
                    if (!page.navButtons) {
                        page.navButtons = [];
                    }

                    const buttonIndex = page.navButtons.findIndex(nav => nav.id === container.dataset.navId);
                    if (buttonIndex >= 0) {
                        page.navButtons[buttonIndex].position = {
                            x: initialX,
                            y: initialY
                        };
                        await updatePage(page);
                    }
                } catch (error) {
                    console.error('Error saving button position:', error);
                    showAlert('Failed to save button position', 'danger');
                }
            }
        };

        // Add drag event listeners
        container.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Add double-click to edit
        button.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showNavButtonEditor(container.dataset.navId);
        });
    }

    return container;
}

// Function to show navigation button editor
async function showNavButtonEditor(navId = null) {
    console.log('Opening nav button editor, navId:', navId);
    const isNewButton = !navId;
    navId = navId || Date.now().toString();
    
    // Get current button data if editing
    let currentButtonData = null;
    if (!isNewButton) {
        try {
            const page = await getCurrentPage();
            currentButtonData = page.navButtons?.find(nav => nav.id === navId);
        } catch (error) {
            console.error('Error fetching button data:', error);
            showAlert('Failed to load button data', 'danger');
            return;
        }
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    // Get available pages
    const pages = window.availablePages || [];
    console.log('Available pages:', pages);
    
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isNewButton ? 'Add' : 'Edit'} Navigation Button</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Target Page</label>
                        <select class="form-select" id="pageSelect">
                            ${pages.map(page => 
                                `<option value="${page.id}" ${currentButtonData?.targetPage === page.id ? 'selected' : ''}>
                                    ${page.name}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Button Text</label>
                        <input type="text" class="form-control" id="buttonText" 
                               value="${currentButtonData?.text || 'Go to Home'}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Button Style</label>
                        <select class="form-select" id="buttonStyle">
                            <option value="modern" ${currentButtonData?.style === 'modern' ? 'selected' : ''}>
                                Modern (Gradient)
                            </option>
                            <option value="tech" ${currentButtonData?.style === 'tech' ? 'selected' : ''}>
                                Tech (Geometric)
                            </option>
                            <option value="minimal" ${currentButtonData?.style === 'minimal' ? 'selected' : ''}>
                                Minimal (Clean)
                            </option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="createAndSaveNavButton('${navId}', ${isNewButton})">
                        ${isNewButton ? 'Add Button' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Function to create and save navigation button
async function createAndSaveNavButton(navId, isNew = false) {
    console.log('Creating/saving nav button:', navId, 'isNew:', isNew);
    const modal = document.querySelector('.modal');
    const pageSelect = modal.querySelector('#pageSelect');
    const buttonText = modal.querySelector('#buttonText');
    const buttonStyle = modal.querySelector('#buttonStyle');
    
    const buttonData = {
        id: navId,
        targetPage: pageSelect.value,
        text: buttonText.value,
        style: buttonStyle.value,
        position: { x: 20, y: 20 }
    };

    console.log('Button data:', buttonData);

    try {
        const page = await getCurrentPage();
        console.log('Current page:', page);
        
        // Initialize navButtons array if it doesn't exist
        if (!page.navButtons) {
            page.navButtons = [];
        }

        const existingIndex = page.navButtons.findIndex(nav => nav.id === navId);
        if (existingIndex >= 0) {
            page.navButtons[existingIndex] = { ...page.navButtons[existingIndex], ...buttonData };
        } else {
            page.navButtons.push(buttonData);
        }

        // Save to backend first
        const updatedPage = { ...page };
        console.log('Updating page with:', updatedPage);
        await updatePage(updatedPage);

        // After successful save, update the DOM
        await renderNavigationButtons(page.navButtons);
        
        modal.remove();
        showAlert('Navigation button saved successfully', 'success');
    } catch (error) {
        console.error('Error saving nav button:', error);
        showAlert('Failed to save navigation button', 'danger');
    }
}

// Function to render navigation buttons
async function renderNavigationButtons(navButtons = []) {
    const container = isPreviewMode ? document.getElementById('public-content') : content;
    if (!container) return;
    
    // Remove existing navigation buttons
    const existingButtons = container.querySelectorAll('.draggable-nav-button');
    existingButtons.forEach(btn => btn.remove());

    // Create and add new buttons
    navButtons.forEach(navData => {
        const navButton = document.createElement('div');
        navButton.className = 'draggable-nav-button';
        navButton.style.position = 'absolute';
        navButton.style.left = `${navData.position?.x || 20}px`;
        navButton.style.top = `${navData.position?.y || 20}px`;
        navButton.style.zIndex = '100';

        const button = document.createElement('button');
        button.className = `nav-button ${navData.style || 'futuristic'}`;
        button.textContent = navData.text || 'Go to Home';
        
        // Add delete button in admin mode
        if (!isPreviewMode) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm delete-nav-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '-10px';
            deleteBtn.style.right = '-10px';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '24px';
            deleteBtn.style.height = '24px';
            deleteBtn.style.padding = '0';
            deleteBtn.style.display = 'none';
            
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Delete this navigation button?')) {
                    await deleteNavButton(navData.id);
                }
            };

            navButton.appendChild(deleteBtn);

            // Show/hide delete button on hover
            navButton.onmouseenter = () => deleteBtn.style.display = 'block';
            navButton.onmouseleave = () => deleteBtn.style.display = 'none';

            // Add drag functionality in admin mode
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialX = parseInt(navButton.style.left) || 0;
            let initialY = parseInt(navButton.style.top) || 0;

            navButton.onmousedown = (e) => {
                if (e.target === button || e.target === navButton) {
                    isDragging = true;
                    startX = e.clientX - initialX;
                    startY = e.clientY - initialY;
                    navButton.style.zIndex = '1000';
                }
            };

            document.onmousemove = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    const newX = e.clientX - startX;
                    const newY = e.clientY - startY;
                    
                    navButton.style.left = `${newX}px`;
                    navButton.style.top = `${newY}px`;
                    
                    initialX = newX;
                    initialY = newY;
                }
            };

            document.onmouseup = async () => {
                if (isDragging) {
                    isDragging = false;
                    navButton.style.zIndex = '100';
                    
                    try {
                        const page = await getCurrentPage();
                        const buttonIndex = page.navButtons.findIndex(nav => nav.id === navData.id);
                        if (buttonIndex >= 0) {
                            page.navButtons[buttonIndex].position = {
                                x: initialX,
                                y: initialY
                            };
                            await updatePage(page);
                        }
                    } catch (error) {
                        console.error('Error saving button position:', error);
                        showAlert('Failed to save button position', 'danger');
                    }
                }
            };
        }

        navButton.appendChild(button);
        container.appendChild(navButton);
    });
}

// Function to delete navigation button
async function deleteNavButton(navId) {
    try {
        const page = await getCurrentPage();
        const navButtons = (page.navButtons || []).filter(nav => nav.id !== navId);
        await updatePage({ ...page, navButtons });
        await loadPageContent(currentPage);
        showAlert('Navigation button deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting nav button:', error);
        showAlert('Failed to delete navigation button', 'danger');
    }
}

// Update the Add Navigation Button event listener
document.getElementById('addNavBtn')?.addEventListener('click', () => {
    console.log('Add Navigation Button clicked');
    showNavButtonEditor();
});

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
    const addNavBtn = document.getElementById('addNavBtn');
    if (!addNavBtn) {
        console.error('Add Navigation Button not found in DOM');
    } else {
        console.log('Add Navigation Button found and initialized');
    }
});

// Function to restore navigation buttons from storage
async function restoreNavigationButtons() {
    try {
        const page = await getCurrentPage();
        if (!page.navButtons) return;

        // Clear existing buttons
        const container = isPreviewMode ? publicContent : content;
        const existingButtons = container.querySelectorAll('.draggable-nav-button');
        existingButtons.forEach(btn => btn.remove());

        // Restore buttons from page data
        page.navButtons.forEach(navData => {
            // Check localStorage for any updated positions
            const storageKey = `navButton_${currentPage}_${navData.id}`;
            const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            // Merge stored data with page data, preferring stored data
            const mergedData = { ...navData, ...storedData };
            const navButton = createDraggableNavButton(mergedData);
            container.appendChild(navButton);
        });
    } catch (error) {
        console.error('Error restoring navigation buttons:', error);
    }
}

// Page Management Functions
async function renamePage() {
    try {
        // Get current pages
        const response = await makeRequest('/api/pages');
        const pages = response.filter(page => page.id !== 'home');

        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal show d-block';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Rename Page</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Select Page to Rename</label>
                            <select class="form-select" id="pageSelect">
                                ${pages.map(page => `<option value="${page.id}">${page.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">New Name</label>
                            <input type="text" class="form-control" id="newPageName">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmRename">Rename</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle modal close
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('[data-bs-dismiss="modal"]').onclick = closeModal;
        modal.querySelector('.btn-secondary').onclick = closeModal;

        // Handle rename confirmation
        modal.querySelector('#confirmRename').onclick = async () => {
            const pageId = modal.querySelector('#pageSelect').value;
            const newName = modal.querySelector('#newPageName').value.trim();

            if (!newName) {
                showAlert('Please enter a new name', 'danger');
                return;
            }

            try {
                const response = await makeRequest(`/api/pages/${pageId}/rename`, {
                    method: 'PUT',
                    body: JSON.stringify({ newName })
                });

                showAlert('Page renamed successfully', 'success');
                closeModal();

                // Update current page ID if we're on the renamed page
                if (currentPage === pageId) {
                    currentPage = response.newId;
                    localStorage.setItem('currentPage', response.newId);
                }

                // Reload pages and current content
                await loadPages();
                await loadPageContent(currentPage);
            } catch (error) {
                showAlert('Failed to rename page: ' + error.message, 'danger');
            }
        };
    } catch (error) {
        showAlert('Failed to load pages: ' + error.message, 'danger');
    }
}

async function deletePage() {
    try {
        // Get current pages
        const response = await makeRequest('/api/pages');
        const pages = response.filter(page => page.id !== 'home');

        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal show d-block';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Delete Page</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Select Page to Delete</label>
                            <select class="form-select" id="pageSelect">
                                ${pages.map(page => `<option value="${page.id}">${page.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="alert alert-warning">
                            Warning: This action cannot be undone!
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle modal close
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('[data-bs-dismiss="modal"]').onclick = closeModal;
        modal.querySelector('.btn-secondary').onclick = closeModal;

        // Handle delete confirmation
        modal.querySelector('#confirmDelete').onclick = async () => {
            const pageId = modal.querySelector('#pageSelect').value;

            try {
                await makeRequest(`/api/pages/${pageId}`, {
                    method: 'DELETE'
                });

                showAlert('Page deleted successfully', 'success');
                closeModal();
                await loadPages();
                if (currentPage === pageId) {
                    currentPage = 'home';
                    localStorage.setItem('currentPage', 'home');
                    await loadPageContent('home');
                }
            } catch (error) {
                showAlert('Failed to delete page: ' + error.message, 'danger');
            }
        };
    } catch (error) {
        showAlert('Failed to load pages: ' + error.message, 'danger');
    }
}

// Add event listeners for the page management buttons
document.getElementById('renamePageBtn').addEventListener('click', renamePage);
document.getElementById('deletePageBtn').addEventListener('click', deletePage);

// Function to create a new navigation button
function createNavigationButton(text, targetPage) {
    const styleSelect = document.getElementById('buttonStyleSelect');
    const selectedStyle = styleSelect ? styleSelect.value : 'futuristic';
    
    return {
        id: Date.now().toString(),
        text: text,
        targetPage: targetPage,
        style: selectedStyle
    };
}

// Add button style options to the button creation form
function showAddButtonForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Navigation Button</h3>
            <div class="form-group">
                <label for="buttonText">Button Text:</label>
                <input type="text" id="buttonText" class="form-control">
            </div>
            <div class="form-group">
                <label for="buttonStyleSelect">Button Style:</label>
                <select id="buttonStyleSelect" class="form-control">
                    <option value="futuristic">Futuristic</option>
                    <option value="futuristic pulse">Futuristic with Pulse</option>
                    <option value="neon">Neon</option>
                    <option value="neon pulse">Neon with Pulse</option>
                </select>
            </div>
            <div class="form-group">
                <label for="targetPage">Target Page:</label>
                <select id="targetPage" class="form-control">
                    <!-- Pages will be populated here -->
                </select>
            </div>
            <div class="button-group">
                <button onclick="saveButton()" class="btn btn-primary">Save</button>
                <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
}

// Make navigation function globally available
window.navigateToPage = async function(pageId) {
    console.log('Navigating to page:', pageId);
    try {
        const page = await makeRequest(`/api/pages/${pageId}`);
        if (!page) {
            throw new Error('Page not found');
        }

        // Update current page
        currentPage = pageId;
        localStorage.setItem('currentPage', pageId);

        // Load the page content
        if (userRole === 'admin' && !isPreviewMode) {
            await loadPageContent(pageId);
        } else {
            await loadPublicPage(pageId);
        }
    } catch (error) {
        console.error('Navigation error:', error);
        showAlert('Failed to navigate: ' + error.message, 'danger');
    }
}; 