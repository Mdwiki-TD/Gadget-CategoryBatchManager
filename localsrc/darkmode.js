
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const darkThemeCss = document.getElementById('darkThemeCss');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function setDarkMode(enabled) {
    if (enabled) {
        html.setAttribute('data-theme', 'dark');
        if (darkThemeCss) darkThemeCss.media = 'all';
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        html.removeAttribute('data-theme');
        if (darkThemeCss) darkThemeCss.media = 'not all';
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// Initialize theme
if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    setDarkMode(true);
} else {
    setDarkMode(false);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = html.getAttribute('data-theme') === 'dark';
        setDarkMode(!isDark);
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
}
