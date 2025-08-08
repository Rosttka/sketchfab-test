const iframe = document.getElementById('api-frame');
const hotspotContainer = document.getElementById('hotspot-container');
const modelUID = '40fa706855ed407fbbd0123951988cc0';
const client = new Sketchfab(iframe);

iframe.src = `https://sketchfab.com/models/${modelUID}/embed?ui_infos=0&ui_controls=1&ui_stop=0&ui_watermark=0&ui_annotations=1&autostart=1`;

client.init(modelUID, {
  success: function(api) {
    api.start();
    api.addEventListener('viewerready', function() {
      console.log('Viewer is ready');

      // Отримуємо список анотацій
      api.getAnnotationList(function(err, annotations) {
        if (err) {
          console.error('Annotation list error', err);
          return;
        }
        console.log('Кількість анотацій:', annotations.length);

        annotations.forEach((anno, index) => {
          // Створюємо кастомну кнопку
          const btn = document.createElement('button');
          btn.className = 'custom-hotspot';
          btn.textContent = anno.name || `Hotspot ${index + 1}`;
          btn.style.left = '0px'; // як було — всі у верхньому лівому
          btn.style.top = '0px';
          btn.dataset.index = index;
          btn.addEventListener('click', () => {
            api.gotoAnnotation(index);
          });
          hotspotContainer.appendChild(btn);
        });
      });
    });
  },
  error: function() {
    console.error('Sketchfab API error');
  }
});
