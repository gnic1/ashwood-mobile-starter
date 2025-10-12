export async function getNarration(seed: string, choice?: string) {
  // Placeholder to keep Phase 2 bootstrapped without secrets
  const base = "A cold draft crawls along the manor hall. Candlelight trembles.";
  if (choice) {
    return `${base} You chose: "${choice}". The walls seem to lean in, listening...`;
  }
  return `${base} Somewhere above, a floorboard sighs.`;
}
