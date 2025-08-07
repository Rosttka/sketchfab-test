let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    const client = new Sketchfab('1.12.1', iframe);

    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function (fetchedApi) {
            api = fetchedApi;
            api.start();

            api.addEventListener('viewerready', function () {
                console.log('✅ Sketchfab готовий');

                api.getAnnotationList(function (err, fetchedAnnotations) {
                    if (err) {
                        console.error('❌ Помилка отримання анотацій:', err);
                        return;
                    }

                    annotations = fetchedAnnotations;
                    console.log('✅ Отримано анотації:', annotations);
                    createCustomHotspots();
                });

                // Додай лог на кожне оновлення
                api.addEventListener('viewerprocess', () => {
                    console.log('🔄 Оновлення позицій хотспотів...');
                    updateHotspotsPosition();
                });
            });
        },
        error: function () {
            console.error('❌ Помилка ініціалізації API Sketchfab');
        }
    });
}

function createCustomHotspots() {
    annotations.forEach((annotation, i) => {
        const hotspot = document.createElement('button');
        hotspot.className = 'custom-hotspot';
        hotspot.id = `hotspot-${i}`;
        hotspot.innerText = annotation.name || `Hotspot ${i+1}`;

        hotspot.onclick = function () {
            console.log(`👉 Перехід до анотації #${i}`);
            api.gotoAnnotation(i);
        };

        uiContainer.appendChild(hotspot);
    });

    console.log('✅ Кастомні хотспоти створені');
}

function updateHotspotsPosition() {
    annotations.forEach((annotation, i) => {
        if (!annotation.position) {
            console.warn('⚠️ Анотація не має position:', annotation);
            return;
        }

        const pos = Array.isArray(annotation.position)
            ? { x: annotation.position[0], y: annotation.position[1], z: annotation.position[2] }
            : annotation.position;

        console.log('Позиція анотації:', pos);
        api.getWorldToScreenCoordinates(pos, function (err, screenCoordinates) {
            if (err || !screenCoordinates || typeof screenCoordinates.x !== 'number' || typeof screenCoordinates.y !== 'number') {
                console.error(`❌ Помилка getWorldToScreenCoordinates для анотації #${i}:`, err || screenCoordinates);
                return;
            }

            // Додаємо лог координат
            console.log(`hotspot-${i}:`, screenCoordinates.x, screenCoordinates.y);

            const iframeRect = document.getElementById('api-frame').getBoundingClientRect();
            const hotspotElement = document.getElementById(`hotspot-${i}`);
            if (hotspotElement) {
                hotspotElement.style.left = `${screenCoordinates.x + iframeRect.left}px`;
                hotspotElement.style.top = `${screenCoordinates.y + iframeRect.top}px`;

                const isOutside =
                    screenCoordinates.viewport &&
                    (screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                     screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1);

                hotspotElement.style.display = isOutside ? 'none' : 'block';
            } else {
                console.warn(`⚠️ DOM-елемент hotspot-${i} не знайдено`);
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
