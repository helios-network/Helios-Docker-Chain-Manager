# Système de Thème Helios

## Vue d'ensemble

Le système de thème Helios permet de basculer entre un thème clair (par défaut) et un thème sombre. Le système utilise des variables CSS pour une gestion centralisée des couleurs et des styles.

## Fonctionnalités

### 🎨 Thèmes disponibles
- **Thème clair** : Design moderne avec des couleurs claires et des accents bleus
- **Thème sombre** : Design élégant avec des couleurs sombres et des accents bleus

### 🔄 Basculement de thème
- **Bouton flottant** : Bouton circulaire en haut à droite de l'écran
- **Bouton sidebar** : Bouton dans le footer de la sidebar
- **Persistance** : Le thème choisi est sauvegardé dans le localStorage
- **Détection automatique** : Respecte les préférences système (première visite)

### 🎯 Éléments stylisés
- Arrière-plans et conteneurs
- Boutons et formulaires
- Sidebar et navigation
- Tableaux et cartes
- Modales et notifications
- Scrollbars personnalisées

## Architecture technique

### Variables CSS
Le système utilise des variables CSS définies dans `:root` et `[data-theme="dark"]` :

```css
:root {
    --bg-primary: linear-gradient(135deg, #E2EBFF 0%, #F8FAFF 100%);
    --text-primary: #040F34;
    --accent-primary: #002DCB;
    /* ... autres variables */
}

[data-theme="dark"] {
    --bg-primary: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    --text-primary: #F8FAFC;
    --accent-primary: #3B82F6;
    /* ... autres variables */
}
```

### JavaScript
Le gestionnaire de thème (`theme.js`) :
- Gère le basculement entre thèmes
- Persiste le choix utilisateur
- Synchronise les boutons de thème
- Écoute les changements de préférences système

### Intégration
- **CSS** : Variables appliquées à tous les éléments
- **HTML** : Attribut `data-theme` sur `<html>`
- **JavaScript** : Gestionnaire global accessible via `window.themeManager`

## Utilisation

### Pour l'utilisateur
1. Cliquer sur le bouton de thème (flottant ou sidebar)
2. Le thème change instantanément
3. Le choix est sauvegardé automatiquement

### Pour le développeur
```javascript
// Accéder au gestionnaire de thème
const themeManager = window.themeManager;

// Changer le thème programmatiquement
themeManager.setTheme('dark');

// Obtenir le thème actuel
const currentTheme = themeManager.getCurrentTheme();

// Écouter les changements de thème
document.addEventListener('themeChanged', (event) => {
    console.log('Thème changé vers:', event.detail.theme);
});
```

## Fichiers modifiés

### Nouveaux fichiers
- `html/js/theme.js` : Gestionnaire de thème
- `THEME_SYSTEM.md` : Documentation

### Fichiers modifiés
- `html/style.css` : Variables CSS et styles de thème
- `html/js/side-bar.js` : Bouton de thème dans la sidebar
- Toutes les pages HTML : Inclusion du script theme.js

## Personnalisation

### Ajouter de nouveaux éléments
Pour styliser un nouvel élément avec le système de thème :

```css
.mon-element {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
}

.mon-element:hover {
    background: var(--bg-button-hover);
}
```

### Ajouter de nouvelles variables
1. Définir la variable dans `:root` (thème clair)
2. Définir la variable dans `[data-theme="dark"]` (thème sombre)
3. Utiliser la variable dans les styles

### Créer un nouveau thème
1. Ajouter un nouveau sélecteur `[data-theme="nom-du-theme"]`
2. Définir toutes les variables CSS nécessaires
3. Ajouter la logique de basculement dans `theme.js`

## Accessibilité

- Contraste respecté pour les deux thèmes
- Focus visible avec des couleurs appropriées
- Support des préférences système
- Navigation au clavier fonctionnelle

## Compatibilité

- Navigateurs modernes (CSS Variables)
- Fallback pour les navigateurs plus anciens
- Responsive design maintenu
- Performance optimisée (pas de rechargement de page) 