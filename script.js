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
                console.log("Sketchfab готовий");

                api.getAnnotationList(function(err, fetchedAnnotations) {
                    if (err) {
                        console.error("Не вдалося отримати анотації:", err);
                        return;
                    }

                    console.log("Анотації:", fetchedAnnotations);
                    annotations = fetchedAnnotations;
                    createHotspots();
                    api.addEventListener('viewerprocess', updateHotspotPositions);
                });
            });
        },
        error: function() {
            console.error('Помилка ініціалізації Sketchfab');
        }
    });
}

function createHotspots() {
    annotations.forEach(annotation => {
        const hotspot = document.createElement('div');
        hotspot.className = 'custom-hotspot';
        hotspot.id = `hotspot-${annotation.index}`;
        hotspot.textContent = annotation.name;
        uiContainer.appendChild(hotspot);
    });
}

function updateHotspotPositions() {
    annotations.forEach(annotation => {
        const el = document.getElementById(`hotspot-${annotation.index}`);
        if (!el) return;

        // Переважно у анотацій є viewpointPosition або position
        const pos = annotation.position || annotation.viewpointPosition || annotation.eye;
        if (!pos) {
            console.warn(`Немає позиції для анотації ${annotation.index}`);
            return;
        }

        api.getWorldToScreenCoordinates(pos, function(err, screenCoordinates) {
            if (err || !screenCoordinates) {
                console.error('Координати не отримано:', err);
                return;
            }

            el.style.position = 'absolute';
            el.style.left = `${screenCoordinates.x}px`;
            el.style.top = `${screenCoordinates.y}px`;
            el.style.display = 'block';
        });
    });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
