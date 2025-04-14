import React, { useState } from 'react';

const PageManager = ({ 
    pages, 
    currentPage, 
    onPageChange, 
    onPageAdd, 
    onPageRemove, 
    onPageUpdate,
    onError,
    isUserView = false  // Flag to identify user view mode
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [defaultPage, setDefaultPage] = useState(localStorage.getItem('defaultPage') || 'home');
    const [showAddPageModal, setShowAddPageModal] = useState(false);
    const [newPageName, setNewPageName] = useState('');

    // Generate a valid, unique page ID from a name
    const generatePageId = (pageName) => {
        if (!pageName) return '';
        
        // Start with basic slugification
        let pageId = pageName.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')     // Replace spaces with hyphens
            .replace(/-+/g, '-')      // Remove multiple hyphens
            .trim();
            
        // Make sure it's unique
        let uniqueId = pageId;
        let counter = 1;
        
        while (pages.some(p => p.id === uniqueId)) {
            uniqueId = `${pageId}-${counter}`;
            counter++;
        }
        
        return uniqueId;
    };

    const handlePageAdd = () => {
        if (isUserView || !onPageAdd) return;
        
        // Show the add page modal instead of using prompt
        setShowAddPageModal(true);
        setNewPageName('');
    };
    
    const submitNewPage = () => {
        try {
            if (!newPageName?.trim()) {
                throw new Error('Page name cannot be empty');
            }
            
            if (newPageName.trim().length < 2) {
                throw new Error('Page name must be at least 2 characters');
            }
            
            const pageId = generatePageId(newPageName);
            
            if (!pageId) {
                throw new Error('Invalid page name');
            }
            
            console.log(`Creating new page: ${newPageName} (${pageId})`);
            onPageAdd({ id: pageId, name: newPageName.trim(), snippets: [] });
            setShowAddPageModal(false);
        } catch (err) {
            onError(err.message);
        }
    };

    const handlePageEdit = (page) => {
        if (isUserView) return;
        
        setEditingPage({...page}); // Clone the page to avoid direct state mutation
        setShowSettings(true);
    };

    const handlePageUpdate = () => {
        if (isUserView || !onPageUpdate || !editingPage) return;
        
        try {
            const trimmedName = editingPage.name.trim();
            
            if (!trimmedName) {
                throw new Error('Page name cannot be empty');
            }
            
            if (trimmedName.length < 2) {
                throw new Error('Page name must be at least 2 characters');
            }
            
            // Create updated page object with trimmed name
            const updatedPage = {
                ...editingPage,
                name: trimmedName
            };
            
            console.log(`Updating page: ${updatedPage.id} to name: ${trimmedName}`);
            onPageUpdate(updatedPage);
            setShowSettings(false);
            setEditingPage(null);
        } catch (err) {
            onError(err.message);
        }
    };

    const handleDefaultPageChange = (pageId) => {
        if (isUserView) return;
        
        setDefaultPage(pageId);
        // Update in localStorage or backend
        localStorage.setItem('defaultPage', pageId);
        console.log(`Default page set to: ${pageId}`);
    };

    return (
        <div className={`page-manager ${isUserView ? 'user-page-manager' : 'admin-page-manager'}`}>
            <div className="page-navigation">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="page-buttons">
                        {pages.map(page => (
                            <span key={page.id} className="me-3">
                                <button
                                    onClick={() => onPageChange(page.id)}
                                    className={`btn ${currentPage === page.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                    title={`View ${page.name} page`}
                                >
                                    {page.name}
                                </button>
                                {!isUserView && (
                                    <button
                                        className="btn btn-link text-secondary"
                                        onClick={() => handlePageEdit(page)}
                                        title="Edit page settings"
                                    >
                                        ⚙️
                                    </button>
                                )}
                                {!isUserView && page.id !== 'home' && onPageRemove && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to delete the page "${page.name}"?`)) {
                                                onPageRemove(page.id);
                                            }
                                        }}
                                        className="btn btn-danger btn-sm ms-1"
                                        title="Delete page"
                                    >
                                        ×
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                    {!isUserView && (
                        <div className="page-actions">
                            <button 
                                onClick={handlePageAdd}
                                className="btn btn-success btn-sm"
                                title="Add a new page"
                            >
                                + New Page
                            </button>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="btn btn-secondary btn-sm ms-2"
                                title="Global page settings"
                            >
                                Page Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Page Modal */}
            {!isUserView && showAddPageModal && (
                <div className="modal show d-block" onClick={(e) => {
                    // Close modal when clicking on backdrop
                    if (e.target.className === 'modal show d-block') {
                        setShowAddPageModal(false);
                    }
                }}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add New Page</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setShowAddPageModal(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Page Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newPageName}
                                        onChange={(e) => setNewPageName(e.target.value)}
                                        placeholder="Enter page name"
                                        minLength="2"
                                        maxLength="50"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && newPageName.trim().length >= 2) {
                                                submitNewPage();
                                            }
                                        }}
                                    />
                                    <small className="text-muted">
                                        Page name must be at least 2 characters long.
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowAddPageModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={submitNewPage}
                                    disabled={!newPageName.trim() || newPageName.trim().length < 2}
                                >
                                    Create Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Settings Modal - Only shown in admin mode */}
            {!isUserView && showSettings && (
                <div className="modal show d-block" onClick={(e) => {
                    // Close modal when clicking on backdrop (outside modal content)
                    if (e.target.className === 'modal show d-block') {
                        setShowSettings(false);
                        setEditingPage(null);
                    }
                }}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingPage ? 'Edit Page' : 'Page Settings'}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => {
                                        setShowSettings(false);
                                        setEditingPage(null);
                                    }}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body">
                                {editingPage ? (
                                    <div className="mb-3">
                                        <label className="form-label">Page Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editingPage.name}
                                            onChange={(e) => setEditingPage({
                                                ...editingPage,
                                                name: e.target.value
                                            })}
                                            placeholder="Enter page name"
                                            minLength="2"
                                            maxLength="50"
                                        />
                                        <small className="text-muted">
                                            {editingPage.id === 'home' ? 
                                                'This is your home page and cannot be deleted.' : 
                                                `Page ID: ${editingPage.id}`}
                                        </small>
                                    </div>
                                ) : (
                                    <div className="mb-3">
                                        <label className="form-label">Default Landing Page</label>
                                        <select
                                            className="form-select"
                                            value={defaultPage}
                                            onChange={(e) => handleDefaultPageChange(e.target.value)}
                                        >
                                            {pages.map(page => (
                                                <option key={page.id} value={page.id}>
                                                    {page.name}
                                                </option>
                                            ))}
                                        </select>
                                        <small className="text-muted">
                                            This is the page users will see when they first visit your site.
                                        </small>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => {
                                        setShowSettings(false);
                                        setEditingPage(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                {editingPage && (
                                    <button 
                                        type="button" 
                                        className="btn btn-primary"
                                        onClick={handlePageUpdate}
                                    >
                                        Save Changes
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageManager; 