// Глобальні змінні
let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

// Ініціалізація Sketchfab Viewer API
function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    const client = new Sketchfab('1.12.1', iframe);

    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function(fetchedApi) {
            api = fetchedApi;
            api.start();

            api.addEventListener('viewerready', function() {
                // Отримуємо список анотацій
                api.getAnnotationList(function(err, fetchedAnnotations) {
                    if (err) {
                        console.error('Помилка отримання анотацій:', err);
                        return;
                    }

                    annotations = fetchedAnnotations;
                    createCustomHotspots();
                });

                // Оновлюємо позиції на кожному кадрі
                api.addEventListener('frameUpdate', updateHotspotsPosition);
            });
        },
        error: function() {
            console.error('Помилка API Sketchfab');
        },
        transparent: 1 // залишено про всяк випадок
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

// Оновлення позицій кастомних хотспотів на екрані
function updateHotspotsPosition() {
    annotations.forEach(annotation => {
        const hotspotElement = document.getElementById(`hotspot-${annotation.index}`);
        if (!hotspotElement) return;

        // Важливо: використовуємо annotation.position, а не eye
        api.getWorldToScreenCoordinates(annotation.position, function(err, screenCoordinates) {
            if (err) {
                console.error('Координати не отримано:', err);
                return;
            }

            // Позиціонуємо елемент
            hotspotElement.style.left = `${screenCoordinates.x}px`;
            hotspotElement.style.top = `${screenCoordinates.y}px`;

            // Ховаємо, якщо за межами екрану
            if (screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1) {
                hotspotElement.style.display = 'none';
            } else {
                hotspotElement.style.display = 'block';
            }
        });
    });
}

// Старт
window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
