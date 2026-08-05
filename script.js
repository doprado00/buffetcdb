/**
 * Buffet Elegance / Seleto Buffet - Core Application Logic
 * Clean & Organized JavaScript Module
 */

let scrollPosition = 0;

// DOM Elements - Modals & Forms
const loginModal = document.getElementById('loginModal');
const menuModal = document.getElementById('menuModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// DOM Elements - Buttons & Triggers
const openLogin = document.getElementById('openLogin');
const closeLogin = document.getElementById('closeLogin');
const closePanelBtn = document.getElementById('closePanelBtn');
const logoutBtn = document.getElementById('logoutBtn');
const panelMenuBtn = document.getElementById('panelMenuBtn');

const openMenu = document.getElementById('openMenu');
const openMenuNav = document.getElementById('openMenuNav');
const openMenuHero = document.getElementById('openMenuHero');
const closeMenu = document.getElementById('closeMenu');
const closeMenuToContact = document.getElementById('closeMenuToContact');

const menuToggle = document.getElementById('menu-toggle');
const ownerControls = document.getElementById('ownerControls');
const editMenuBtn = document.getElementById('editMenuBtn');
const saveMenuBtn = document.getElementById('saveMenuBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const menuContainer = document.getElementById('menuContainer');
const menuFeedback = document.getElementById('menuFeedback');

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

// Application State
let isOwner = !!localStorage.getItem('ownerToken');

/* ==========================================
   UI & Scroll Management
   ========================================== */

/**
 * Updates UI layout and panel depending on owner authentication state
 */
function updateUIForOwner() {
    const loginView = document.getElementById('loginView');
    const ownerView = document.getElementById('ownerView');
    const loggedInUser = document.getElementById('loggedInUser');

    if (isOwner) {
        if (ownerControls) ownerControls.style.display = 'flex';
        if (openLogin) {
            const span = openLogin.querySelector('span');
            if (span) span.textContent = 'Painel';
            openLogin.classList.add('admin-active');
        }
        if (loginView) loginView.style.display = 'none';
        if (ownerView) ownerView.style.display = 'block';
        if (loggedInUser) loggedInUser.textContent = localStorage.getItem('ownerUser') || 'Proprietário';
    } else {
        if (ownerControls) ownerControls.style.display = 'none';
        if (openLogin) {
            const span = openLogin.querySelector('span');
            if (span) span.textContent = 'Login';
            openLogin.classList.remove('admin-active');
        }
        if (loginView) loginView.style.display = 'block';
        if (ownerView) ownerView.style.display = 'none';
    }
}

/**
 * Prevents background page scroll when a modal is open
 */
function lockScroll() {
    scrollPosition = window.scrollY || window.pageYOffset;
    // Fix body in place at the current scroll offset so the backdrop-filter
    // shows the correct part of the page (not just the top)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = `calc(100% - ${scrollbarWidth}px)`;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
}

/**
 * Restores background page scroll when modals close
 */
function unlockScroll() {
    // Remove fixed positioning and instantly restore scroll position
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
}

/* ==========================================
   Authentication Logic
   ========================================== */

if (loginForm) {
    loginForm.onsubmit = async function (e) {
        e.preventDefault();
        const usuario = document.getElementById('username').value;
        const senha = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('ownerToken', data.token);
                localStorage.setItem('ownerUser', data.user);
                isOwner = true;
                updateUIForOwner();
                if (loginModal) loginModal.style.display = 'none';
                unlockScroll();
                loginForm.reset();
            } else {
                if (loginError) {
                    loginError.textContent = data.message;
                    loginError.style.display = 'block';
                }
            }
        } catch (error) {
            if (loginError) {
                loginError.textContent = 'Erro ao conectar ao servidor.';
                loginError.style.display = 'block';
            }
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async function () {
        isOwner = false;
        localStorage.removeItem('ownerToken');
        localStorage.removeItem('ownerUser');
        updateUIForOwner();
        if (loginModal) loginModal.style.display = 'none';
        unlockScroll();
        try {
            await fetch(`${API_URL}/logout`, { method: 'POST' });
        } catch (e) {
            // Ignora erros no logout
        }
    };
}

if (togglePassword) {
    togglePassword.onclick = function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    };
}

/* ==========================================
   Menu Data & Management
   ========================================== */

/**
 * Fetches menu items from backend API
 */
async function loadMenu() {
    try {
        const response = await fetch(`${API_URL}/api/menu`);
        const items = await response.json();

        if (Array.isArray(items) && items.length > 0) {
            renderMenu(items);
        }
    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
    }
}

/**
 * Helper to get SVG decorative dividers per menu category
 */
function getDividerSvg(key) {
    if (key === 'principais') {
        return `<div class="category-divider">
            <svg viewBox="0 0 240 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 8 L95 8 M145 8 L240 8" stroke="#b8860b" stroke-width="1.2"/>
                <path d="M95 8 C102 2, 108 14, 120 8 C132 2, 138 14, 145 8" stroke="#b8860b" stroke-width="1.2"/>
                <circle cx="120" cy="8" r="2.5" fill="#b8860b"/>
                <circle cx="100" cy="8" r="1.5" fill="#d4af37"/>
                <circle cx="140" cy="8" r="1.5" fill="#d4af37"/>
            </svg>
        </div>`;
    } else if (key === 'sobremesas') {
        return `<div class="category-divider">
            <svg viewBox="0 0 200 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 7 L80 7 M120 7 L200 7" stroke="#b8860b" stroke-width="1"/>
                <path d="M80 7 C88 1, 95 13, 100 7 C105 1, 112 13, 120 7" stroke="#b8860b" stroke-width="1.2"/>
                <circle cx="100" cy="7" r="2" fill="#b8860b"/>
            </svg>
        </div>`;
    } else {
        return `<div class="category-divider">
            <svg viewBox="0 0 200 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="5" x2="200" y2="5" stroke="#b8860b" stroke-width="1" opacity="0.6"/>
            </svg>
        </div>`;
    }
}

/**
 * Renders structured HTML for menu categories and items
 */
function renderMenu(items) {
    if (!menuContainer) return;

    const categories = {
        'entradas': { title: 'Entradas', items: [] },
        'principais': { title: 'Pratos Principais', items: [] },
        'sobremesas': { title: 'Sobremesas', items: [] }
    };

    items.forEach(item => {
        if (categories[item.categoria]) {
            categories[item.categoria].items.push(item);
        }
    });

    menuContainer.innerHTML = '';
    for (const key in categories) {
        const cat = categories[key];
        const section = document.createElement('div');
        section.className = 'menu-category';
        section.setAttribute('data-cat', key);
        section.innerHTML = `
            <h3>${cat.title.toUpperCase()}</h3>
            ${getDividerSvg(key)}
            <ul class="menu-list" data-category="${key}">
                ${cat.items.map(item => `
                    <li>
                        <span class="item-name">${item.nome}</span>
                        <p class="item-desc">${item.descricao}</p>
                    </li>
                `).join('')}
            </ul>
        `;
        menuContainer.appendChild(section);
    }
}

/**
 * Displays status feedback messages in the menu modal
 */
function showMenuFeedback(message, isError = false) {
    if (!menuFeedback) return;
    menuFeedback.textContent = message;
    menuFeedback.className = `menu-feedback ${isError ? 'error' : 'success'}`;
    menuFeedback.style.display = 'block';

    setTimeout(() => {
        menuFeedback.style.display = 'none';
    }, 5000);
}

// Edit Mode Event Listeners
if (editMenuBtn) {
    editMenuBtn.onclick = () => {
        menuModal.classList.add('editing');
        editMenuBtn.style.display = 'none';
        if (saveMenuBtn) saveMenuBtn.style.display = 'inline-block';
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

        const items = menuContainer.querySelectorAll('li');
        items.forEach(li => {
            const name = li.querySelector('.item-name').textContent;
            const desc = li.querySelector('.item-desc').textContent;
            li.innerHTML = `
                <input type="text" class="edit-input name-input" value="${name}">
                <textarea class="edit-textarea desc-input">${desc}</textarea>
            `;
        });
    };
}

if (cancelEditBtn) {
    cancelEditBtn.onclick = () => {
        menuModal.classList.remove('editing');
        if (editMenuBtn) editMenuBtn.style.display = 'inline-block';
        if (saveMenuBtn) saveMenuBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        loadMenu();
    };
}

if (saveMenuBtn) {
    saveMenuBtn.onclick = async () => {
        const updatedItems = [];
        const categories = menuContainer.querySelectorAll('.menu-list');

        categories.forEach(catList => {
            const category = catList.dataset.category;
            const items = catList.querySelectorAll('li');
            items.forEach(li => {
                const nameInput = li.querySelector('.name-input');
                const descInput = li.querySelector('.desc-input');
                if (nameInput && descInput) {
                    updatedItems.push({
                        categoria: category,
                        nome: nameInput.value,
                        descricao: descInput.value
                    });
                }
            });
        });

        try {
            const token = localStorage.getItem('ownerToken');
            const response = await fetch(`${API_URL}/api/menu/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(updatedItems)
            });

            const data = await response.json();
            if (data.success) {
                showMenuFeedback('Cardápio atualizado com sucesso!');
                menuModal.classList.remove('editing');
                if (editMenuBtn) editMenuBtn.style.display = 'inline-block';
                saveMenuBtn.style.display = 'none';
                if (cancelEditBtn) cancelEditBtn.style.display = 'none';
                loadMenu();
            } else {
                showMenuFeedback('Erro ao salvar: ' + data.message, true);
                if (data.message === 'Não autorizado') {
                    isOwner = false;
                    localStorage.removeItem('ownerToken');
                    localStorage.removeItem('ownerUser');
                    updateUIForOwner();
                    if (cancelEditBtn) cancelEditBtn.click();
                }
            }
        } catch (error) {
            showMenuFeedback('Erro de conexão ao salvar.', true);
        }
    };
}

/* ==========================================
   Modal Open & Close Control
   ========================================== */

if (openLogin) {
    openLogin.onclick = function (e) {
        e.preventDefault();
        if (loginModal) loginModal.style.display = 'flex';
        lockScroll();
        if (loginError) loginError.style.display = 'none';
    };
}

if (closeLogin) {
    closeLogin.onclick = function () {
        if (loginModal) loginModal.style.display = 'none';
        unlockScroll();
    };
}

if (closePanelBtn) {
    closePanelBtn.onclick = function () {
        if (loginModal) loginModal.style.display = 'none';
        unlockScroll();
    };
}

const handleOpenMenu = function () {
    if (menuModal) menuModal.style.display = 'flex';
    lockScroll();
    if (menuToggle) menuToggle.checked = false;
    loadMenu();
};

if (openMenu) openMenu.onclick = function (e) { e.preventDefault(); handleOpenMenu(); };
if (openMenuNav) openMenuNav.onclick = function (e) { e.preventDefault(); handleOpenMenu(); };
if (openMenuHero) openMenuHero.onclick = function (e) { e.preventDefault(); handleOpenMenu(); };

if (panelMenuBtn) {
    panelMenuBtn.onclick = function (e) {
        e.preventDefault();
        if (loginModal) loginModal.style.display = 'none';
        handleOpenMenu();
    };
}

if (closeMenu) {
    closeMenu.onclick = function () {
        if (menuModal) menuModal.style.display = 'none';
        unlockScroll();
    };
}

if (closeMenuToContact) {
    closeMenuToContact.onclick = function () {
        if (menuModal) menuModal.style.display = 'none';
        unlockScroll();
    };
}

window.onclick = function (event) {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
        unlockScroll();
    }
    if (event.target === menuModal && !menuModal.classList.contains('editing')) {
        menuModal.style.display = 'none';
        unlockScroll();
    }
};

/* ==========================================
   Navigation Intersection Observer
   ========================================== */

const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

if (sections.length > 0) {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navItems.forEach(a => a.classList.remove('active'));
                const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
                if (active) active.classList.add('active');
            }
        });
    }, { threshold: 0.4 });

    sections.forEach(s => sectionObserver.observe(s));
}

// Função para reanimar os elementos do header
function animarElementosHeader() {
    const elementos = document.querySelectorAll('.header-element, .header-logo');
    
    elementos.forEach((el, index) => {
        // Remove a animação
        el.style.animation = 'none';
        
        // Força o reflow
        void el.offsetWidth;
        
        // Reaplica a animação com delay baseado na posição
        setTimeout(() => {
            if (el.classList.contains('header-logo')) {
                el.style.animation = 'fadeInScale 0.8s ease-out forwards';
            } else {
                el.style.animation = `fadeInUp 0.6s ease-out forwards`;
            }
        }, index * 100); // 100ms de delay entre cada elemento
    });
}

// 1. Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(animarElementosHeader, 100); // Pequeno delay para garantir que carregou
});

// 2. Ao fechar modal do Cardápio
document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('menuModal').style.display = 'none';
    animarElementosHeader();
});

// 3. Ao fechar modal de Login
document.getElementById('closeLogin').addEventListener('click', function() {
    document.getElementById('loginModal').style.display = 'none';
    animarElementosHeader();
});

/* ==========================================
   Initialization
   ========================================== */

updateUIForOwner();
loadMenu();
