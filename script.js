/**
 * Buffet Elegance / Seleto Buffet - Core Application Logic
 * Clean & Organized JavaScript Module
 */

let scrollPosition = 0;
const API_URL = (window.location.port === '5000') ? '' : 'http://127.0.0.1:5000';

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

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal confirm-overlay active';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '9999';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content confirm-modal-content';

        const text = document.createElement('p');
        text.textContent = message;
        text.className = 'confirm-message';

        const btnRow = document.createElement('div');
        btnRow.className = 'confirm-btn-row';

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-outline confirm-btn-cancel';
        btnCancel.textContent = 'CANCELAR';

        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn confirm-btn-confirm';
        btnConfirm.textContent = 'EXCLUIR';

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnConfirm);
        modalContent.appendChild(text);
        modalContent.appendChild(btnRow);
        overlay.appendChild(modalContent);
        document.body.appendChild(overlay);

        const cleanup = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        btnCancel.onclick = () => {
            cleanup();
            resolve(false);
        };

        btnConfirm.onclick = () => {
            cleanup();
            resolve(true);
        };
    });
}

function updateUIForOwner() {
    const loginView = document.getElementById('loginView');
    const ownerView = document.getElementById('ownerView');
    const loggedInUser = document.getElementById('loggedInUser');
    const ownerControls = document.getElementById('ownerControls'); // Garante que pegamos os controles do cardápio

    if (isOwner) {
        // 1. MOSTRAR controles de edição do cardápio
        if (ownerControls) {
            ownerControls.classList.remove('display-none'); // ← REMOVE a classe que esconde
            ownerControls.style.display = 'flex';           // ← Força a exibição
        }

        // 1b. MOSTRAR painel admin da galeria (se estiver na página da galeria)
        const galleryAdminPanel = document.getElementById('galleryAdminPanel');
        if (galleryAdminPanel) {
            galleryAdminPanel.classList.remove('display-none');
            galleryAdminPanel.style.display = 'block';
        }
        
        // 2. Atualizar botão do header
        if (openLogin) {
            const span = openLogin.querySelector('span');
            if (span) span.textContent = 'Painel';
            openLogin.classList.add('admin-active');
        }
        
        // 3. Trocar a visão do modal de login para a visão de proprietário
        if (loginView) {
            loginView.style.display = 'none';
            loginView.classList.add('display-none');
        }
        if (ownerView) {
            ownerView.style.display = 'block';
            ownerView.classList.remove('display-none');
        }
        if (loggedInUser) loggedInUser.textContent = localStorage.getItem('ownerUser') || 'Proprietário';
        
    } else {
        // 1. ESCONDER controles de edição do cardápio
        if (ownerControls) {
            ownerControls.classList.add('display-none');    // ← ADICIONA a classe que esconde
            ownerControls.style.display = 'none';           // ← Força a ocultação
        }

        // 1b. ESCONDER painel admin da galeria
        const galleryAdminPanel = document.getElementById('galleryAdminPanel');
        if (galleryAdminPanel) {
            galleryAdminPanel.classList.add('display-none');
            galleryAdminPanel.style.display = 'none';
        }
        
        // 2. Atualizar botão do header
        if (openLogin) {
            const span = openLogin.querySelector('span');
            if (span) span.textContent = 'Login';
            openLogin.classList.remove('admin-active');
        }
        
        // 3. Trocar a visão do modal de volta para o formulário de login
        if (loginView) {
            loginView.style.display = 'block';
            loginView.classList.remove('display-none');
        }
        if (ownerView) {
            ownerView.style.display = 'none';
            ownerView.classList.add('display-none');
        }
    }
}

function lockScroll() {
    scrollPosition = window.scrollY || window.pageYOffset;
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

function unlockScroll() {
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

        // Esconde a mensagem de erro anterior ao tentar logar
        if (loginError) {
            loginError.style.display = 'none';
            loginError.classList.add('display-none');
            loginError.textContent = '';
        }

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
                
                // Fecha o modal e destrava a rolagem da página
                if (loginModal) loginModal.style.display = 'none';
                unlockScroll();
                
                if (loginError) loginError.style.display = 'none';
                loginForm.reset();
            } else {
                // MOSTRA a mensagem de erro (remove a classe display-none)
                if (loginError) {
                    loginError.textContent = data.message || 'Usuário ou senha inválidos';
                    loginError.classList.remove('display-none'); // ← REMOVE a classe que esconde
                    loginError.style.display = 'block';           // ← Força a exibição
                }
            }
        } catch (error) {
            // MOSTRA mensagem de erro de conexão
            if (loginError) {
                loginError.textContent = 'Erro ao conectar ao servidor. Tente novamente mais tarde.';
                loginError.classList.remove('display-none'); // ← REMOVE a classe que esconde
                loginError.style.display = 'block';           // ← Força a exibição
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

function renderMenu(items) {
    if (!menuContainer) return;

    // Mapa ordenado: preserva a ordem de chegada das categorias do banco
    const categoryMap = new Map();
    items.forEach(item => {
        if (!categoryMap.has(item.categoria)) {
            categoryMap.set(item.categoria, []);
        }
        categoryMap.get(item.categoria).push(item);
    });

    menuContainer.innerHTML = '';
    categoryMap.forEach((catItems, key) => {
        // Capitaliza o nome: "pratos_principais" → "Pratos Principais"
        const title = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const section = document.createElement('div');
        section.className = 'menu-category';
        section.setAttribute('data-cat', key);
        section.innerHTML = `
            <h3>${title.toUpperCase()}</h3>
            ${getDividerSvg(key)}
            <ul class="menu-list" data-category="${key}">
                ${catItems.map(item => `
                    <li>
                        <span class="item-name">${item.nome}</span>
                        <p class="item-desc">${item.descricao}</p>
                    </li>
                `).join('')}
            </ul>
        `;
        menuContainer.appendChild(section);
    });
}

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

        // Mostra o botão SALVAR
        if (saveMenuBtn) {
            saveMenuBtn.classList.remove('display-none');
            saveMenuBtn.style.display = 'inline-block';
        }

        // Mostra o botão CANCELAR
        if (cancelEditBtn) {
            cancelEditBtn.classList.remove('display-none');
            cancelEditBtn.style.display = 'inline-block';
        }

        // Transforma os itens do cardápio em campos editáveis
        const items = menuContainer.querySelectorAll('li');
        items.forEach(li => {
            const name = li.querySelector('.item-name').textContent;
            const desc = li.querySelector('.item-desc').textContent;
            li.innerHTML = `
                <div class="edit-item-row">
                    <input type="text" class="edit-input name-input" placeholder="Nome do prato" value="${name}">
                    <button type="button" class="btn-remove-item" title="Remover item">✕</button>
                </div>
                <textarea class="edit-textarea desc-input" placeholder="Descrição">${desc}</textarea>
            `;
            li.querySelector('.btn-remove-item').addEventListener('click', () => li.remove());
        });

        // Adiciona botão "+ Adicionar Item" em cada categoria existente
        menuContainer.querySelectorAll('.menu-category').forEach(catDiv => {
            const catKey = catDiv.getAttribute('data-cat');
            const list = catDiv.querySelector('.menu-list');
            if (!list) return;

            // Botão de remover a categoria inteira
            const catHeader = catDiv.querySelector('h3');
            if (catHeader && !catDiv.querySelector('.btn-remove-topic')) {
                const removeTopicBtn = document.createElement('button');
                removeTopicBtn.type = 'button';
                removeTopicBtn.className = 'btn-remove-topic';
                removeTopicBtn.title = 'Remover tópico';
                removeTopicBtn.textContent = '✕ Remover tópico';
                removeTopicBtn.addEventListener('click', async () => {
                    if (await showCustomConfirm(`Remover o tópico "${catHeader.textContent}" e todos os seus itens?`)) {
                        catDiv.remove();
                    }
                });
                catHeader.insertAdjacentElement('afterend', removeTopicBtn);
            }

            if (!catDiv.querySelector('.btn-add-item')) {
                const addItemBtn = document.createElement('button');
                addItemBtn.type = 'button';
                addItemBtn.className = 'btn-add-item';
                addItemBtn.textContent = '+ Adicionar Item';
                addItemBtn.addEventListener('click', () => addNewItem(list, catKey));
                catDiv.appendChild(addItemBtn);
            }
        });

        // Botão global "+ Novo Tópico"
        if (!menuContainer.querySelector('.btn-add-topic')) {
            const addTopicBtn = document.createElement('button');
            addTopicBtn.type = 'button';
            addTopicBtn.className = 'btn-add-topic';
            addTopicBtn.textContent = '+ Novo Tópico';
            addTopicBtn.addEventListener('click', addNewTopic);
            menuContainer.appendChild(addTopicBtn);
        }
    };
}

/**
 * Insere um novo <li> em branco em uma lista de categoria.
 */
function addNewItem(list, catKey) {
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="edit-item-row">
            <input type="text" class="edit-input name-input" placeholder="Nome do prato">
            <button type="button" class="btn-remove-item" title="Remover item">✕</button>
        </div>
        <textarea class="edit-textarea desc-input" placeholder="Descrição"></textarea>
    `;
    li.querySelector('.btn-remove-item').addEventListener('click', () => li.remove());
    list.appendChild(li);
    li.querySelector('.name-input').focus();
}

/**
 * Cria um novo bloco de tópico/categoria com nome editável.
 */
function addNewTopic() {
    // Remove o botão "+ Novo Tópico" temporariamente (será re-adicionado ao final)
    const existingTopicBtn = menuContainer.querySelector('.btn-add-topic');
    if (existingTopicBtn) existingTopicBtn.remove();

    // Gera uma chave única para a categoria (usada como data-category)
    const catKey = 'topico_' + Date.now();

    const catDiv = document.createElement('div');
    catDiv.className = 'menu-category';
    catDiv.setAttribute('data-cat', catKey);
    catDiv.innerHTML = `
        <div class="new-topic-header">
            <input type="text" class="edit-input topic-name-input" placeholder="Nome do tópico (ex: Bebidas)">
            <button type="button" class="btn-remove-topic" title="Remover tópico">✕ Remover tópico</button>
        </div>
        <div class="category-divider">
            <svg viewBox="0 0 200 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="5" x2="200" y2="5" stroke="#b8860b" stroke-width="1" opacity="0.6"/>
            </svg>
        </div>
        <ul class="menu-list" data-category="${catKey}"></ul>
    `;

    // Sincroniza o input do nome do tópico com o data-category em tempo real
    const topicNameInput = catDiv.querySelector('.topic-name-input');
    topicNameInput.addEventListener('input', () => {
        const slug = topicNameInput.value.trim().toLowerCase().replace(/\s+/g, '_') || catKey;
        catDiv.setAttribute('data-cat', slug);
        catDiv.querySelector('.menu-list').setAttribute('data-category', slug);
    });

    // Botão de remover o tópico
    catDiv.querySelector('.btn-remove-topic').addEventListener('click', async () => {
        if (await showCustomConfirm('Remover este tópico e todos os seus itens?')) catDiv.remove();
    });

    menuContainer.appendChild(catDiv);

    // Adiciona botão "+" ao novo tópico
    const list = catDiv.querySelector('.menu-list');
    const addItemBtn = document.createElement('button');
    addItemBtn.type = 'button';
    addItemBtn.className = 'btn-add-item';
    addItemBtn.textContent = '+ Adicionar Item';
    addItemBtn.addEventListener('click', () => addNewItem(list, catDiv.getAttribute('data-cat')));
    catDiv.appendChild(addItemBtn);

    // Re-adiciona o botão global "+ Novo Tópico" ao final
    const newTopicBtn = document.createElement('button');
    newTopicBtn.type = 'button';
    newTopicBtn.className = 'btn-add-topic';
    newTopicBtn.textContent = '+ Novo Tópico';
    newTopicBtn.addEventListener('click', addNewTopic);
    menuContainer.appendChild(newTopicBtn);

    topicNameInput.focus();
}

if (cancelEditBtn) {
    cancelEditBtn.onclick = () => {
        menuModal.classList.remove('editing');
        
        // Mostra o botão EDITAR novamente
        if (editMenuBtn) editMenuBtn.style.display = 'inline-block';
        
        // Esconde SALVAR e CANCELAR (readiciona a classe que esconde)
        if (saveMenuBtn) {
            saveMenuBtn.style.display = 'none';
            saveMenuBtn.classList.add('display-none');
        }
        if (cancelEditBtn) {
            cancelEditBtn.style.display = 'none';
            cancelEditBtn.classList.add('display-none');
        }
        
        loadMenu(); // Recarrega o cardápio original
    };
}

if (saveMenuBtn) {
    saveMenuBtn.onclick = async () => {
        const updatedItems = [];
        const categories = menuContainer.querySelectorAll('.menu-list');

        categories.forEach(catList => {
            // Para tópicos novos, o nome vem do input; para existentes, vem do data-category
            const catDiv = catList.closest('.menu-category');
            const topicNameInput = catDiv ? catDiv.querySelector('.topic-name-input') : null;
            const categorySlug = topicNameInput
                ? (topicNameInput.value.trim().toLowerCase().replace(/\s+/g, '_') || catList.dataset.category)
                : catList.dataset.category;

            const items = catList.querySelectorAll('li');
            items.forEach(li => {
                const nameInput = li.querySelector('.name-input');
                const descInput = li.querySelector('.desc-input');
                if (nameInput && descInput && nameInput.value.trim()) {
                    updatedItems.push({
                        categoria: categorySlug,
                        nome: nameInput.value.trim(),
                        descricao: descInput.value.trim()
                    });
                }
            });
        });

        // Valida que há pelo menos um item para salvar
        if (updatedItems.length === 0) {
            showMenuFeedback('Adicione pelo menos um item com nome antes de salvar.', true);
            return;
        }

        // Valida que todos os tópicos novos têm nome
        const unnamedTopics = [...menuContainer.querySelectorAll('.topic-name-input')]
            .filter(inp => !inp.value.trim());
        if (unnamedTopics.length > 0) {
            unnamedTopics[0].focus();
            showMenuFeedback('Preencha o nome de todos os novos tópicos antes de salvar.', true);
            return;
        }

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

                // Reseta os botões para o estado normal
                if (editMenuBtn) editMenuBtn.style.display = 'inline-block';

                if (saveMenuBtn) {
                    saveMenuBtn.style.display = 'none';
                    saveMenuBtn.classList.add('display-none');
                }
                if (cancelEditBtn) {
                    cancelEditBtn.style.display = 'none';
                    cancelEditBtn.classList.add('display-none');
                }

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
        updateUIForOwner();
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

const panelGalleryBtn = document.getElementById('panelGalleryBtn');
if (panelGalleryBtn) {
    panelGalleryBtn.onclick = function (e) {
        e.preventDefault();
        if (loginModal) loginModal.style.display = 'none';
        unlockScroll();
        window.location.href = 'galeria.html';
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
    const galleryLightbox = document.getElementById('galleryLightbox');
    if (event.target === galleryLightbox) {
        galleryLightbox.classList.remove('active');
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

/* ==========================================
   Header Animation (ONLY ON PAGE LOAD)
   ========================================== */

function animarElementosHeader() {
    const elementos = document.querySelectorAll('.header-element, .header-logo');
    
    elementos.forEach((el, index) => {
        el.style.animation = 'none';
        void el.offsetWidth; // Força o reflow
        
        setTimeout(() => {
            if (el.classList.contains('header-logo')) {
                el.style.animation = 'fadeInScale 0.8s ease-out forwards';
            } else {
                el.style.animation = `fadeInUp 0.6s ease-out forwards`;
            }
        }, index * 100);
    });
}

// ÚNICO gatilho da animação: quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(animarElementosHeader, 100);
});

/* ==========================================
   Scroll Indicator Hiding Logic
   ========================================== */

function setupScrollIndicators() {
    const heroIndicator = document.querySelector('.hero-scroll-indicator');
    const menuIndicator = document.querySelector('.menu-scroll-indicator');

    // Ao rolar a página principal, esconde o indicador do hero permanentemente
    if (heroIndicator) {
        const handleWindowScroll = () => {
            if (window.scrollY > 10) {
                heroIndicator.classList.add('is-scrolling');
                window.removeEventListener('scroll', handleWindowScroll);
            }
        };
        window.addEventListener('scroll', handleWindowScroll, { passive: true });
    }

    // Ao rolar o modal do cardápio, esconde o indicador do cardápio permanentemente
    const menuModalContent = document.querySelector('.menu-modal-content');
    if (menuModalContent && menuIndicator) {
        const handleModalScroll = () => {
            if (menuModalContent.scrollTop > 10) {
                menuIndicator.classList.add('is-scrolling');
                menuModalContent.removeEventListener('scroll', handleModalScroll);
            }
        };
        menuModalContent.addEventListener('scroll', handleModalScroll, { passive: true });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupScrollIndicators();
    setupGallery();
});

/* ==========================================
   Gallery Interactive Logic (Filters, Lightbox & Admin)
   ========================================== */

let galleryCurrentFilter = 'all';
let galleryAllPhotos = [];

const CATEGORY_LABELS = {
    pratos: 'Gastronomia',
    eventos: 'Eventos',
    decoracao: 'Decoração'
};

async function loadGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;

    try {
        const response = await fetch(`${API_URL}/api/galeria`);
        const fotos = await response.json();

        galleryAllPhotos = Array.isArray(fotos) ? fotos : [];
        renderGallery(galleryAllPhotos);
    } catch (error) {
        console.error('Erro ao carregar galeria:', error);
        const loadingMsg = document.getElementById('galleryLoadingMsg');
        if (loadingMsg) {
            loadingMsg.innerHTML = '<div class="gallery-empty-icon">⚠️</div><p>Erro ao carregar a galeria.</p>';
        }
    }
}

function renderGallery(fotos) {
    const galleryGrid = document.getElementById('galleryGrid');
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    if (!galleryGrid) return;

    // Filter photos by current active filter
    const filtered = galleryCurrentFilter === 'all'
        ? fotos
        : fotos.filter(f => f.categoria === galleryCurrentFilter);

    galleryGrid.innerHTML = '';

    if (filtered.length === 0) {
        galleryGrid.innerHTML = `
            <div class="gallery-empty-msg">
                <div class="gallery-empty-icon">🖼️</div>
                <p>${fotos.length === 0 ? 'Nenhuma foto adicionada à galeria ainda.' : 'Nenhuma foto nesta categoria.'}</p>
            </div>
        `;
        return;
    }

    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');

    filtered.forEach(foto => {
        const imgUrl = `${API_URL}/imagens/galeria/${foto.filename}`;
        const label = CATEGORY_LABELS[foto.categoria] || foto.categoria;

        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.setAttribute('data-category', foto.categoria);
        item.setAttribute('data-id', foto.id);

        item.innerHTML = `
            <img src="${imgUrl}" alt="${foto.titulo}" loading="lazy">
            <div class="gallery-overlay">
                <div class="gallery-info">
                    <span class="gallery-tag">${label}</span>
                    <h3>${foto.titulo}</h3>
                </div>
                <span class="gallery-zoom-icon">🔍</span>
            </div>
            ${isOwner ? `<button class="gallery-delete-btn" data-id="${foto.id}" title="Excluir foto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                </svg>
            </button>` : ''}
        `;

        // Lightbox click (only on non-delete areas)
        item.addEventListener('click', (e) => {
            if (e.target.closest('.gallery-delete-btn')) return;
            if (lightbox && lightboxImg) {
                lightboxImg.src = imgUrl;
                if (lightboxTitle) lightboxTitle.textContent = foto.titulo || '';
                if (lightboxDesc) lightboxDesc.textContent = foto.descricao || '';
                lightbox.classList.add('active');
            }
        });

        // Delete button
        if (isOwner) {
            const deleteBtn = item.querySelector('.gallery-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await showCustomConfirm(`Tem certeza que deseja excluir a foto "${foto.titulo}"?`);
                    if (!confirmed) return;

                    try {
                        const token = localStorage.getItem('ownerToken');
                        const res = await fetch(`${API_URL}/api/galeria/${foto.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': token }
                        });
                        const data = await res.json();
                        if (data.success) {
                            showGalleryFeedback('Foto excluída com sucesso!', false);
                            await loadGallery();
                        } else {
                            showGalleryFeedback('Erro ao excluir: ' + data.message, true);
                        }
                    } catch (err) {
                        showGalleryFeedback('Erro de conexão ao excluir.', true);
                    }
                });
            }
        }

        galleryGrid.appendChild(item);
    });

    // Re-attach lightbox close button
    const closeLightbox = document.getElementById('closeLightbox');
    if (closeLightbox && lightbox) {
        closeLightbox.onclick = () => lightbox.classList.remove('active');
    }
}

function showGalleryFeedback(message, isError = false) {
    const fb = document.getElementById('galleryUploadFeedback');
    if (!fb) return;
    fb.textContent = message;
    fb.className = `gallery-upload-feedback ${isError ? 'error' : 'success'}`;
    fb.classList.remove('display-none');
    fb.style.display = 'block';
    setTimeout(() => {
        fb.style.display = 'none';
        fb.classList.add('display-none');
    }, 5000);
}

function setupGallery() {
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    const lightbox = document.getElementById('galleryLightbox');
    const closeLightbox = document.getElementById('closeLightbox');

    // 1. Filtros
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            galleryCurrentFilter = btn.getAttribute('data-filter');
            renderGallery(galleryAllPhotos);
        });
    });

    // 2. Lightbox close
    if (closeLightbox && lightbox) {
        closeLightbox.addEventListener('click', () => lightbox.classList.remove('active'));
    }

    // 3. Upload form
    const uploadForm = document.getElementById('galleryUploadForm');
    const fotoFile = document.getElementById('fotoFile');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const filePreviewImg = document.getElementById('filePreviewImg');
    const fileDropText = document.getElementById('fileDropText');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const dropZone = document.getElementById('dropZone');

    if (fotoFile) {
        fotoFile.addEventListener('change', () => {
            const file = fotoFile.files[0];
            if (file) showFilePreview(file);
        });
    }

    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', () => {
            if (fotoFile) fotoFile.value = '';
            if (filePreviewContainer) {
                filePreviewContainer.classList.add('display-none');
                filePreviewContainer.style.display = 'none';
            }
            if (fileDropText) fileDropText.textContent = 'Clique para selecionar ou arraste uma foto aqui';
        });
    }

    // Drag & Drop
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && fotoFile) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fotoFile.files = dt.files;
                showFilePreview(file);
            }
        });
    }

    function showFilePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (filePreviewImg) filePreviewImg.src = e.target.result;
            if (filePreviewContainer) {
                filePreviewContainer.classList.remove('display-none');
                filePreviewContainer.style.display = 'flex';
            }
            if (fileDropText) fileDropText.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const titulo = document.getElementById('fotoTitulo')?.value.trim();
            const descricao = document.getElementById('fotoDescricao')?.value.trim();
            const categoria = document.getElementById('fotoCategoria')?.value;
            const file = fotoFile?.files[0];

            if (!titulo) { showGalleryFeedback('Preencha o título da foto.', true); return; }
            if (!file) { showGalleryFeedback('Selecione uma foto para enviar.', true); return; }

            const formData = new FormData();
            formData.append('foto', file);
            formData.append('titulo', titulo);
            formData.append('descricao', descricao || '');
            formData.append('categoria', categoria);

            const uploadBtn = document.getElementById('galleryUploadBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'ENVIANDO...';
            }

            try {
                const token = localStorage.getItem('ownerToken');
                const res = await fetch(`${API_URL}/api/galeria/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    showGalleryFeedback('✅ Foto adicionada com sucesso!', false);
                    uploadForm.reset();
                    if (fotoFile) fotoFile.value = '';
                    if (filePreviewContainer) {
                        filePreviewContainer.classList.add('display-none');
                        filePreviewContainer.style.display = 'none';
                    }
                    if (fileDropText) fileDropText.textContent = 'Clique para selecionar ou arraste uma foto aqui';
                    galleryCurrentFilter = 'all';
                    document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
                    const allBtn = document.querySelector('.gallery-filter-btn[data-filter="all"]');
                    if (allBtn) allBtn.classList.add('active');
                    await loadGallery();
                } else {
                    showGalleryFeedback('Erro: ' + data.message, true);
                }
            } catch (err) {
                showGalleryFeedback('Erro de conexão. Tente novamente.', true);
            } finally {
                if (uploadBtn) {
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ADICIONAR FOTO À GALERIA`;
                }
            }
        });
    }
}

/* ==========================================
   Initialization
   ========================================== */

updateUIForOwner();
loadMenu();
loadGallery();