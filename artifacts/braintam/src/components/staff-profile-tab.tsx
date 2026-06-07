import { useState, useRef } from "react";
import { Camera, Save, Loader2, CheckCircle2 } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

export interface StaffUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatarUrl?: string | null;
  school?: string | null;
}

interface Props {
  user: StaffUser;
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  flash?: (msg: string, ok?: boolean) => void;
  onSaved?: (updated: StaffUser) => void;
}

export function StaffProfileTab({ user, apiFetch, flash, onSaved }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [school, setSchool] = useState(user.school ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = ev => { setAvatarPreview(ev.target?.result as string); setError(""); };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const r = await apiFetch("/staff/me", {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), school: school.trim() || null, avatarUrl: avatarPreview || null }),
    });
    if (r.ok) {
      const d = await r.json();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      if (flash) flash("Profile updated successfully!");
      if (onSaved) onSaved(d);
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Failed to save profile.");
      if (flash) flash(d.error ?? "Failed to save profile.", false);
    }
    setSaving(false);
  }

  const initials = (name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-lg space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 shadow-sm">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-2xl"
            style={{ background: avatarPreview ? "transparent" : NAVY }}>
            {avatarPreview
              ? <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
              : initials}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
            style={{ background: ORANGE }}
            title="Change photo">
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <div className="font-black text-sm" style={{ color: NAVY }}>{user.name}</div>
          <div className="text-xs text-gray-400 capitalize mt-0.5">{user.role}</div>
          <button onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs font-semibold underline underline-offset-2"
            style={{ color: ORANGE }}>
            Change Photo
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>Profile Details</h3>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name</label>
          <input value={name} onChange={e => { setName(e.target.value); setError(""); }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">School / Organisation</label>
          <input value={school} onChange={e => setSchool(e.target.value)} placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            Email <span className="font-normal text-gray-400">(contact admin to change)</span>
          </label>
          <input value={user.email ?? "—"} readOnly
            className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm outline-none bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            Phone <span className="font-normal text-gray-400">(contact admin to change)</span>
          </label>
          <input value={user.phone ?? "—"} readOnly
            className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm outline-none bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
          style={{ background: saving ? "#9CA3AF" : GREEN }}>
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
            ? <CheckCircle2 className="w-4 h-4" />
            : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
