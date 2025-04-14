import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SnippetManager from './components/SnippetManager';
import PageManager from './components/PageManager';
import SnippetContainer from './components/SnippetContainer';

const App = () => {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
    const [isUser, setIsUser] = useState(localStorage.getItem('isUser') === 'true');
    const [pages, setPages] = useState([{ id: 'home', name: 'Home', snippets: [] }]);
    const [currentPage, setCurrentPage] = useState(localStorage.getItem('defaultPage') || 'home');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // Initialize axios with base URL and interceptors
    useEffect(() => {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:10000';
        axios.defaults.baseURL = baseURL;
        
        // Add auth token to requests
        axios.interceptors.request.use(config => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Handle token expiration and retries
        axios.interceptors.response.use(
            response => response,
            async error => {
                if (error.response?.status === 401 && retryCount < 3) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('isAdmin');
                    localStorage.removeItem('isUser');
                    setIsAdmin(false);
                    setIsUser(false);
                    setError('Session expired. Please login again.');
                    setRetryCount(count => count + 1);
                } else if (error.response?.status === 503 && retryCount < 3) {
                    // Service unavailable - retry after delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setRetryCount(count => count + 1);
                    return axios(error.config);
                }
                return Promise.reject(error);
            }
        );

        // Check server health
        const checkHealth = async () => {
            try {
                await axios.get('/api/health');
            } catch (err) {
                console.error('Server health check failed:', err);
                setError('Server connection issue. Please try again later.');
            }
        };
        checkHealth();

        return () => {
            setRetryCount(0);
        };
    }, [retryCount]);

    // Initialize login if tokens are stored
    useEffect(() => {
        const token = localStorage.getItem('token');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const isUser = localStorage.getItem('isUser') === 'true';

        if (token && (isAdmin || isUser)) {
            console.log('Found existing token, attempting auto-login');
            loadPages();
        }
    }, []);

    // Load pages from backend with retry logic
    useEffect(() => {
        if (isAdmin || isUser) {
            loadPages();
        }
    }, [isAdmin, isUser]);

    const loadPages = async () => {
        try {
            setLoading(true);
            console.log('Loading pages...');
            const response = await axios.get('/api/pages');
            console.log('Pages loaded:', response.data);
            if (response.data.length > 0) {
                setPages(response.data);
            }
            setError('');
        } catch (err) {
            console.error('Failed to load pages:', err);
            setError('Failed to load pages. Please try again or refresh.');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced login with support for both admin and regular users
    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!email || !password) {
            setError('Email and password are required');
            return;
        }
        
        try {
            setLoading(true);
            setError('');
            
            console.log('Attempting login for:', email);
            const response = await axios.post('/api/login', { email, password });
            const { token, role } = response.data;
            
            if (!token) {
                throw new Error('No token received from server');
            }
            
            localStorage.setItem('token', token);
            
            if (role === 'admin') {
                localStorage.setItem('isAdmin', 'true');
                localStorage.removeItem('isUser');
                setIsAdmin(true);
                setIsUser(false);
                console.log('Logged in as admin');
            } else {
                localStorage.setItem('isUser', 'true');
                localStorage.removeItem('isAdmin');
                setIsUser(true);
                setIsAdmin(false);
                console.log('Logged in as regular user');
            }
            
            setRetryCount(0);
            // Clear form fields
            setEmail('');
            setPassword('');
        } catch (err) {
            console.error('Login error:', err);
            if (err.response?.status === 429) {
                setError('Too many login attempts. Please try again later.');
            } else if (err.response?.status === 401) {
                setError('Invalid email or password');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Page management handlers with optimistic updates
    const handlePageAdd = async (newPage) => {
        try {
            setPages(prev => [...prev, newPage]); // Optimistic update
            await axios.post('/api/pages', newPage);
        } catch (err) {
            setError('Failed to create page');
            setPages(prev => prev.filter(p => p.id !== newPage.id)); // Rollback
        }
    };

    const handlePageRemove = async (pageId) => {
        if (pageId === 'home') {
            setError('Cannot remove home page');
            return;
        }
        const pageToRemove = pages.find(p => p.id === pageId);
        try {
            setPages(prev => prev.filter(p => p.id !== pageId)); // Optimistic update
            await axios.delete(`/api/pages/${pageId}`);
            if (currentPage === pageId) {
                setCurrentPage('home');
            }
        } catch (err) {
            setError('Failed to delete page');
            setPages(prev => [...prev, pageToRemove]); // Rollback
        }
    };

    const handlePageUpdate = async (updatedPage) => {
        const originalPage = pages.find(p => p.id === updatedPage.id);
        try {
            setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p)); // Optimistic update
            await axios.put(`/api/pages/${updatedPage.id}`, updatedPage);
        } catch (err) {
            setError('Failed to update page');
            setPages(prev => prev.map(p => p.id === updatedPage.id ? originalPage : p)); // Rollback
        }
    };

    // Snippet management handlers with optimistic updates
    const handleSnippetAdd = async (snippet) => {
        const updatedPage = pages.find(p => p.id === currentPage);
        const newSnippet = {
            id: Date.now(),
            ...snippet,
            position: { x: 0, y: 0 }
        };

        try {
            // Optimistic update
            setPages(prev => prev.map(p => p.id === currentPage ? {
                ...p,
                snippets: [...p.snippets, newSnippet]
            } : p));

            await axios.put(`/api/pages/${currentPage}`, {
                ...updatedPage,
                snippets: [...updatedPage.snippets, newSnippet]
            });
        } catch (err) {
            setError('Failed to add snippet');
            // Rollback
            setPages(prev => prev.map(p => p.id === currentPage ? updatedPage : p));
        }
    };

    const handleSnippetUpdate = async (snippetId, updates) => {
        const updatedPage = pages.find(p => p.id === currentPage);
        const originalSnippets = [...updatedPage.snippets];

        try {
            // Optimistic update
            setPages(prev => prev.map(p => p.id === currentPage ? {
                ...p,
                snippets: p.snippets.map(s => s.id === snippetId ? { ...s, ...updates } : s)
            } : p));

            await axios.put(`/api/pages/${currentPage}`, {
                ...updatedPage,
                snippets: updatedPage.snippets.map(s => s.id === snippetId ? { ...s, ...updates } : s)
            });
        } catch (err) {
            setError('Failed to update snippet');
            // Rollback
            setPages(prev => prev.map(p => p.id === currentPage ? {
                ...p,
                snippets: originalSnippets
            } : p));
        }
    };

    // Get current page snippets
    const currentSnippets = pages.find(page => page.id === currentPage)?.snippets || [];

    return (
        <div className="app-container">
            {error && (
                <div className="alert alert-danger alert-dismissible fade show">
                    {error}
                    <button 
                        type="button" 
                        className="btn-close" 
                        onClick={() => setError('')}
                    ></button>
                </div>
            )}
            {loading && <div className="loading-overlay">Loading...</div>}
            
            {!isAdmin && !isUser ? (
                <div className="login-form p-4">
                    <h2>Login</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-control mb-2"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-control mb-2"
                        />
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading || retryCount >= 3}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            ) : isAdmin ? (
                <>
                    <div className="admin-toolbar">
                        <SnippetManager 
                            onAddSnippet={handleSnippetAdd}
                            onError={setError}
                        />
                        <button 
                            onClick={() => setShowPreview(!showPreview)} 
                            className="btn btn-info me-2"
                        >
                            {showPreview ? 'Exit Preview' : 'Preview Mode'}
                        </button>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('isAdmin');
                                setIsAdmin(false);
                                setRetryCount(0);
                            }} 
                            className="btn btn-danger"
                        >
                            Logout
                        </button>
                    </div>

                    <PageManager
                        pages={pages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onPageAdd={handlePageAdd}
                        onPageRemove={handlePageRemove}
                        onPageUpdate={handlePageUpdate}
                        onError={setError}
                    />

                    <div
                        className={`page-content ${showPreview ? 'preview-mode' : ''}`}
                    >
                        {currentSnippets.map(snippet => (
                            <SnippetContainer
                                key={snippet.id}
                                snippet={snippet}
                                showPreview={showPreview}
                                onUpdate={handleSnippetUpdate}
                                onError={setError}
                            />
                        ))}
                    </div>
                </>
            ) : (
                // User view (non-admin)
                <>
                    <div className="user-toolbar">
                        <button 
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('isUser');
                                setIsUser(false);
                                setRetryCount(0);
                            }} 
                            className="btn btn-outline-danger"
                        >
                            Logout
                        </button>
                    </div>

                    <PageManager
                        pages={pages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onPageAdd={null}  // Users can't add pages
                        onPageRemove={null}  // Users can't remove pages
                        onPageUpdate={null}  // Users can't update pages
                        onError={setError}
                        isUserView={true}  // Flag for user view mode
                    />

                    <div className="page-content preview-mode">
                        {currentSnippets.map(snippet => (
                            <SnippetContainer
                                key={snippet.id}
                                snippet={snippet}
                                showPreview={true}  // Always in preview mode for users
                                onUpdate={null}  // Users can't update snippets
                                onError={setError}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default App; 