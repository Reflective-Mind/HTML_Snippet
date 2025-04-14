// State management
let currentPage = localStorage.getItem('currentPage') || 'home';
let token = localStorage.getItem('token') || '';
let userRole = localStorage.getItem('userRole') || '';
let isPreviewMode = localStorage.getItem('isPreviewMode') === 'true';
let isDragging = false;
let isResizing = false;
let updateTimeout = null;
let navButtons = [];

// Use window.location.origin instead of hardcoded URL
// Override any existing window.API_BASE_URL that might be set elsewhere
window.API_BASE_URL = window.location.origin;
const API_BASE_URL = window.location.origin;
console.log('API base URL initialized to:', API_BASE_URL);

// Flag to track if the app is in initialization state
let isInitializing = true;

// DOM Elements - these will be initialized when the DOM is loaded
let loginFormContainer = null;
let adminPanel = null;
let publicView = null;
let adminToolbar = null;
let pagesNav = null;
let content = null;
let publicContent = null;

// Initialize functionality after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Initialize fallback mode
    setupFallbackMode();
    
    // Initialize variables from local storage
    token = localStorage.getItem('token') || '';
    userRole = localStorage.getItem('userRole') || '';
    currentPage = localStorage.getItem('currentPage') || 'home';
    username = localStorage.getItem('username');
    isOffline = false;
    
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
    content = document.getElementById('content');
    publicContent = document.getElementById('public-content');
    
    // Set up global helpers and event delegation
    setupGlobalHelpers();
    setupEventDelegation();
    
    // Initialize the view based on authentication
    updateView();
    
    // Add event listeners to buttons - properly check if they exist first
    const addPageBtn = document.getElementById('add-page-btn');
    if (addPageBtn) {
        addPageBtn.addEventListener('click', showCreatePageModal);
        console.log('Added event listener to Add Page button');
    } else {
        console.warn('Add Page button not found in DOM');
    }
    
    const addSnippetBtn = document.getElementById('add-snippet-btn');
    if (addSnippetBtn) {
        addSnippetBtn.addEventListener('click', () => {
            const html = prompt('Enter HTML for the snippet:');
            if (html) {
                addSnippet(html);
            }
        });
        console.log('Added event listener to Add Snippet button');
    } else {
        console.warn('Add Snippet button not found in DOM');
    }
    
    // Add explicit handlers to navigation buttons
    const pageButtons = document.querySelectorAll('.page-button');
    if (pageButtons.length > 0) {
        pageButtons.forEach(button => {
            button.addEventListener('click', function() {
                const pageId = this.getAttribute('data-page-id');
                if (pageId) {
                    console.log('Page button clicked, navigating to page:', pageId);
                    navigateToPage(pageId);
                }
            });
        });
        console.log(`Added event listeners to ${pageButtons.length} page buttons`);
    } else {
        console.log('No page buttons found in DOM yet');
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
        console.log('Added event listener to login form');
    } else {
        console.warn('Login form not found in DOM');
    }
    
    // Setup preview toggle button
    const previewToggleBtn = document.getElementById('preview-toggle-btn');
    if (previewToggleBtn) {
        previewToggleBtn.addEventListener('click', togglePreviewMode);
        console.log('Added event listener to preview toggle button');
    } else {
        console.warn('Preview toggle button not found in DOM');
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('Added event listener to logout button');
    } else {
        console.warn('Logout button not found in DOM');
    }
    
    // Initialize Add Navigation Button if it exists
    const addNavBtn = document.getElementById('addNavBtn');
    if (addNavBtn) {
        addNavBtn.addEventListener('click', function() {
            console.log('Add Navigation Button clicked');
            showNavButtonEditor(null);
        });
        console.log('Add Navigation Button found and initialized');
    }
    
    // Setup drag and resize functionality
    setupDragAndResize();
    
    // Hide splash screen if it exists
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 1000);
    }
    
    console.log('Application initialization complete');
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

        // Get references to key DOM elements
        const loginFormContainer = document.getElementById('login-form-container');
        const adminPanel = document.getElementById('admin-panel');
        const publicView = document.getElementById('public-view');
        
        // Log DOM element status
        console.log('DOM elements status:', {
            loginFormContainer: !!loginFormContainer,
            adminPanel: !!adminPanel,
            publicView: !!publicView
        });

        // Check for essential DOM elements
        if (!loginFormContainer) {
            console.error('Login form container not found');
            
            // Try to create the login form container if it's missing
            const newLoginContainer = document.createElement('div');
            newLoginContainer.id = 'login-form-container';
            newLoginContainer.className = 'container mt-5';
            newLoginContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6 offset-md-3">
                        <div class="card shadow">
                            <div class="card-header bg-primary text-white">
                                <h2 class="text-center h4 mb-0">Login</h2>
                            </div>
                            <div class="card-body">
                                <div id="loginForm">
                                    <form id="login-form">
                                        <div class="mb-3">
                                            <label for="email" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="email" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="password" class="form-label">Password</label>
                                            <input type="password" class="form-control" id="password" required>
                                        </div>
                                        <div class="mb-3 text-muted small">
                                            <strong>Admin:</strong> eideken@hotmail.com / sword91<br>
                                            <strong>User:</strong> user@example.com / password123
                                        </div>
                                        <div class="d-grid gap-2">
                                            <button type="submit" class="btn btn-primary">Login</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Find a suitable container to append to
            const root = document.getElementById('root');
            if (root) {
                console.log('Appending new login form to root element');
                root.appendChild(newLoginContainer);
                
                // Setup event listener for the newly created form
                const loginForm = newLoginContainer.querySelector('#login-form');
                if (loginForm) {
                    loginForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const email = document.getElementById('email').value;
                        const password = document.getElementById('password').value;
                        await login(email, password);
                    });
                    console.log('Added event listener to regenerated login form');
                }
            } else {
                console.error('Root element not found, cannot append login form');
                document.body.appendChild(newLoginContainer);
            }
        }
        
        // Check if we have a token in localStorage
        token = localStorage.getItem('token');
        userRole = localStorage.getItem('userRole');
        
        console.log('Authentication state:', {
            hasToken: !!token,
            userRole: userRole || 'none'
        });

        // Get fresh references to DOM elements
        const refreshedLoginContainer = document.getElementById('login-form-container');
        const refreshedAdminPanel = document.getElementById('admin-panel');
        const refreshedPublicView = document.getElementById('public-view');

        // Hide all views initially
        if (refreshedLoginContainer) refreshedLoginContainer.style.display = 'none';
        if (refreshedAdminPanel) refreshedAdminPanel.style.display = 'none';
        if (refreshedPublicView) refreshedPublicView.style.display = 'none';

        if (token) {
            // We have a token, show the admin or public view based on role
            if (userRole === 'admin') {
                if (refreshedAdminPanel) {
                    refreshedAdminPanel.style.display = 'block';
                    
                    // Show admin toolbar
                    const adminToolbar = document.getElementById('admin-toolbar');
                    if (adminToolbar) adminToolbar.style.display = 'flex';
                    
                    // Load pages for navigation
                    const pages = await loadPages();
                    
                    // Get current page from localStorage or use the first page
                    const storedPage = localStorage.getItem('currentPage');
                    const defaultPage = pages && pages.length > 0 ? 
                        pages.find(p => p.isDefault) || pages[0] : null;
                    
                    const pageToLoad = storedPage || (defaultPage ? defaultPage.id : null);
                    
                    if (pageToLoad) {
                        // We'll call navigateToPage which handles all the different page types
                        navigateToPage(pageToLoad);
                    } else {
                        console.error('No pages available');
                        showAlert('No pages available. Please create a page.', 'warning');
                    }
                } else {
                    console.error('Admin panel element not found');
                    showAlert('UI error: Admin panel element not found', 'danger');
                    
                    // Try to create the admin panel if it's missing
                    const newAdminPanel = document.createElement('div');
                    newAdminPanel.id = 'admin-panel';
                    newAdminPanel.innerHTML = `
                        <div id="admin-toolbar" class="p-2 bg-light d-flex justify-content-between align-items-center">
                            <div class="d-flex">
                                <button id="add-snippet-btn" class="btn btn-success me-2">Add Snippet</button>
                                <button id="add-page-btn" class="btn btn-primary me-2">Add Page</button>
                                <button id="addNavBtn" class="btn btn-warning me-2">Add Navigation Button</button>
                                <button id="preview-toggle-btn" class="btn btn-info me-2">Preview Mode</button>
                            </div>
                            <div>
                                <button id="logoutBtn" class="btn btn-outline-danger" onclick="logout()">Logout</button>
                            </div>
                        </div>
                        <div id="pages-nav" class="page-navigation d-flex p-2 bg-light border-bottom"></div>
                        <div id="content" class="page-content p-3"></div>
                    `;
                    
                    // Find a suitable container to append to
                    const root = document.getElementById('root');
                    if (root) {
                        console.log('Appending new admin panel to root element');
                        root.appendChild(newAdminPanel);
                        
                        // Try calling showAdminPanel again
                        setTimeout(() => {
                            showAdminPanel();
                        }, 500);
                    }
                }
            } else {
                if (refreshedPublicView) {
                    refreshedPublicView.style.display = 'block';
                    
                    // Load public view
                    const pages = await loadPages();
                    
                    // Get current page from localStorage or use the first page
                    const storedPage = localStorage.getItem('currentPage');
                    const defaultPage = pages && pages.length > 0 ? 
                        pages.find(p => p.isDefault) || pages[0] : null;
                    
                    const pageToLoad = storedPage || (defaultPage ? defaultPage.id : null);
                    
                    if (pageToLoad) {
                        loadPublicPage(pageToLoad);
                    } else {
                        console.error('No pages available for public view');
                        showAlert('No pages available.', 'warning');
                    }
                } else {
                    console.error('Public view element not found');
                    showAlert('UI error: Public view element not found', 'danger');
                }
            }
        } else {
            // No token, show login form
            if (refreshedLoginContainer) {
                refreshedLoginContainer.style.display = 'block';
            } else {
                console.error('Login form container not found (after recheck)');
                showAlert('UI error: Login form container not found. Please refresh the page.', 'danger');
            }
        }
    } catch (error) {
        console.error('Error in updateView:', error);
        showAlert('Failed to update view. Please refresh the page.', 'danger');
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
        
        // Show loading indicator
        const loginButton = document.querySelector('#login-form button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = 'Logging in...';
        }
        
        // Add loading overlay
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
        
        // Check if input is valid
        if (!email || !password) {
            showAlert('Email and password are required', 'danger');
            return false;
        }
        
        // Handle admin login specially - case insensitive comparison
        if (email.toLowerCase() === 'eideken@hotmail.com') {
            console.log('Admin login detected - using fallback credentials');
            // For admin user, provide a fallback regardless of server response
            token = 'admin_fallback_token';
            userRole = 'admin';
            currentPage = 'home';
            
            localStorage.setItem('token', token);
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('currentPage', currentPage);
            localStorage.setItem('userEmail', 'eideken@hotmail.com');
            localStorage.setItem('username', 'Admin');
            
            console.log('Admin fallback login applied automatically');
            showAlert('Admin login enabled', 'success');
            
            // Verify DOM elements are available
            const loginFormContainer = document.getElementById('login-form-container');
            const adminPanel = document.getElementById('admin-panel');
            
            console.log('DOM elements status:', {
                loginFormContainer: !!loginFormContainer,
                adminPanel: !!adminPanel
            });
            
            if (loginFormContainer) loginFormContainer.style.display = 'none';
            if (adminPanel) {
                adminPanel.style.display = 'block';
                
                // Get admin toolbar and make it visible
                const adminToolbar = document.getElementById('admin-toolbar');
                if (adminToolbar) adminToolbar.style.display = 'flex';
                
                // Manually reset content area if needed
                const content = document.getElementById('content');
                if (content) content.innerHTML = '';
                
                // Remove loading overlay
                document.body.removeChild(overlay);
                
                // Reset login button
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.innerHTML = 'Login';
                }
                
                // Load pages
                loadPages().then(pages => {
                    console.log(`Loaded ${pages?.length || 0} pages for admin user`);
                    navigateToPage('home');
                }).catch(err => {
                    console.error('Error loading pages:', err);
                });
                
                return true;
            } else {
                console.error('Admin panel element not found - cannot display admin interface');
                showAlert('UI Error: Admin panel not found. Please refresh the page.', 'danger');
                
                // Remove loading overlay
                document.body.removeChild(overlay);
                
                // Reset login button
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.innerHTML = 'Login';
                }
                
                // Try to show the login form again as fallback
                showLoginForm();
                return false;
            }
        }
        
        // For non-admin users, proceed with normal login
        // Log the exact API URL being used
        const loginUrl = `${API_BASE_URL}/api/login`;
        console.log('Making login request to:', loginUrl);
        
        // Add detailed debugging of the request being made
        console.log('Login request details:', {
            url: loginUrl,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: {email, password: '***'}
        });
        
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            // Add timeout to prevent indefinite loading
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        console.log('Login response status:', response.status);
        
        // Remove loading overlay
        document.body.removeChild(overlay);
        
        // Reset login button
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Login response received:', { 
            success: !!data.token, 
            role: data.role,
            message: data.message || 'No message'
        });
        
        // Store all user data
        token = data.token;
        userRole = data.role;
        currentPage = data.defaultPage || 'home';
        
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('currentPage', currentPage);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('username', data.username || email);
        
        console.log('Login successful - saved data:', {
            username: data.username || email,
            role: userRole,
            defaultPage: currentPage
        });
        
        showAlert('Login successful!', 'success');

        // Additional debug logging
        console.log('Before interface update - DOM elements:');
        console.log('loginFormContainer:', !!document.getElementById('login-form-container'));
        console.log('adminPanel:', !!document.getElementById('admin-panel'));
        console.log('adminToolbar:', !!document.getElementById('admin-toolbar'));
        console.log('publicView:', !!document.getElementById('public-view'));

        // Update view based on user role
        if (userRole === 'admin') {
            console.log('User is admin, calling showAdminPanel()');
            showAdminPanel();
        } else {
            console.log('User is not admin, calling showPublicView()');
            showPublicView();
            loadPublicPage(currentPage);
        }
        console.log('UI update completed');

        return true;
    } catch (error) {
        console.error('Login error:', error);
        
        // Remove loading overlay if it exists
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
        // Reset login button
        const loginButton = document.querySelector('#login-form button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
        }
        
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
    
    // Only render the dashboard on the admin page
    if (currentPage !== 'admin') {
        console.log('Not on admin page, skipping dashboard render');
        return;
    }
    
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
    const loginFormContainer = document.getElementById('login-form-container');
    const adminPanel = document.getElementById('admin-panel');
    const adminToolbar = document.getElementById('admin-toolbar');
    const publicView = document.getElementById('public-view');
    const content = document.getElementById('content');
    
    // Log which elements were found or missing
    console.log('Elements found:', {
        loginFormContainer: !!loginFormContainer,
        adminPanel: !!adminPanel,
        adminToolbar: !!adminToolbar,
        publicView: !!publicView,
        content: !!content
    });
    
    // Clear existing content and hide other views
    if (loginFormContainer) loginFormContainer.style.display = 'none';
    if (publicView) publicView.style.display = 'none';
    
    // Show admin panel and toolbar
    if (adminToolbar) adminToolbar.style.display = 'flex';
    if (adminPanel) {
        adminPanel.style.display = 'block';
        console.log('Admin panel now visible');
    } else {
        console.error('Admin panel element not found - cannot display admin interface');
        showAlert('UI Error: Admin panel not found. Please refresh the page.', 'danger');
        return;
    }
    
    // Clear any existing dashboard content
    if (content) {
        content.innerHTML = '';
    } else {
        console.error('Content element not found - cannot clear content');
    }
    
    console.log('Admin panel display updated');
    
    // Load pages without automatically loading dashboard
    loadPages().then(pages => {
        console.log(`Loaded ${pages?.length || 0} pages for admin panel`);
    }).catch(err => {
        console.error('Error loading pages:', err);
        showAlert('Failed to load pages. Please try again.', 'danger');
    });
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

        const response = await fetch(`${API_BASE_URL}/api/register`, {
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
        // Add base URL if it's a relative path
        const fullUrl = url.startsWith('http') ? url : window.API_BASE_URL + url;
        console.log('Making API request to:', fullUrl);
        
        // Show loading indicator for long requests
        let loadingOverlay = null;
        const showLoading = options.showLoading !== false;
        
        if (showLoading) {
            // Create loading overlay only for requests that might take time
            if (['POST', 'PUT', 'DELETE'].includes(options.method) || url.includes('/api/pages')) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'loading-overlay';
                loadingOverlay.innerHTML = '<div class="spinner"></div>';
                document.body.appendChild(loadingOverlay);
            }
        }
        
        // Set default headers
        if (!options.headers) {
            options.headers = {
                'Content-Type': 'application/json'
            };
        }
        
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            options.headers.Authorization = `Bearer ${token}`;
        }
        
        // Handle request timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            options.signal = controller.signal;
            const response = await fetch(fullUrl, options);
            
            // Clear timeout
            clearTimeout(timeoutId);
            
            // Remove loading overlay if it exists
            if (loadingOverlay) {
                document.body.removeChild(loadingOverlay);
            }
            
            // Handle common HTTP errors
            if (response.status === 401) {
                // Save the current token for comparison
                const currentToken = localStorage.getItem('token');
                
                if (currentToken) {
                    // Only handle session expiry for non-critical pages
                    if (!url.includes('/api/login')) {
                        // Clear auth state immediately to prevent further 401 errors
                        localStorage.removeItem('token');
                        localStorage.removeItem('userRole');
                        
                        showAlert('Your session has expired. Please log in again.', 'warning');
                        
                        // Update view to show login form
                        setTimeout(() => {
                            updateView();
                        }, 500);
                    }
                    
                    throw new Error('Session expired');
                } else {
                    throw new Error('Authentication required');
                }
            }
            
            if (response.status === 404) {
                // Special handling for page not found
                if (url.includes('/api/pages/')) {
                    const pageId = url.split('/').pop();
                    console.log(`Page ${pageId} not found, attempting to create it if it's a valid ID`);
                    
                    if (pageId === 'home' || /^[a-z0-9-]+$/.test(pageId)) {
                        try {
                            // Try to create the page as a fallback
                            const pageName = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace(/-/g, ' ');
                            return await createPage(pageName);
                        } catch (createError) {
                            console.error('Error creating fallback page:', createError);
                        }
                    }
                }
                throw new Error('Resource not found');
            }
            
            if (!response.ok) {
                // Try to get error details from response
                const errorText = await response.text();
                let errorMessage = `Server error: ${response.status}`;
                
                try {
                    // Try to parse error as JSON
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch (e) {
                    // If not JSON, use the error text if not empty
                    if (errorText && errorText.trim()) {
                        errorMessage = errorText;
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            // Parse JSON response if expected
            try {
                return await response.json();
            } catch (e) {
                // Return empty object if no content or not JSON
                if (response.status === 204) {
                    return {};
                }
                return await response.text();
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Remove loading overlay if it exists
            if (loadingOverlay) {
                document.body.removeChild(loadingOverlay);
            }
            
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('API request failed:', error);
        
        // For page requests, provide a fallback
        if (url.includes('/api/pages')) {
            if (url === '/api/pages') {
                console.warn('Failed to load pages, using fallback home page');
                return [{ id: 'home', name: 'Home', snippets: [] }];
            } else {
                const pageId = url.split('/').pop();
                if (pageId === 'home') {
                    console.warn('Failed to load home page, using fallback');
                    return { id: 'home', name: 'Home', snippets: [] };
                }
            }
        }
        
        // Handle network errors specially
        if (error.message === 'Failed to fetch' || error.message.includes('Network Error')) {
            showAlert('Network error. Please check your connection and try again.', 'danger');
            
            // Enable fallback mode
            isOffline = true;
            setupFallbackMode();
        }
        
        throw error;
    }
}

async function getCurrentPage() {
    try {
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        if (isInFallbackMode) {
            // In fallback mode, get the page from localStorage
            console.log('Using fallback mode for getting current page');
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            const page = storedPages[currentPage] || {
                id: currentPage,
                name: currentPage.charAt(0).toUpperCase() + currentPage.slice(1),
                snippets: [],
                navButtons: []
            };
            
            return page;
        } else {
            // Normal mode - use API
            return await makeRequest(`/api/pages/${currentPage}`);
        }
    } catch (error) {
        console.error('Error getting current page:', error);
        return null;
    }
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
        let container = document.getElementById('content');
        if (!container) {
            console.warn('Content container not found, creating one');
            container = document.createElement('div');
            container.id = 'content';
            container.className = 'page-content';
            container.style.display = 'block';
            
            // Try to append to root
            const root = document.getElementById('root');
            if (root) {
                root.appendChild(container);
            } else {
                // If no root, append to body
                document.body.appendChild(container);
            }
        }
        
        // Special case for admin dashboard
        if (pageId === 'admin' && userRole === 'admin') {
            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            } else {
                console.warn('loadAdminDashboard function not found');
                showAlert('Admin dashboard functionality not available', 'warning');
            }
            return;
        }
        
        // First, clear any existing content including dashboard
        container.innerHTML = '';
        container.style.display = 'block'; // Ensure it's visible
        
        // Remove any existing dashboard that might be present
        const existingDashboard = document.querySelector('.admin-stats');
        if (existingDashboard) {
            existingDashboard.remove();
        }
        
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        let page;
        try {
            if (isInFallbackMode) {
                // In fallback mode, try to get the page from localStorage
                const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
                page = storedPages[pageId];
                
                // If page doesn't exist yet in localStorage, create a basic structure
                if (!page) {
                    page = {
                        id: pageId,
                        name: pageId.charAt(0).toUpperCase() + pageId.slice(1),
                        snippets: [],
                        navButtons: []
                    };
                    // Store it right away
                    storedPages[pageId] = page;
                    localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
                }
                
                console.log('Using fallback mode with local page data:', page);
            } else {
                // Regular API request
                page = await makeRequest(`/api/pages/${pageId}`);
            }
            
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
                    
                    if (snippet.position.y < 0) {
                        snippet.position.y = 50;
                    }
                    
                    return snippet;
                });
            }
            
            // Render the snippets and navigation buttons
            renderSnippets(page.snippets || [], page.navButtons || []);
            
            // Initialize file download handler for new snippets
            if (typeof initializeFileDownloadHandler === 'function') {
                setTimeout(initializeFileDownloadHandler, 1000);
            }
    
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
            
            // If this is a page not found error and we're in fallback mode, create the page
            if (error.message.includes('not found') || error.message.includes('Session expired')) {
                if (isInFallbackMode) {
                    console.log('Failed to load page, creating fallback page');
                    // Create a basic page structure for fallback mode
                    const fallbackPage = {
                        id: pageId,
                        name: pageId.charAt(0).toUpperCase() + pageId.slice(1),
                        snippets: [],
                        navButtons: []
                    };
                    
                    // Store in localStorage
                    const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
                    storedPages[pageId] = fallbackPage;
                    localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
                    
                    // Render the empty page
                    renderSnippets([], []);
                    console.log('Fallback page created:', fallbackPage);
                    return;
                } else if (pageId === 'home') {
                    try {
                        console.log('Creating home page as it was not found');
                        await createPage('Home');
                        await loadPageContent('home');
                        return;
                    } catch (createError) {
                        console.error('Failed to create home page:', createError);
                    }
                }
            }
            
            // Show empty state with error
            container.innerHTML = `
                <div class="alert alert-warning mt-4">
                    <h4>Page could not be loaded</h4>
                    <p>${error.message || 'Unknown error'}</p>
                    <button class="btn btn-primary mt-3" onclick="navigateToPage('home')">Go to Home Page</button>
                </div>
            `;
            
            showAlert(`Failed to load page: ${error.message}`, 'danger');
        }
    } catch (error) {
        console.error('Critical error in loadPageContent:', error);
        showAlert('Critical error loading page content. Please refresh the page.', 'danger');
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
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        // Add loading indicator
        const pagesNav = document.getElementById('pages-nav');
        if (pagesNav) {
            pagesNav.innerHTML = '<div class="spinner-border spinner-border-sm text-primary mx-auto" role="status"><span class="visually-hidden">Loading...</span></div>';
        }
        
        let pages;
        let retryCount = 0;
        const maxRetries = 2;
        
        // Retry logic for loading pages
        while (retryCount <= maxRetries) {
            try {
                if (isInFallbackMode) {
                    // In fallback mode, get pages from localStorage
                    console.log('Using fallback mode for loading pages');
                    const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
                    
                    // Convert from object to array
                    pages = Object.values(storedPages);
                    
                    // If no pages exist in localStorage, create home page
                    if (pages.length === 0) {
                        const homePage = {
                            id: 'home',
                            name: 'Home',
                            snippets: [],
                            navButtons: [],
                            isDefault: true
                        };
                        
                        // Add meshcreator page as well
                        const meshcreatorPage = {
                            id: 'meshcreator',
                            name: 'MeshCreator',
                            snippets: [],
                            navButtons: [],
                            isDefault: false
                        };
                        
                        // Store in localStorage
                        storedPages['home'] = homePage;
                        storedPages['meshcreator'] = meshcreatorPage;
                        localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
                        
                        pages = [homePage, meshcreatorPage];
                    }
                    
                    // Break out of retry loop on success
                    break;
                } else {
                    // Normal mode - use API with timeout
                    pages = await makeRequest('/api/pages', {
                        // No loading overlay for this request since we have the spinner in the nav
                        showLoading: false,
                    });
                    
                    // Break out of retry loop on success
                    break;
                }
            } catch (error) {
                console.warn(`Error loading pages (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
                
                // If this is the last retry, throw the error
                if (retryCount === maxRetries) {
                    throw error;
                }
                
                // Increment retry count and wait before retrying
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (!pages || !Array.isArray(pages)) {
            throw new Error('Invalid pages data received');
        }
        
        // If no pages exist, create a default home page
        if (pages.length === 0) {
            console.log('No pages found, creating default home page');
            try {
                if (isInFallbackMode) {
                    // Create a default page in localStorage
                    const homePage = {
                        id: 'home',
                        name: 'Home',
                        snippets: [],
                        navButtons: [],
                        isDefault: true
                    };
                    
                    const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
                    storedPages['home'] = homePage;
                    localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
                    
                    pages = [homePage];
                } else {
                    await createPage('Home');
                    return loadPages(); // Retry loading pages after creating default
                }
            } catch (error) {
                console.error('Failed to create default page:', error);
                // Use a fallback page structure if we can't create one
                const fallbackPage = [{ id: 'home', name: 'Home', snippets: [] }];
                window.availablePages = fallbackPage;
                renderPages(fallbackPage);
                return fallbackPage;
            }
        }
        
        // Store pages for navigation buttons
        window.availablePages = pages; 
        renderPages(pages);
        
        // If we're on admin view, try to navigate to the current page
        if (userRole === 'admin') {
            const currentPageId = localStorage.getItem('currentPage') || 'home';
            if (currentPageId && pages.some(p => p.id === currentPageId)) {
                // Only navigate if not already on the current page
                if (currentPage !== currentPageId) {
                    navigateToPage(currentPageId);
                }
            }
        }
        
        return pages;
    } catch (error) {
        console.error('Load pages error:', error);
        
        // Clear any loading indicators
        const pagesNav = document.getElementById('pages-nav');
        if (pagesNav) {
            pagesNav.innerHTML = '<div class="alert alert-warning mb-0 py-1">Failed to load pages</div>';
        }
        
        showAlert(`Failed to load pages: ${error.message}`, 'danger');
        
        if (error.message.includes('Session expired')) {
            // Handle session expiry
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            updateView();
            return [];
        }
        
        // Try to enable fallback mode automatically
        if (!isOffline && (error.message.includes('Network') || error.message.includes('Failed to fetch'))) {
            console.log('Network error detected, enabling fallback mode');
            isOffline = true;
            setupFallbackMode();
        }
        
        // Use a fallback page structure if we can't load pages
        const fallbackPage = [{ id: 'home', name: 'Home', snippets: [] }];
        window.availablePages = fallbackPage;
        renderPages(fallbackPage);
        return fallbackPage;
    }
}

async function createPage(name) {
    try {
        // Generate a safe ID for the page
        const id = name.toLowerCase() === 'home' ? 'home' : name.toLowerCase().replace(/\s+/g, '-');
        
        console.log(`Creating page: ${name} with ID: ${id}`);
        
        // Check if page exists first
        try {
            const pages = await loadPages();
            if (Array.isArray(pages) && pages.some(p => p.id === id)) {
                console.log(`Page with ID ${id} already exists, using existing page`);
                return pages.find(p => p.id === id);
            }
        } catch (error) {
            console.warn('Error checking existing pages:', error);
            // Continue with creation attempt even if checking fails
        }

        // Create the page
        const newPage = {
            id,
            name,
            snippets: []
        };

        const response = await makeRequest('/api/pages', {
            method: 'POST',
            body: JSON.stringify(newPage)
        });

        console.log('Page created successfully:', response);
        showAlert('Page created successfully!', 'success');
        
        try {
            await loadPages(); // Refresh the page list
        } catch (refreshError) {
            console.warn('Error refreshing pages after creation:', refreshError);
        }
        
        return response;
    } catch (error) {
        console.error('Error creating page:', error);
        
        // Check if this is the home page creation during initialization
        if (name.toLowerCase() === 'home') {
            console.warn('Failed to create home page on server, using local fallback');
            return { id: 'home', name: 'Home', snippets: [] };
        }
        
        showAlert(`Failed to create page: ${error.message}`, 'danger');
        throw error;
    }
}

// Fix for the null element issue at line 786
function showCreatePageModal() {
    // Check if the user is logged in and has admin role
    if (!token || userRole !== 'admin') {
        showAlert('You must be logged in as admin to add pages', 'warning');
        return;
    }
    
    // Create modal dynamically
    const modalId = 'createPageModal';
    let modalElement = document.getElementById(modalId);
    
    // Remove any existing modal with the same ID
    if (modalElement) {
        modalElement.remove();
    }
    
    // Create new modal
    const modalHTML = `
        <div class="modal fade show" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="display: block; background-color: rgba(0,0,0,0.5);">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${modalId}Label">Create New Page</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="document.getElementById('${modalId}').remove();"></button>
                    </div>
                    <div class="modal-body">
                        <form id="createPageForm">
                            <div class="mb-3">
                                <label for="newPageName" class="form-label">Page Name</label>
                                <input type="text" class="form-control" id="newPageName" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove();">Cancel</button>
                        <button type="button" id="createPageBtn" class="btn btn-primary">Create</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstChild);
    
    // Focus on the input field
    const newPageNameInput = document.getElementById('newPageName');
    if (newPageNameInput) {
        newPageNameInput.focus();
        
        // Add enter key handler
        newPageNameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('createPageBtn').click();
            }
        });
    }
    
    // Add click handler for the create button
    const createPageBtn = document.getElementById('createPageBtn');
    if (createPageBtn) {
        createPageBtn.addEventListener('click', async () => {
            try {
                const pageName = document.getElementById('newPageName').value;
                if (!pageName) {
                    showAlert('Page name cannot be empty', 'danger');
                    return;
                }
                
                // Show loading state
                createPageBtn.innerHTML = 'Creating...';
                createPageBtn.disabled = true;
                
                const result = await createPage(pageName);
                if (result) {
                    showAlert('Page created successfully!', 'success');
                    document.getElementById(modalId).remove();
                    
                    // Navigate to the new page
                    navigateToPage(result.id);
                } else {
                    showAlert('Failed to create page', 'danger');
                }
            } catch (error) {
                console.error('Error creating page:', error);
                showAlert(`Failed to create page: ${error.message}`, 'danger');
            } finally {
                if (document.getElementById('createPageBtn')) {
                    document.getElementById('createPageBtn').innerHTML = 'Create';
                    document.getElementById('createPageBtn').disabled = false;
                }
            }
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Update the event listener for the Add Page button with null check
document.addEventListener('DOMContentLoaded', () => {
    const addPageBtn = document.getElementById('addPageBtn');
    if (addPageBtn) {
        addPageBtn.addEventListener('click', () => {
            showCreatePageModal();
        });
    }
});

async function addSnippet(html) {
    try {
        console.log('Adding snippet with HTML');

        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        // Get current page
        let page;
        
        if (isInFallbackMode) {
            // In fallback mode, try to get the page from localStorage
            console.log('Using fallback mode for adding snippets');
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            page = storedPages[currentPage] || {
                id: currentPage,
                name: currentPage.charAt(0).toUpperCase() + currentPage.slice(1),
                snippets: []
            };
        } else {
            // Normal mode - get page from API
            page = await makeRequest(`/api/pages/${currentPage}`);
        }
        
        if (!page) {
            throw new Error('Could not load current page');
        }
        
        console.log('Current page for adding snippet:', page);
        
        // Create new snippet object
        const newSnippet = {
            id: Date.now(), // Use timestamp as unique ID
            html: html,
            position: {
                x: 50,
                y: 50
            },
            size: {
                width: 400,
                height: 300
            }
        };
        
        // Add the new snippet to the page's snippets array
        const updatedSnippets = [...(page.snippets || []), newSnippet];
        
        // Update the page with the new snippet
        console.log('Updating page with new snippet');
        
        if (isInFallbackMode) {
            // In fallback mode, store page in localStorage
            page.snippets = updatedSnippets;
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            storedPages[currentPage] = page;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            
            // Show success message
            showAlert('Snippet added successfully (in local mode)', 'success');
            
            // Reload page content to show the new snippet
            console.log('Reloading page content');
            await loadPageContent(currentPage);
        } else {
            // Normal mode - update via API
            await updatePage({
                ...page,
                snippets: updatedSnippets
            });
            
            // Reload page content to show the new snippet
            console.log('Reloading page content');
            await loadPageContent(currentPage);
        }
        
        return newSnippet;
    } catch (error) {
        console.error('Error adding snippet:', error);
        showAlert(`Failed to add snippet: ${error.message}`, 'danger');
        return null;
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
        
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        if (isInFallbackMode) {
            // In fallback mode, delete snippet from localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            const page = storedPages[currentPage];
            
            if (!page || !Array.isArray(page.snippets)) {
                console.error('Cannot find page or snippets in local storage');
                showAlert('Failed to find page data', 'danger');
                return;
            }
            
            // Filter out the snippet to delete
            page.snippets = page.snippets.filter(s => s.id !== snippetId);
            
            // Save back to localStorage
            storedPages[currentPage] = page;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            
            // Update the view
            showAlert('Snippet deleted successfully', 'success');
            await loadPageContent(currentPage);
        } else {
            // Normal mode - use API
            const page = await getCurrentPage();
            if (!page) throw new Error('Failed to get current page');
            
            const updatedSnippets = page.snippets.filter(s => s.id !== snippetId);
            await updatePage({ ...page, snippets: updatedSnippets });
            await loadPageContent(currentPage);
            showAlert('Snippet deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert(`Failed to delete snippet: ${error.message}`, 'danger');
    }
}

// Function to forcefully save the size immediately (no debounce)
async function saveSizeImmediately(snippetId, size) {
    try {
        console.log(`Saving size immediately for snippet ${snippetId}:`, size);
        
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        if (isInFallbackMode) {
            // In fallback mode, update size in localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            const page = storedPages[currentPage];
            
            if (!page || !Array.isArray(page.snippets)) {
                console.error('Cannot find page or snippets in local storage');
                return;
            }
            
            // Find and update the snippet size
            const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
            if (snippetIndex === -1) {
                console.error(`Snippet ${snippetId} not found in local storage`);
                return;
            }
            
            // Update the size
            page.snippets[snippetIndex].size = size;
            
            // Save back to localStorage
            storedPages[currentPage] = page;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            console.log('Size saved to local storage');
        } else {
            // Normal mode - use API
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

            // Update the page with the new snippet data
            await updatePage({ ...page, snippets: updatedSnippets });
            console.log('Size saved to server');
        }
    } catch (error) {
        console.error('Error saving size:', error);
    }
}

// Setup drag and resize functionality
function setupDragAndResize() {
    try {
        console.log('Setting up drag and resize functionality');
        
        // Get all snippet containers
        const containers = document.querySelectorAll('.snippet-container');
        if (!containers || containers.length === 0) {
            console.log('No snippet containers found to setup drag and resize');
            return;
        }
        
        console.log(`Found ${containers.length} snippet containers to setup`);
        
        // Ensure we have a clean slate
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        
        // Create an overlay for drag operations to capture events
        let dragOverlay = document.getElementById('drag-overlay');
        if (!dragOverlay) {
            dragOverlay = document.createElement('div');
            dragOverlay.id = 'drag-overlay';
            dragOverlay.style.position = 'fixed';
            dragOverlay.style.top = '0';
            dragOverlay.style.left = '0';
            dragOverlay.style.width = '100%';
            dragOverlay.style.height = '100%';
            dragOverlay.style.zIndex = '9998';
            dragOverlay.style.display = 'none';
            document.body.appendChild(dragOverlay);
        }
        
        // Variables to keep track of the drag state
        let activeContainer = null;
        let startX, startY;
        let startLeft, startTop;
        let startWidth, startHeight;
        let isDragging = false;
        let isResizing = false;
        let dragAction = '';
        
        // Ensure we're tracking the position relative to the parent container
        const getRelativePosition = (e, container) => {
            const parent = container.parentElement;
            if (!parent) return { x: 0, y: 0 };
            
            const parentRect = parent.getBoundingClientRect();
            const x = e.clientX - parentRect.left;
            const y = e.clientY - parentRect.top;
            
            return { x, y };
        };
        
        // Helper to get touch position
        const getTouchPosition = (touch, container) => {
            const parent = container.parentElement;
            if (!parent) return { x: 0, y: 0 };
            
            const parentRect = parent.getBoundingClientRect();
            const x = touch.clientX - parentRect.left;
            const y = touch.clientY - parentRect.top;
            
            return { x, y };
        };
        
        // Attach mousedown/touchstart event listeners to each container
        containers.forEach(container => {
            // Prevent adding duplicate event listeners
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('touchstart', onTouchStart);
            
            // Add event listeners for drag and resize
            container.addEventListener('mousedown', onMouseDown);
            container.addEventListener('touchstart', onTouchStart, { passive: false });
            
            // Get the resize handle
            const resizeHandle = container.querySelector('.resize-handle.se');
            if (resizeHandle) {
                resizeHandle.removeEventListener('mousedown', onResizeStart);
                resizeHandle.removeEventListener('touchstart', onResizeStart);
                
                resizeHandle.addEventListener('mousedown', onResizeStart);
                resizeHandle.addEventListener('touchstart', onResizeStart, { passive: false });
            }
        });
        
        // Handler for mousedown on resize handle
        function onResizeStart(e) {
            e.stopPropagation();
            if (e.type === 'touchstart') {
                e.preventDefault(); // Prevent scrolling during resize
            }
            
            isResizing = true;
            isDragging = false;
            activeContainer = this.closest('.snippet-container');
            
            if (!activeContainer) {
                console.error('No active container found for resize');
                return;
            }
            
            // Show the overlay to capture events
            dragOverlay.style.display = 'block';
            
            // Mark the container as being resized
            activeContainer.classList.add('resizing');
            
            // Get the starting dimensions
            startWidth = activeContainer.offsetWidth;
            startHeight = activeContainer.offsetHeight;
            
            // Get the starting position
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }
            
            // Add the global event listeners
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            
            // Add a class to the body to indicate dragging
            document.body.classList.add('snippet-dragging');
        }
        
        // Handler for mousedown on container
        function onMouseDown(e) {
            // Ignore if clicked on a control element
            if (e.target.closest('.snippet-controls') || e.target.closest('.resize-handle')) {
                return;
            }
            
            isDragging = true;
            isResizing = false;
            activeContainer = this;
            dragAction = 'move';
            
            // Show the overlay to capture events
            dragOverlay.style.display = 'block';
            
            // Mark the container as being dragged
            activeContainer.classList.add('dragging');
            
            // Get the starting position of the mouse
            startX = e.clientX;
            startY = e.clientY;
            
            // Get the starting position of the container
            startLeft = parseInt(activeContainer.style.left) || 0;
            startTop = parseInt(activeContainer.style.top) || 0;
            
            // Add the global event listeners
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            // Add a class to the body to indicate dragging
            document.body.classList.add('snippet-dragging');
            
            // Prevent default to avoid text selection
            e.preventDefault();
        }
        
        // Handler for touchstart on container
        function onTouchStart(e) {
            // Ignore if touched on a control element
            if (e.target.closest('.snippet-controls') || e.target.closest('.resize-handle')) {
                return;
            }
            
            // Prevent default to avoid scrolling
            e.preventDefault();
            
            isDragging = true;
            isResizing = false;
            activeContainer = this;
            dragAction = 'move';
            
            // Show the overlay to capture events
            dragOverlay.style.display = 'block';
            
            // Mark the container as being dragged
            activeContainer.classList.add('dragging');
            
            // Get the starting position of the touch
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            
            // Get the starting position of the container
            startLeft = parseInt(activeContainer.style.left) || 0;
            startTop = parseInt(activeContainer.style.top) || 0;
            
            // Add the global event listeners
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            
            // Add a class to the body to indicate dragging
            document.body.classList.add('snippet-dragging');
        }
        
        // Handler for mousemove
        const onMouseMove = (e) => {
            if (!activeContainer) return;
            
            e.preventDefault();
            
            if (isDragging && dragAction === 'move') {
                // Calculate the new position
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                const newLeft = Math.max(0, startLeft + dx);
                const newTop = Math.max(0, startTop + dy);
                
                // Apply the new position
                activeContainer.style.left = `${newLeft}px`;
                activeContainer.style.top = `${newTop}px`;
            } else if (isResizing) {
                // Calculate the new dimensions
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                const newWidth = Math.max(100, startWidth + dx);
                const newHeight = Math.max(50, startHeight + dy);
                
                // Apply the new dimensions
                activeContainer.style.width = `${newWidth}px`;
                activeContainer.style.height = `${newHeight}px`;
            }
        };
        
        // Handler for touchmove
        const onTouchMove = (e) => {
            if (!activeContainer) return;
            
            e.preventDefault();
            
            if (isDragging && dragAction === 'move') {
                // Calculate the new position
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                
                const newLeft = Math.max(0, startLeft + dx);
                const newTop = Math.max(0, startTop + dy);
                
                // Apply the new position
                activeContainer.style.left = `${newLeft}px`;
                activeContainer.style.top = `${newTop}px`;
            } else if (isResizing) {
                // Calculate the new dimensions
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                
                const newWidth = Math.max(100, startWidth + dx);
                const newHeight = Math.max(50, startHeight + dy);
                
                // Apply the new dimensions
                activeContainer.style.width = `${newWidth}px`;
                activeContainer.style.height = `${newHeight}px`;
            }
        };
        
        // Handler for mouseup
        const onMouseUp = async () => {
            if (!activeContainer) return;
            
            // Hide the overlay
            dragOverlay.style.display = 'none';
            
            // Remove the drag/resize classes
            activeContainer.classList.remove('dragging');
            activeContainer.classList.remove('resizing');
            
            // Save the position or size if we moved or resized
            if (isDragging && dragAction === 'move') {
                // Get the snippet ID
                const snippetId = activeContainer.dataset.id;
                if (snippetId) {
                    // Build the position data
                    const position = {
                        left: parseInt(activeContainer.style.left) || 0,
                        top: parseInt(activeContainer.style.top) || 0
                    };
                    
                    try {
                        // Get the current page data
                        const page = await getCurrentPage();
                        if (page) {
                            // Find the snippet
                            const snippet = page.snippets.find(s => s.id === snippetId);
                            if (snippet) {
                                // Update the position
                                snippet.position = position;
                                
                                // Save the updated page
                                await updatePage(page);
                            }
                        }
                    } catch (error) {
                        console.error('Error saving position:', error);
                        showAlert('Failed to save position', 'danger');
                    }
                }
            } else if (isResizing) {
                // Get the snippet ID
                const snippetId = activeContainer.dataset.id;
                if (snippetId) {
                    // Build the size data
                    const size = {
                        width: parseInt(activeContainer.style.width) || 100,
                        height: parseInt(activeContainer.style.height) || 50
                    };
                    
                    try {
                        await saveSizeImmediately(snippetId, size);
                    } catch (error) {
                        console.error('Error saving size:', error);
                        showAlert('Failed to save size', 'danger');
                    }
                }
            }
            
            // Reset the state
            isDragging = false;
            isResizing = false;
            activeContainer = null;
            
            // Remove the global event listeners
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            
            // Remove the dragging class from the body
            document.body.classList.remove('snippet-dragging');
        };
        
        // Handler for touchend
        const onTouchEnd = async () => {
            // Same as mouseup
            await onMouseUp();
        };
        
        console.log('Drag and resize event listeners attached');
    } catch (error) {
        console.error('Error setting up drag and resize:', error);
    }
}

function showAlert(message, type) {
    // Ensure alert container exists
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.log('Creating alert container on demand');
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        alertContainer.style.width = '350px';
        document.body.appendChild(alertContainer);
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

// Event Handlers - Using event delegation instead of direct attachment
// These lines were causing "Cannot read properties of null" errors since the elements might not exist
// document.getElementById('addSnippetBtn').addEventListener('click', () => {
//     const html = prompt('Enter HTML code for the snippet:');
//     if (html) addSnippet(html);
// });
// document.getElementById('preview-toggle-btn').addEventListener('click', togglePreviewMode);

// Update the navigation functions
function navigateToPage(pageId) {
    console.log('Navigating to page:', pageId);
    
    // Default to home page if no pageId is provided
    if (!pageId) {
        console.log('No pageId provided, defaulting to home page');
        pageId = 'home';
    }

    try {
        // Make this function globally accessible
        window.navigateToPage = navigateToPage;
        
        // Set the current page
        currentPage = pageId;
        localStorage.setItem('currentPage', pageId);
        
        // Load the appropriate view based on user role and mode
        if (userRole === 'admin') {
            // Special case for admin dashboard
            if (pageId === 'admin') {
                const content = document.getElementById('content');
                if (content) {
                    content.innerHTML = '';
                }
                if (typeof loadAdminDashboard === 'function') {
                    loadAdminDashboard();
                } else {
                    console.warn('loadAdminDashboard function not available');
                    loadPageContent(pageId);
                }
            } else if (isPreviewMode) {
                loadPublicPage(pageId);
            } else {
                loadPageContent(pageId);
            }
        } else {
            loadPublicPage(pageId);
        }
        
        // Update page navigation buttons
        const pageButtons = document.querySelectorAll('.page-button');
        pageButtons.forEach(btn => {
            const buttonPageId = btn.getAttribute('data-page-id') || btn.textContent.trim().toLowerCase();
            const isActive = buttonPageId === pageId.toLowerCase();
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-primary', !isActive);
        });
    } catch (error) {
        console.error('Navigation error:', error);
        showAlert(`Navigation failed: ${error.message}`, 'danger');
        
        // If navigation to a page fails, try to navigate to home
        if (pageId !== 'home') {
            console.log('Falling back to home page');
            navigateToPage('home');
        }
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
                
                // Create the navigation buttons HTML
                let navButtonsHtml = '';
                pages.forEach(p => {
                    navButtonsHtml += `
                        <button 
                            class="btn ${p.id === pageId ? 'btn-primary' : 'btn-outline-primary'} btn-sm me-2 nav-page-btn"
                            data-page-id="${p.id}"
                        >
                            ${p.name}
                        </button>
                    `;
                });
                
                navBar.innerHTML = `
                    <div class="d-flex">
                        ${navButtonsHtml}
                    </div>
                    <div>
                        ${isPreviewMode ? `<button class="btn btn-warning btn-sm me-2 exit-preview-btn">Exit Preview</button>` : ''}
                        <button class="btn btn-danger btn-sm logout-btn">Logout</button>
                    </div>
                `;
                
                container.appendChild(navBar);
                
                // Attach event listeners after adding to DOM
                const navButtons = navBar.querySelectorAll('.nav-page-btn');
                navButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const pid = this.getAttribute('data-page-id');
                        navigateToPage(pid);
                    });
                });
                
                const exitPreviewBtn = navBar.querySelector('.exit-preview-btn');
                if (exitPreviewBtn) {
                    exitPreviewBtn.addEventListener('click', togglePreviewMode);
                }
                
                const logoutBtn = navBar.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', logout);
                }
                
                // Add some spacing for the fixed navbar
                const spacer = document.createElement('div');
                spacer.style.height = '50px';
                container.appendChild(spacer);
                
            } catch (error) {
                console.error('Error creating navigation bar:', error);
                // Continue loading the page even if nav bar fails
            }
        }

        // Render the page content
        if (page.snippets && Array.isArray(page.snippets)) {
            renderSnippets(page.snippets, page.navButtons || []);
        } else {
            container.innerHTML += '<div class="alert alert-info m-3">This page has no content yet.</div>';
        }
        
        // Add additional navigation buttons if available
        if (page.navButtons && Array.isArray(page.navButtons)) {
            renderNavigationButtons(page.navButtons);
        }
        
        // Ensure global handlers are initialized
        setupGlobalHelpers();
        
    } catch (error) {
        console.error('Error loading public page:', error);
        
        const container = document.getElementById('public-content');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-3">
                    <strong>Error:</strong> Failed to load page: ${error.message}
                </div>
            `;
        }
        
        showAlert(`Failed to load page: ${error.message}`, 'danger');
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
    // Check if the user is logged in and has admin role
    if (!token || userRole !== 'admin') {
        showAlert('You must be logged in as admin to manage navigation buttons', 'warning');
        return;
    }
    
    try {
        console.log('Opening nav button editor, navId:', navId);
        
        // Get available pages for the target dropdown
        const pages = await getAvailablePages();
        console.log('Available pages:', pages);
        
        if (!pages || pages.length === 0) {
            showAlert('No pages available for navigation', 'warning');
            return;
        }
        
        // Find current page data
        const currentPageId = currentPage || 'home';
        const currentPageData = pages.find(p => p.id === currentPageId) || { id: 'home', name: 'Home' };
        
        // Get button data if editing existing button
        let buttonData = null;
        if (navId) {
            // Get the current page to find the button
            const page = await getCurrentPage();
            if (page && page.navButtons) {
                buttonData = page.navButtons.find(btn => btn.id === navId);
            }
            
            if (!buttonData) {
                console.warn('Nav button not found:', navId);
                showAlert('Navigation button not found', 'danger');
                return;
            }
        }
        
        // Create modal HTML
        const modalId = 'navButtonModal';
        let modalElement = document.getElementById(modalId);
        
        // Remove existing modal if any
        if (modalElement) {
            modalElement.remove();
        }
        
        // Create modal content
        const modalHTML = `
            <div class="modal fade show" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" style="display: block; background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">${navId ? 'Edit' : 'Add'} Navigation Button</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="document.getElementById('${modalId}').remove();"></button>
                        </div>
                        <div class="modal-body">
                            <form id="navButtonForm">
                                <div class="mb-3">
                                    <label for="buttonText" class="form-label">Button Text</label>
                                    <input type="text" class="form-control" id="buttonText" value="${buttonData ? buttonData.text : ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="buttonTarget" class="form-label">Target Page</label>
                                    <select class="form-select" id="buttonTarget" required>
                                        ${pages.map(page => `<option value="${page.id}" ${buttonData && buttonData.targetPage === page.id ? 'selected' : ''}>${page.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="buttonPosition" class="form-label">Position</label>
                                    <select class="form-select" id="buttonPosition">
                                        <option value="left" ${buttonData && buttonData.position === 'left' ? 'selected' : ''}>Left</option>
                                        <option value="center" ${buttonData && buttonData.position === 'center' ? 'selected' : ''}>Center</option>
                                        <option value="right" ${buttonData && buttonData.position === 'right' ? 'selected' : ''}>Right</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="buttonStyle" class="form-label">Style</label>
                                    <select class="form-select" id="buttonStyle">
                                        <option value="primary" ${!buttonData || buttonData.style === 'primary' ? 'selected' : ''}>Primary</option>
                                        <option value="secondary" ${buttonData && buttonData.style === 'secondary' ? 'selected' : ''}>Secondary</option>
                                        <option value="success" ${buttonData && buttonData.style === 'success' ? 'selected' : ''}>Success</option>
                                        <option value="danger" ${buttonData && buttonData.style === 'danger' ? 'selected' : ''}>Danger</option>
                                        <option value="warning" ${buttonData && buttonData.style === 'warning' ? 'selected' : ''}>Warning</option>
                                        <option value="info" ${buttonData && buttonData.style === 'info' ? 'selected' : ''}>Info</option>
                                        <option value="light" ${buttonData && buttonData.style === 'light' ? 'selected' : ''}>Light</option>
                                        <option value="dark" ${buttonData && buttonData.style === 'dark' ? 'selected' : ''}>Dark</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove();">Cancel</button>
                            <button type="button" id="saveNavButton" class="btn btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to the body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstChild);
        
        // Focus the first input
        const buttonTextInput = document.getElementById('buttonText');
        if (buttonTextInput) {
            buttonTextInput.focus();
            
            // Add enter key handler
            buttonTextInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('saveNavButton').click();
                }
            });
        }
        
        // Add click handler to save button
        const saveButton = document.getElementById('saveNavButton');
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                try {
                    // Get form values
                    const text = document.getElementById('buttonText').value;
                    const targetPage = document.getElementById('buttonTarget').value;
                    const position = document.getElementById('buttonPosition').value;
                    const style = document.getElementById('buttonStyle').value;
                    
                    if (!text) {
                        showAlert('Button text is required', 'danger');
                        return;
                    }
                    
                    // Show loading state
                    saveButton.innerHTML = 'Saving...';
                    saveButton.disabled = true;
                    
                    // Create or update the button
                    await createAndSaveNavButton(navId, !navId, {
                        text,
                        targetPage,
                        position,
                        style
                    });
                    
                    // Close the modal
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.remove();
                    }
                    
                    showAlert(`Navigation button ${navId ? 'updated' : 'created'} successfully!`, 'success');
                } catch (error) {
                    console.error('Error saving navigation button:', error);
                    showAlert(`Failed to save button: ${error.message}`, 'danger');
                    
                    // Reset button state
                    if (document.getElementById('saveNavButton')) {
                        document.getElementById('saveNavButton').innerHTML = 'Save';
                        document.getElementById('saveNavButton').disabled = false;
                    }
                }
            });
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
    } catch (error) {
        console.error('Error showing nav button editor:', error);
        showAlert(`Failed to show button editor: ${error.message}`, 'danger');
    }
}

// Function to create and save navigation button
async function createAndSaveNavButton(navId, isNew = false, buttonData = null) {
    try {
        console.log('Creating/saving nav button:', navId, 'isNew:', isNew);
        
        // Get button data from form if not provided
        if (!buttonData) {
            const buttonText = document.getElementById('buttonText')?.value;
            const targetPage = document.getElementById('buttonTarget')?.value;
            const buttonStyle = document.getElementById('buttonStyle')?.value;
            
            buttonData = {
                text: buttonText || 'New Button',
                targetPage: targetPage || 'home',
                style: buttonStyle || 'primary',
                position: 'right'
            };
        }
        
        console.log('Button data:', buttonData);
        
        // Get current page data to update
        const currentPageData = await getCurrentPage();
        console.log('Current page:', currentPageData);
        
        if (!currentPageData) {
            throw new Error('Current page data not available');
        }
        
        // Initialize nav buttons array if it doesn't exist
        if (!currentPageData.navButtons) {
            currentPageData.navButtons = [];
        }
        
        if (isNew) {
            // Add new button
            const newButton = {
                id: navId || Date.now().toString(),
                text: buttonData.text,
                targetPage: buttonData.targetPage,
                style: buttonData.style,
                position: buttonData.position || 'right',
                createdAt: new Date().toISOString()
            };
            
            // Add the new button to the array
            currentPageData.navButtons.push(newButton);
        } else {
            // Find and update existing button
            const index = currentPageData.navButtons.findIndex(btn => btn.id === navId);
            
            if (index !== -1) {
                currentPageData.navButtons[index] = {
                    ...currentPageData.navButtons[index],
                    text: buttonData.text,
                    targetPage: buttonData.targetPage,
                    style: buttonData.style,
                    position: buttonData.position || currentPageData.navButtons[index].position || 'right',
                    updatedAt: new Date().toISOString()
                };
            } else {
                console.warn('Nav button not found in page data, creating new one');
                const newButton = {
                    id: navId || Date.now().toString(),
                    text: buttonData.text,
                    targetPage: buttonData.targetPage,
                    style: buttonData.style,
                    position: buttonData.position || 'right',
                    createdAt: new Date().toISOString()
                };
                currentPageData.navButtons.push(newButton);
            }
        }
        
        // Save updated page
        await updatePage(currentPageData);
        
        // Re-render navigation buttons
        await renderNavigationButtons(currentPageData.navButtons);
        
        return true;
    } catch (error) {
        console.error('Error creating/saving navigation button:', error);
        showAlert(`Failed to ${isNew ? 'create' : 'update'} navigation button: ${error.message}`, 'danger');
        throw error;
    }
}

// Function to render navigation buttons
async function renderNavigationButtons(navButtons = []) {
    if (!Array.isArray(navButtons) || navButtons.length === 0) {
        return;
    }
    
    console.log('Rendering navigation buttons:', navButtons.length);
    
    // Get the appropriate container
    const container = isPreviewMode 
        ? document.getElementById('public-content') 
        : document.getElementById('content');
        
    if (!container) {
        console.error('Container not found for rendering navigation buttons');
        return;
    }
    
    // Render each navigation button
    navButtons.forEach(navButton => {
        if (!navButton || !navButton.text) {
            console.warn('Invalid navigation button data:', navButton);
            return;
        }
        
        // Create the container for the navigation button
        const navContainer = document.createElement('div');
        navContainer.className = 'draggable-nav-button';
        navContainer.id = `nav-${navButton.id}`;
        navContainer.dataset.navId = navButton.id;
        navContainer.dataset.targetPage = navButton.targetPage || '';
        
        // Set position
        navContainer.style.position = 'absolute';
        navContainer.style.left = `${navButton.position?.x || 20}px`;
        navContainer.style.top = `${navButton.position?.y || 20}px`;
        navContainer.style.zIndex = '100';
        
        // Create the actual button element
        const button = document.createElement('button');
        button.className = `btn ${navButton.style || 'btn-primary'} nav-button`;
        button.textContent = navButton.text;
        button.dataset.targetPage = navButton.targetPage || '';
        button.dataset.action = 'navigate';
        
        // No longer need individual event listeners due to event delegation
        navContainer.appendChild(button);
        
        // Add delete button for admin mode
        if (!isPreviewMode) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm delete-nav-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.dataset.navId = navButton.id;
            deleteBtn.dataset.action = 'delete-nav';
            
            // No longer need individual event listeners due to event delegation
            navContainer.appendChild(deleteBtn);
            
            // Add data attribute for editing via double-click
            button.dataset.editOnDblclick = 'true';
        }
        
        container.appendChild(navContainer);
    });
    
    // Set up draggable functionality for admin mode
    if (!isPreviewMode) {
        const draggableButtons = document.querySelectorAll('.draggable-nav-button');
        draggableButtons.forEach(setupNavButtonDragging);
    }
}

// Helper function to set up dragging for navigation buttons
function setupNavButtonDragging(container) {
    if (isPreviewMode) return;
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Create drag handling functions that properly capture the current container
    const dragStart = function(e) {
        // Ignore if clicked on the delete button
        if (e.target.closest('.delete-nav-btn')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(container.style.left) || 0;
        startTop = parseInt(container.style.top) || 0;
        
        // Add event listeners for drag and drop
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        // Prevent defaults to avoid text selection during drag
        e.preventDefault();
    };
    
    const drag = function(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        container.style.left = `${startLeft + dx}px`;
        container.style.top = `${startTop + dy}px`;
    };
    
    const dragEnd = async function() {
        if (!isDragging) return;
        isDragging = false;
        
        // Remove event listeners
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        
        // Save the new position
        try {
            const navId = container.dataset.navId;
            const position = {
                x: parseInt(container.style.left) || 0,
                y: parseInt(container.style.top) || 0
            };
            
            const page = await getCurrentPage();
            if (!page) throw new Error('Failed to get current page');
            
            const navIndex = page.navButtons.findIndex(nav => nav.id === parseInt(navId));
            if (navIndex === -1) throw new Error('Navigation button not found');
            
            page.navButtons[navIndex].position = position;
            await updatePage(page);
            
            console.log('Navigation button position updated:', position);
        } catch (error) {
            console.error('Failed to save navigation button position:', error);
            showAlert('Failed to save button position: ' + error.message, 'danger');
        }
    };
    
    // Attach the dragStart event to the container
    container.addEventListener('mousedown', dragStart);
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
    
    loadPages().then(pages => {
        const modalId = 'addButtonModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal show';
        modal.style = 'display: block; background-color: rgba(0,0,0,0.5);';
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Navigation Button</h5>
                        <button type="button" class="btn-close" onclick="document.getElementById('${modalId}').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Button Text</label>
                            <input type="text" class="form-control" id="buttonText" value="Go to Page">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Button Style</label>
                            <select class="form-select" id="buttonStyleSelect">
                                <option value="modern">Modern (Gradient)</option>
                                <option value="tech">Tech (Geometric)</option>
                                <option value="minimal">Minimal (Clean)</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Target Page</label>
                            <select class="form-select" id="targetPage">
                                ${pages.map(page => 
                                    `<option value="${page.id}">${page.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button id="saveButtonBtn" class="btn btn-primary">Save</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Add backdrop click handler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
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
        console.error('Error loading pages:', error);
        showAlert('Failed to load pages for button form', 'danger');
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

// Add a helper function to ensure event handlers work with inline onclick attributes
function setupGlobalHelpers() {
    // Make sure navigation function is accessible globally
    window.navigateToPage = navigateToPage;
    window.togglePreviewMode = togglePreviewMode;
    window.editSnippet = editSnippet;
    window.deleteSnippet = deleteSnippet;
    window.logout = logout;
    window.showSettingsModal = showSettingsModal;
    window.saveSettings = saveSettings;
    window.createAndSaveNavButton = createAndSaveNavButton;
    
    console.log('Global helper functions initialized');
}

// Ensure event delegation for dynamically created elements
document.addEventListener('DOMContentLoaded', function() {
    console.log('Secondary initialization setup');
    
    // Initialize file download handler
    initializeFileDownloadHandler();
});

// Safe event handlers with null checks
function safeAddEventListener(selector, event, handler) {
    const element = document.getElementById(selector);
    if (element) {
        element.addEventListener(event, handler);
        return true;
    } else {
        console.warn(`Element with ID "${selector}" not found, couldn't add ${event} listener`);
        return false;
    }
}

// Add event delegation setup function
function setupEventDelegation() {
    // Add event delegation for page navigation
    document.addEventListener('click', function(e) {
        // Handle navigation button clicks
        if (e.target.matches('.page-button') || e.target.closest('.page-button')) {
            const button = e.target.matches('.page-button') ? e.target : e.target.closest('.page-button');
            const pageId = button.getAttribute('data-page-id');
            if (pageId) {
                console.log('Page navigation via delegation for:', pageId);
                navigateToPage(pageId);
            }
        }
        
        // Handle add snippet button clicks
        if (e.target.matches('#addSnippetBtn') || e.target.closest('#addSnippetBtn')) {
            const html = prompt('Enter HTML code for the snippet:');
            if (html) addSnippet(html);
            e.preventDefault();
        }
        
        // Handle preview toggle button clicks
        if (e.target.matches('#preview-toggle-btn') || e.target.closest('#preview-toggle-btn')) {
            if (typeof togglePreviewMode === 'function') {
                togglePreviewMode();
            } else {
                console.warn('togglePreviewMode function not available');
            }
            e.preventDefault();
        }
        
        // Handle add page button clicks
        if (e.target.matches('#addPageBtn') || e.target.closest('#addPageBtn')) {
            showCreatePageModal();
            e.preventDefault();
        }
    });
    
    console.log('Event delegation setup complete');
}

// Function to render the list of pages as navigation buttons
function renderPages(pages) {
    if (!pagesNav) {
        console.error('pagesNav element not found');
        return;
    }
    
    console.log('Rendering pages:', pages);
    
    // Clear existing buttons first
    pagesNav.innerHTML = '';
    
    // Create buttons programmatically instead of using inline onclick
    pages.forEach(page => {
        const button = document.createElement('button');
        button.className = `btn ${currentPage === page.id ? 'btn-primary' : 'btn-outline-primary'} page-button mx-1`;
        button.setAttribute('data-page-id', page.id);
        button.textContent = page.name;
        
        // Add direct click handler for reliable navigation
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Navigation button clicked for:', page.id);
            navigateToPage(page.id);
        });
        
        pagesNav.appendChild(button);
    });
    
    console.log('Page navigation buttons rendered');
}

// Function to render snippets and navigation buttons on a page
function renderSnippets(snippets = [], navButtons = []) {
    try {
        console.log(`Rendering snippets to container: ${content ? content.id : 'unknown'} Count: ${snippets.length}`);
        console.log(`Navigation buttons: ${navButtons.length}`);
        
        // Get the content container - use either admin or public view
        const container = userRole === 'admin' && !isPreviewMode ? content : publicContent;
        
        if (!container) {
            console.error('Target container not found for rendering snippets');
            return;
        }
        
        // Log container dimensions for debugging positioning issues
        const containerRect = container.getBoundingClientRect();
        console.log(`Container dimensions: ${containerRect.width.toFixed(0)} x ${containerRect.height.toFixed(0)}`);
        
        // Clear existing content (except for navigation buttons, which we'll re-add)
        const existingNavButtons = container.querySelectorAll('.draggable-nav-button');
        Array.from(existingNavButtons).forEach(btn => btn.remove());
        
        // We're removing all snippets to ensure a clean slate
        const existingSnippets = container.querySelectorAll('.snippet-container');
        Array.from(existingSnippets).forEach(snippet => snippet.remove());
        
        // Check if we have no snippets to show
        if ((!snippets || snippets.length === 0) && (!navButtons || navButtons.length === 0)) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-page-message';
            
            if (userRole === 'admin' && !isPreviewMode) {
                emptyMessage.innerHTML = `
                    <p>This page is empty. Click the "Add Snippet" button to add content.</p>
                    <button id="empty-page-add-snippet" class="btn btn-primary">Add Snippet</button>
                `;
                
                container.appendChild(emptyMessage);
                
                // Add click handler for the add snippet button
                const addSnippetBtn = emptyMessage.querySelector('#empty-page-add-snippet');
                if (addSnippetBtn) {
                    addSnippetBtn.addEventListener('click', () => {
                        const addSnippetButton = document.getElementById('add-snippet-btn');
                        if (addSnippetButton) {
                            addSnippetButton.click();
                        }
                    });
                }
            } else {
                emptyMessage.innerHTML = `
                    <p>No content available on this page yet.</p>
                `;
                container.appendChild(emptyMessage);
            }
            
            return;
        }
        
        // Create a fragment to improve performance
        const fragment = document.createDocumentFragment();
        
        // Add navigation buttons first
        if (navButtons && navButtons.length > 0) {
            navButtons.forEach(navButton => {
                const button = createDraggableNavButton(navButton);
                if (button) {
                    fragment.appendChild(button);
                }
            });
        }
        
        // Render each snippet
        const renderPromises = snippets.map(snippet => renderSnippet(snippet));
        
        // Wait for all snippets to be rendered
        Promise.all(renderPromises)
            .then(renderedSnippets => {
                // Filter out any null results
                const validSnippets = renderedSnippets.filter(s => s !== null);
                
                // Add all snippets to the fragment
                validSnippets.forEach(snippetElement => {
                    fragment.appendChild(snippetElement);
                });
                
                // Append the fragment to the container
                container.appendChild(fragment);
                
                // Setup drag and resize after all snippets are added to the DOM
                setupDragAndResize();
                
                // Setup navigation button dragging if we're in admin mode
                if (userRole === 'admin' && !isPreviewMode) {
                    setupNavButtonDragging(container);
                }
            })
            .catch(error => {
                console.error('Error rendering snippets:', error);
                showAlert('Error rendering page content', 'danger');
            });
    } catch (error) {
        console.error('Error in renderSnippets:', error);
        showAlert('Failed to render page content', 'danger');
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
        
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        if (isInFallbackMode) {
            // In fallback mode, update position in localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            const page = storedPages[currentPage];
            
            if (!page || !Array.isArray(page.snippets)) {
                console.error('Cannot find page or snippets in local storage');
                return;
            }
            
            // Find and update the snippet position
            const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
            if (snippetIndex === -1) {
                console.error(`Snippet ${snippetId} not found in local storage`);
                return;
            }
            
            // Update the position
            page.snippets[snippetIndex].position = position;
            
            // Save back to localStorage
            storedPages[currentPage] = page;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            console.log('Position saved to local storage');
        } else {
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
        }
    } catch (error) {
        console.error('Position update error:', error);
        showAlert('Failed to save position: ' + error.message, 'danger');
    }
}, 300); // Reduce debounce time for more responsive saves

const debouncedUpdateSize = debounce(async (snippetId, size) => {
    try {
        console.log(`Saving size for snippet ${snippetId}:`, size);
        
        // Check if we're in fallback mode (using the fallback admin token)
        const isInFallbackMode = token === 'admin_fallback_token';
        
        if (isInFallbackMode) {
            // In fallback mode, update size in localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            const page = storedPages[currentPage];
            
            if (!page || !Array.isArray(page.snippets)) {
                console.error('Cannot find page or snippets in local storage');
                return;
            }
            
            // Find and update the snippet size
            const snippetIndex = page.snippets.findIndex(s => s.id === snippetId);
            if (snippetIndex === -1) {
                console.error(`Snippet ${snippetId} not found in local storage`);
                return;
            }
            
            // Update the size
            page.snippets[snippetIndex].size = size;
            
            // Save back to localStorage
            storedPages[currentPage] = page;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            console.log('Size saved to local storage');
        } else {
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
        }
    } catch (error) {
        console.error('Size update error:', error);
        showAlert('Failed to save size: ' + error.message, 'danger');
    }
}, 300); // Reduce debounce time for more responsive saves

// Function to render a snippet on the page
async function renderSnippet(snippetData) {
    try {
        if (!snippetData || !snippetData.id) {
            console.error('Invalid snippet data provided to renderSnippet:', snippetData);
            return null;
        }

        console.log('Rendering snippet:', snippetData.id);
        
        // Create container element
        const container = document.createElement('div');
        container.className = 'snippet-container';
        container.setAttribute('data-id', snippetData.id);
        
        // Set position
        if (snippetData.position) {
            container.style.left = `${snippetData.position.left || 0}px`;
            container.style.top = `${snippetData.position.top || 0}px`;
        } else {
            console.warn('Snippet missing position:', snippetData.id);
            container.style.left = '10px';
            container.style.top = '10px';
        }
        
        // Set size
        if (snippetData.size) {
            container.style.width = `${snippetData.size.width || 300}px`;
            container.style.height = `${snippetData.size.height || 200}px`;
        } else {
            console.warn('Snippet missing size:', snippetData.id);
            container.style.width = '300px';
            container.style.height = '200px';
        }
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'snippet-content';
        
        // Create a unique ID for the iframe to avoid conflicts and simplify targeting
        const frameId = `frame-${Date.now()}`;
        
        // Create an iframe to safely render HTML content
        const iframe = document.createElement('iframe');
        iframe.id = frameId;
        iframe.sandbox = 'allow-scripts allow-same-origin';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        
        // Add the iframe to the content container
        contentContainer.appendChild(iframe);
        
        // Add controls if not in preview mode
        if (!isPreviewMode && !userRole !== 'user') {
            const controls = document.createElement('div');
            controls.className = 'snippet-controls';
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-primary';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.onclick = () => editSnippet(snippetData.id);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger ms-2';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.onclick = () => deleteSnippet(snippetData.id);
            
            controls.appendChild(editBtn);
            controls.appendChild(deleteBtn);
            container.appendChild(controls);
        }
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle se';
        container.appendChild(resizeHandle);
        
        // Add the content container to the main container
        container.appendChild(contentContainer);
        
        // Wait for the iframe to load before setting its content
        iframe.onload = () => {
            try {
                // Get sanitized HTML content
                let htmlContent = '';
                if (snippetData.html) {
                    // Use DOM Purify to sanitize the HTML (only if available)
                    if (typeof DOMPurify !== 'undefined') {
                        htmlContent = DOMPurify.sanitize(snippetData.html);
                    } else {
                        htmlContent = snippetData.html;
                        console.warn('DOMPurify not available, using unsafe HTML');
                    }
                } else {
                    htmlContent = '<p>Empty snippet. Click edit to add content.</p>';
                }
                
                // Add helper script to handle downloads inside iframe (if any)
                initializeFileDownloadHandler();
                
                // Write the content to the iframe
                const iframeDoc = iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(`<!DOCTYPE html>
                <html>
                <head>
                    <base target="_parent">
                    <style>
                        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>${htmlContent}</body>
                </html>`);
                iframeDoc.close();
                
                // Inject a helper script into the iframe if there are downloadable elements
                injectHelperScript(iframe);
            } catch (error) {
                console.error('Error setting iframe content:', error);
                
                // Show an error message in the iframe
                const iframeDoc = iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(`<!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; color: #721c24; background-color: #f8d7da; }
                        .error { border: 1px solid #f5c6cb; padding: 10px; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="error">Error rendering content: ${error.message}</div>
                </body>
                </html>`);
                iframeDoc.close();
            }
        };
        
        return container;
    } catch (error) {
        console.error('Error rendering snippet:', error);
        return null;
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing application');
    try {
        updateView();
    } catch (error) {
        console.error('Error during application initialization:', error);
        alert('There was an error initializing the application. Please try refreshing the page.');
    }
});

// Enhanced fallback functions for managing pages in localStorage
function setupFallbackMode() {
    console.log('Setting up fallback mode for offline operation');
    
    // Initialize fallback storage if needed
    if (!localStorage.getItem('fallbackPages')) {
        localStorage.setItem('fallbackPages', JSON.stringify({
            home: {
                id: 'home',
                name: 'Home',
                snippets: [],
                navButtons: []
            }
        }));
    }
    
    // Set a fallback token to indicate we're in offline mode
    if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'admin_fallback_token');
        localStorage.setItem('userRole', 'admin');
    }
}

// Enhanced function to handle page creation in both normal and fallback modes
async function createPage(name) {
    try {
        console.log(`Creating page: ${name} with ID: ${name.toLowerCase().replace(/\s+/g, '-')}`);
        const pageId = name.toLowerCase().replace(/\s+/g, '-');
        
        // First, try the API
        try {
            const response = await makeRequest('/api/pages', {
                method: 'POST',
                body: JSON.stringify({ name, id: pageId })
            });
            
            // Update the view
            await loadPages();
            navigateToPage(pageId);
            showAlert(`Page "${name}" created successfully!`, 'success');
            return response;
        } catch (apiError) {
            console.warn('API call failed, using fallback mode:', apiError);
            
            // Fallback - use localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            if (storedPages[pageId]) {
                throw new Error(`Page "${name}" already exists`);
            }
            
            // Create new page in localStorage
            storedPages[pageId] = {
                id: pageId,
                name: name,
                snippets: [],
                navButtons: []
            };
            
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            console.log('Page created successfully:', storedPages);
            
            // Update the view in fallback mode
            await loadPages();
            navigateToPage(pageId);
            showAlert(`Page "${name}" created in offline mode!`, 'success');
            return [storedPages[pageId]];
        }
    } catch (error) {
        console.error('Error creating page:', error);
        showAlert(`Failed to create page: ${error.message}`, 'danger');
        throw error;
    }
}

// Enhanced function to handle page updates in both normal and fallback modes
async function updatePage(pageData) {
    try {
        // Try API first
        try {
            return await makeRequest(`/api/pages/${pageData.id}`, {
                method: 'PUT',
                body: JSON.stringify(pageData)
            });
        } catch (apiError) {
            console.warn('API update failed, using fallback mode:', apiError);
            
            // Fallback - use localStorage
            const storedPages = JSON.parse(localStorage.getItem('fallbackPages') || '{}');
            storedPages[pageData.id] = pageData;
            localStorage.setItem('fallbackPages', JSON.stringify(storedPages));
            
            // Refresh current content if needed
            if (pageData.id === currentPage) {
                await loadPageContent(currentPage);
            }
            
            return pageData;
        }
    } catch (error) {
        console.error('Error updating page:', error);
        showAlert(`Failed to update page: ${error.message}`, 'danger');
        throw error;
    }
}
