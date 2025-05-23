
const displaySideBar = () => {
    const sidebarElement = document.querySelector('div.sidebar');

    if (sidebarElement == undefined) {
        return ;
    }

    sidebarElement.innerHTML = `
            <div class="sidebar-logo">
                <img src="./logo.png" alt="Logo">
            </div>
            <div class="sidebar-logo-mobile">
                <img src="./icon.png" alt="Logo">
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
        }
    ];

    const url = new URL(window.location.href);

    links.forEach((x, i) => {
        sidebarElement.innerHTML += `<a href="${x.path}" class="${'sidebar-button' + (i > 0 ? ' mt-1': '') + (url.pathname == x.path ? ' selected' : '')}" title="${x.name}">${x.icon}<span>${x.name}</span></a>`;
    });
}