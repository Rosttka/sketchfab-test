// Ця функція буде запускатися нашими кнопками для зміни кольору
function changeBackgroundColor(color) {
    document.body.style.backgroundColor = color;
}

// Глобальна змінна для API Sketchfab
let api;

// Ця функція ініціалізує вікно перегляду Sketchfab та налаштовує API
function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    const client = new Sketchfab('1.0.0', iframe);

    // Зверніть увагу: ідентифікатор моделі має бути в лапках
    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function(fetchedApi) {
            api = fetchedApi;
            api.start();
            api.addEventListener('viewerready', function() {
                setupHotspots();
            });
        },
        error: function() {
            console.log('Помилка API Sketchfab');
        }
    });
}

// Ця функція отримує дані анотацій та створює власні гарячі точки
function setupHotspots() {
    api.getAnnotationList(function(err, annotations) {
        if (err) {
            console.log('Помилка отримання анотацій:', err);
            return;
        }

        const uiContainer = document.getElementById('ui-elements');
        annotations.forEach(annotation => {
            const hotspot = document.createElement('button');
            hotspot.className = 'custom-hotspot';
            hotspot.innerText = annotation.name;
            hotspot.onclick = function() {
                api.gotoAnnotation(annotation.index);
                // Тут можна додати логіку для спливаючого вікна
                // showPopup(annotation.name, annotation.content);
            };

            // Додаємо кнопку до контейнера
            uiContainer.appendChild(hotspot);
        });
    });
}

// Додаємо функції для керування спливаючим вікном
function showPopup(title, content) {
    const popup = document.getElementById('info-popup');
    const titleElement = document.getElementById('popup-title');
    const contentElement = document.getElementById('popup-content');

    titleElement.innerText = title;
    contentElement.innerText = content;
    popup.style.display = 'block';
}

function hidePopup() {
    const popup = document.getElementById('info-popup');
    popup.style.display = 'none';
}

// Викликаємо функцію ініціалізації, коли сторінка завантажується
window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
