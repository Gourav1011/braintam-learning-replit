import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/api-base";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

interface BlockedWord {
  id: number;
  word: string;
  isActive: boolean;
  createdAt: string;
}

export function BlockedWordsTab() {
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showFlash = (type: "ok" | "err", msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/chat-moderation/blocked-words");
      const d = await r.json();
      setWords(d.words ?? []);
    } catch {
      showFlash("err", "Failed to load blocked words");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    setAdding(true);
    try {
      const r = await apiFetch("/chat-moderation/blocked-words", {
        method: "POST",
        body: JSON.stringify({ word: w, isActive: true }),
      });
      if (!r.ok) throw new Error("Failed");
      setNewWord("");
      showFlash("ok", `"${w}" added to blocked words`);
      await load();
    } catch {
      showFlash("err", "Failed to add word");
    } finally {
      setAdding(false);
    }
  };

  const toggleWord = async (id: number, isActive: boolean) => {
    try {
      await apiFetch(`/chat-moderation/blocked-words/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      setWords(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w));
    } catch {
      showFlash("err", "Failed to toggle word");
    }
  };

  const deleteWord = async (id: number, word: string) => {
    if (!confirm(`Remove "${word}" from blocked words?`)) return;
    try {
      await apiFetch(`/chat-moderation/blocked-words/${id}`, { method: "DELETE" });
      setWords(prev => prev.filter(w => w.id !== id));
      showFlash("ok", `"${word}" removed`);
    } catch {
      showFlash("err", "Failed to delete word");
    }
  };

  const activeCount = words.filter(w => w.isActive).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base" style={{ color: NAVY }}>Chat Moderation — Blocked Words</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Words in this list are automatically filtered from student chat. Matched words are replaced with <code className="bg-gray-100 px-1 rounded">---</code>.
            3 violations = auto-block.
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {flash && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${flash.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {flash.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-black" style={{ color: NAVY }}>{words.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Words</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-black" style={{ color: ORANGE }}>{activeCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Active Filters</div>
        </div>
      </div>

      {/* Add new word */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" style={{ color: NAVY }} />
          <span className="font-semibold text-sm" style={{ color: NAVY }}>Add New Word</span>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Type a word to block (e.g. badword)"
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !adding && addWord()}
          />
          <button
            onClick={addWord}
            disabled={adding || !newWord.trim()}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: NAVY }}
          >
            <Plus className="w-4 h-4" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Words are matched case-insensitively with word boundaries. The list refreshes every 60 seconds on the live-class server — no deploy needed.
        </p>
      </div>

      {/* Word list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm" style={{ color: NAVY }}>Blocked Words List</span>
          <span className="text-xs text-gray-400">{words.length} word{words.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : words.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No blocked words yet. Add words above to enable chat moderation.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {words.map(w => (
              <div key={w.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-semibold px-2 py-0.5 rounded-lg ${w.isActive ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-400 line-through"}`}>
                    {w.word}
                  </span>
                  {!w.isActive && (
                    <span className="text-[10px] bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWord(w.id, w.isActive)}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                    title={w.isActive ? "Deactivate" : "Activate"}
                  >
                    {w.isActive
                      ? <ToggleRight className="w-4 h-4 text-green-600" />
                      : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => deleteWord(w.id, w.word)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
