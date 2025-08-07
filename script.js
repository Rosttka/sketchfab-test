let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

function initializeSketchfabAPI() {
    const iframe = document.getElementById('api-frame');
    const client = new Sketchfab('1.12.1', iframe);

    client.init('40fa706855ed407fbbd0123951988cc0', {
        success: function(fetchedApi) {
            api = fetchedApi;
            api.start();

            api.addEventListener('viewerready', function() {
                api.getAnnotationList(function(err, fetchedAnnotations) {
                    if (err) {
                        console.error('Помилка отримання анотацій:', err);
                        return;
                    }

                    annotations = fetchedAnnotations;
                    console.log("Отримані анотації:", annotations); // ← додано
                    createCustomHotspots();

                    // Перемикаємо на viewerprocess (надійніше для початку)
                    api.addEventListener('viewerprocess', updateHotspotsPosition);
                });
            });
        },
        error: function() {
            console.error('Помилка ініціалізації Sketchfab');
        },
        transparent: 1
    });
}

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

function updateHotspotsPosition() {
    annotations.forEach(annotation => {
        const hotspotElement = document.getElementById(`hotspot-${annotation.index}`);
        if (!hotspotElement) return;

        // ←←← ← ТУТ ГОЛОВНЕ: пробуємо worldPosition
        const position = annotation.worldPosition || annotation.position || annotation.eye;

        if (!position) {
            console.warn(`Annotation ${annotation.index} не має координат`);
            return;
        }

        api.getWorldToScreenCoordinates(position, function(err, screenCoordinates) {
            if (err) {
                console.error('Помилка координат:', err);
                return;
            }

            hotspotElement.style.left = `${screenCoordinates.x}px`;
            hotspotElement.style.top = `${screenCoordinates.y}px`;

            const outOfView = screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                              screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1;

            hotspotElement.style.display = outOfView ? 'none' : 'block';
        });
    });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
