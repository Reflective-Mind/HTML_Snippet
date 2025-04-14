// State management
let currentPage = localStorage.getItem('currentPage') || 'home';
let token = localStorage.getItem('token') || '';
let userRole = localStorage.getItem('userRole') || '';
let isPreviewMode = localStorage.getItem('isPreviewMode') === 'true';
let isDragging = false;
let isResizing = false;
let updateTimeout = null;
let navButtons = [];

// DOM Elements - these will be initialized when the DOM is loaded
let loginForm;
let registerForm;
let loginFormContainer;
let adminPanel;
let publicView;
let pagesNav;
let content;
let publicContent;
let adminToolbar;

// Initialize functionality after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Initialize variables from local storage
    token = localStorage.getItem('token') || '';
    userRole = localStorage.getItem('userRole') || '';
    currentPage = localStorage.getItem('currentPage') || 'home';
    
    // Initialize preview mode state from localStorage
    const storedPreviewMode = localStorage.getItem('isPreviewMode');
    isPreviewMode = storedPreviewMode === 'true';
    window.isPreviewMode = isPreviewMode;
    
    // Get DOM element references
    loginFormContainer = document.getElementById('login-form-container');
    adminPanel = document.getElementById('admin-panel');
    publicView = document.getElementById('public-view');
    adminToolbar = document.getElementById('admin-toolbar');
    pagesNav = document.getElementById('pages-nav');
    
    // Initialize the view based on authentication
    updateView();
    
    // Add event listeners to buttons
    const addPageBtn = document.getElementById('add-page-btn');
    if (addPageBtn) {
        addPageBtn.addEventListener('click', showCreatePageModal);
    }
    
    const addSnippetBtn = document.getElementById('add-snippet-btn');
    if (addSnippetBtn) {
        addSnippetBtn.addEventListener('click', () => {
            const html = prompt('Enter HTML for the snippet:');
            if (html) {
                addSnippet(html);
            }
        });
    }
    
    // Setup event listeners for the login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    }
    
    // Setup drag and resize functionality
    setupDragAndResize();
});

// Toggle between login and register forms
function toggleRegister() {
    console.log('Toggle register called');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (!loginForm || !registerForm) {
        console.error('Login or register form not found');
        return;
    }
    
    console.log('Current visibility - Login:', loginForm.style.display, 'Register:', registerForm.style.display);
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        console.log('Showing login form');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        console.log('Showing register form');
    }
}

// Show appropriate view based on authentication
async function updateView() {
    try {
        console.log('Updating view...');

        // Check for essential DOM elements
        if (!document.getElementById('login-form-container')) {
            console.error('Login form container not found');
            showAlert('UI error: Login form container not found. Please refresh the page.', 'danger');
        }
        
        if (!document.getElementById('admin-panel')) {
            console.error('Admin panel not found');
            showAlert('UI error: Admin panel not found. Please refresh the page.', 'danger');
        }
        
        if (!document.getElementById('public-view')) {
            console.error('Public view not found');
            showAlert('UI error: Public view not found. Please refresh the page.', 'danger');
        }

        // Check if we have a token in localStorage
        token = localStorage.getItem('token');
        userRole = localStorage.getItem('userRole');
        
        console.log('Authentication state:', {
            hasToken: !!token,
            userRole: userRole || 'none'
        });

        // Hide all views initially
        if (loginFormContainer) loginFormContainer.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'none';
        if (publicView) publicView.style.display = 'none';

        if (token) {
            // We have a token, show the admin or public view based on role
            if (userRole === 'admin') {
                if (adminPanel) {
                    adminPanel.style.display = 'block';
                    
                    // Load pages for navigation
                    const pages = await loadPages();
                    
                    // Get current page from localStorage or use the first page
                    const storedPage = localStorage.getItem('currentPage');
                    const defaultPage = pages && pages.length > 0 ? 
                        pages.find(p => p.isDefault) || pages[0] : null;
                    
                    const pageToLoad = storedPage || (defaultPage ? defaultPage.id : null);
                    
                    if (pageToLoad) {
                        navigateToPage(pageToLoad);
                    } else {
                        console.error('No pages available');
                        showAlert('No pages available. Please create a page.', 'warning');
                    }
                } else {
                    console.error('Admin panel element not found');
                    showAlert('UI error: Admin panel element not found', 'danger');
                }
            } else {
                if (publicView) {
                    publicView.style.display = 'block';
                    
                    // Load public view
                    const pages = await loadPages();
                    
                    // Get current page from localStorage or use the first page
                    const storedPage = localStorage.getItem('currentPage');
                    const defaultPage = pages && pages.length > 0 ? 
                        pages.find(p => p.isDefault) || pages[0] : null;
                    
                    const pageToLoad = storedPage || (defaultPage ? defaultPage.id : null);
                    
                    if (pageToLoad) {
                        navigateToPage(pageToLoad);
                    } else {
                        console.error('No pages available');
                        showAlert('No pages available.', 'warning');
                    }
                } else {
                    console.error('Public view element not found');
                    showAlert('UI error: Public view element not found', 'danger');
                }
            }
        } else {
            // No token, show login form
            if (loginFormContainer) {
                loginFormContainer.style.display = 'block';
            } else {
                console.error('Login form container element not found');
                showAlert('UI error: Login form container element not found', 'danger');
                
                // Try to create a minimal login form as a fallback
                const fallbackForm = document.createElement('div');
                fallbackForm.className = 'container mt-5';
                fallbackForm.innerHTML = `
                    <div class="alert alert-danger">Error: Login form not found. Using fallback.</div>
                    <div class="card">
                        <div class="card-body">
                            <h2>Login</h2>
                            <form id="fallbackLoginForm">
                                <div class="mb-3">
                                    <input type="email" class="form-control" id="fallbackEmail" placeholder="Email" required>
                                </div>
                                <div class="mb-3">
                                    <input type="password" class="form-control" id="fallbackPassword" placeholder="Password" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Login</button>
                            </form>
                        </div>
                    </div>
                `;
                document.body.appendChild(fallbackForm);
                
                // Add event listener to the fallback form
                document.getElementById('fallbackLoginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('fallbackEmail').value.trim();
                    const password = document.getElementById('fallbackPassword').value;
                    await login(email, password);
                });
            }
        }
    } catch (error) {
        console.error('Error updating view:', error);
        showAlert('Failed to initialize application: ' + error.message, 'danger');
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
        console.log('Login function called with email:', email);
        
        // Check if input is valid
        if (!email || !password) {
            showAlert('Email and password are required', 'danger');
            return false;
        }
        
        console.log('Making login request to /api/login');
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Login response status:', response.status);
        
        const data = await response.json();
        console.log('Login response received:', { success: !!data.token, role: data.role });
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid credentials');
        }
        
        // Store all user data
        token = data.token;
        userRole = data.role;
        currentPage = data.defaultPage || 'home';
        
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('currentPage', currentPage);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('username', data.username);
        
        console.log('Login successful - saved data:', {
            username: data.username,
            role: userRole,
            defaultPage: currentPage
        });
        
        showAlert('Login successful!', 'success');

        // Additional debug logging
        console.log('Before interface update - DOM elements:');
        console.log('loginFormContainer exists:', !!window.loginFormContainer);
        console.log('adminPanel exists:', !!window.adminPanel);
        console.log('adminToolbar exists:', !!window.adminToolbar);
        console.log('publicView exists:', !!window.publicView);

        // Update view based on user role
        setTimeout(() => {
            console.log('In setTimeout callback - about to update UI based on role:', userRole);
            if (userRole === 'admin') {
                console.log('User is admin, calling showAdminPanel()');
                showAdminPanel();
                loadAdminDashboard();
            } else {
                console.log('User is not admin, calling showPublicView()');
                showPublicView();
                loadPublicPage(currentPage);
            }
            console.log('UI update completed');
        }, 1000); // Short delay to let the alert show

        return true;
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed. Please try again.', 'danger');
        return false;
    }
}

async function loadAdminDashboard() {
    try {
        console.log('Loading admin dashboard...');
        const response = await makeRequest('/api/admin');
        console.log('Admin dashboard API response:', response);
        if (response) {
            renderAdminDashboard(response);
        } else {
            throw new Error('Failed to load admin dashboard - empty response');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showAlert('Failed to load admin dashboard', 'error');
    }
}

function renderAdminDashboard(data) {
    console.log('Rendering admin dashboard with data:', data);
    // Clear existing dashboard elements first
    const existingDashboard = document.querySelector('.admin-stats');
    if (existingDashboard) {
        existingDashboard.remove();
    }

    // Create new dashboard container
    const dashboard = document.createElement('div');
    dashboard.className = 'admin-stats';
    
    // Handle both response formats from server.js (the two different implementations)
    const stats = data.stats || data;
    const serverTime = data.serverTime || new Date().toISOString();
    const message = data.message || 'Dashboard loaded successfully';
    
    dashboard.innerHTML = `
        <h2>Dashboard Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Total Users</span>
                <span class="stat-value">${stats.users}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Pages</span>
                <span class="stat-value">${stats.pages}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Settings</span>
                <span class="stat-value">${stats.settings}</span>
            </div>
        </div>
        <div class="server-info mt-3">
            <p class="text-muted">${message}</p>
            <small class="text-muted">Server time: ${serverTime}</small>
        </div>
    `;

    // Insert the dashboard at the beginning of the content area
    const contentArea = document.getElementById('content');
    if (contentArea) {
        console.log('Content area found, inserting dashboard');
        contentArea.insertBefore(dashboard, contentArea.firstChild);
    } else {
        console.error('Content area not found - cannot insert dashboard');
    }
}

function showAdminPanel() {
    console.log('showAdminPanel called - checking DOM elements');
    
    // Check that the necessary elements exist
    if (!loginFormContainer) {
        console.error('loginFormContainer is not defined');
    }
    if (!adminPanel) {
        console.error('adminPanel is not defined');
    }
    if (!adminToolbar) {
        console.error('adminToolbar is not defined');
    }
    if (!publicView) {
        console.error('publicView is not defined');
    }
    
    // Clear existing content
    if (loginFormContainer) loginFormContainer.style.display = 'none';
    if (publicView) publicView.style.display = 'none';
    
    // Clear any existing dashboard content
    const content = document.getElementById('content');
    if (content) {
        content.innerHTML = '';
    } else {
        console.error('content element not found');
    }
    
    // Show admin panel and toolbar
    if (adminToolbar) adminToolbar.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'block';
    
    console.log('Admin panel display updated - loading dashboard');
    
    // Load fresh admin dashboard data
    loadAdminDashboard();
    loadPages();
}

function showPublicView() {
    if (loginFormContainer) loginFormContainer.style.display = 'none';
    if (adminToolbar) adminToolbar.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (publicView) publicView.style.display = 'block';
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
    if (!pageId) {
        console.error('Invalid pageId provided to loadPageContent');
        showAlert('Invalid page ID', 'danger');
        return;
    }
    
    console.log('Loading content for page:', pageId);
    
    try {
        // Ensure the content container exists
        const container = document.getElementById('content');
        if (!container) {
            throw new Error('Content container not found. Please refresh the page.');
        }
        
        const page = await makeRequest(`/api/pages/${pageId}`);
        if (!page) {
            throw new Error('Page not found or empty response received');
        }

        // Update current page
        currentPage = pageId;
        localStorage.setItem('currentPage', pageId);
        
        // Render content
        console.log('Page data:', page);
        
        // Reset any error messages
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = '';
            errorContainer.style.display = 'none';
        }
        
        // Check if snippets need position adjustment
        if (page.snippets && Array.isArray(page.snippets)) {
            // Fix any snippet positions that are off-screen
            page.snippets = page.snippets.map(snippet => {
                if (!snippet.position) {
                    snippet.position = { x: 50, y: 50 };
                }
                
                // Ensure snippets aren't too far to the right or left
                if (snippet.position.x > 1500 || snippet.position.x < 0) {
                    snippet.position.x = 50;
                }
                
                return snippet;
            });
        }
        
        // Render the snippets and navigation buttons
        renderSnippets(page.snippets || [], page.navButtons || []);
        
        // Initialize file download handler for new snippets
        setTimeout(initializeFileDownloadHandler, 1000);

        // Update page navigation buttons
        const pageButtons = document.querySelectorAll('.page-button');
        pageButtons.forEach(btn => {
            const buttonPageId = btn.getAttribute('data-page-id') || btn.textContent.trim().toLowerCase();
            const isActive = buttonPageId === pageId.toLowerCase();
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-primary', !isActive);
        });
    } catch (error) {
        console.error('Error loading page content:', error);
        
        // Create error message container if it doesn't exist
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'alert alert-danger mt-3';
            
            const contentArea = document.getElementById('content');
            if (contentArea) {
                contentArea.innerHTML = '';
                contentArea.appendChild(errorContainer);
            } else {
                // If content area is missing, try to add to a parent element
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) {
                    adminPanel.appendChild(errorContainer);
                }
            }
        }
        
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `<strong>Error:</strong> Failed to load page: ${error.message}`;
        showAlert(`Failed to load page: ${error.message}`, 'danger');
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
    console.log('Show create page modal called');
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
    if (!html) {
        console.error('No HTML provided to addSnippet');
        return;
    }
    
    console.log('Adding snippet with HTML');
    
    try {
        const page = await getCurrentPage();
        console.log('Current page for adding snippet:', page);
        
        const newSnippet = {
            id: Date.now(),
            html,
            position: { x: 20, y: 20 },
            size: { width: 400, height: 300 }
        };
        
        const updatedSnippets = [...(page.snippets || []), newSnippet];
        
        console.log('Updating page with new snippet');
        await updatePage({ ...page, snippets: updatedSnippets });
        
        console.log('Reloading page content');
        await loadPageContent(currentPage);
        
        showAlert('Snippet added successfully', 'success');
    } catch (error) {
        console.error('Error adding snippet:', error);
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
    if (!pagesNav) {
        console.error('pagesNav element not found');
        return;
    }
    
    console.log('Rendering pages:', pages);
    
    pagesNav.innerHTML = pages.map(page => `
        <button 
            class="btn ${currentPage === page.id ? 'btn-primary' : 'btn-outline-primary'} page-button mx-1"
            onclick="navigateToPage('${page.id}')"
            data-page-id="${page.id}"
        >
            ${page.name}
        </button>
    `).join('');
}

function renderSnippets(snippets = [], navButtons = []) {
    const container = isPreviewMode ? document.getElementById('public-content') : document.getElementById('content');
    
    if (!container) {
        console.error('Container element not found for rendering snippets. isPreviewMode:', isPreviewMode);
        showAlert('Failed to load page: Container element not found', 'danger');
        return;
    }
    
    console.log('Rendering snippets to container:', container.id, 'Count:', snippets.length);
    
    // First clear existing content
    container.innerHTML = '';
    
    // Get container dimensions for relative positioning
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    console.log('Container dimensions:', containerWidth, 'x', containerHeight);
    
    // Add snippets to the container
    snippets.forEach(snippet => {
        const snippetDiv = document.createElement('div');
        snippetDiv.className = 'snippet';
        snippetDiv.id = `snippet-${snippet.id}`;
        
        // Set position and size with bounds checking to prevent off-screen placement
        let xPos = snippet.position?.x || 0;
        let yPos = snippet.position?.y || 0;
        
        // Ensure snippets aren't too far to the right or off screen
        if (xPos > containerWidth - 100) xPos = 50;
        if (yPos > containerHeight - 100) yPos = 50;
        
        // Convert absolute positions to percentage-based positions for better responsiveness
        // Only if the container has dimensions (avoid division by zero)
        if (containerWidth > 0 && containerHeight > 0) {
            // Store original pixel positions as data attributes for editing
            snippetDiv.dataset.originalX = xPos;
            snippetDiv.dataset.originalY = yPos;
            
            // Calculate percentage positions
            const xPercent = (xPos / containerWidth) * 100;
            const yPercent = (yPos / containerHeight) * 100;
            
            // Apply percentage positioning in preview mode, pixel positioning in edit mode
            if (isPreviewMode) {
                snippetDiv.style.left = `${xPercent}%`;
                snippetDiv.style.top = `${yPercent}%`;
            } else {
                snippetDiv.style.left = `${xPos}px`;
                snippetDiv.style.top = `${yPos}px`;
            }
        } else {
            // Fallback to pixel positioning if container dimensions aren't available
            snippetDiv.style.left = `${xPos}px`;
            snippetDiv.style.top = `${yPos}px`;
        }
        
        snippetDiv.style.width = `${snippet.size?.width || 400}px`;
        snippetDiv.style.height = `${snippet.size?.height || 300}px`;
        
        // Create snippet content
        const content = document.createElement('div');
        content.className = 'snippet-content';
        
        const iframe = document.createElement('iframe');
        iframe.id = `frame-${snippet.id}`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.srcdoc = snippet.html;
        // Update sandbox attributes to allow downloads and file operations
        iframe.sandbox = 'allow-scripts allow-same-origin allow-modals allow-downloads allow-forms allow-popups';
        
        content.appendChild(iframe);
        snippetDiv.appendChild(content);
        
        // Add controls if not in preview mode
        if (!isPreviewMode) {
            const controls = document.createElement('div');
            controls.className = 'snippet-controls';
            controls.innerHTML = `
                <button class="btn btn-sm btn-primary" onclick="editSnippet(${snippet.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSnippet(${snippet.id})">Delete</button>
            `;
            
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            
            snippetDiv.appendChild(controls);
            snippetDiv.appendChild(resizeHandle);
        }
        
        container.appendChild(snippetDiv);
    });

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
        console.log(`Saving position for snippet ${snippetId}:`, position);
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        // Find the snippet to update
        const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
        if (snippetIndex === -1) {
            console.error(`Snippet ${snippetId} not found in current page`);
            return;
        }

        // Create a new array with the updated snippet
        const updatedSnippets = [...page.snippets];
        updatedSnippets[snippetIndex] = {
            ...updatedSnippets[snippetIndex],
            position
        };

        // Save the updated page
        const result = await updatePage({ 
            ...page, 
            snippets: updatedSnippets 
        });
        
        console.log(`Position saved for snippet ${snippetId}:`, position);
        showAlert('Position saved', 'success', 1000); // Brief success message
    } catch (error) {
        console.error('Position update error:', error);
        showAlert('Failed to save position: ' + error.message, 'danger');
    }
}, 300); // Reduce debounce time for more responsive saves

const debouncedUpdateSize = debounce(async (snippetId, size) => {
    try {
        console.log(`Saving size for snippet ${snippetId}:`, size);
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        // Find the snippet to update
        const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
        if (snippetIndex === -1) {
            console.error(`Snippet ${snippetId} not found in current page`);
            return;
        }

        // Create a new array with the updated snippet
        const updatedSnippets = [...page.snippets];
        updatedSnippets[snippetIndex] = {
            ...updatedSnippets[snippetIndex],
            size
        };

        // Save the updated page
        const result = await updatePage({ 
            ...page, 
            snippets: updatedSnippets 
        });
        
        console.log(`Size saved for snippet ${snippetId}:`, size);
        showAlert('Size saved', 'success', 1000); // Brief success message
    } catch (error) {
        console.error('Size update error:', error);
        showAlert('Failed to save size: ' + error.message, 'danger');
    }
}, 300); // Reduce debounce time for more responsive saves

// Function to forcefully save the position immediately (no debounce)
async function savePositionImmediately(snippetId, position) {
    try {
        console.log(`Saving position immediately for snippet ${snippetId}:`, position);
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        // Find the snippet to update
        const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
        if (snippetIndex === -1) {
            console.error(`Snippet ${snippetId} not found in current page`);
            return;
        }

        // Create a new array with the updated snippet
        const updatedSnippets = [...page.snippets];
        updatedSnippets[snippetIndex] = {
            ...updatedSnippets[snippetIndex],
            position
        };

        // Save the updated page
        await updatePage({ 
            ...page, 
            snippets: updatedSnippets 
        });
        
        console.log(`Position saved immediately for snippet ${snippetId}:`, position);
    } catch (error) {
        console.error('Immediate position update error:', error);
        showAlert('Failed to save position: ' + error.message, 'danger');
    }
}

// Function to forcefully save the size immediately (no debounce)
async function saveSizeImmediately(snippetId, size) {
    try {
        console.log(`Saving size immediately for snippet ${snippetId}:`, size);
        const page = await getCurrentPage();
        if (!page) throw new Error('Failed to get current page');

        // Find the snippet to update
        const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
        if (snippetIndex === -1) {
            console.error(`Snippet ${snippetId} not found in current page`);
            return;
        }

        // Create a new array with the updated snippet
        const updatedSnippets = [...page.snippets];
        updatedSnippets[snippetIndex] = {
            ...updatedSnippets[snippetIndex],
            size
        };

        // Save the updated page
        await updatePage({ 
            ...page, 
            snippets: updatedSnippets 
        });
        
        console.log(`Size saved immediately for snippet ${snippetId}:`, size);
    } catch (error) {
        console.error('Immediate size update error:', error);
        showAlert('Failed to save size: ' + error.message, 'danger');
    }
}

// Updated setupDragAndResize function
function setupDragAndResize() {
    const snippets = document.querySelectorAll('.snippet');
    const container = document.getElementById('content');
    
    if (!container) {
        console.error('Content container not found for drag and resize setup');
        return;
    }
    
    // Get container dimensions for relative positioning
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    snippets.forEach(snippet => {
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startWidth, startHeight, initialX, initialY;
        let currentPosition = { x: 0, y: 0 };
        let currentSize = { width: 0, height: 0 };
        let snippetId = 0;

        const onMouseMove = (e) => {
            if (isDragging) {
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Calculate new position in pixels
                const newX = Math.max(0, initialX + dx);
                const newY = Math.max(0, initialY + dy);
                
                // Keep position within container bounds
                const maxX = containerWidth - snippet.offsetWidth;
                const maxY = containerHeight - snippet.offsetHeight;
                const boundedX = Math.min(maxX, Math.max(0, newX));
                const boundedY = Math.min(maxY, Math.max(0, newY));
                
                // Apply the position
                snippet.style.left = `${boundedX}px`;
                snippet.style.top = `${boundedY}px`;
                
                // Store original pixel values for later conversion to percentages
                snippet.dataset.originalX = boundedX;
                snippet.dataset.originalY = boundedY;
                
                // Update current position
                currentPosition = { x: boundedX, y: boundedY };
                
                // Debounce the position update
                debouncedUpdatePosition(snippetId, currentPosition);
            } else if (isResizing) {
                e.preventDefault();
                const width = startWidth + (e.clientX - startX);
                const height = startHeight + (e.clientY - startY);
                
                // Set minimum sizes
                if (width > 200 && height > 100) {
                    // Keep size within reasonable bounds
                    const maxWidth = containerWidth - parseFloat(snippet.style.left);
                    const maxHeight = containerHeight - parseFloat(snippet.style.top);
                    
                    const boundedWidth = Math.min(maxWidth, width);
                    const boundedHeight = Math.min(maxHeight, height);
                    
                    snippet.style.width = `${boundedWidth}px`;
                    snippet.style.height = `${boundedHeight}px`;
                    
                    // Update current size
                    currentSize = { width: boundedWidth, height: boundedHeight };
                    
                    // Debounce the size update
                    debouncedUpdateSize(snippetId, currentSize);
                }
            }
        };

        const onMouseUp = async () => {
            if (isDragging) {
                // Force an immediate position save on mouse up
                await savePositionImmediately(snippetId, currentPosition);
                
                // When in admin mode: update data attributes for future use
                snippet.dataset.originalX = currentPosition.x;
                snippet.dataset.originalY = currentPosition.y;
            } else if (isResizing) {
                // Force an immediate size save on mouse up
                await saveSizeImmediately(snippetId, currentSize);
            }
            
            isDragging = false;
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        snippet.addEventListener('mousedown', (e) => {
            // Get snippet ID
            snippetId = parseInt(snippet.id.split('-')[1]);
            
            // Debug info
            console.log('MouseDown event on snippet:', snippetId);
            console.log('Target element:', e.target);
            console.log('Element classes:', e.target.className);
            
            if (e.target.classList.contains('resize-handle') || e.target.closest('.resize-handle')) {
                isResizing = true;
                startWidth = snippet.offsetWidth;
                startHeight = snippet.offsetHeight;
                currentSize = { width: startWidth, height: startHeight };
                startX = e.clientX;
                startY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            } else if (!e.target.closest('.snippet-controls')) {
                isDragging = true;
                initialX = snippet.offsetLeft;
                initialY = snippet.offsetTop;
                currentPosition = { x: initialX, y: initialY };
                startX = e.clientX;
                startY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        });
    });
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.error('Alert container not found');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Event Handlers
document.getElementById('addSnippetBtn').addEventListener('click', () => {
    const html = prompt('Enter HTML code for the snippet:');
    if (html) addSnippet(html);
});

document.getElementById('preview-toggle-btn').addEventListener('click', togglePreviewMode);

// Update the navigation functions
function navigateToPage(pageId) {
    console.log('Navigating to page:', pageId);
    
    if (!pageId) {
        console.error('Invalid pageId provided to navigateToPage');
        showAlert('Invalid page ID', 'danger');
        return;
    }

    try {
        // Check if our DOM elements are available
        if (isPreviewMode && !document.getElementById('public-content')) {
            console.error('Public content container not found, cannot navigate');
            showAlert('Navigation failed: UI elements not ready. Please refresh the page.', 'danger');
            return;
        }
        
        if (!isPreviewMode && !document.getElementById('content')) {
            console.error('Content container not found, cannot navigate');
            showAlert('Navigation failed: UI elements not ready. Please refresh the page.', 'danger');
            return;
        }
        
        // Set the current page
        currentPage = pageId;
        localStorage.setItem('currentPage', pageId);
        
        // Handle navigation differently based on mode and role
        if (userRole === 'admin') {
            if (isPreviewMode) {
                loadPublicPage(pageId);
            } else {
                loadPageContent(pageId);
            }
        } else {
            loadPublicPage(pageId);
        }
        
        // Update page navigation buttons if they exist
        const pageButtons = document.querySelectorAll('.page-button');
        pageButtons.forEach(btn => {
            const buttonPageId = btn.getAttribute('data-page-id') || btn.textContent.trim().toLowerCase();
            const isActive = buttonPageId === pageId.toLowerCase();
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-primary', !isActive);
        });
    } catch (error) {
        console.error('Error during page navigation:', error);
        showAlert('Navigation failed: ' + error.message, 'danger');
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
            throw new Error('Public content container not found. Please refresh the page.');
        }

        // Clear existing content
        container.innerHTML = '';

        // Add navigation bar for authenticated users
        if (token) {
            try {
                const navBar = document.createElement('div');
                navBar.className = 'bg-light p-2 d-flex justify-content-between align-items-center';
                navBar.style.position = 'fixed';
                navBar.style.top = '0';
                navBar.style.left = '0';
                navBar.style.right = '0';
                navBar.style.zIndex = '1000';
                
                // Get all available pages for navigation
                const pages = await makeRequest('/api/pages');
                
                if (!pages || !Array.isArray(pages)) {
                    throw new Error('Failed to load pages for navigation');
                }
                
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
                        ${isPreviewMode && userRole === 'admin' ? 
                          `<button class="btn btn-warning btn-sm me-2" onclick="togglePreviewMode()">Exit Preview</button>` : ''}
                        <button class="btn btn-danger btn-sm" onclick="logout()">Logout</button>
                    </div>
                `;
                
                container.appendChild(navBar);
                container.style.paddingTop = '60px';
            } catch (navError) {
                console.error('Error building navigation:', navError);
                // Continue with page load even if navigation fails
            }
        }
        
        // Create a wrapper for snippets with relative positioning
        const snippetsWrapper = document.createElement('div');
        snippetsWrapper.className = 'snippets-wrapper';
        snippetsWrapper.style.position = 'relative';
        snippetsWrapper.style.minHeight = '100vh';
        container.appendChild(snippetsWrapper);
        
        // Render snippets
        if (page.snippets && Array.isArray(page.snippets)) {
            // Check if we need to adjust viewport positioning
            let minTop = Number.MAX_SAFE_INTEGER;
            let maxRight = 0;
            
            // First pass - find minimum top position and maximum right edge
            page.snippets.forEach(snippet => {
                const top = snippet.position?.y || 0;
                const left = snippet.position?.x || 0;
                const width = snippet.size?.width || 400;
                
                if (top < minTop) {
                    minTop = top;
                }
                
                const rightEdge = left + width;
                if (rightEdge > maxRight) {
                    maxRight = rightEdge;
                }
            });
            
            // Calculate offset to ensure snippets are visible
            const topOffset = minTop < 0 ? Math.abs(minTop) + 70 : 0;
            
            // Check if content is too far to the right and needs adjustment
            const viewportWidth = window.innerWidth;
            const horizontalAdjustment = maxRight > viewportWidth && maxRight > 1500 ? 
                Math.max(50 - (page.snippets[0]?.position?.x || 0), 0) : 0;
            
            // Second pass - render with adjusted positions
            page.snippets.forEach(snippet => {
                // Create a more reasonable default position if position is missing or off-screen
                let xPos = (snippet.position?.x || 0) + horizontalAdjustment;
                if (xPos > 1500 || xPos < 0) xPos = 50;
                
                const snippetDiv = document.createElement('div');
                snippetDiv.className = 'snippet';
                snippetDiv.style.position = 'absolute';
                snippetDiv.style.left = `${xPos}px`;
                snippetDiv.style.top = `${(snippet.position?.y || 0) + topOffset}px`;
                snippetDiv.style.width = `${snippet.size?.width || 400}px`;
                snippetDiv.style.height = `${snippet.size?.height || 300}px`;
                
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.srcdoc = snippet.html || '<p>Empty snippet</p>';
                iframe.sandbox = 'allow-scripts allow-same-origin allow-modals';
                
                snippetDiv.appendChild(iframe);
                snippetsWrapper.appendChild(snippetDiv);
            });
        } else {
            // Add a message if there are no snippets
            const noContent = document.createElement('div');
            noContent.className = 'alert alert-info mt-4 text-center';
            noContent.innerHTML = 'This page has no content yet.';
            snippetsWrapper.appendChild(noContent);
        }

        // Render custom navigation buttons
        if (page.navButtons && Array.isArray(page.navButtons)) {
            page.navButtons.forEach(navData => {
                if (!navData) return; // Skip undefined buttons
                
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
                snippetsWrapper.appendChild(navButton);
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
    console.log('Logging out...');
    
    // Clear tokens and auth data
    token = '';
    userRole = '';
    
    // Reset preview mode
    isPreviewMode = false;
    window.isPreviewMode = false;
    
    // Clear all localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('username');
    localStorage.setItem('isPreviewMode', 'false');
    
    // Optionally keep currentPage for convenience
    
    // Show login form
    updateView();
    showAlert('You have been logged out.', 'info');
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
    button.className = `nav-button ${navData?.style || 'btn-primary'}`;
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

// Update the showAddButtonForm function
function showAddButtonForm() {
    console.log('showAddButtonForm called');
    
    // First, load available pages to populate the dropdown
    loadPages().then(pages => {
        const modal = document.createElement('div');
        modal.className = 'modal show d-block';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Navigation Button</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group mb-3">
                            <label for="buttonText">Button Text:</label>
                            <input type="text" id="buttonText" class="form-control" value="Go to Page">
                        </div>
                        <div class="form-group mb-3">
                            <label for="buttonStyleSelect">Button Style:</label>
                            <select id="buttonStyleSelect" class="form-control">
                                <option value="futuristic">Futuristic</option>
                                <option value="futuristic pulse">Futuristic with Pulse</option>
                                <option value="neon">Neon</option>
                                <option value="neon pulse">Neon with Pulse</option>
                            </select>
                        </div>
                        <div class="form-group mb-3">
                            <label for="targetPage">Target Page:</label>
                            <select id="targetPage" class="form-control">
                                ${pages.map(page => 
                                    `<option value="${page.id}">${page.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">Cancel</button>
                        <button id="saveButtonBtn" class="btn btn-primary">Save</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Add click handler for the save button
        document.getElementById('saveButtonBtn').addEventListener('click', async function() {
            try {
                const text = document.getElementById('buttonText').value;
                const style = document.getElementById('buttonStyleSelect').value;
                const targetPage = document.getElementById('targetPage').value;
                
                const navButton = {
                    id: Date.now().toString(),
                    text: text,
                    style: style,
                    targetPage: targetPage,
                    position: { x: 20, y: 20 }
                };
                
                console.log('Creating navigation button:', navButton);
                
                const page = await getCurrentPage();
                if (!page.navButtons) {
                    page.navButtons = [];
                }
                
                page.navButtons.push(navButton);
                await updatePage(page);
                
                await loadPageContent(currentPage);
                modal.remove();
                
                showAlert('Navigation button added successfully', 'success');
            } catch (error) {
                console.error('Error adding navigation button:', error);
                showAlert('Failed to add navigation button', 'danger');
            }
        });
    }).catch(error => {
        console.error('Error loading pages for button form:', error);
        showAlert('Failed to load pages', 'danger');
    });
}

// Add this new function to toggle preview mode
function togglePreviewMode() {
    console.log('togglePreviewMode called');
    isPreviewMode = !isPreviewMode;
    window.isPreviewMode = isPreviewMode;
    
    // Save preview mode state to localStorage
    localStorage.setItem('isPreviewMode', isPreviewMode ? 'true' : 'false');
    
    const previewToggleBtn = document.getElementById('preview-toggle-btn');
    
    if (previewToggleBtn) {
        previewToggleBtn.textContent = isPreviewMode ? 'Exit Preview' : 'Preview Mode';
    }
    
    const addSnippetBtn = document.getElementById('add-snippet-btn');
    const addPageBtn = document.getElementById('add-page-btn');
    const addNavBtn = document.getElementById('add-nav-btn');
    
    if (addSnippetBtn) addSnippetBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    if (addPageBtn) addPageBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    if (addNavBtn) addNavBtn.style.display = isPreviewMode ? 'none' : 'inline-block';
    
    try {
        getCurrentPage().then(page => {
            if (isPreviewMode) {
                adminPanel.style.display = 'none';
                publicView.style.display = 'block';
                loadPublicPage(currentPage);
            } else {
                adminPanel.style.display = 'block';
                publicView.style.display = 'none';
                loadPageContent(currentPage);
            }
        }).catch(error => {
            console.error('Error getting current page:', error);
            showAlert('Failed to toggle preview mode', 'danger');
            
            // Revert to non-preview mode on error
            isPreviewMode = false;
            localStorage.setItem('isPreviewMode', 'false');
        });
    } catch (error) {
        console.error('Error toggling preview mode:', error);
        showAlert('Failed to toggle preview mode', 'danger');
        
        // Revert to non-preview mode on error
        isPreviewMode = false;
        localStorage.setItem('isPreviewMode', 'false');
    }
}

// Function to handle file downloads from snippets
function initializeFileDownloadHandler() {
    console.log('Initializing file download handler');
    
    // Listen for messages from iframes
    window.addEventListener('message', function(event) {
        try {
            // Check if the message is a download request
            if (event.data && event.data.type === 'download') {
                console.log('Received download request:', event.data);
                
                const { fileContent, fileName, fileType } = event.data;
                
                if (!fileContent || !fileName) {
                    console.error('Invalid download request, missing required fields');
                    return;
                }
                
                // Create a blob with the file content
                let blob;
                
                if (fileContent instanceof Blob) {
                    blob = fileContent;
                } else if (typeof fileContent === 'string') {
                    // Determine the MIME type based on file extension
                    let mimeType = 'text/plain';
                    if (fileName.endsWith('.obj')) mimeType = 'model/obj';
                    else if (fileName.endsWith('.mtl')) mimeType = 'model/mtl';
                    else if (fileType) mimeType = fileType;
                    
                    blob = new Blob([fileContent], { type: mimeType });
                } else {
                    console.error('Unsupported file content type');
                    return;
                }
                
                // Create a download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                
                // Append to body, click and remove
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                console.log(`File "${fileName}" downloaded successfully`);
            }
        } catch (error) {
            console.error('Error handling download message:', error);
        }
    });
    
    // Inject helper script into all iframes to enable file downloading
    function injectHelperScript() {
        const snippets = document.querySelectorAll('.snippet-content iframe');
        
        snippets.forEach(iframe => {
            try {
                // Only inject if we can access the iframe content (same origin)
                if (iframe.contentDocument) {
                    const script = iframe.contentDocument.createElement('script');
                    script.textContent = `
                        // Helper function to enable downloading files from within iframes
                        window.downloadFile = function(content, fileName, type) {
                            // Send message to parent window
                            window.parent.postMessage({
                                type: 'download',
                                fileContent: content,
                                fileName: fileName,
                                fileType: type
                            }, '*');
                            return true; // Signal success to caller
                        };
                        
                        // Notify parent that helper is loaded
                        window.parent.postMessage({
                            type: 'helper_loaded',
                            frameId: '${iframe.id}'
                        }, '*');
                        
                        // Override saveAs if it exists (compatibility with FileSaver.js)
                        if (typeof saveAs !== 'undefined') {
                            const originalSaveAs = saveAs;
                            window.saveAs = function(blob, fileName) {
                                return window.downloadFile(blob, fileName);
                            };
                        }
                        
                        console.log('Download helper injected and ready');
                    `;
                    
                    iframe.contentDocument.head.appendChild(script);
                    console.log('Injected helper script into iframe:', iframe.id);
                }
            } catch (e) {
                console.warn('Could not inject helper script into iframe:', iframe.id, e);
            }
        });
    }
    
    // Call immediately and also set up a mutation observer to handle dynamically added iframes
    injectHelperScript();
    
    // Set up observer for dynamically added snippets
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                // Check if we need to inject helper scripts
                const hasNewIframes = Array.from(mutation.addedNodes).some(node => 
                    node.querySelector && node.querySelector('.snippet-content iframe')
                );
                
                if (hasNewIframes) {
                    setTimeout(injectHelperScript, 500); // Delay to ensure iframe is loaded
                }
            }
        });
    });
    
    // Start observing the document
    observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize file download handler when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeFileDownloadHandler();
});
  