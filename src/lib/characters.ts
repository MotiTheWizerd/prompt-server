export interface Character {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  createdAt: number;
}

const STORAGE_KEY = "characters";

export function getCharacters(): Character[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCharacter(char: Character): void {
  const chars = getCharacters();
  chars.push(char);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function deleteCharacter(id: string): void {
  const chars = getCharacters().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}
