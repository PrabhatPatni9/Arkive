// 128-word list for recovery phrases. 12 words = 84 bits entropy with Argon2id KDF on top.
// Words are short, common, and visually distinct when handwritten.
export const WORDLIST: readonly string[] = [
  'abandon', 'able',    'acid',    'adapt',   'adult',   'afraid',  'agree',   'aim',
  'alarm',   'alien',   'allow',   'alter',   'anchor',  'angle',   'angry',   'ankle',
  'answer',  'apart',   'apple',   'arch',    'arctic',  'argue',   'arm',     'army',
  'arrive',  'art',     'athlete', 'atlas',   'atom',    'awful',   'balance', 'basic',
  'battle',  'beach',   'beam',    'bear',    'begin',   'belong',  'bitter',  'blade',
  'blast',   'blend',   'block',   'bloom',   'blue',    'bold',    'bonus',   'border',
  'borrow',  'brave',   'brew',    'bridge',  'bright',  'broken',  'burn',    'calm',
  'camp',    'carbon',  'castle',  'cedar',   'chain',   'charge',  'chase',   'chart',
  'cheap',   'check',   'child',   'claim',   'clean',   'clear',   'climb',   'cloud',
  'coast',   'coral',   'craft',   'crane',   'cross',   'crowd',   'crush',   'curve',
  'dark',    'dawn',    'deck',    'deed',    'dense',   'depth',   'dirt',    'dock',
  'draft',   'drain',   'drama',   'draw',    'dream',   'drift',   'drum',    'dust',
  'eager',   'earth',   'eight',   'elite',   'equal',   'event',   'every',   'extra',
  'faith',   'false',   'fence',   'field',   'firm',    'flash',   'fleet',   'float',
  'flood',   'floor',   'fluid',   'flute',   'focus',   'fold',    'force',   'frame',
  'fresh',   'front',   'frost',   'fruit',   'fuel',    'gauge',   'giant',   'glade',
] as const

export function generateRecoveryPhrase(randomBytes: Uint8Array): string {
  if (randomBytes.length < 12) throw new RangeError('Need at least 12 bytes')
  return Array.from(randomBytes.slice(0, 12))
    .map(b => WORDLIST[b & 0x7f])
    .join(' ')
}
