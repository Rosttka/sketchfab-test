// Глобальні змінні
let api;
let annotations = []; // Будемо зберігати дані анотацій тут
const uiContainer = document.getElementById('ui-elements');

// Ця функція ініціалізує вікно перегляду Sketchfab та налаштовує API
function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    // ВАЖЛИВО: замініть '1.0.0' на '1.12.1' для доступу до новіших функцій API
    const client = new Sketchfab('1.12.1', iframe);

    // НЕ ЗАБУДЬТЕ замінити YOUR_MODEL_ID на ID вашої моделі
    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function(fetchedApi) {
            api = fetchedApi;
            api.start();
            api.addEventListener('viewerready', function() {
                // Вікно перегляду готове, отримуємо анотації
                api.getAnnotationList(function(err, fetchedAnnotations) {
                    if (err) {
                        console.log('Помилка отримання анотацій:', err);
                        return;
                    }
                    annotations = fetchedAnnotations;
                    createCustomHotspots();
                });

                // Додаємо слухача, який буде оновлювати позиції на кожному кадрі
                api.addEventListener('viewerprocess', updateHotspotsPosition);
            });
        },
        error: function() {
            console.log('Помилка API Sketchfab');
        }
    });
}

// Ця функція створює HTML-елементи для наших гарячих точок
function createCustomHotspots() {
    annotations.forEach(annotation => {
        // Створюємо кнопку
        const hotspot = document.createElement('button');
        hotspot.className = 'custom-hotspot';
        // Даємо кожній кнопці унікальний ID, щоб потім її знаходити
        hotspot.id = `hotspot-${annotation.index}`;
        hotspot.innerText = annotation.name;

        // Додаємо дію при кліку
        hotspot.onclick = function() {
            api.gotoAnnotation(annotation.index);
            // Тут можна викликати функцію для показу попапу
            // showPopup(annotation.name, annotation.content.raw);
        };

        // Додаємо кнопку до нашого контейнера
        uiContainer.appendChild(hotspot);
    });
}

// Ця функція оновлює позиції гарячих точок на екрані
function updateHotspotsPosition() {
    annotations.forEach(annotation => {
        // Отримуємо 2D координати для 3D точки
        api.getWorldToScreenCoordinates(annotation.eye, function(err, screenCoordinates) {
            if (err) {
                console.log('Помилка отримання координат:', err);
                return;
            }

            const hotspotElement = document.getElementById(`hotspot-${annotation.index}`);
            if (hotspotElement) {
                // screenCoordinates.x та screenCoordinates.y - це позиції в пікселях
                hotspotElement.style.left = `${screenCoordinates.x}px`;
                hotspotElement.style.top = `${screenCoordinates.y}px`;

                // Перевіряємо, чи точка не за межами екрану
                if (screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                    screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1) {
                    hotspotElement.style.display = 'none'; // Ховаємо, якщо за екраном
                } else {
                    hotspotElement.style.display = 'block'; // Показуємо, якщо в межах екрану
                }
            }
        });
    });
}


// Викликаємо функцію ініціалізації, коли сторінка завантажується
window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);

/*
// --- Функції для попапів (якщо вони вам потрібні) ---
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
*/