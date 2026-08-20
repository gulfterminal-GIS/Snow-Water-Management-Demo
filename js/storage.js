window.App = window.App || {};

App.storage = {
  defaults() {
    return {
      notes: [],
      userLayers: [],
      extraMarkers: [],
      placedGauges: [],
      breakpoints: [],
      season: 'aprJul'
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(App.config.storageKey);
      if (!raw) return this.defaults();
      return Object.assign(this.defaults(), JSON.parse(raw));
    } catch (err) {
      console.warn('Could not read saved demo data', err);
      return this.defaults();
    }
  },

  save(partial) {
    const next = Object.assign(this.load(), partial);
    localStorage.setItem(App.config.storageKey, JSON.stringify(next));
    return next;
  }
};
