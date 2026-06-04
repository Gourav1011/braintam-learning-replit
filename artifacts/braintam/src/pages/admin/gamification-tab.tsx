import { useState, useEffect } from "react";
import { Zap, Trophy, Target, Rocket, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

interface XPValues { login: number; homework: number; test: number; recording: number; liveClass: number; competition: number; referral: number; }
interface GamificationSettings {
  xpEnabled: boolean; leaderboardEnabled: boolean; dailyMissionsEnabled: boolean; spaceJourneyEnabled: boolean;
  xpValues: XPValues;
}

function Toggle({ checked, onChange, label, description, icon: Icon, color }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: checked ? color + "22" : "#F3F4F6" }}>
          <Icon className="w-5 h-5" style={{ color: checked ? color : "#9CA3AF" }} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: NAVY }}>{label}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? "bg-green-500" : "bg-gray-200"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function XPInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0"
          max="500"
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-7 w-20 text-xs text-right"
        />
        <span className="text-xs text-gray-400 w-5">XP</span>
      </div>
    </div>
  );
}

export function GamificationTab() {
  const [settings, setSettings] = useState<GamificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/gamification/settings");
      if (r.ok) setSettings(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await apiFetch("/admin/gamification/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (r.ok) {
        setSettings(await r.json());
        setMsg({ text: "Settings saved successfully!", ok: true });
      } else {
        setMsg({ text: "Failed to save settings.", ok: false });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  function setToggle(key: keyof Omit<GamificationSettings, "xpValues">, val: boolean) {
    setSettings(prev => prev ? { ...prev, [key]: val } : null);
  }

  function setXP(key: keyof XPValues, val: number) {
    setSettings(prev => prev ? { ...prev, xpValues: { ...prev.xpValues, [key]: val } } : null);
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Gamification Control Center</h2>
          <p className="text-xs text-gray-400 mt-0.5">Configure XP, badges, and student engagement features</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Feature Toggles */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Feature Toggles</p>
        <div className="space-y-2">
          <Toggle checked={settings.xpEnabled} onChange={v => setToggle("xpEnabled", v)}
            label="XP System" description="Students earn XP for completing activities"
            icon={Zap} color="#F59E0B" />
          <Toggle checked={settings.leaderboardEnabled} onChange={v => setToggle("leaderboardEnabled", v)}
            label="Leaderboard" description="Show student rankings and competition"
            icon={Trophy} color="#3B82F6" />
          <Toggle checked={settings.dailyMissionsEnabled} onChange={v => setToggle("dailyMissionsEnabled", v)}
            label="Daily Missions" description="Daily challenges and streaks for students"
            icon={Target} color="#22C55E" />
          <Toggle checked={settings.spaceJourneyEnabled} onChange={v => setToggle("spaceJourneyEnabled", v)}
            label="Space Journey" description="Planet-level progression system"
            icon={Rocket} color="#8B5CF6" />
        </div>
      </div>

      {/* XP Values */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{ color: ORANGE }} />
          <h3 className="text-sm font-bold" style={{ color: NAVY }}>XP Values</h3>
          <span className="text-xs text-gray-400 ml-1">· Points awarded per activity</span>
        </div>
        <div>
          <XPInput label="Daily Login" value={settings.xpValues.login} onChange={v => setXP("login", v)} />
          <XPInput label="Homework Submitted" value={settings.xpValues.homework} onChange={v => setXP("homework", v)} />
          <XPInput label="Test Completed" value={settings.xpValues.test} onChange={v => setXP("test", v)} />
          <XPInput label="Recording Watched" value={settings.xpValues.recording} onChange={v => setXP("recording", v)} />
          <XPInput label="Live Class Attended" value={settings.xpValues.liveClass} onChange={v => setXP("liveClass", v)} />
          <XPInput label="Competition Winner" value={settings.xpValues.competition} onChange={v => setXP("competition", v)} />
          <XPInput label="Referral Bonus" value={settings.xpValues.referral} onChange={v => setXP("referral", v)} />
        </div>
      </div>

      {/* Space Journey Levels Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold" style={{ color: NAVY }}>Space Journey Levels</h3>
        </div>
        <div className="space-y-2">
          {[
            { level: "Earth Explorer", xp: "0+", color: "#22C55E" },
            { level: "Moon Explorer", xp: "100+", color: "#6B7280" },
            { level: "Mars Explorer", xp: "500+", color: "#EF4444" },
            { level: "Saturn Explorer", xp: "1,000+", color: "#F59E0B" },
            { level: "Galaxy Master", xp: "2,500+", color: "#3B82F6" },
            { level: "Universe Champion", xp: "5,000+", color: "#8B5CF6" },
          ].map(l => (
            <div key={l.level} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                <span className="text-xs font-semibold" style={{ color: l.color }}>{l.level}</span>
              </div>
              <span className="text-xs text-gray-400">{l.xp} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="text-white gap-1.5" style={{ background: ORANGE }}>
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
