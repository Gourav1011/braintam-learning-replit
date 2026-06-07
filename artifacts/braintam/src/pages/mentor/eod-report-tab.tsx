import { useState, useEffect } from "react";
import { Loader2, FileText, Send, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const NAVY = "#0B2B6B";
const GREEN = "#059669";
const ORANGE = "#FF6B1A";

interface EodReport {
  id: number | null; mentorId: number; reportDate: string;
  studentsContacted: number; callsCompleted: number;
  followUpsCompleted: number; followUpsPending: number;
  doubtSessionsConducted: number; classesObserved: number;
  challengesFaced: string | null; studentsNeedingAttention: string | null;
  parentConcerns: string | null; remarks: string | null;
  createdAt?: string;
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 text-center shadow-sm">
      <div className="text-xl font-black" style={{ color: NAVY }}>{value}</div>
      <div className="text-[10px] font-bold mt-0.5" style={{ color }}>{label}</div>
    </div>
  );
}

function PastReport({ report }: { report: EodReport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-sm" style={{ color: NAVY }}>{report.reportDate}</span>
          <div className="flex gap-2 text-[10px]">
            <span className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">{report.studentsContacted} contacted</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">{report.callsCompleted} calls</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-3">
            <MetricBox label="Contacted" value={report.studentsContacted} color={GREEN} />
            <MetricBox label="Calls" value={report.callsCompleted} color="#2563EB" />
            <MetricBox label="FU Done" value={report.followUpsCompleted} color={GREEN} />
            <MetricBox label="FU Pending" value={report.followUpsPending} color={ORANGE} />
            <MetricBox label="Doubt Sessions" value={report.doubtSessionsConducted} color="#6366F1" />
            <MetricBox label="Classes Observed" value={report.classesObserved} color={NAVY} />
          </div>
          {report.challengesFaced && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Challenges Faced</div>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{report.challengesFaced}</p></div>
          )}
          {report.studentsNeedingAttention && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Students Needing Attention</div>
              <p className="text-xs text-gray-600 bg-orange-50 rounded-lg p-2">{report.studentsNeedingAttention}</p></div>
          )}
          {report.parentConcerns && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Concerns</div>
              <p className="text-xs text-gray-600 bg-yellow-50 rounded-lg p-2">{report.parentConcerns}</p></div>
          )}
          {report.remarks && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Remarks</div>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{report.remarks}</p></div>
          )}
        </div>
      )}
    </div>
  );
}

export function EodReportTab({ apiFetch }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
}) {
  const [prefill, setPrefill] = useState<EodReport | null>(null);
  const [pastReports, setPastReports] = useState<EodReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [studentsContacted, setStudentsContacted] = useState("0");
  const [callsCompleted, setCallsCompleted] = useState("0");
  const [followUpsCompleted, setFollowUpsCompleted] = useState("0");
  const [followUpsPending, setFollowUpsPending] = useState("0");
  const [doubtSessionsConducted, setDoubtSessionsConducted] = useState("0");
  const [classesObserved, setClassesObserved] = useState("0");
  const [challengesFaced, setChallengesFaced] = useState("");
  const [studentsNeedingAttention, setStudentsNeedingAttention] = useState("");
  const [parentConcerns, setParentConcerns] = useState("");
  const [remarks, setRemarks] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    const [prefillRes, pastRes] = await Promise.all([
      apiFetch("/mentor/eod-reports/today-prefill"),
      apiFetch("/mentor/eod-reports"),
    ]);
    if (prefillRes.ok) {
      const d: EodReport = await prefillRes.json();
      setPrefill(d);
      setStudentsContacted(String(d.studentsContacted));
      setCallsCompleted(String(d.callsCompleted));
      setFollowUpsCompleted(String(d.followUpsCompleted));
      setFollowUpsPending(String(d.followUpsPending));
      setDoubtSessionsConducted(String(d.doubtSessionsConducted));
      setClassesObserved(String(d.classesObserved));
      setChallengesFaced(d.challengesFaced ?? "");
      setStudentsNeedingAttention(d.studentsNeedingAttention ?? "");
      setParentConcerns(d.parentConcerns ?? "");
      setRemarks(d.remarks ?? "");
    }
    if (pastRes.ok) {
      const all: EodReport[] = await pastRes.json();
      setPastReports(all.filter(r => r.reportDate !== today));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit() {
    setSaving(true);
    const r = await apiFetch("/mentor/eod-reports", {
      method: "POST",
      body: JSON.stringify({
        reportDate: today,
        studentsContacted: Number(studentsContacted),
        callsCompleted: Number(callsCompleted),
        followUpsCompleted: Number(followUpsCompleted),
        followUpsPending: Number(followUpsPending),
        doubtSessionsConducted: Number(doubtSessionsConducted),
        classesObserved: Number(classesObserved),
        challengesFaced: challengesFaced || null,
        studentsNeedingAttention: studentsNeedingAttention || null,
        parentConcerns: parentConcerns || null,
        remarks: remarks || null,
      }),
    });
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      await load();
    }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>;

  const isExisting = prefill?.id !== null && prefill?.id !== undefined;

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>End of Day Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Daily work summary for {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Today's report form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: NAVY }} />
          <span className="font-black text-sm" style={{ color: NAVY }}>Today's Report — {today}</span>
          {isExisting && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Saved</span>}
        </div>

        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase mb-2">Auto-filled Activity Summary</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "Contacted", key: "studentsContacted", val: studentsContacted, color: GREEN },
              { label: "Calls", key: "callsCompleted", val: callsCompleted, color: "#2563EB" },
              { label: "FU Done", key: "followUpsCompleted", val: followUpsCompleted, color: GREEN },
              { label: "FU Pending", key: "followUpsPending", val: followUpsPending, color: ORANGE },
              { label: "Doubt Sessions", key: "doubtSessions", val: doubtSessionsConducted, color: "#6366F1" },
              { label: "Classes Seen", key: "classesObserved", val: classesObserved, color: NAVY },
            ].map(item => (
              <div key={item.key} className="text-center">
                <div
                  className="w-full text-center text-xl font-black rounded-xl py-2"
                  style={{ color: NAVY, background: "#F1F5F9", border: "1px solid #E2E8F0" }}
                >
                  {item.val}
                </div>
                <div className="text-[9px] font-bold mt-0.5" style={{ color: item.color }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Challenges Faced</label>
            <textarea value={challengesFaced} onChange={e => setChallengesFaced(e.target.value)} rows={3} placeholder="Any difficulties or blockers today?"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Students Needing Attention</label>
            <textarea value={studentsNeedingAttention} onChange={e => setStudentsNeedingAttention(e.target.value)} rows={3} placeholder="Students who need special follow-up?"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Parent Concerns</label>
            <textarea value={parentConcerns} onChange={e => setParentConcerns(e.target.value)} rows={3} placeholder="Parent feedback or concerns raised?"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Any other notes or remarks…"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>

        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: saving ? "#9CA3AF" : saved ? GREEN : NAVY }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {saving ? "Submitting…" : saved ? "Report Saved!" : isExisting ? "Update Today's Report" : "Submit End of Day Report"}
        </button>
      </div>

      {/* Past reports */}
      {pastReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black" style={{ color: NAVY }}>Past Reports ({pastReports.length})</h2>
          {pastReports.map(r => <PastReport key={`${r.reportDate}-${r.id}`} report={r} />)}
        </div>
      )}
    </div>
  );
}
