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

    client.init(40fa706855ed407fbbd0123951988cc0, {
        success: function(fetchedApi) {
            api = fetchedApi; // Присвоюємо об'єкт API нашій глобальній змінній
            api.start();
            api.addEventListener('viewerready', function() {
                // Вікно перегляду готове, тепер ми отримуємо анотації та створюємо наш інтерфейс
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
                // При натисканні переміщуємо камеру до позиції анотації
                api.gotoAnnotation(annotation.index);

                // Наприклад, ви також можете показати тут спливаюче вікно
                // showPopup(annotation.name, annotation.content);
            };

            // Тут вам потрібно буде розрахувати позицію гарячої точки на екрані.
            // Це найскладніша частина, яка вимагає перетворення 3D-координат у 2D.
            // Наразі давайте просто додамо кнопки до контейнера.
            uiContainer.appendChild(hotspot);
        });
    });
}

// Викликаємо функцію ініціалізації, коли сторінка завантажується
window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);

// Додайте ці функції до вашого файлу script.js
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