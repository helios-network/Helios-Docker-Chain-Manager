
const displaySideBar = () => {
    const sidebarElement = document.querySelector('div.sidebar');

    if (sidebarElement == undefined) {
        return ;
    }

    sidebarElement.innerHTML = `
            <div class="sidebar-logo">
                <img src="./logo_black.png" alt="Logo">
            </div>
            <div class="sidebar-logo-mobile">
                <img src="./icon.png" alt="Logo">
            </div>
            <div class="sidebar-nav">
            </div>
    `;

    const links = [
        {
            name: 'Node',
            path: '/status',
            icon: '<i class="material-icons">home</i>'
        },
        {
            name: 'Validator',
            path: '/validator',
            icon: '<i class="material-icons">how_to_reg</i>'
        },
        {
            name: 'Wallet',
            path: '/wallet',
            icon: '<i class="material-icons">wallet</i>'
        },
        {
            name: 'Settings',
            path: '/settings',
            icon: '<i class="material-icons">settings</i>'
        },
        {
            name: 'EthStats',
            path: '/eth-stats',
            icon: '<i class="material-icons">analytics</i>'
        },
        {
            name: 'Hyperions',
            path: '/hyperions',
            icon: '<i class="material-icons">blur_on</i>'
        },
        {
            name: 'IBC Relayers',
            path: '/ibc-relayers',
            icon: '<i class="material-icons">multiple_stop</i>'
        },
        {
            name: 'Backups',
            path: '/backups',
            icon: '<i class="material-icons">backup</i>'
        }
    ];

    const url = new URL(window.location.href);

    const navContainer = sidebarElement.querySelector('.sidebar-nav');
    
    links.forEach((x, i) => {
        navContainer.innerHTML += `<a href="${x.path}" class="${'sidebar-button' + (i > 0 ? ' mt-1': '') + (url.pathname == x.path ? ' selected' : '')}" title="${x.name}">${x.icon}<span>${x.name}</span></a>`;
    });

    // Add theme toggle functionality
    const themeToggleBtn = sidebarElement.querySelector('#theme-toggle-sidebar');
    if (themeToggleBtn) {
        // Set initial icon based on current theme
        const icon = themeToggleBtn.querySelector('.material-icons');
        if (icon && window.themeManager) {
            icon.textContent = window.themeManager.getCurrentTheme() === 'light' ? 'dark_mode' : 'light_mode';
        }
        
        themeToggleBtn.addEventListener('click', () => {
            if (window.themeManager) {
                window.themeManager.toggleTheme();
                // Update the sidebar button icon
                if (icon) {
                    icon.textContent = window.themeManager.getCurrentTheme() === 'light' ? 'dark_mode' : 'light_mode';
                }
            }
        });
        
        // Listen for theme changes from other sources (like the floating toggle)
        document.addEventListener('themeChanged', (event) => {
            if (icon) {
                icon.textContent = event.detail.theme === 'light' ? 'dark_mode' : 'light_mode';
            }
        });
    }
}