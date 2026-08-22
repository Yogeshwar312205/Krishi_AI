/**
 * The basemap, repainted in the rate board's own palette.
 *
 * A stock basemap under this UI looks like a screenshot of another product.
 * Positron is grey-blue on white; every other surface in this app is ink on
 * manila. So rather than ship a second visual language, the style JSON is
 * fetched once and retinted before the map is ever constructed — the map
 * arrives already in the palette, with no flash of somebody else's grey.
 *
 * Retinting by layer ROLE, not by exact layer id, is deliberate. CARTO renames
 * and reorders layers between releases; a hardcoded list of thirty ids would
 * silently stop matching and leave a half-painted map. Matching on "is this a
 * road line / a water fill / a POI label" survives that.
 *
 * Two things are deliberately not attempted:
 *
 *   Our own fonts. Glyphs are served as pre-rendered PBFs by the tile provider,
 *   so Khand and Mukta are not available to the label layers without hosting a
 *   glyph server. Labels keep the provider's face and take our ink colour.
 *
 *   A hand-written style. Forty layers of vector rules maintained here would be
 *   a second design system to keep in step with the first.
 */

/* Straight from index.css / tailwind.config.js — the same values, so the map
 * ground and the page ground are literally the same colour. */
export const INK = '#14251A';
export const INK_FAINT = '#5F6E63';
export const PAPER = '#EFECE1';
export const RULE = '#C9C4B4';
export const FOREST = '#18532B';
export const TURMERIC = '#EDBF4F';
export const TERRACOTTA = '#C1652D';

/* Ground tints, mixed to sit under ink marks without competing with them. */
const WATER = '#D6DED3';
const GREEN = '#E3E4D2';
const BUILDING = '#E5E0D2';
const ROAD_MINOR = '#DCD7C7';
const ROAD_MAJOR = '#CEC7B3';
const ROAD_TRUNK = '#BDB5A0';

const BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const has = (id, ...needles) => needles.some((n) => id.includes(n));

/**
 * A map with no tiles at all: paper, and whatever we draw on it.
 *
 * This is what a farmer on a dead connection gets. The stops and the route
 * still render, correctly positioned relative to each other, because those are
 * our own GeoJSON — only the world underneath is missing. A blank panel would
 * have told them nothing; this still shows the shape of the haul.
 */
export const PAPER_ONLY_STYLE = {
  version: 8,
  name: 'KrushiFlow paper',
  sources: {},
  layers: [{ id: 'paper', type: 'background', paint: { 'background-color': PAPER } }],
};

/** Repaints one layer in place. Flat colours override any data-driven paint. */
const retintLayer = (layer) => {
  const id = layer.id || '';
  const paint = { ...(layer.paint || {}) };

  if (layer.type === 'background') {
    return { ...layer, paint: { ...paint, 'background-color': PAPER } };
  }

  /*
   * POIs, house numbers and shields are noise on a screen whose subject is a
   * truck route. Hidden rather than recoloured — the fewer marks on the ground,
   * the louder our own stops read.
   */
  if (layer.type === 'symbol' && has(id, 'poi', 'housenumber', 'shield')) {
    return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
  }

  if (layer.type === 'symbol') {
    return {
      ...layer,
      paint: {
        ...paint,
        'text-color': has(id, 'water') ? INK_FAINT : INK,
        'text-halo-color': PAPER,
        'text-halo-width': 1.4,
      },
    };
  }

  if (layer.type === 'fill' || layer.type === 'fill-extrusion') {
    const key = layer.type === 'fill' ? 'fill-color' : 'fill-extrusion-color';
    if (has(id, 'water')) return { ...layer, paint: { ...paint, [key]: WATER } };
    if (has(id, 'building')) return { ...layer, paint: { ...paint, [key]: BUILDING } };
    if (has(id, 'park', 'wood', 'grass', 'landcover', 'landuse', 'sand', 'cemetery')) {
      return { ...layer, paint: { ...paint, [key]: GREEN } };
    }
    return { ...layer, paint: { ...paint, [key]: PAPER } };
  }

  if (layer.type === 'line') {
    if (has(id, 'water')) return { ...layer, paint: { ...paint, 'line-color': WATER } };
    if (has(id, 'boundary', 'admin')) {
      return { ...layer, paint: { ...paint, 'line-color': INK_FAINT, 'line-opacity': 0.35 } };
    }
    if (has(id, 'motorway', 'trunk')) {
      return { ...layer, paint: { ...paint, 'line-color': ROAD_TRUNK } };
    }
    if (has(id, 'major', 'primary', 'secondary', 'railway', 'rail')) {
      return { ...layer, paint: { ...paint, 'line-color': ROAD_MAJOR } };
    }
    if (has(id, 'casing')) return { ...layer, paint: { ...paint, 'line-color': RULE } };
    return { ...layer, paint: { ...paint, 'line-color': ROAD_MINOR } };
  }

  return layer;
};

export const retintStyle = (style) => ({
  ...style,
  layers: (style.layers || []).map(retintLayer),
});

/*
 * One fetch per session, shared by every map on every screen. The dispatcher
 * opens a map per suggestion card; without this each one would re-download and
 * re-walk the same style document.
 */
let stylePromise = null;

export const loadMapStyle = () => {
  if (stylePromise) return stylePromise;

  stylePromise = fetch(BASEMAP_STYLE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`basemap style ${res.status}`);
      return res.json();
    })
    .then(retintStyle)
    .catch((err) => {
      // Degrade, never fail: paper and our own marks. Not cached as a
      // rejection, so a map opened after the connection returns tries again.
      console.warn('Basemap unavailable, drawing on paper only:', err.message);
      stylePromise = null;
      return PAPER_ONLY_STYLE;
    });

  return stylePromise;
};
