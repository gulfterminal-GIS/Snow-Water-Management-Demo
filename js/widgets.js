window.App = window.App || {};

App.widgets = {
  init() {
    const map = App.state.map;
    document.getElementById('btn-home').addEventListener('click', () => App.map.flyHome());
    document.getElementById('btn-zoom-in').addEventListener('click', () => map.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => map.zoomOut());

    document.getElementById('btn-3d').addEventListener('click', () => {
      App.state.is3D = !App.state.is3D;
      map.easeTo({ pitch: App.state.is3D ? App.config.home.pitch : 0, duration: 900 });
      document.getElementById('btn-3d').classList.toggle('active', App.state.is3D);
    });
    document.getElementById('btn-3d').classList.add('active');

    document.getElementById('btn-snow').addEventListener('click', () => {
      App.map.setSnow(!App.state.snowOn);
    });

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: 'Search place or coordinates'
    });
    document.getElementById('search-panel').appendChild(geocoder.onAdd(map));
    geocoder.on('result', (e) => {
      map.flyTo({ center: e.result.center, zoom: 12, duration: 1200 });
    });

    document.getElementById('btn-search').addEventListener('click', () => {
      const panel = document.getElementById('search-panel');
      panel.classList.toggle('open');
      document.getElementById('btn-search').classList.toggle('active', panel.classList.contains('open'));
      if (panel.classList.contains('open')) {
        const input = panel.querySelector('input');
        if (input) input.focus();
      }
    });

    document.getElementById('btn-draw').addEventListener('click', (e) => {
      e.stopPropagation();
      App.ui.toggleFlyout('draw-menu');
    });
    document.getElementById('btn-add').addEventListener('click', (e) => {
      e.stopPropagation();
      App.ui.toggleFlyout('add-menu');
    });

    document.querySelectorAll('#draw-menu .flyout-item').forEach((item) => {
      item.addEventListener('click', () => {
        const mode = item.dataset.draw;
        document.getElementById('btn-draw').classList.toggle('active', mode !== 'simple_select' && mode !== 'trash');
        App.drawTools.setMode(mode);
      });
    });

    document.querySelectorAll('#add-menu .flyout-item').forEach((item) => {
      item.addEventListener('click', () => {
        App.ui.closeFlyouts();
        App.state.placeMode = item.dataset.add;
        map.getCanvas().style.cursor = 'crosshair';
        document.getElementById('btn-add').classList.add('active');
        App.ui.toast('Click the map to place a ' + item.dataset.add.replace('-', ' '));
      });
    });

    document.getElementById('btn-measure').addEventListener('click', () => {
      const btn = document.getElementById('btn-measure');
      const on = !btn.classList.contains('active');
      btn.classList.toggle('active', on);
      if (on) App.drawTools.setMode('measure-line');
      else {
        App.state.placeMode = null;
        App.state.draw.changeMode('simple_select');
      }
    });

    map.on('mousemove', (e) => {
      const lat = e.lngLat.lat.toFixed(4);
      const lng = Math.abs(e.lngLat.lng).toFixed(4);
      const dir = e.lngLat.lng < 0 ? 'W' : 'E';
      document.getElementById('stat-coords').textContent = lat + '°N, ' + lng + '°' + dir;
    });
  }
};
