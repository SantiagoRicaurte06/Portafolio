// ==================== OBSERVADOR PARA ANIMACIONES ==================== 
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationDelay = `0.2s`;
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observar todas las secciones
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// ==================== EFECTO DE BARRA DE PROGRESO ==================== 
const skillBars = document.querySelectorAll('.skill-progress');

const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBar = entry.target;
            const width = progressBar.style.width;
            progressBar.style.width = '0%';
            
            setTimeout(() => {
                progressBar.style.width = width;
            }, 100);
            
            skillObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

skillBars.forEach(bar => skillObserver.observe(bar));

// ==================== DESPLAZAMIENTO SUAVE MEJORADO ==================== 
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== EFECTO DE MOVIMIENTO DEL MOUSE EN EL HEADER ==================== 
const header = document.querySelector('header');
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
});

// ==================== CAMBIO DE CLASE AL DESPLAZAR ==================== 
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    let scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop) {
        // Desplazando hacia abajo
        header.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.2)';
    } else {
        // Desplazando hacia arriba
        header.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.1)';
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});

// ==================== ANIMACIÓN DE CARGA ==================== 
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ==================== EFECTO DE TIPEO EN EL LOGO ==================== 
const logo = document.querySelector('.logo');
if (logo) {
    const originalText = logo.textContent;
    logo.textContent = '';
    
    let index = 0;
    const typeInterval = setInterval(() => {
        if (index < originalText.length) {
            logo.textContent += originalText[index];
            index++;
        } else {
            clearInterval(typeInterval);
        }
    }, 100);
}
