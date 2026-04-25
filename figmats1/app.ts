interface Product {
    name: string;
    price: string;
    image: string;
    desc: string;
    date: string;
}

const loginFrom = document.getElementById('login-form') as HTMLFormElement | null;

if (loginForm) {
    loginForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        const loginInput = loginForm.querySelector('.login-input') as HTMLInputElement | null;
        const username = loginInput ? loginInput.value : 'User';

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        
        window.location.href = 'index.html';
    });
}

const productForm = document.getElementById('product-form') as HTMLFormElement | null;
if (productForm) {
    productForm.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('product-name') as HTMLInputElement | null;
        const priceInput = document.getElementById('product-price') as HTMLInputElement | null;
        const imageInput = document.getElementById('product-image') as HTMLInputElement | null;
        const descInput = document.getElementById('product-desc') as HTMLTextAreaElement | null;
        
        if (nameInput && priceInput && imageInput && descInput) {
            const newProduct: Product = {
                name: nameInput.value,
                price: priceInput.value,
                image: imageInput.value,
                desc: descInput.value,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            };
            
            const products: Product[] = JSON.parse(localStorage.getItem('products') || '[]');
            products.push(newProduct);
            localStorage.setItem('products', JSON.stringify(products));
            
            alert('Maxsulot muvaffaqiyatli qo\'shildi!');
            window.location.href = 'index.html';
        }
    });
}

const renderProducts = () => {
    const cardsContainer = document.querySelector('.cards-container');
    if (!cardsContainer) return;

    let products: any[] = [];
    try {
        products = JSON.parse(localStorage.getItem('products') || '[]');
    } catch (e) {
        console.error('Error parsing products from localStorage', e);
        return;
    }
    
    if (!Array.isArray(products)) return;
    
    products.forEach(product => {
        if (!product || typeof product.name !== 'string') return;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar">${product.name.charAt(0).toUpperCase() || '?'}</div>
                <div class="card-title-group">
                    <h3 class="card-title">${product.name}</h3>
                    <p class="card-date">${product.date || ''}</p>
                </div>
            </div>
            <img src="${product.image || 'image.png'}" alt="${product.name}" class="card-image" onerror="this.src='image.png'">
            <div class="card-content">
                <p>${product.desc || ''}</p>
            </div>
            <div class="card-footer">
                <svg viewBox="0 0 24 24" width="24" height="24" class="heart-icon">
                    <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span class="price">${(product.price || '').startsWith('$') ? product.price : '$' + (product.price || '0')}</span>
            </div>
        `;
        cardsContainer.prepend(card);
    });
};

const checkAuthState = () => {
    const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
    
    if (isIndexPage) {
        renderProducts();
        
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const addProductContainer = document.getElementById('add-product-container');
        const guestProfile = document.getElementById('guest-profile');
        const userProfile = document.getElementById('user-profile');
        
        if (isLoggedIn) {
            if (addProductContainer) addProductContainer.style.display = 'block';
            if (guestProfile) guestProfile.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'inline-block';
                const userNameSpan = userProfile.querySelector('.user-name');
                const savedUserName = localStorage.getItem('username');
                if (userNameSpan && savedUserName) {
                    userNameSpan.textContent = savedUserName;
                }
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', checkAuthState);