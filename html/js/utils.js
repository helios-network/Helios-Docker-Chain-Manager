// Lib Utils

const rot13 = str => str.split('').map(char => String.fromCharCode(char.charCodeAt(0) + 13)).join('');

const compareIt = (a,b) => {
    let ap = a.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let bp = b.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let cmp = ap != bp;
    return cmp;
};

