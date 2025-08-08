let api;
let annotations = [];
let cached = []; // [{ index, name, world:[x,y,z] }]
const ui = document.getElementById('ui-elements');
const cover = document.getElementById('preload-cover');
let rafId = null;

window.addEventListener('DOMContentLoaded', init);

function init() {
  const iframe = document.getElementById('api-frame');
  const client = new Sketchfab(iframe);

  client.init('40fa706855ed407fbbd0123951988cc0', {
    success: (fetchedApi) => {
      api = fetchedApi;
      api.start();
      api.addEventListener('viewerready', onReady);
    },
    error: () => console.error('❌ Sketchfab init error'),
  });
}

async function onReady() {
  console.log('✅ Sketchfab готовий');

  annotations = await getAnnotationListAsync().catch(() => []);
  console.log(`ℹ️ Анотацій: ${annotations.length}`);

  // 1) кешуємо worldPosition для кожної анотації під cover’ом
  cover.style.display = 'grid';
  cached = await preloadWorldPositions(annotations);
  console.log(`✅ Кешовано: ${cached.length}/${annotations.length}`);

  // 2) рендеримо кнопки
  createHotspots(cached);

  // 3) первинне позиціонування
  updateHotspotsPosition();

  // 4) прибираємо cover (користувач не бачив пробіжку)
  cover.style.display = 'none';

  // 5) оновлення позицій
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 350);
  });
}

/* ---------- Promise helpers ---------- */
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const getAnnotationListAsync = () =>
  new Promise((res, rej) => api.getAnnotationList((e, list) => e ? rej(e) : res(list || [])));
const getAnnotationAsync = (i) =>
  new Promise((res, rej) => api.getAnnotation(i, (e, a) => e ? rej(e) : res(a)));
const gotoAnnotationAsync = (i) =>
  new Promise((res) => { t
