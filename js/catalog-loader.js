// Mapeo de categorías a archivos CSV
const categoryFiles = {
    'gamer': 'catalogo/gamer.csv',
    'hardware': 'catalogo/hardware.csv',
    'pc': 'catalogo/pc.csv',
    'perifericos': 'catalogo/perifericos.csv',
    'imagen-audio': 'catalogo/imagen-audio.csv',
    'impresion': 'catalogo/impresion.csv',
    'conectividad': 'catalogo/conectividad.csv',
    'seguridad': 'catalogo/seguridad.csv',
    'energia': 'catalogo/energia.csv',
    'movil': 'catalogo/movil.csv',
    'equipaje': 'catalogo/equipaje.csv',
    'hogar': 'catalogo/hogar.csv'
};

// Función para parsear CSV con soporte para comillas
function parseCSV(csvText) {
    // Eliminar BOM si está presente
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
    }

    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : '';
        });
        return obj;
    }).filter(obj => obj.name && obj.name !== ''); // Filtrar líneas vacías
}

// Función auxiliar para parsear una línea de CSV con comillas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

// Función para cargar un archivo CSV
async function loadCSV(category) {
    const filePath = categoryFiles[category];
    if (!filePath) return [];

    try {
        const response = await fetch(filePath);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error(`Error loading CSV for ${category}:`, error);
        return [];
    }
}

// Función para crear tarjeta de producto
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Obtener precio formateado
    const price = parseFloat(product.price) || 0;
    const formattedPrice = price > 0 ? `$${price}` : 'Consultar';

    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect width=\\'18\\' height=\\'12\\' x=\\'3\\' y=\\'4\\' rx=\\'2\\' ry=\\'2\\'></rect><line x1=\\'2\\' x2=\\'22\\' y1=\\'20\\' y2=\\'20\\'></line></svg>'">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-brand">${product.brand || ''}</p>
            <p class="product-price">${formattedPrice}</p>
            <p class="product-description">${product.description || ''}</p>
        </div>
    `;

    return card;
}

// Función para cargar productos de una categoría con paginación
async function loadCategoryProducts(category, offset = 0, limit = 30) {
    console.log(`Cargando productos para categoría: ${category}, offset: ${offset}, limit: ${limit}`);
    const products = await loadCSV(category);
    console.log(`Productos cargados para ${category}:`, products.length);

    const section = document.getElementById(category);

    if (!section) {
        console.error(`No se encontró la sección para categoría: ${category}`);
        return { products: [], total: 0 };
    }

    const grid = section.querySelector('.products-grid');
    if (!grid) {
        console.error(`No se encontró el grid para categoría: ${category}`);
        return { products: [], total: 0 };
    }

    // Si es la primera carga (offset 0), limpiar el grid
    if (offset === 0) {
        grid.innerHTML = '';
    }

    // Obtener productos paginados
    const paginatedProducts = products.slice(offset, offset + limit);

    // Agregar nuevos productos
    paginatedProducts.forEach((product, index) => {
        console.log(`Procesando producto ${offset + index + 1}:`, product.name);
        const card = createProductCard(product);
        grid.appendChild(card);
    });

    // Actualizar contador de productos
    const countElement = section.querySelector('.product-count');
    if (countElement) {
        countElement.textContent = `${products.length} productos`;
    }

    console.log(`Categoría ${category} completada con ${paginatedProducts.length} productos (total: ${products.length})`);

    return { products: paginatedProducts, total: products.length };
}

// Estado para el scroll infinito
let currentCategory = null;
let currentOffset = 0;
let isLoading = false;
let hasMoreProducts = true;
const PRODUCTS_PER_PAGE = 30;

// Función para cargar todas las categorías
async function loadAllCategories() {
    // Ya no cargamos todas las categorías automáticamente
    console.log('Sistema de carga bajo demanda iniciado');
}

// Función para cargar más productos al hacer scroll
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts || !currentCategory) {
        return;
    }

    isLoading = true;
    console.log(`Cargando más productos para ${currentCategory}, offset: ${currentOffset}`);

    const result = await loadCategoryProducts(currentCategory, currentOffset, PRODUCTS_PER_PAGE);

    currentOffset += result.products.length;
    hasMoreProducts = currentOffset < result.total;
    isLoading = false;

    console.log(`Productos cargados: ${result.products.length}, Total cargado: ${currentOffset}, Total disponible: ${result.total}, Hay más: ${hasMoreProducts}`);
}

// Función para inicializar una categoría específica
async function initializeCategory(category) {
    console.log(`Inicializando categoría: ${category}`);

    // Resetear estado
    currentCategory = category;
    currentOffset = 0;
    isLoading = false;
    hasMoreProducts = true;

    // Cargar primeros 30 productos
    await loadCategoryProducts(category, 0, PRODUCTS_PER_PAGE);
    currentOffset = PRODUCTS_PER_PAGE;
}

// Event listener para scroll infinito
window.addEventListener('scroll', () => {
    if (!currentCategory) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    // Cargar más productos cuando estemos a 200px del final
    if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreProducts();
    }
});

// Cargar productos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    loadAllCategories();
});