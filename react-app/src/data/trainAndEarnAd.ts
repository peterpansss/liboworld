/**
 * The TRAIN AND EARN 3D ad (approved by Noah 18 Nov 2026), on Home under the hero.
 *
 * Masters: `Brand-Management/Marketing/SocialMediaContent/Accounts/@liboworld/Ads/train-and-earn-3d/final/`.
 * Web copies (H.264, faststart) were encoded from them into `final/web/` and
 * pushed to R2 with `scripts/upload-marketing-video.mjs`; mp4s are git-ignored,
 * so they cannot live in `public/`. Posters are WebP stills of frame 1 and do.
 *
 * Voice exists in English and German only. German visitors get the German cut,
 * everyone else the English one; Spanish, French and Portuguese visitors also
 * get subtitles in their language (Noah, 19 Nov 2026). Cue times follow the
 * English voice (whisper word times on the final mix). The cash line adds the
 * amount the voice leaves out, so amount and condition stay together (canon).
 * The same cues as .vtt files sit next to the web copies for YouTube.
 */

const CDN = 'https://videos.liboworld.com/marketing';
/** Bump when a file is re-encoded under the same name (Cloudflare caches per URL). */
const V = '2'; // 2: German cut re-rendered with "PS5-LOSE" (Noah, 19 Nov)

export type AdLang = 'en' | 'de';
export type AdFormat = 'wide' | 'tall';

export function adVideo(lang: AdLang, format: AdFormat) {
  const file = format === 'wide' ? `train-and-earn-${lang}-1080p.mp4` : `train-and-earn-${lang}-vertical.mp4`;
  const poster = `/ad-media/train-and-earn-${lang}-${format === 'wide' ? '16x9' : '9x16'}-poster.webp?v=${V}`;
  return { src: `${CDN}/${file}?v=${V}`, poster };
}

export type Cue = { start: number; end: number; text: string };

const TIMES: Array<[number, number]> = [
  [0.18, 1.8], [1.83, 2.95], [3.0, 4.55], [4.6, 6.15], [6.2, 7.38], [7.4, 8.55],
  [8.6, 10.65], [10.7, 13.2], [13.24, 14.25], [14.3, 17.05], [17.1, 19.55], [19.6, 21.5],
];

const LINES: Record<'es' | 'fr' | 'pt', string[]> = {
  es: [
    'Acababa de volver a entrenar,',
    'y entonces llegó el fin de semana.',
    'Festival, copas,',
    'ni miré mi cuenta del banco,',
    'y otra vez fuera de forma.',
    'Ahí es donde entra Libo.',
    'Cada entrenamiento que haces suma puntos.',
    'Puedes cambiar esos puntos por tarjetas regalo,',
    'por sorteos',
    'o por dinero (hasta 50 €) cuando terminas tu reto de 30 días.',
    'Y ahora vuelvo a estar en forma, y valió la pena.',
    'Libo. Train and earn.',
  ],
  fr: [
    "Je venais de reprendre l'entraînement,",
    'puis le week-end est arrivé.',
    'Festival, verres,',
    'même pas regardé mon compte en banque,',
    'et me revoilà hors de forme.',
    "C'est là que Libo entre en jeu.",
    'Chaque séance te rapporte des points.',
    'Tu peux les échanger contre des cartes cadeaux,',
    'des participations aux tirages au sort',
    "ou du cash (jusqu'à 50 €) quand tu termines ton défi de 30 jours.",
    'Et là, je suis de nouveau en forme, et ça a payé.',
    'Libo. Train and earn.',
  ],
  pt: [
    'Eu tinha acabado de voltar a treinar,',
    'aí chegou o fim de semana.',
    'Festival, drinks,',
    'nem olhei minha conta no banco,',
    'e fiquei fora de forma de novo.',
    'É aí que entra a Libo.',
    'Cada treino que você faz rende pontos.',
    'Você pode trocar esses pontos por vale-presentes,',
    'por sorteios',
    'ou por dinheiro (até 50 €) quando você termina seu desafio de 30 dias.',
    'E agora estou em forma de novo, e valeu a pena.',
    'Libo. Train and earn.',
  ],
};

/** Which cut a site language gets, and its subtitles (null = the voice is already in that language). */
export function adForLanguage(lng: string | undefined): { lang: AdLang; cues: Cue[] | null } {
  const code = (lng ?? 'en').slice(0, 2).toLowerCase();
  if (code === 'de') return { lang: 'de', cues: null };
  if (code === 'es' || code === 'fr' || code === 'pt') {
    return { lang: 'en', cues: TIMES.map(([start, end], i) => ({ start, end, text: LINES[code][i] })) };
  }
  return { lang: 'en', cues: null };
}
