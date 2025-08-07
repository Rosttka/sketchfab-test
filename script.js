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
    annotations.forEach(annotation => {
        const hotspot = document.createElement('button');
        hotspot.className = 'custom-hotspot';
        hotspot.id = `hotspot-${annotation.index}`;
        hotspot.innerText = annotation.name;

        hotspot.onclick = function () {
            console.log(`👉 Перехід до анотації #${annotation.index}`);
            api.gotoAnnotation(annotation.index);
        };

        uiContainer.appendChild(hotspot);
    });

    console.log('✅ Кастомні хотспоти створені');
}

function updateHotspotsPosition() {
    annotations.forEach(annotation => {
        if (!annotation.position) {
            console.warn('⚠️ Анотація не має position:', annotation);
            return;
        }

        console.log(`📌 Анотація #${annotation.index} — позиція:`, annotation.position);

        api.getWorldToScreenCoordinates(annotation.position, function (err, screenCoordinates) {
            if (err) {
                console.error(`❌ Помилка getWorldToScreenCoordinates для анотації #${annotation.index}:`, err);
                return;
            }

            console.log(`📐 2D координати для анотації #${annotation.index}:`, screenCoordinates);

            const hotspotElement = document.getElementById(`hotspot-${annotation.index}`);
            if (hotspotElement) {
                hotspotElement.style.left = `${screenCoordinates.x}px`;
                hotspotElement.style.top = `${screenCoordinates.y}px`;

                const isOutside =
                    screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                    screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1;

                hotspotElement.style.display = isOutside ? 'none' : 'block';
            } else {
                console.warn(`⚠️ DOM-елемент hotspot-${annotation.index} не знайдено`);
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
