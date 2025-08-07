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

            api.addEventListener('viewerready', function () {
                console.log("Sketchfab готовий");

                api.getAnnotationList(function (err, fetchedAnnotations) {
                    if (err) {
                        console.error("Помилка отримання анотацій:", err);
                        return;
                    }

                    annotations = fetchedAnnotations;
                    createHotspots();

                    api.addEventListener('viewerprocess', updateHotspotPositions);
                });
            });
        },
        error: function () {
            console.error('Помилка API');
        }
    });
}

function createHotspots() {
    annotations.forEach(annotation => {
        const hotspot = document.createElement('div');
        hotspot.className = 'custom-hotspot';
        hotspot.id = `hotspot-${annotation.index}`;
        hotspot.innerText = annotation.name;

        hotspot.onclick = () => api.gotoAnnotation(annotation.index);

        uiContainer.appendChild(hotspot);
    });
}

function updateHotspotPositions() {
    annotations.forEach(annotation => {
        const el = document.getElementById(`hotspot-${annotation.index}`);
        if (!el) return;

        // Перетворюємо масив [x, y, z] → об'єкт {x, y, z}
        const posArray = annotation.position;
        if (!Array.isArray(posArray) || posArray.length !== 3) {
            console.warn(`Анотація ${annotation.index} не має коректної позиції`);
            return;
        }

        const pos = {
            x: posArray[0],
            y: posArray[1],
            z: posArray[2]
        };

        api.getWorldToScreenCoordinates(pos, function (err, screenCoordinates) {
            if (err || !screenCoordinates) {
                console.error('Координати не отримано:', err);
                return;
            }

            el.style.position = 'absolute';
            el.style.left = `${screenCoordinates.x}px`;
            el.style.top = `${screenCoordinates.y}px`;

            const outOfView = screenCoordinates.viewport.x < 0 || screenCoordinates.viewport.x > 1 ||
                              screenCoordinates.viewport.y < 0 || screenCoordinates.viewport.y > 1;

            el.style.display = outOfView ? 'none' : 'block';
        });
    });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
