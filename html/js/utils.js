// Lib Utils

const rot13 = str => str.split('').map(char => String.fromCharCode(char.charCodeAt(0) + 13)).join('');

const compareIt = (a,b) => {
    let ap = a.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let bp = b.trim().replace(/\&lt/gm, '<').replace(/\&gt/gm, '<').replace(/[^a-z0-9]/gi, '');
    let cmp = ap != bp;
    return cmp;
};

const buildDisplay = (displayRepresentation, targetElement) => {
    let finalDisplayRepresentation = { };

    for (let element of displayRepresentation) {
        let result;

        switch (element.type) {
            case "button":
                result = buildButton(element);
                break;
            case "raw":
                result = buildRaw(element);
                break;
            case "content":
                result = buildContent(element);
                break;
            case "checklist":
                result = buildChecklist(element);
                break;
            case "list":
                result = buildList(element);
                break;
            case "text":
                result = buildText(element);
                break;
            case "address":
                result = buildAddress(element);
                break;
            case "iconButton":
                result = buildIconButton(element);
                break;
            case "form-group":
                result = buildFormGroup(element);
                break;
            case "logs-container":
                result = buildLogsContainer(element);
                break;
        }

        if (result) {
            targetElement.appendChild(result.element);
            if (result.keys) {
                // Gérer les clés si nécessaire
                finalDisplayRepresentation = { ... finalDisplayRepresentation, ... result.keys };
                console.log(finalDisplayRepresentation, element.type);
            }
        }

        if (element.content != undefined && element.type != 'content') {
            finalDisplayRepresentation = { ... finalDisplayRepresentation, ... buildDisplay(element.content, element.element) };
        } else if (element.content != undefined && element.type == 'content') {
            finalDisplayRepresentation = { ... finalDisplayRepresentation, ... buildDisplay(element.content, result.targetElement) };
        }
    }

    return { ... finalDisplayRepresentation, struct: displayRepresentation };
}

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

const buildFormGroup = (formGroup) => {
    let keys = {};

    const div = document.createElement('div');
    div.classList.add('form-group');

    let controlKeys = {};
    formGroup.controls.forEach(control => {
        const controlBuildResult = buildFormControl(formGroup, control);
        controlKeys = { ... controlKeys, ... controlBuildResult.keys };

        div.appendChild(controlBuildResult.element);
    });

    if (formGroup.key != undefined) {
        keys[formGroup.key] = {
            element: formGroup,
            isValid: () => {
                return Object.values(controlKeys).some(k => k.input.valid);
            },
            getErrors: () => {
                const inputInError = Object.values(controlKeys).find(k => k.input.valid);
                return inputInError ? inputInError.input.errors : undefined;
            }
        };
    }

    return { keys: { ... keys, ... controlKeys }, element: div };
}

const buildFormControl = (formGroup, control) => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.setAttribute('for', formGroup.id);
    label.textContent = control.label; // Utilisation de textContent pour éviter XSS
    div.appendChild(label);
    const inputBuildResult = buildInput(control);
    div.appendChild(inputBuildResult.element);

    let keys = {};
    if (control.key != undefined) {
        keys[control.key] = {
            element: control,
            input: inputBuildResult.keys[control.key]
        };
    }

    return { keys: keys, element: div };
}

const buildInput = (control) => {
    const input = document.createElement('input');
    // input.id = control.id;
    input.type = control.type || 'text'; // Type par défaut
    input.className = 'form-control';
    input.placeholder = control.placeholder;
    input.errors = {};

    if (control.onChange != undefined) {
        input.onChange = control.onChange;
    }

    const onChangeFn = () => {
        input.errors = {};
        if (control.validators != undefined) {
            control.validators.forEach(validatorFn => {
                const validationResult = validatorFn(input);

                if (validationResult != undefined) {
                    input.errors = { ... input.errors, ... validationResult };
                }
            })
        }

        if (Object.keys(input.errors).length == 0) {
            input.valid = true;
            input.invalid = !input.valid;
            input.classList.add('input-valid');
            input.classList.remove('input-invalid');
        } else {
            input.valid = false;
            input.invalid = !input.valid;
            input.classList.remove('input-valid');
            input.classList.add('input-invalid');
        }
        if (input.onChange != undefined) {
            console.log(control.validators, control.validators ? control.validators[0](input) : '');
            input.onChange(input);
        }
    }
    onChangeFn();

    input.onchange = onChangeFn;

    let keys = {};
    if (control.key != undefined) {
        keys[control.key] = {
            element: input
        };
    }

    return { keys: keys, element: input };
}

const buildIconButton = (iconButton) => {
    const container = document.createElement('div');
    container.style.width = '80px'; // Largeur du conteneur
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'flex-start'; // Alignement en haut
    container.style.margin = '10px'; // Optionnel : espacement autour du bouton

    const button = document.createElement('div'); // Créer un div pour le bouton
    button.style.width = '40px'; // Largeur du bouton
    button.style.height = '40px'; // Hauteur du bouton
    button.style.border = '1px solid #000'; // Bordure noire
    button.style.backgroundColor = '#fff'; // Fond blanc
    button.style.borderRadius = '50%'; // Rayon de 50%
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer'; // Changer le curseur pour indiquer que c'est cliquable

    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.style.color = '#000'; // Icône noire
    icon.textContent = iconButton.icon; // Utilisation de textContent pour éviter XSS
    button.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = iconButton.text; // Utilisation de textContent pour éviter XSS
    text.style.marginTop = '5px'; // Espacement de 5px au-dessus du texte
    text.style.textAlign = 'center'; // Centrer le texte
    container.appendChild(button); // Ajouter le bouton au conteneur
    container.appendChild(text); // Ajouter le texte au conteneur

    let keys = {};
    if (iconButton.key != undefined) {
        keys[iconButton.key] = {
            element: container,
            button: button,
        };
    }

    return { keys: keys, element: container };
}

const buildText = (textElement) => {
    const div = document.createElement('div');
    div.classList.add('text-container');
    div.style.textAlign = textElement.align || 'left'; // Alignement par défaut à gauche

    const span = document.createElement('span');
    span.textContent = textElement.text; // Utilisation de textContent pour éviter XSS
    div.appendChild(span);

    let keys = {};
    if (textElement.key != undefined) {
        keys[textElement.key] = {
            element: div,
        };
    }

    return { keys: keys, element: div };
}

const buildAddress = (addressElement) => {
    const div = document.createElement('div');
    div.classList.add('address-container');
    div.style.borderRadius = '5px';
    div.style.border = '1px solid #ccc';
    div.style.padding = '10px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';

    const addressSpan = document.createElement('span');
    addressSpan.textContent = addressElement.address; // Utilisation de textContent pour éviter XSS
    div.appendChild(addressSpan);

    const copyIcon = document.createElement('i');
    copyIcon.className = 'material-icons';
    copyIcon.textContent = 'content_copy'; // Icône de copie
    copyIcon.style.cursor = 'pointer';
    copyIcon.addEventListener('click', () => {
        navigator.clipboard.writeText(addressElement.address).then(() => {
            // Effet brillant sur clic
            div.style.backgroundColor = '#e0f7fa'; // Couleur de fond brillante
            setTimeout(() => {
                div.style.backgroundColor = ''; // Réinitialiser après un court délai
            }, 300);
        });
    });
    div.appendChild(copyIcon);

    let keys = {};
    if (addressElement.key != undefined) {
        keys[addressElement.key] = {
            element: div,
        };
    }

    return { keys: keys, element: div };
}

const buildChecklist = (checklist) => {
    const ul = document.createElement('ul');
    ul.classList.add('checklist');

    checklist.items.forEach(item => {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = item.id; // Assurez-vous que chaque item a une propriété id
        checkbox.checked = item.checked || false; // État par défaut

        const label = document.createElement('label');
        label.htmlFor = item.id;
        label.textContent = item.text; // Utilisation de textContent pour éviter XSS

        li.appendChild(checkbox);
        li.appendChild(label);
        
        // Vérification de contenu récursif
        if (item.content) {
            buildDisplay(item.content, li);
        }

        ul.appendChild(li);
    });

    checklist.element = ul; // Référence à l'élément pour modification future

    let keys = {};
    if (checklist.key != undefined) {
        keys[checklist.key] = {
            element: ul,
        };
    }

    return { keys: keys, element: ul };
}

const buildList = (list) => {
    const ul = document.createElement('ul');
    ul.classList.add('list');

    // Appliquer des styles en fonction des paramètres
    ul.style.paddingInlineStart = '0'; // Désactiver le padding-inline-start

    if (list.horizontal) {
        ul.style.display = 'flex'; // Affichage horizontal
        ul.style.overflowX = 'auto'; // Rendre la liste scrollable horizontalement
    } else {
        ul.style.display = 'block'; // Affichage vertical
    }

    ul.style.listStyleType = list.showDots ? 'disc' : 'none'; // Afficher ou masquer les points
    ul.style.justifyContent = list.justifyContent ?? 'start';

    list.items.forEach(item => {
        const li = document.createElement('li');
        // Vérification de contenu récursif
        if (item.type) {
            buildDisplay([item], li);
        } else {
            li.textContent = item.text; // Utilisation de textContent pour éviter XSS
        }
        ul.appendChild(li);
    });

    list.element = ul; // Référence à l'élément pour modification future

    let keys = {};
    if (list.key != undefined) {
        keys[list.key] = {
            element: ul,
        };
    }

    return { keys: keys, element: ul };
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

const buildContent = (content) => {
    const div = document.createElement('div');
    div.classList.add('section');

    const sectionHeader = document.createElement('div');
    sectionHeader.classList.add('section-header');

    const sectionTitle = document.createElement('div');
    sectionTitle.classList.add('section-title');
    sectionTitle.append(buildIcon(content.icon));
    const titleSpanElement = buildSpan(content.title);
    sectionTitle.append(titleSpanElement);
    content.setTitle = (t) => { titleSpanElement.innerText = t; }; // fn;
    sectionHeader.appendChild(sectionTitle);

    if (content.badge != undefined) {
        const optionalBadge = document.createElement('div');
        optionalBadge.classList.add('status-badge');
        if (content.badge.icon != undefined) {
            optionalBadge.append(buildIcon(content.badge.icon));
        }
        const badgeTextElement = buildSpan(content.badge.value);
        optionalBadge.append(badgeTextElement);
        content.badge.setValue = (v) => { badgeTextElement.innerText = v; }; // fn;
        sectionHeader.appendChild(optionalBadge);
    }
    div.appendChild(sectionHeader);

    const sectionContent = document.createElement('div');
    sectionContent.classList.add('section-content');
    div.appendChild(sectionContent);

    content.element = div; // ref
    let keys = {};
    if (content.key != undefined) {
        keys[content.key] = {
            element: div,
        };
    }

    return { keys: keys, element: div, targetElement: sectionContent };
}

const buildRaw = (raw) => {
    const div = document.createElement('div');

    let nbrOfRaw = 3;
    if (raw.nbr != undefined) {
        nbrOfRaw = raw.nbr;
    }

    div.classList.add('button-group', `grp${nbrOfRaw}`);

    raw.element = div;

    let keys = {};
    if (raw.key != undefined) {
        keys[raw.key] = {
            element: div,
        };
    }

    return { keys: keys, element: div };
}

const buildButton = (button) => {
    const btn = document.createElement('button');
    btn.id = button.id; // Assurez-vous que l'objet button a une propriété id
    btn.className = `button ${button.class}`;
    if (button.disabled != undefined) {
        btn.disabled = button.disabled;
    }
    btn.onclick = button.onclick; // Assurez-vous que l'objet button a une propriété onclick
    if (button.display != undefined) {
        btn.style.display = button.display;
    }

    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.textContent = button.icon; // Utilisation de textContent pour éviter XSS
    btn.appendChild(icon);

    const span = document.createElement('span');
    span.textContent = button.text; // Utilisation de textContent pour éviter XSS
    btn.appendChild(span);

    let keys = {};
    if (button.key != undefined) {
        keys[button.key] = {
            element: btn,
            display: (b) => {
                if (!b) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = '';
                }
            }
        };
    }
    return { keys: keys, element: btn };
}

// var promptCount = 0;
window.pw_prompt = function(options) {
    var lm = options.lm || "Password:",
        bm = options.bm || "Submit";
    if(!options.callback) { 
        alert("No callback function provided! Please provide one.") 
    };

    var prompt = document.createElement("div");
    prompt.className = "pw_prompt";

    var submit = function() {
        options.callback(input.value);
        document.body.removeChild(prompt);
    };

    var label = document.createElement("label");
    label.textContent = lm;
    label.for = "pw_prompt_input";
    prompt.appendChild(label);

    var input = document.createElement("input");
    input.id = "pw_prompt_input";
    input.type = "password";
    input.classList.add('form-control');
    input.addEventListener("keyup", function(e) {
        if (e.keyCode == 13) submit();
    }, false);
    prompt.appendChild(input);

    var button = document.createElement("button");
    button.textContent = bm;
    button.addEventListener("click", submit, false);
    prompt.appendChild(button);

    document.body.appendChild(prompt);
};