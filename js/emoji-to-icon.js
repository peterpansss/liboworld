/**
 * Libo emoji→lucide icon helper for HTML contexts.
 *
 * Mirrors libo-landing/react-app/src/utils/icons.ts and
 * libo-app-v2/src/utils/icons.ts — keep these three files in sync when the
 * NTC-aesthetic icon mapping is updated.
 *
 * Usage:
 *   1. Load Lucide UMD + this file in the page:
 *        <script src="https://unpkg.com/lucide@latest"></script>
 *        <script src="js/emoji-to-icon.js"></script>
 *   2. In template strings, use:
 *        `${LiboIcons.iconHTML('🔥', { size: 18 })}`
 *   3. After each innerHTML write that may contain icon placeholders, call:
 *        LiboIcons.refresh();
 *      (equivalent to `lucide.createIcons()`)
 */
(function (global) {
  var STROKE = 1.75;

  // Mirrors iconForEmoji in react-app/src/utils/icons.ts.
  // Value = lucide icon kebab-name (the value accepted by `data-lucide`).
  var EMOJI_TO_LUCIDE = {
    '💪': 'dumbbell',
    '🔥': 'flame',
    '⚡': 'zap',
    '🏋️': 'dumbbell',
    '🏋': 'dumbbell',
    '🎯': 'target',
    '🏃': 'footprints',
    '🧘': 'leaf',
    '⏱️': 'clock',
    '⏱': 'clock',
    '⏰': 'clock',
    '🕐': 'clock',
    '🌡️': 'thermometer',
    '🌡': 'thermometer',
    '🧊': 'snowflake',
    '🏅': 'award',
    '🏆': 'trophy',
    '🎟️': 'ticket',
    '🎟': 'ticket',
    '💰': 'coins',
    '💧': 'droplets',
    '🤝': 'handshake',
    '🎁': 'gift',
    '🎉': 'party-popper',
    '🔍': 'search',
    '📹': 'video',
    '📊': 'bar-chart-3',
    '📈': 'trending-up',
    '🌟': 'star',
    '🦾': 'sparkles',
    '💥': 'flame',
    '✏️': 'pencil',
    '✨': 'sparkles',
    '💫': 'sparkles',
    '📋': 'clipboard-list',
    '📱': 'smartphone',
    '💡': 'lightbulb',
    '👤': 'user',
    '🫂': 'users',
    '🔒': 'lock',
    '✉️': 'mail',
    '👁': 'eye',
    '👁️': 'eye',
    '👀': 'eye',
    '✕': 'circle',
    '✓': 'check-circle-2',
    '✅': 'check-circle-2',
    '🔄': 'refresh-cw',
    '🏟️': 'building-2',
    '🏟': 'building-2',
    '🏠': 'home',
    '🏡': 'home',
    '⚙️': 'settings',
    '⚙': 'settings',
    '🛋️': 'sofa',
    '🛋': 'sofa',
    '🚶': 'person-standing',
    '🚴': 'bike',
    '❤️': 'heart',
    '❤': 'heart',
    '❤️‍🔥': 'heart-pulse',
    '☀️': 'sun',
    '☀': 'sun',
    '🌙': 'moon',
    '😴': 'moon',
    '😪': 'moon',
    '🌅': 'sunrise',
    '😌': 'smile',
    '😊': 'smile',
    '😐': 'meh',
    '🎂': 'cake',
    '📏': 'ruler',
    '📐': 'ruler',
    '⚖️': 'scale',
    '⚖': 'scale',
    '🏁': 'flag',
    '🌱': 'sprout',
    '🌿': 'leaf',
    '🌳': 'tree-pine',
    '🩹': 'bandage',
    '🥗': 'salad',
    '🍽️': 'utensils',
    '🍽': 'utensils',
    '🚀': 'rocket',
    '🧠': 'brain',
    '📆': 'calendar',
    '📅': 'calendar',
    '🧗': 'mountain',
    '🔋': 'battery',
    '🤔': 'help-circle',
    '🫁': 'wind',
    '♂️': 'user',
    '♂': 'user',
    '♀️': 'user',
    '♀': 'user',
    '⚧': 'user',
    '⚧️': 'user',
    '🔝': 'arrow-up',
    '⬆️': 'arrow-up',
    '⬆': 'arrow-up',
    '🙌': 'hand-metal',
    '👋': 'hand-metal',
    '🟠': 'circle',
    '🔸': 'circle',
    '🌍': 'globe',
    '🚪': 'door-open',
    '👑': 'crown',
    '🎨': 'sparkles',
    '🦵': 'dumbbell',
    '🍑': 'target',
    '🤸': 'activity',
    '🧬': 'activity',
    '🪑': 'sofa',
    // Added during landing-site sweep
    '💎': 'gem',
    '💶': 'euro',
    '💻': 'laptop',
    '🖥': 'monitor',
    '🖥️': 'monitor',
    '🤖': 'bot',
    '🥑': 'salad',
    '🥩': 'beef',
    '🤷': 'help-circle',
    '😓': 'frown',
    '😩': 'frown',
    '🪢': 'cable',
    '🫀': 'heart',
    '🧱': 'blocks',
    '🔀': 'shuffle',
    '🔁': 'repeat',
    '🌆': 'sunset',
    '📍': 'map-pin',
    '📲': 'smartphone',
    '📷': 'camera',
    '📚': 'library',
    '🍎': 'apple',
    '🔙': 'arrow-left',
    '🔲': 'square',
    '★': 'star',
    '👨': 'user',
    '👩': 'user',
    '🧑': 'user',
  };

  function resolve(emojiOrName, fallback) {
    if (!emojiOrName) return fallback || 'dumbbell';
    return EMOJI_TO_LUCIDE[emojiOrName] || fallback || 'dumbbell';
  }

  /**
   * Return an HTML placeholder string that Lucide will hydrate into an <svg>
   * on the next call to `lucide.createIcons()`.
   *
   * @param {string} emojiOrName  Source emoji (or a raw lucide name).
   * @param {object} [opts]
   * @param {number} [opts.size=20]         Pixel size (width = height).
   * @param {string} [opts.color]           CSS color (defaults to currentColor).
   * @param {number} [opts.stroke=1.75]     Stroke width.
   * @param {string} [opts.className]       Extra class names.
   * @param {string} [opts.fallback]        Fallback lucide name if emoji unmapped.
   */
  function iconHTML(emojiOrName, opts) {
    opts = opts || {};
    var name = resolve(emojiOrName, opts.fallback);
    var size = opts.size != null ? opts.size : 20;
    var stroke = opts.stroke != null ? opts.stroke : STROKE;
    var color = opts.color ? ' color:' + opts.color + ';' : '';
    var cls = opts.className ? ' class="' + opts.className + '"' : '';
    return (
      '<i data-lucide="' + name + '"' + cls +
      ' width="' + size + '"' +
      ' height="' + size + '"' +
      ' stroke-width="' + stroke + '"' +
      ' style="display:inline-block;vertical-align:middle;' + color + '"></i>'
    );
  }

  /** Hydrate all `<i data-lucide="...">` placeholders to SVG. No-op if lucide is absent. */
  function refresh() {
    if (global.lucide && typeof global.lucide.createIcons === 'function') {
      global.lucide.createIcons();
    }
  }

  global.LiboIcons = {
    EMOJI_TO_LUCIDE: EMOJI_TO_LUCIDE,
    STROKE: STROKE,
    resolve: resolve,
    iconHTML: iconHTML,
    refresh: refresh,
  };
})(typeof window !== 'undefined' ? window : this);
