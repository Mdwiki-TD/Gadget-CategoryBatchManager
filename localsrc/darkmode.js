
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
        darkThemeCss.media = 'all';
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        html.removeAttribute('data-theme');
        darkThemeCss.media = 'not all';
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Initialize theme
if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    setDarkMode(true);
} else {
    setDarkMode(false);
}

themeToggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    setDarkMode(!isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});
