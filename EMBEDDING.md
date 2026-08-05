# Embedding & controlling Geostrat

Geostrat can be opened on a specific view, and can be driven live by a page that
embeds it (this is how Janus opens the globe on a theory zone).

## 1. By URL

```
index.html?layers=heartland,rimland&lat=45&lon=75&zoom=2.4
```

| Parameter | Example | Meaning |
|---|---|---|
| `layers` | `heartland,rimland` | Layers to switch **on** (comma-separated) |
| `off` | `clouds,radar` | Layers to switch **off** |
| `lat` / `lon` | `45` / `75` | Fly to these coordinates |
| `zoom` | `2.4` | Zoom level |
| `flat` | `1` or `0` | Flat map (`1`) or globe (`0`) |
| `year` | `1990` | Set the year slider |

All parameters are optional and can be combined.

## 2. By postMessage (from a parent frame)

```js
const frame = document.querySelector('iframe.geo');

// Wait until Geostrat says it's ready…
window.addEventListener('message', e => {
  if (e.data?.type === 'geostrat:ready') {
    frame.contentWindow.postMessage({
      type:   'geostrat',
      layers: ['rimland'],
      lat:    35, lon: 100, zoom: 2.2
    }, '*');
  }
});
```

Geostrat replies with `{type:'geostrat:ok', applied:{…}}` once the view is set.
This is the better option for an already-loaded frame — it changes the view
without reloading the map.

## 3. Same-origin direct handle

If the embedding page is on the same origin:

```js
frame.contentWindow.geostrat.apply({ layers:['heartland'], zoom:2.4 });
frame.contentWindow.geostrat.setLayer('rimland', true);
frame.contentWindow.geostrat.layers();   // every available layer key
```

## Layer keys

**Classical theory:** `heartland` (Mackinder) · `rimland` (Spykman) ·
`shatter` (shatterbelts) · `islandchains` · `pearls` · `deltas`

**Strategic geography:** `chokepoints` · `lanes` (shipping) · `bri` ·
`nuclear` · `pipelines` · `flowarcs` · `chokestress` · `caspian` · `portwatch`

**Live layers:** `newspulse` · `radar` · `clouds` · `heat`

**Terrain:** `hillshade` · `terrain3d`

Unknown keys are ignored and logged to the console — they never break the view.

---

# Performance notes

MapLibre, the TopoJSON decoder and the world geometry are **vendored locally**
(`vendor/`, `data/world/`) rather than pulled from unpkg and jsdelivr. Previously
the page could not paint until three third-party round-trips completed; now the
only external requests are basemap tiles and live data feeds, none of which block
first paint.

Scripts are `defer`red so they download in parallel and execute in order after
the HTML is parsed, and the Google Fonts stylesheet is loaded non-blocking.

**If you upgrade MapLibre**, replace `vendor/maplibre-gl.js` and
`vendor/maplibre-gl.css` together:

```bash
npm install maplibre-gl@<version>
cp node_modules/maplibre-gl/dist/maplibre-gl.js  vendor/
cp node_modules/maplibre-gl/dist/maplibre-gl.css vendor/
```

The world geometry (`data/world/countries-50m.json`, `countries-10m.json`) comes
from the `world-atlas@2` package and rarely needs updating.
