window.App = window.App || {};

App.analysis = {
  flattenRiver(fc) {
    const lines = turf.flatten(fc).features.filter((f) => f.geometry && f.geometry.type === 'LineString');
    if (!lines.length) return null;
    lines.sort((a, b) => turf.length(b) - turf.length(a));
    return lines[0];
  },

  riverLine() {
    if (!App.state.riverLine) {
      App.state.riverLine = this.flattenRiver(App.state.river);
    }
    return App.state.riverLine;
  },

  snapToRiver(lngLat) {
    const line = this.riverLine();
    if (!line) return null;
    const pt = turf.point([lngLat.lng, lngLat.lat]);
    const snapped = turf.nearestPointOnLine(line, pt, { units: 'kilometers' });
    return snapped;
  },

  splitAt(lngLat) {
    const line = this.riverLine();
    const snapped = this.snapToRiver(lngLat);
    if (!line || !snapped) return null;
    const total = turf.length(line, { units: 'kilometers' });
    const along = snapped.properties.location;
    const start = turf.along(line, 0, { units: 'kilometers' });
    const end = turf.along(line, total, { units: 'kilometers' });
    const upstream = turf.lineSlice(start, snapped, line);
    const downstream = turf.lineSlice(snapped, end, line);
    const fraction = total > 0 ? along / total : 0;
    return { snapped, upstream, downstream, fraction, totalKm: total, alongKm: along };
  },

  applyBreakpoint(lngLat, reservoirName, silent) {
    const split = this.splitAt(lngLat);
    if (!split) {
      if (!silent) App.ui.toast('Could not snap that point to the Blue River.');
      return null;
    }
    const map = App.state.map;
    map.getSource('river-upstream').setData({ type: 'FeatureCollection', features: [split.upstream] });
    map.getSource('river-downstream').setData({ type: 'FeatureCollection', features: [split.downstream] });

    const contrib = this.contribution(split.fraction);
    const record = {
      id: 'bp-' + Date.now(),
      lngLat: split.snapped.geometry.coordinates,
      reservoir: reservoirName || this.nearestReservoir(split.snapped.geometry.coordinates),
      fraction: split.fraction,
      contributionAf: contrib.af,
      contributionInches: contrib.inches
    };
    App.state.saved.breakpoints = [record];
    App.storage.save({ breakpoints: App.state.saved.breakpoints });
    App.catalog.renderBreakpoint(record);
    return record;
  },

  nearestReservoir(coord) {
    const dillon = turf.point([-106.06, 39.60]);
    const green = turf.point([-106.28, 39.86]);
    const pt = turf.point(coord);
    const d1 = turf.distance(pt, dillon);
    const d2 = turf.distance(pt, green);
    return d1 < d2 ? 'Dillon Reservoir' : 'Green Mountain Reservoir';
  },

  contribution(fraction) {
    const m = App.state.metrics;
    const inches = m.swe.inches;
    const totalAf = m.watershed.areaAcres * inches / 12;
    const af = totalAf * fraction;
    return {
      inches: inches,
      af: Math.round(af),
      kaf: +(af / 1000).toFixed(1),
      fraction: fraction
    };
  },

  assignTarget(lngLat) {
    const map = App.state.map;
    const point = map.project(lngLat);
    const reservoirHits = map.queryRenderedFeatures(point, { layers: ['reservoirs-fill'] });
    if (reservoirHits.length) {
      return { assignedTo: 'reservoir', targetId: reservoirHits[0].properties.NAME };
    }
    const riverHits = map.queryRenderedFeatures(point, { layers: ['river-line', 'river-glow'] });
    if (riverHits.length) {
      return { assignedTo: 'river', targetId: 'Blue River' };
    }
    const wsHits = map.queryRenderedFeatures(point, { layers: ['watershed-fill'] });
    if (wsHits.length) {
      return { assignedTo: 'watershed', targetId: 'Blue River Watershed' };
    }
    return { assignedTo: 'location', targetId: 'Unassigned' };
  }
};
