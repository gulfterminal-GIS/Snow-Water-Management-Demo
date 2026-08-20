window.App = window.App || {};

App.layers = {
  emptyFc() {
    return { type: 'FeatureCollection', features: [] };
  },

  async loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load ' + path);
    return res.json();
  },

  async loadAll() {
    const p = App.config.paths;
    const [basin, watershed, river, reservoirs, dams, gauges, sensors, metrics] = await Promise.all([
      this.loadJson(p.basin),
      this.loadJson(p.watershed),
      this.loadJson(p.river),
      this.loadJson(p.reservoirs),
      this.loadJson(p.dams),
      this.loadJson(p.gauges),
      this.loadJson(p.sensors),
      this.loadJson(p.metrics)
    ]);

    App.state.basin = basin;
    App.state.watershed = watershed;
    App.state.river = river;
    App.state.reservoirs = reservoirs;
    App.state.dams = dams;
    App.state.gauges = gauges;
    App.state.sensors = sensors;
    App.state.metrics = metrics;

    this.addSourcesAndLayers();
    this.startRiverAnimation();
  },

  addSourcesAndLayers() {
    const map = App.state.map;
    const c = App.config.colors;

    map.addSource('basin', { type: 'geojson', data: App.state.basin });
    map.addLayer({
      id: 'basin-fill',
      type: 'fill',
      source: 'basin',
      paint: { 'fill-color': '#6B778C', 'fill-opacity': 0.04 }
    });
    map.addLayer({
      id: 'basin-line',
      type: 'line',
      source: 'basin',
      paint: { 'line-color': '#6B778C', 'line-width': 2, 'line-dasharray': [4, 2] }
    });

    map.addSource('watershed', { type: 'geojson', data: App.state.watershed });
    map.addLayer({
      id: 'watershed-fill',
      type: 'fill',
      source: 'watershed',
      paint: { 'fill-color': c.watershed, 'fill-opacity': 0.12 }
    });
    map.addLayer({
      id: 'watershed-line',
      type: 'line',
      source: 'watershed',
      paint: { 'line-color': c.watershed, 'line-width': 3, 'line-dasharray': [2, 1] }
    });

    map.addSource('river', { type: 'geojson', data: App.state.river });
    map.addLayer({
      id: 'river-glow',
      type: 'line',
      source: 'river',
      paint: { 'line-color': '#7EC8F5', 'line-width': 22, 'line-opacity': 0.22, 'line-blur': 6 }
    });
    map.addLayer({
      id: 'river-line',
      type: 'line',
      source: 'river',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.river, 'line-width': 10 }
    });
    map.addLayer({
      id: 'river-flow',
      type: 'line',
      source: 'river',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#E8F6FF',
        'line-width': 5,
        'line-opacity': 0.95,
        'line-dasharray': [0, 0, 2.2, 5.8],
        'line-dasharray-transition': { duration: 0, delay: 0 }
      }
    });

    map.addSource('river-upstream', { type: 'geojson', data: this.emptyFc() });
    map.addSource('river-downstream', { type: 'geojson', data: this.emptyFc() });
    map.addLayer({
      id: 'river-upstream',
      type: 'line',
      source: 'river-upstream',
      paint: { 'line-color': c.upstream, 'line-width': 10 }
    });
    map.addLayer({
      id: 'river-downstream',
      type: 'line',
      source: 'river-downstream',
      paint: { 'line-color': c.downstream, 'line-width': 10 }
    });

    map.addSource('reservoirs', { type: 'geojson', data: App.state.reservoirs });
    map.addLayer({
      id: 'reservoirs-fill',
      type: 'fill',
      source: 'reservoirs',
      paint: { 'fill-color': c.reservoir, 'fill-opacity': 0.62 }
    });
    map.addLayer({
      id: 'reservoirs-outline',
      type: 'line',
      source: 'reservoirs',
      paint: { 'line-color': '#0A4F63', 'line-width': 2 }
    });

    map.addSource('user-layers', { type: 'geojson', data: this.emptyFc() });
    map.addLayer({
      id: 'user-fill',
      type: 'fill',
      source: 'user-layers',
      paint: { 'fill-color': '#2F4A6D', 'fill-opacity': 0.16 }
    });
    map.addLayer({
      id: 'user-line',
      type: 'line',
      source: 'user-layers',
      paint: { 'line-color': '#1B2A4A', 'line-width': 2 }
    });

    map.on('click', 'reservoirs-fill', (e) => {
      if (App.state.placeMode || App.state.suppressClick) return;
      const name = e.features[0].properties.NAME;
      App.ui.showReservoir(name);
    });
    map.on('mouseenter', 'reservoirs-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'reservoirs-fill', () => {
      if (!App.state.placeMode) map.getCanvas().style.cursor = '';
    });

    map.on('click', 'watershed-fill', (e) => {
      if (App.state.placeMode || App.state.suppressClick) return;
      if (map.queryRenderedFeatures(e.point, { layers: ['reservoirs-fill'] }).length) return;
      App.ui.showWatershed();
    });
  },

  setVisibility(ids, visible) {
    const map = App.state.map;
    const value = visible ? 'visible' : 'none';
    ids.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', value);
    });
  },

  startRiverAnimation() {
    const dash = 2.2;
    const gap = 5.8;
    const cycle = dash + gap;
    const msPerCycle = 700;

    const tick = (ts) => {
      const map = App.state.map;
      if (map && map.getLayer('river-flow')) {
        const offset = (cycle - ((ts / msPerCycle) * cycle) % cycle) % cycle;
        let dashArray;
        if (offset <= gap) {
          dashArray = [0, offset, dash, gap - offset];
        } else {
          const rest = offset - gap;
          dashArray = [rest, gap, Math.max(0, dash - rest), 0];
        }
        map.setPaintProperty('river-flow', 'line-dasharray', dashArray);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};
