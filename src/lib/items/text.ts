const APOSTROPHES = /[‘’ʼ`´]/g;

const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\b([a-z]+)n't\b/g, "$1 not"],
  [/\bi'm\b/g, "i am"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(i|you|we|they)'ve\b/g, "$1 have"],
  [/\b(i|you|he|she|it|we|they)'ll\b/g, "$1 will"],
  [/\bcan not\b/g, "cannot"],
];

export function normalizeText(value: string): string {
  let text = value.normalize("NFKC").toLowerCase().replace(APOSTROPHES, "'");
  text = text.replace(/[.,!?;:"()]/g, " ").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of CONTRACTIONS) text = text.replace(pattern, replacement);
  return text.replace(/\s+/g, " ").trim();
}

export function sameText(given: string, expected: string): boolean {
  return normalizeText(given) === normalizeText(expected);
}
