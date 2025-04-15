import React, { useEffect, useState } from 'react';
import NavigationManager from './utils/NavigationManager';

// Set window variables for navigation from snippets with proper scope
useEffect(() => {
    // Create a unified navigation system that works consistently in both admin and user views
    const setupNavigationFunctions = () => {
        // Make these functions available to snippets with immediate values
        window.isPreviewMode = showPreview || isUser;
        
        // Create a closure with the current pages and current page
        window.getAvailablePages = function() {
            // Create a clean copy of pages data to avoid exposing internal details
            const availablePages = pages.map(p => ({ id: p.id, name: p.name }));
            console.log('getAvailablePages called, returning:', availablePages);
            return availablePages;
        };
        
        // Single implementation of navigation that works consistently in all modes
        window.navigateToPage = function(pageId) {
            console.log('navigateToPage called with:', pageId);
            if (!pageId || !pages.some(p => p.id === pageId)) {
                console.error(`Invalid page ID: ${pageId}`);
                return;
            }
            
            // Consistently store the current page ID in localStorage
            localStorage.setItem('currentPage', pageId);
            
            // Dispatch navigation event for iframe content
            const navigationEvent = new CustomEvent('navigationRequested', { 
                detail: { pageId: pageId }
            });
            window.dispatchEvent(navigationEvent);
            
            // For user view, add URL hash to support browser history
            if (isUser) {
                window.location.hash = pageId;
            }
            
            console.log(`Navigation to page ${pageId} initiated`);
        };
    };
    
    // Set up navigation functions
    setupNavigationFunctions();
    
    // Log initialization
    console.log('Window navigation functions initialized. Preview mode:', window.isPreviewMode);
    
    // Handle navigation events
    const handleNavigationEvent = (e) => {
        const pageId = e.detail?.pageId;
        if (pageId && pages.some(p => p.id === pageId)) {
            console.log(`Navigation event received, changing to page: ${pageId}`);
            setCurrentPage(pageId);
        }
    };
    
    // Add event listener for navigation events
    window.addEventListener('navigationRequested', handleNavigationEvent);
    
    return () => {
        // Remove event listener when component unmounts
        window.removeEventListener('navigationRequested', handleNavigationEvent);
        
        // Clean up window functions to prevent memory leaks
        // Note: We keep the window functions to avoid issues with iframe references
        console.log('App component unmounting, cleaning up navigation event listeners');
    };
}, [pages, showPreview, isUser, currentPage]);

// Navigation listener for snippet-initiated page changes
useEffect(() => {
    // Initialize the navigation manager
    NavigationManager.initialize(
        pages, 
        showPreview || isUser,
        (pageId) => {
            console.log(`Navigation event received, changing to page: ${pageId}`);
            setCurrentPage(pageId);
        }
    );
    
    // Update hash for user view
    if (isUser) {
        const handleHashChange = () => {
            const pageId = window.location.hash.replace('#', '');
            if (pageId && pages.some(p => p.id === pageId)) {
                console.log(`Hash changed to #${pageId}, navigating...`);
                setCurrentPage(pageId);
            }
        };
        
        window.addEventListener('hashchange', handleHashChange);
        
        // Check initial hash on load
        if (window.location.hash) {
            handleHashChange();
        }
        
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }
    
    // Cleanup on unmount
    return () => {
        console.log('App component unmounting, navigation listeners preserved');
    };
}, [pages, showPreview, isUser]);

// Update NavigationManager when relevant state changes
useEffect(() => {
    if (NavigationManager.isInitialized) {
        NavigationManager.update(
            pages, 
            showPreview || isUser,
            (pageId) => setCurrentPage(pageId)
        );
    }
}, [pages, showPreview, isUser, currentPage]); 