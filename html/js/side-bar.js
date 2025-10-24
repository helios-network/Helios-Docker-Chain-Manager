
const displaySideBar = () => {
    const sidebarElement = document.querySelector('.sidebar');

    if (!sidebarElement) {
        return;
    }

    const navigationGroups = [
        {
            title: 'Monitoring',
            links: [
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
                    name: 'EthStats',
                    path: '/eth-stats',
                    icon: '<i class="material-icons">analytics</i>'
                }
            ]
        },
        {
            title: 'Configuration',
            links: [
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
                    name: 'RPC Config',
                    path: '/rpc',
                    icon: '<i class="material-icons">router</i>'
                },
                {
                    name: 'Backups',
                    path: '/backups',
                    icon: '<i class="material-icons">backup</i>'
                },
                {
                    name: 'Versions',
                    path: '/versions',
                    icon: '<i class="material-icons">update</i>'
                }
            ]
        },
        {
            title: 'Extensions',
            links: [
                {
                    name: 'Hyperions',
                    path: '/hyperions',
                    comming_soon: true,
                    icon: '<i class="material-icons">blur_on</i>'
                },
                {
                    name: 'IBC Relayers',
                    path: '/ibc-relayers',
                    comming_soon: true,
                    icon: '<i class="material-icons">multiple_stop</i>'
                }
            ]
        }
    ];

    sidebarElement.innerHTML = `
        <div class="sidebar-logo">
            <img src="./logo_black.png" alt="Helios Logo">
        </div>
        <div class="sidebar-logo-mobile">
            <img src="./icon.png" alt="Helios Logo">
        </div>
        <nav class="sidebar-nav"></nav>
    `;

    const url = new URL(window.location.href);
    const navContainer = sidebarElement.querySelector('.sidebar-nav');

    navContainer.innerHTML = navigationGroups.map((group) => {
        const linksHtml = group.links.map((link) => {
            const classes = ['sidebar-button'];

            if (url.pathname === link.path) {
                classes.push('selected');
            }

            if (link.comming_soon) {
                classes.push('comming-soon');
            }

            const href = link.comming_soon ? '#' : link.path;

            return `
                <a href="${href}" class="${classes.join(' ')}" title="${link.name}" ${link.comming_soon ? 'aria-disabled="true"' : ''}>
                    ${link.icon}
                    <div class="sidebar-link-content">
                        <span class="sidebar-link-label">${link.name}</span>
                        ${link.comming_soon ? '<span class="sidebar-link-badge">Soon</span>' : ''}
                    </div>
                </a>
            `;
        }).join('');

        return `
            <div class="sidebar-group">
                <p class="sidebar-group-label">${group.title}</p>
                ${linksHtml}
            </div>
        `;
    }).join('');

    const themeToggleBtn = sidebarElement.querySelector('#theme-toggle-sidebar');
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('.material-icons');
        if (icon && window.themeManager) {
            icon.textContent = window.themeManager.getCurrentTheme() === 'light' ? 'dark_mode' : 'light_mode';
        }

        themeToggleBtn.addEventListener('click', () => {
            if (window.themeManager) {
                window.themeManager.toggleTheme();
                if (icon) {
                    icon.textContent = window.themeManager.getCurrentTheme() === 'light' ? 'dark_mode' : 'light_mode';
                }
            }
        });

        document.addEventListener('themeChanged', (event) => {
            if (icon) {
                icon.textContent = event.detail.theme === 'light' ? 'dark_mode' : 'light_mode';
            }
        });
    }

    const ensureMobileChrome = () => {
        let toggleBtn = document.querySelector('.sidebar-mobile-toggle');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'sidebar-mobile-toggle';
            toggleBtn.innerHTML = '<span class="material-icons">menu</span>';
            toggleBtn.setAttribute('aria-label', 'Open navigation menu');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.appendChild(toggleBtn);
        }

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        const icon = toggleBtn.querySelector('.material-icons');

        const setOpenState = (isOpen) => {
            sidebarElement.classList.toggle('is-open', isOpen);
            document.body.classList.toggle('sidebar-open', isOpen);
            if (icon) {
                icon.textContent = isOpen ? 'close' : 'menu';
            }
            toggleBtn.setAttribute('aria-expanded', String(isOpen));
        };

        const toggleSidebar = () => {
            const isOpen = !sidebarElement.classList.contains('is-open');
            setOpenState(isOpen);
        };

        toggleBtn.onclick = toggleSidebar;
        overlay.onclick = () => setOpenState(false);

        setOpenState(false);

        if (!window.__heliosSidebarMobileSetup) {
            window.addEventListener('resize', () => {
                if (window.innerWidth > 900) {
                    setOpenState(false);
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    setOpenState(false);
                }
            });

            window.__heliosSidebarMobileSetup = true;
        }

        navContainer.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    setOpenState(false);
                }
            });
        });
    };

    ensureMobileChrome();
};
