"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserRound,
  Plus,
  Trash2,
  Loader2,
  X,
  Upload,
} from "lucide-react";
import {
  type Character,
  getCharacters,
  saveCharacter,
  deleteCharacter,
} from "@/lib/characters";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setCharacters(getCharacters());
  }, []);

  const handleCreated = (char: Character) => {
    setCharacters(getCharacters());
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    // Delete files from server
    await fetch("/api/characters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    // Delete from localStorage
    deleteCharacter(id);
    setCharacters(getCharacters());
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <UserRound className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-semibold">Characters</h1>
          <span className="text-xs text-gray-500">
            {characters.length} saved
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Character
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {characters.length === 0 && !showCreate ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onDelete={() => handleDelete(char.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateCharacterModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <UserRound className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-200">
          No characters yet
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Create your first character by uploading a reference photo. The AI
          will describe their physical features once, and you can reuse them
          in any flow.
        </p>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Character
        </button>
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  onDelete,
}: {
  character: Character;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={character.imagePath}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-200 truncate">
          {character.name}
        </h3>
        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
          {character.description}
        </p>
      </div>

      {/* Delete button */}
      {confirmDelete ? (
        <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center gap-2 p-4">
          <p className="text-xs text-gray-400 text-center">Delete this character?</p>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 text-xs rounded-md border border-gray-700 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CreateCharacterModal({
  onCreated,
  onClose,
}: {
  onCreated: (char: Character) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [imageData, setImageData] = useState("");
  const [providerId, setProviderId] = useState("mistral");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!name.trim() || !imageData) return;

    setLoading(true);
    setError("");

    try {
      const id = crypto.randomUUID();

      // Step 1: Describe persona via vision API
      const describeRes = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [{ data: imageData, filename: "persona.jpg", type: "persona" }],
          providerId,
        }),
      });

      if (!describeRes.ok) {
        const err = await describeRes.json().catch(() => ({ error: "Describe failed" }));
        throw new Error(err.error || "Failed to describe character");
      }

      const { description } = await describeRes.json();

      // Step 2: Save image to server filesystem
      const saveRes = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: name.trim(), imageData }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Failed to save character image");
      }

      const { imagePath } = await saveRes.json();

      // Step 3: Save to localStorage
      const char: Character = {
        id,
        name: name.trim(),
        description,
        imagePath,
        createdAt: Date.now(),
      };

      saveCharacter(char);
      onCreated(char);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">New Character</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            {imageData ? (
              <div className="relative group">
                <img
                  src={imageData}
                  alt="Character preview"
                  className="w-full h-48 object-cover rounded-xl border border-gray-700"
                />
                <button
                  onClick={() => setImageData("")}
                  className="absolute top-2 right-2 p-1 rounded-md bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors cursor-pointer gap-2"
              >
                <Upload className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">
                  Upload character photo
                </span>
              </button>
            )}
          </div>

          {/* Name */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />

          {/* Provider */}
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="mistral">Mistral AI</option>
            <option value="glm">GLM (Zhipu)</option>
            <option value="claude">Claude (CLI)</option>
          </select>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !imageData || loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Describing...
                </>
              ) : (
                "Create Character"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
