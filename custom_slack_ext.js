// custom_slack_ext.js
// This is your custom JavaScript file that will be injected into Slack.

console.log('SLACK EXTENSION: Script started loading...');

// Wrapped in try-catch to prevent any startup failures
try {
    // Function to add our visual indicator
    function addVisualIndicator() {
        console.log('SLACK EXTENSION: Attempting to add visual indicator...');
        
        try {
            // Remove any existing banner first
            const existingBanner = document.getElementById('slack-extension-banner-main');
            if (existingBanner) {
                existingBanner.remove();
            }

            // Create a bright blue banner at the top of the page
            const banner = document.createElement('div');
            banner.innerHTML = '🚀 SLACK EXTENSION ACTIVE! 🚀';
            banner.id = 'slack-extension-banner-main';
            banner.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                background-color: #0066ff !important;
                color: #ffffff !important;
                text-align: center !important;
                padding: 10px !important;
                font-size: 16px !important;
                font-weight: bold !important;
                z-index: 9999999 !important;
                border-bottom: 3px solid #0044cc !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
            `;
            
            // Add it to the page
            if (document.body) {
                document.body.appendChild(banner);
                console.log('SLACK EXTENSION: Banner added to body!');
                return true;
            } else if (document.documentElement) {
                document.documentElement.appendChild(banner);
                console.log('SLACK EXTENSION: Banner added to html!');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error adding visual elements:', error);
            return false;
        }
    }

    // Function to try adding banner safely
    function tryAddBanner() {
        // Check if we have the necessary APIs
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.log('SLACK EXTENSION: Missing window or document - not in renderer context');
            return false;
        }
        
        console.log('SLACK EXTENSION: Environment check - process.type:', typeof process !== 'undefined' ? process.type : 'undefined');
        
        // Try to add banner
        return addVisualIndicator();
    }

    // Safe injection approach
    console.log('SLACK EXTENSION: Setting up safe injection...');
    
    // Try immediately if DOM is ready
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
        setTimeout(tryAddBanner, 1000);
    }
    
    // Listen for DOM ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('SLACK EXTENSION: DOMContentLoaded fired');
            setTimeout(tryAddBanner, 1500);
        });
    }
    
    // Listen for window load
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            console.log('SLACK EXTENSION: Window load fired');
            setTimeout(tryAddBanner, 2000);
        });
    }
    
    // Fallback polling (limited attempts)
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = setInterval(() => {
        attempts++;
        console.log(`SLACK EXTENSION: Poll attempt ${attempts}/${maxAttempts}`);
        
        if (tryAddBanner() || attempts >= maxAttempts) {
            clearInterval(pollInterval);
        }
    }, 5000);

    console.log('SLACK EXTENSION: Setup complete');

} catch (error) {
    console.error('SLACK EXTENSION: Critical error in main script:', error);
    // Don't re-throw to avoid breaking Slack startup
}

// Function to log detailed debugging information
function logEnvironmentInfo() {
    console.log('SLACK EXTENSION: === ENVIRONMENT INFO ===');
    console.log('SLACK EXTENSION: typeof window:', typeof window);
    console.log('SLACK EXTENSION: typeof document:', typeof document);
    console.log('SLACK EXTENSION: typeof process:', typeof process);
    console.log('SLACK EXTENSION: typeof require:', typeof require);
    
    if (typeof window !== 'undefined') {
        console.log('SLACK EXTENSION: window.location:', window.location ? window.location.href : 'No location');
        console.log('SLACK EXTENSION: window.navigator.userAgent:', window.navigator ? window.navigator.userAgent : 'No navigator');
    }
    
    if (typeof document !== 'undefined') {
        console.log('SLACK EXTENSION: document.title:', document.title || 'No title');
        console.log('SLACK EXTENSION: document.readyState:', document.readyState);
        console.log('SLACK EXTENSION: document.body exists:', !!document.body);
        console.log('SLACK EXTENSION: document.documentElement exists:', !!document.documentElement);
        
        if (document.body) {
            console.log('SLACK EXTENSION: document.body.children.length:', document.body.children.length);
        }
        
        // Try to find some elements
        const totalElements = document.querySelectorAll('*').length;
        console.log('SLACK EXTENSION: Total elements:', totalElements);
        
        // Look for common web app root elements
        const commonSelectors = ['#root', '#app', '#react-app', '#react-app-root', '.app', '[data-qa]', '[data-reactroot]'];
        commonSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`SLACK EXTENSION: Found element: ${selector}`);
            }
        });
    }
    
    if (typeof process !== 'undefined') {
        console.log('SLACK EXTENSION: process.type:', process.type);
        console.log('SLACK EXTENSION: process.versions.electron:', process.versions ? process.versions.electron : 'No versions');
    }


    console.log('SLACK EXTENSION: === END ENVIRONMENT INFO ===');
}

// Example: You could try to access Slack's global objects or add a simple UI element.
// Be aware that Slack's internal APIs and DOM structure can change without notice.

// (function() {
//   'use strict';
//    console.log('Slack Custom JS: Pre-DOMContentLoaded');
//    document.addEventListener('DOMContentLoaded', () => {
//        console.log('Slack Custom JS: DOMContentLoaded');
//        // Try to add a small banner or modify something simple as a test
//        try {
//            const appRoot = document.getElementById('react-app-root'); // This ID might change
//            if (appRoot) {
//                const testDiv = document.createElement('div');
//                testDiv.innerHTML = '<strong>Custom Extension Active!</strong>';
//                testDiv.style.backgroundColor = 'yellow';
//                testDiv.style.color = 'black';
//                testDiv.style.padding = '5px';
//                testDiv.style.position = 'fixed';
//                testDiv.style.top = '50px';
//                testDiv.style.right = '10px';
//                testDiv.style.zIndex = '9999';
//                appRoot.prepend(testDiv);
//                console.log('Slack Custom JS: Test div added.');
//            } else {
//                console.log('Slack Custom JS: #react-app-root not found.');
//            }
//        } catch (e) {
//            console.error('Slack Custom JS: Error during DOM manipulation:', e);
//        }
//    });
// })(); 