import React, { useState } from 'react';

const PageManager = ({ 
    pages, 
    currentPage, 
    onPageChange, 
    onPageAdd, 
    onPageRemove, 
    onPageUpdate,
    onError 
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [defaultPage, setDefaultPage] = useState('home');

    const handlePageAdd = () => {
        const pageName = prompt('Enter page name:');
        if (pageName) {
            try {
                const pageId = pageName.toLowerCase().replace(/\s+/g, '-');
                if (pages.some(p => p.id === pageId)) {
                    throw new Error('Page with this name already exists');
                }
                onPageAdd({ id: pageId, name: pageName, snippets: [] });
            } catch (err) {
                onError(err.message);
            }
        }
    };

    const handlePageEdit = (page) => {
        setEditingPage(page);
        setShowSettings(true);
    };

    const handlePageUpdate = () => {
        try {
            if (!editingPage.name.trim()) {
                throw new Error('Page name cannot be empty');
            }
            onPageUpdate(editingPage);
            setShowSettings(false);
            setEditingPage(null);
        } catch (err) {
            onError(err.message);
        }
    };

    const handleDefaultPageChange = (pageId) => {
        setDefaultPage(pageId);
        // Update in localStorage or backend
        localStorage.setItem('defaultPage', pageId);
    };

    return (
        <div className="page-manager">
            <div className="page-navigation bg-light p-2">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="page-buttons">
                        {pages.map(page => (
                            <span key={page.id} className="me-3">
                                <button
                                    onClick={() => onPageChange(page.id)}
                                    className={`btn ${currentPage === page.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                >
                                    {page.name}
                                </button>
                                <button
                                    className="btn btn-link text-secondary"
                                    onClick={() => handlePageEdit(page)}
                                >
                                    ⚙️
                                </button>
                                {page.id !== 'home' && (
                                    <button
                                        onClick={() => onPageRemove(page.id)}
                                        className="btn btn-danger btn-sm ms-1"
                                    >
                                        ×
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                    <div className="page-actions">
                        <button 
                            onClick={handlePageAdd}
                            className="btn btn-success btn-sm"
                        >
                            + New Page
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn btn-secondary btn-sm ms-2"
                        >
                            Page Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Page Settings Modal */}
            {showSettings && (
                <div className="modal show d-block">
                    <div className="modal-dialog">
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
                                        />
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
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
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