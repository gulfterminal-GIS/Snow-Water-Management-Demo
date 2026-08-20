window.App = window.App || {};

App.catalog = {
  markers: {
    dams: [],
    gauges: [],
    sensors: [],
    notes: [],
    extra: [],
    breakpoint: null
  },

  init() {
    this.renderDams();
    this.renderGauges();
    this.renderSensors();
    this.renderCatalogList();
    this.restoreUserItems();
  },

  markerEl(kind) {
    const el = document.createElement('div');
    el.className = 'map-marker marker-' + kind;
    el.innerHTML = typeof App.icons[kind] === 'function' ? App.icons[kind]() : '';
    return el;
  },

  addMarker(el, lngLat, onClick) {
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(lngLat)
      .addTo(App.state.map);
    if (onClick) el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (App.state.placeMode) return;
      onClick();
    });
    return marker;
  },

  renderDams() {
    App.state.dams.features.forEach((f) => {
      const p = f.properties;
      const el = this.markerEl('dam');
      const marker = this.addMarker(el, f.geometry.coordinates, () => App.ui.showDam(p));
      this.markers.dams.push(marker);
    });
  },

  gaugeFeatures() {
    const official = App.state.gauges.features.filter((f) => f.properties.placed !== false);
    const extra = (App.state.saved.placedGauges || []).map((g) => ({
      type: 'Feature',
      id: g.id,
      geometry: { type: 'Point', coordinates: g.coordinates },
      properties: g
    }));
    return official.concat(extra);
  },

  clearGroup(key) {
    this.markers[key].forEach((m) => m.remove());
    this.markers[key] = [];
  },

  renderGauges() {
    this.clearGroup('gauges');
    this.gaugeFeatures().forEach((f) => {
      const p = f.properties;
      const el = this.markerEl('gauge');
      const marker = this.addMarker(el, f.geometry.coordinates, () => App.ui.showGauge(p, f.geometry.coordinates));
      this.markers.gauges.push(marker);
    });
  },

  renderSensors() {
    this.clearGroup('sensors');
    App.state.sensors.features.forEach((f) => {
      const p = f.properties;
      const el = this.markerEl('sensor');
      const marker = this.addMarker(el, f.geometry.coordinates, () => App.ui.showSensor(p));
      this.markers.sensors.push(marker);
    });
  },

  renderNotes() {
    this.clearGroup('notes');
    (App.state.saved.notes || []).forEach((n) => {
      const el = this.markerEl('note');
      const marker = this.addMarker(el, n.coordinates, () => App.ui.showNote(n));
      this.markers.notes.push(marker);
    });
  },

  renderExtras() {
    this.clearGroup('extra');
    (App.state.saved.extraMarkers || []).forEach((item) => {
      const kind = item.kind === 'dam' ? 'dam' : 'diversion';
      const el = this.markerEl(kind);
      const marker = this.addMarker(el, item.coordinates, () => App.ui.showExtra(item));
      this.markers.extra.push(marker);
    });
  },

  renderBreakpoint(record) {
    if (this.markers.breakpoint) this.markers.breakpoint.remove();
    if (!record) return;
    const el = this.markerEl('breakpoint');
    this.markers.breakpoint = this.addMarker(el, record.lngLat, () => App.ui.showBreakpoint(record));
  },

  restoreUserItems() {
    this.renderNotes();
    this.renderExtras();
    const bp = (App.state.saved.breakpoints || [])[0];
    if (bp) {
      App.analysis.applyBreakpoint({ lng: bp.lngLat[0], lat: bp.lngLat[1] }, bp.reservoir, true);
    }
  },

  renderCatalogList() {
    const box = document.getElementById('gauge-catalog');
    box.innerHTML = '';
    App.state.gauges.features.forEach((f) => {
      const p = f.properties;
      const row = document.createElement('div');
      row.className = 'catalog-item';
      row.draggable = true;
      row.innerHTML =
        '<div class="catalog-meta"><div class="layer-icon icon-gauge">' + App.icons.gauge() + '</div><div>' +
        '<h4>' + p.name + '</h4><span>' + p.stationId + ' · ' + p.flowCfs + ' cfs</span></div></div>' +
        '<button class="place-btn" type="button">Place</button>';
      row.querySelector('.place-btn').addEventListener('click', () => {
        App.state.placeMode = 'catalog-gauge';
        App.state.pendingGauge = p;
        App.ui.toast('Click the map to place ' + p.name);
        App.state.map.getCanvas().style.cursor = 'crosshair';
      });
      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/gauge-id', String(p.stationId));
        e.dataTransfer.effectAllowed = 'copy';
      });
      box.appendChild(row);
    });
  },

  placeCatalogGauge(lngLat, station) {
    const assignment = App.analysis.assignTarget(lngLat);
    const placed = {
      id: 'user-gauge-' + Date.now(),
      stationId: station.stationId,
      name: station.name,
      agency: station.agency,
      parameter: station.parameter,
      flowCfs: station.flowCfs,
      stageFt: station.stageFt,
      dwrUrl: station.dwrUrl,
      assignedTo: assignment.assignedTo,
      targetId: assignment.targetId,
      official: false,
      coordinates: [lngLat.lng, lngLat.lat]
    };
    App.state.saved.placedGauges.push(placed);
    App.storage.save({ placedGauges: App.state.saved.placedGauges });
    this.renderGauges();
    App.ui.showGauge(placed, placed.coordinates);
    App.ui.toast('Gauge assigned to ' + assignment.targetId);
  },

  addNote(lngLat, title, text) {
    const note = {
      id: 'note-' + Date.now(),
      title: title || 'Field note',
      text: text || '',
      coordinates: [lngLat.lng, lngLat.lat],
      created: new Date().toISOString()
    };
    App.state.saved.notes.push(note);
    App.storage.save({ notes: App.state.saved.notes });
    this.renderNotes();
    App.ui.showNote(note);
  },

  addExtra(kind, lngLat, name) {
    const item = {
      id: kind + '-' + Date.now(),
      kind: kind,
      name: name,
      coordinates: [lngLat.lng, lngLat.lat]
    };
    App.state.saved.extraMarkers.push(item);
    App.storage.save({ extraMarkers: App.state.saved.extraMarkers });
    this.renderExtras();
    App.ui.showExtra(item);
  },

  setGroupVisible(key, visible) {
    this.markers[key].forEach((m) => {
      m.getElement().style.display = visible ? 'flex' : 'none';
    });
  }
};
