window.App = window.App || {};

App.drawTools = {
  init() {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {}
    });
    App.state.draw = draw;
    App.state.map.addControl(draw);
    this.syncUserSource();

    App.state.map.on('draw.create', (e) => this.onCreate(e));
    App.state.map.on('draw.update', () => this.persistDraw());
    App.state.map.on('draw.delete', () => this.persistDraw());
  },

  setMode(mode) {
    const draw = App.state.draw;
    App.ui.closeFlyouts();
    if (mode === 'polygon') {
      draw.changeMode('draw_polygon');
      App.ui.toast('Click to draw a basin, watershed, or sub-basin. Double-click to finish.');
    } else if (mode === 'line') {
      draw.changeMode('draw_line_string');
      App.ui.toast('Click to draw a river or canal. Double-click to finish.');
    } else if (mode === 'edit') {
      draw.changeMode('simple_select');
      App.ui.toast('Select a drawn boundary, then drag vertices to edit.');
    } else if (mode === 'trash') {
      const selected = draw.getSelectedIds();
      if (selected.length) draw.delete(selected);
      else App.ui.toast('Select a drawn feature first.');
    } else if (mode === 'breakpoint') {
      App.state.placeMode = 'breakpoint';
      App.state.map.getCanvas().style.cursor = 'crosshair';
      App.ui.toast('Click the Blue River to set a reservoir breakpoint.');
    } else if (mode === 'measure-line') {
      App.state.placeMode = 'measure';
      draw.changeMode('draw_line_string');
      App.ui.toast('Click to measure distance. Double-click to finish.');
    } else if (mode === 'measure-area') {
      App.state.placeMode = 'measure';
      draw.changeMode('draw_polygon');
      App.ui.toast('Click to measure area. Double-click to finish.');
    } else {
      draw.changeMode('simple_select');
    }
  },

  onCreate(e) {
    const feature = e.features[0];
    if (App.state.placeMode === 'measure') {
      this.showMeasure(feature);
      App.state.draw.delete([feature.id]);
      App.state.placeMode = null;
      document.getElementById('btn-measure').classList.remove('active');
      return;
    }
    if (feature.geometry.type === 'Polygon') {
      App.ui.promptLayer(feature);
    } else if (feature.geometry.type === 'LineString') {
      feature.properties = Object.assign({}, feature.properties, {
        kind: 'canal',
        name: 'User canal / river'
      });
      this.persistDraw();
      App.ui.toast('River / canal saved.');
    }
  },

  showMeasure(feature) {
    const chip = document.getElementById('measure-chip');
    if (feature.geometry.type === 'LineString') {
      const km = turf.length(feature, { units: 'kilometers' });
      const mi = km * 0.621371;
      chip.textContent = 'Distance: ' + km.toFixed(2) + ' km (' + mi.toFixed(2) + ' mi)';
    } else {
      const acres = turf.area(feature) / 4046.8564224;
      chip.textContent = 'Area: ' + acres.toFixed(1) + ' acres';
    }
    chip.classList.add('show');
    setTimeout(() => chip.classList.remove('show'), 6000);
  },

  persistDraw() {
    const fc = App.state.draw.getAll();
    const named = (App.state.saved.userLayers || []).reduce((acc, layer) => {
      acc[layer.id] = layer;
      return acc;
    }, {});
    const userLayers = fc.features.map((f) => {
      const prev = named[f.id] || {};
      return {
        id: f.id,
        name: f.properties.name || prev.name || 'Untitled layer',
        kind: f.properties.kind || prev.kind || (f.geometry.type === 'Polygon' ? 'watershed' : 'line'),
        geometry: f.geometry,
        properties: Object.assign({}, prev.properties, f.properties)
      };
    });
    App.state.saved.userLayers = userLayers;
    App.storage.save({ userLayers: userLayers });
    this.syncUserSource();
    App.ui.refreshUserLayers();
  },

  restore() {
    const layers = App.state.saved.userLayers || [];
    layers.forEach((layer) => {
      try {
        App.state.draw.add({
          type: 'Feature',
          id: layer.id,
          geometry: layer.geometry,
          properties: { name: layer.name, kind: layer.kind }
        });
      } catch (err) {
        console.warn('Could not restore drawn layer', err);
      }
    });
    this.syncUserSource();
    App.ui.refreshUserLayers();
  },

  syncUserSource() {
    const map = App.state.map;
    if (!map.getSource('user-layers')) return;
    const fc = {
      type: 'FeatureCollection',
      features: (App.state.saved.userLayers || []).map((layer) => ({
        type: 'Feature',
        id: layer.id,
        geometry: layer.geometry,
        properties: { name: layer.name, kind: layer.kind }
      }))
    };
    map.getSource('user-layers').setData(fc);
  }
};
