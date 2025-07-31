// Theme management system
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.init();
    }

    init() {
        // Apply stored theme on page load
        this.applyTheme(this.currentTheme);
        
        // Create theme toggle button
        this.createThemeToggle();
        
        // Listen for system theme changes
        this.listenForSystemTheme();
    }

    getStoredTheme() {
        return localStorage.getItem('helios-theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('helios-theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        
        // Update theme toggle button icon
        this.updateThemeToggleIcon();
        
        // Dispatch custom event for other components
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    createThemeToggle() {
        // Remove existing toggle if present
        const existingToggle = document.querySelector('.theme-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }

        // Create new toggle button
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle theme');
        toggle.setAttribute('title', 'Toggle theme');
        
        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
        
        toggle.appendChild(icon);
        toggle.addEventListener('click', () => this.toggleTheme());
        
        // Add to body
        document.body.appendChild(toggle);
    }

    updateThemeToggleIcon() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            const icon = toggle.querySelector('.material-icons');
            if (icon) {
                icon.textContent = this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
            }
        }
    }

    listenForSystemTheme() {
        // Check if user prefers dark mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            // Only auto-switch if no theme is stored (first visit)
            if (!this.getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(newTheme);
            }
        };

        // Listen for changes
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }
    }

    // Public method to get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Public method to set theme programmatically
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        }
    }
}

// Initialize theme manager when DOM is loaded
let themeManager;

document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
});

// Export for use in other scripts
window.ThemeManager = ThemeManager;
window.themeManager = themeManager; 