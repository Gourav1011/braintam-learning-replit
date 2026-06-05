import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronRight, ChevronLeft, Video, BookOpen, Calendar, Clock, Eye, EyeOff, Globe, GlobeLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface DemoBatch {
  id: number; title: string; description: string | null;
  teacherName: string | null; bannerUrl: string | null; joinLink: string | null;
  startDate: string | null; endDate: string | null; status: string;
  isActive: boolean; isPublic: boolean; grade: number | null; subject: string | null; totalDays: number;
}

interface DemoSession {
  id: number; batchId: number; title: string; description: string | null;
  dayNumber: number; scheduledAt: string; duration: number;
  joinUrl: string | null; recordingUrl: string | null; homeworkText: string | null;
  status: string; isPublished: boolean;
}

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const STATUSES = ["upcoming", "active", "completed"];

const emptyBatch = { title: "", description: "", teacherName: "", bannerUrl: "", joinLink: "", startDate: "", endDate: "", grade: "", subject: "", totalDays: "5" };
const emptySession = { title: "", description: "", dayNumber: "1", scheduledAt: "", duration: "60", joinUrl: "", recordingUrl: "", homeworkText: "" };

export function DemoBatchesTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [batches, setBatches] = useState<DemoBatch[]>([]);
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<DemoBatch | null>(null);
  const [view, setView] = useState<"batches" | "sessions">("batches");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [sessionForm, setSessionForm] = useState(emptySession);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/demo-batches");
      if (r.ok) setBatches(await r.json());
    } finally { setLoading(false); }
  }, []);

  const loadSessions = useCallback(async (batchId: number) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${batchId}/sessions`);
      if (r.ok) setSessions(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  async function createBatch() {
    if (!batchForm.title.trim()) { flash("Title required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/demo-batches", {
        method: "POST",
        body: JSON.stringify({
          title: batchForm.title, description: batchForm.description || undefined,
          teacherName: batchForm.teacherName || undefined, bannerUrl: batchForm.bannerUrl || undefined,
          joinLink: batchForm.joinLink || undefined,
          startDate: batchForm.startDate || undefined, endDate: batchForm.endDate || undefined,
          grade: batchForm.grade ? Number(batchForm.grade) : undefined,
          subject: batchForm.subject || undefined, totalDays: Number(batchForm.totalDays) || 5,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Demo batch created");
      setBatchForm(emptyBatch);
      setShowAddBatch(false);
      loadBatches();
    } catch { flash("Failed to create batch", false); }
    finally { setBusy(false); }
  }

  async function deleteBatch(id: number) {
    if (!confirm("Delete this batch and all its sessions?")) return;
    await apiFetch(`/admin/demo-batches/${id}`, { method: "DELETE" });
    loadBatches();
    flash("Batch deleted");
  }

  async function toggleBatchStatus(batch: DemoBatch) {
    await apiFetch(`/admin/demo-batches/${batch.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !batch.isActive }),
    });
    loadBatches();
  }

  async function toggleBatchPublish(batch: DemoBatch) {
    await apiFetch(`/admin/demo-batches/${batch.id}`, {
      method: "PUT",
      body: JSON.stringify({ isPublic: !batch.isPublic }),
    });
    loadBatches();
    flash(batch.isPublic ? "Batch hidden from public" : "Batch published publicly");
  }

  async function toggleSessionPublish(session: DemoSession) {
    if (!selectedBatch) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${session.id}`, {
      method: "PUT",
      body: JSON.stringify({ isPublished: !session.isPublished }),
    });
    loadSessions(selectedBatch.id);
  }

  function openSessions(batch: DemoBatch) {
    setSelectedBatch(batch);
    setView("sessions");
    loadSessions(batch.id);
  }

  async function createSession() {
    if (!selectedBatch) return;
    if (!sessionForm.title.trim()) { flash("Title required", false); return; }
    if (!sessionForm.scheduledAt) { flash("Scheduled time required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          title: sessionForm.title, description: sessionForm.description || undefined,
          dayNumber: Number(sessionForm.dayNumber) || 1,
          scheduledAt: sessionForm.scheduledAt,
          duration: Number(sessionForm.duration) || 60,
          joinUrl: sessionForm.joinUrl || undefined,
          recordingUrl: sessionForm.recordingUrl || undefined,
          homeworkText: sessionForm.homeworkText || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Session created");
      setSessionForm(emptySession);
      setShowAddSession(false);
      loadSessions(selectedBatch.id);
    } catch { flash("Failed to create session", false); }
    finally { setBusy(false); }
  }

  async function deleteSession(id: number) {
    if (!selectedBatch) return;
    if (!confirm("Delete this session?")) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${id}`, { method: "DELETE" });
    loadSessions(selectedBatch.id);
    flash("Session deleted");
  }

  async function updateSessionStatus(session: DemoSession, status: string) {
    if (!selectedBatch) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${session.id}`, {
      method: "PUT", body: JSON.stringify({ status }),
    });
    loadSessions(selectedBatch.id);
  }

  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    live: "bg-red-100 text-red-700",
  };

  if (loading && view === "batches" && batches.length === 0) {
    return <div className="text-gray-400 text-sm p-4">Loading...</div>;
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Batches View ── */}
      {view === "batches" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ color: NAVY }}>Demo Batches</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage 5-day workshops, webinars, and demo classes</p>
            </div>
            <Button onClick={() => setShowAddBatch(!showAddBatch)} style={{ background: ORANGE }}
              className="text-white hover:opacity-90 gap-2">
              <Plus className="w-4 h-4" />New Batch
            </Button>
          </div>

          {/* Create Form */}
          {showAddBatch && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: NAVY }}>New Demo Batch</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Batch title *" value={batchForm.title} onChange={e => setBatchForm(p => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Teacher name" value={batchForm.teacherName} onChange={e => setBatchForm(p => ({ ...p, teacherName: e.target.value }))} />
                <Input placeholder="Subject (e.g. Maths)" value={batchForm.subject} onChange={e => setBatchForm(p => ({ ...p, subject: e.target.value }))} />
                <Select value={batchForm.grade} onValueChange={v => setBatchForm(p => ({ ...p, grade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Grade (optional)" /></SelectTrigger>
                  <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Total days (e.g. 5)" value={batchForm.totalDays} onChange={e => setBatchForm(p => ({ ...p, totalDays: e.target.value }))} min={1} max={30} />
                <Input placeholder="Default join link" value={batchForm.joinLink} onChange={e => setBatchForm(p => ({ ...p, joinLink: e.target.value }))} />
                <Input type="datetime-local" placeholder="Start date" value={batchForm.startDate} onChange={e => setBatchForm(p => ({ ...p, startDate: e.target.value }))} />
                <Input type="datetime-local" placeholder="End date" value={batchForm.endDate} onChange={e => setBatchForm(p => ({ ...p, endDate: e.target.value }))} />
                <Input placeholder="Banner image URL (optional)" value={batchForm.bannerUrl} onChange={e => setBatchForm(p => ({ ...p, bannerUrl: e.target.value }))} className="md:col-span-2" />
                <Textarea placeholder="Description (optional)" value={batchForm.description} onChange={e => setBatchForm(p => ({ ...p, description: e.target.value }))} rows={2} className="md:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button onClick={createBatch} disabled={busy} style={{ background: NAVY }} className="text-white text-sm">
                  {busy ? "Creating..." : "Create Batch"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowAddBatch(false); setBatchForm(emptyBatch); }} className="text-sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Batch list */}
          {batches.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Video className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No demo batches yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map(batch => (
                <div key={batch.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{batch.title}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[batch.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {batch.status}
                      </span>
                      {!batch.isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {batch.teacherName && <span>by {batch.teacherName}</span>}
                      {batch.subject && <span>{batch.subject}</span>}
                      {batch.grade && <span>Grade {batch.grade}</span>}
                      <span><Clock className="w-3 h-3 inline mr-0.5" />{batch.totalDays}-Day Batch</span>
                      {batch.startDate && <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(batch.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="text-xs gap-1"
                      onClick={() => openSessions(batch)}>
                      Sessions <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className={`text-xs gap-1 ${batch.isPublic ? "text-green-600 hover:text-green-800" : "text-gray-400 hover:text-green-600"}`}
                      title={batch.isPublic ? "Published publicly — click to unpublish" : "Draft — click to publish"}
                      onClick={() => toggleBatchPublish(batch)}>
                      {batch.isPublic ? <Globe className="w-3.5 h-3.5" /> : <GlobeLock className="w-3.5 h-3.5" />}
                      {batch.isPublic ? "Published" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => toggleBatchStatus(batch)}>
                      {batch.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                      onClick={() => deleteBatch(batch.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Sessions View ── */}
      {view === "sessions" && selectedBatch && (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => { setView("batches"); setSelectedBatch(null); setSessions([]); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
              <ChevronLeft className="w-4 h-4" />Demo Batches
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-semibold" style={{ color: NAVY }}>{selectedBatch.title}</span>
          </div>

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold" style={{ color: NAVY }}>Sessions</h2>
              <p className="text-sm text-gray-500">Manage days/sessions for this batch</p>
            </div>
            <Button onClick={() => setShowAddSession(!showAddSession)} style={{ background: ORANGE }}
              className="text-white hover:opacity-90 gap-2">
              <Plus className="w-4 h-4" />Add Session
            </Button>
          </div>

          {/* Add Session Form */}
          {showAddSession && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: NAVY }}>New Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Session title *" value={sessionForm.title} onChange={e => setSessionForm(p => ({ ...p, title: e.target.value }))} />
                <Input type="number" placeholder="Day number *" value={sessionForm.dayNumber} onChange={e => setSessionForm(p => ({ ...p, dayNumber: e.target.value }))} min={1} />
                <Input type="datetime-local" placeholder="Scheduled at *" value={sessionForm.scheduledAt} onChange={e => setSessionForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                <Input type="number" placeholder="Duration (minutes)" value={sessionForm.duration} onChange={e => setSessionForm(p => ({ ...p, duration: e.target.value }))} min={1} />
                <Input placeholder="Join URL (Zoom/Meet)" value={sessionForm.joinUrl} onChange={e => setSessionForm(p => ({ ...p, joinUrl: e.target.value }))} />
                <Input placeholder="Recording URL (after class)" value={sessionForm.recordingUrl} onChange={e => setSessionForm(p => ({ ...p, recordingUrl: e.target.value }))} />
                <Textarea placeholder="Homework / notes (optional)" value={sessionForm.homeworkText} onChange={e => setSessionForm(p => ({ ...p, homeworkText: e.target.value }))} rows={2} className="md:col-span-2" />
                <Textarea placeholder="Description (optional)" value={sessionForm.description} onChange={e => setSessionForm(p => ({ ...p, description: e.target.value }))} rows={2} className="md:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSession} disabled={busy} style={{ background: NAVY }} className="text-white text-sm">
                  {busy ? "Adding..." : "Add Session"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowAddSession(false); setSessionForm(emptySession); }} className="text-sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Sessions list */}
          {loading ? (
            <div className="text-gray-400 text-sm text-center py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No sessions yet. Add the first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id}
                  className="flex items-start gap-4 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  {/* Day badge */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: session.status === "live" ? "#EF4444" : NAVY }}>
                    {session.dayNumber}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-gray-900">{session.title}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[session.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span><Calendar className="w-3 h-3 inline mr-0.5" />
                        {new Date(session.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span><Clock className="w-3 h-3 inline mr-0.5" />{session.duration} min</span>
                      {session.joinUrl && <span className="text-blue-600">Join link ✓</span>}
                      {session.recordingUrl && <span className="text-purple-600">Recording ✓</span>}
                      {session.homeworkText && <span className="text-green-600">Homework ✓</span>}
                    </div>
                    {session.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{session.description}</p>}
                    {/* Status changer */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => updateSessionStatus(session, s)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-all font-medium ${session.status === s ? "border-transparent text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                          style={session.status === s ? { background: NAVY } : {}}>
                          {s}
                        </button>
                      ))}
                      <button onClick={() => updateSessionStatus(session, "live")}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-all font-medium ${session.status === "live" ? "border-transparent bg-red-500 text-white" : "border-gray-200 text-gray-500 hover:border-red-300"}`}>
                        live
                      </button>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleSessionPublish(session)}
                      title={session.isPublished ? "Published — click to hide" : "Hidden — click to publish"}
                      className={`p-1.5 rounded-lg transition-colors ${session.isPublished ? "text-green-600 hover:bg-green-50" : "text-gray-300 hover:text-green-500 hover:bg-green-50"}`}>
                      {session.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5"
                      onClick={() => deleteSession(session.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
