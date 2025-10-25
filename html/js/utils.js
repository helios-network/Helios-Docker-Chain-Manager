// Lib Utils

const rot13 = str => str.split('').map(char => String.fromCharCode(char.charCodeAt(0) + 13)).join('');

const compareIt = (a,b) => {
    let ap = a.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let bp = b.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let cmp = ap != bp;
    return cmp;
};

const buildLogsContainer = (logContainer) => {
    const divControlLogs = document.createElement('div');
    divControlLogs.classList.add('control-logs');

    const div = document.createElement('div');
    div.classList.add('logs-container');

    const pre = document.createElement('pre');

    // Ajout d'un bouton Pause
    const pauseButton = document.createElement('button');
    pauseButton.className = 'button secondary';
    pauseButton.textContent = 'Pause';
    let isPaused = false; // État de pause

    pauseButton.onclick = () => {
        isPaused = !isPaused; // Inverser l'état de pause
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause'; // Changer le texte du bouton
        if (isPaused) {
            div.style.border = '1px solid orange'; // Afficher que le logging est en pause
        } else {
            div.style.border = ''; // Afficher que le logging reprend
        }
    };

    div.append(pre); // Ajouter le bouton au conteneur
    divControlLogs.append(pauseButton, div);

    let keys = {};
    if (logContainer.key != undefined) {
        keys[logContainer.key] = {
            element: div,
            setLog: (content) => {
                if (!isPaused && compareIt(pre.innerHTML, content)) {
                    pre.innerHTML = content;
        
                    if (!document.activeElement.isEqualNode(pre) && !document.activeElement.isEqualNode(div)) {
                        div.scrollTop = div.scrollHeight; // Faire défiler vers le bas
                    }
                }
            }
        };
    }

    return { keys: keys, element: divControlLogs };
}

const buildIcon = (name) => {
    const i = document.createElement('i');
    i.classList.add('material-icons');
    i.innerText = name;
    return i;
}

const buildSpan = (innerText, classes = []) => {
    const span = document.createElement('span');
    span.classList.add(... classes);
    span.innerText = innerText;
    return span;
}

// var promptCount = 0;
window.pw_prompt = function(options) {
    var lm = options.lm || "Password:",
        bm = options.bm || "Submit";
    if(!options.callback) { 
        alert("No callback function provided! Please provide one.") 
    };

    // Create overlay
    var overlay = document.createElement("div");
    overlay.className = "pw_prompt";

    // Create content container
    var content = document.createElement("div");

    var submit = function() {
        options.callback(input.value);
        document.body.removeChild(overlay);
    };

    var cancel = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };

    // Allow clicking overlay to close
    overlay.addEventListener("click", cancel, false);

    var label = document.createElement("label");
    label.textContent = lm;
    label.htmlFor = "pw_prompt_input";
    content.appendChild(label);

    var input = document.createElement("input");
    input.id = "pw_prompt_input";
    input.type = lm.toLowerCase().includes("password") ? "password" : "text";
    input.classList.add('form-control');
    input.placeholder = lm.toLowerCase().includes("password") ? "Enter your password" : "Enter value";
    input.addEventListener("keyup", function(e) {
        if (e.keyCode == 13) submit();
    }, false);
    content.appendChild(input);

    var button = document.createElement("button");
    button.textContent = bm;
    button.addEventListener("click", submit, false);
    content.appendChild(button);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Focus input after a brief delay to ensure it's rendered
    setTimeout(function() {
        input.focus();
    }, 100);
};

window.btn_prompt = function(options) {
    var bm = options.bm || "Submit";
    if(!options.callback) { 
        alert("No callback function provided! Please provide one.") 
    };

    // Create overlay
    var overlay = document.createElement("div");
    overlay.className = "btn_prompt";

    // Create content container
    var content = document.createElement("div");

    var submit = function() {
        options.callback();
        document.body.removeChild(overlay);
    };

    var cancel = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };

    // Allow clicking overlay to close
    overlay.addEventListener("click", cancel, false);

    var button = document.createElement("button");
    button.textContent = bm;
    button.addEventListener("click", submit, false);
    content.appendChild(button);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
};