window.App = window.App || {};

App.map = {
  create() {
    mapboxgl.accessToken = App.config.mapboxToken;
    const home = App.config.home;
    const map = new mapboxgl.Map({
      container: 'map',
      style: App.config.style,
      center: home.center,
      zoom: home.zoom,
      pitch: home.pitch,
      bearing: home.bearing,
      attributionControl: true
    });
    App.state.map = map;
    App.state.is3D = true;
    App.state.snowOn = true;
    map.on('style.load', () => {
      if (App.state.snowOn) App.map.setSnow(true);
    });
    return map;
  },

  addTerrainAndSky() {
    const map = App.state.map;
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
    }
    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: App.config.terrainExaggeration
    });
    if (!map.getLayer('sky')) {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 12
        }
      });
    }
    map.setFog({
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 168)',
      'horizon-blend': 0.08,
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.15
    });
    if (App.state.snowOn) this.setSnow(true);
  },

  setTerrain(on) {
    const map = App.state.map;
    if (on) {
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: App.config.terrainExaggeration
      });
    } else {
      map.setTerrain(null);
    }
  },

  flyHome() {
    App.state.map.flyTo(Object.assign({ duration: 1400 }, App.config.home));
  },

  snowParams() {
    const fadeIn = (value) => [
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      value * 0.35,
      10,
      value
    ];
    return {
      density: fadeIn(0.85),
      intensity: 1.0,
      'center-thinning': 0.1,
      direction: [0, 50],
      opacity: 1.0,
      color: '#ffffff',
      'flake-size': 0.71,
      vignette: fadeIn(0.28),
      'vignette-color': '#ffffff'
    };
  },

  setSnow(on) {
    const map = App.state.map;
    App.state.snowOn = !!on;
    if (!map || typeof map.setSnow !== 'function') return;
    if (on) map.setSnow(this.snowParams());
    else map.setSnow(null);
    const btn = document.getElementById('btn-snow');
    const toggle = document.getElementById('toggle-snow');
    if (btn) btn.classList.toggle('active', !!on);
    if (toggle) toggle.checked = !!on;
  }
};
