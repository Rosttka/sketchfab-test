// Глобальні змінні
let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

// Ініціалізація Sketchfab API
function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    const client = new Sketchfab('1.12.1', iframe);

    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function(fetchedApi) {
            api = fetchedApi;
            api.start();

            api.addEventListener('viewerready', function() {
                console.log('Sketchfab готовий');

                // Отримуємо анотації
                api.getAnnotationList(function(err, fetchedAnnotations) {
                    if (err) {
                        console.log('Помилка отримання анотацій:', err);
                        return;
                    }
                    annotations = fetchedAnnotations;
                    createCustomHotspots();
                });

                // Постійно оновлюємо позицію кастомних точок
                api.addEventListener('viewerprocess', updateHotspotsPosition);
            });
        },
        error: function() {
            console.log('Помилка API Sketchfab');
        }
    });
}

// Створення кастомних хотспотів
function createCustomHotspots() {
    annotations.forEach(annotation => {
        const hotspot = document.createElement('button');
        hotspot.className = 'custom-hotspot';
        hotspot.id = `hotspot-${annotation.index}`;
        hotspot.innerText = annotation.name;

        hotspot.onclick = function() {
            api.gotoAnnotation(annotation.index);
        };

        uiContainer.appendChild(hotspot);
    });
}

// ОНОВЛЕНА ФУНКЦІЯ — Прив’язка до annotation.position
function updateHotspotsPosition() {
    annotations.forEach(annotation => {
        api.getWorldToScreenCoordinates(annotation.position, function(err, screenCoordinates) {
            if (err) {
                console.log('Помилка координат:', err);
                return;
            }

            const hotspotElement = document.getElementById(`hotspot-${annotation.index}`);
            if (hotspotElement) {
                hotspotElement.style.left = `${screenCoordinates.x}px`;
                hotspotElement.style.top = `${screenCoordinates.y}px`;

                const isOutside =
                    screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                    screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1;

                hotspotElement.style.display = isOutside ? 'none' : 'block';
            }
        });
    });
}

// Запускаємо API після завантаження сторінки
window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
