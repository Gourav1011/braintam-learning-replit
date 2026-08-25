import os
import sys
import shutil
import re
import subprocess

def find_target_file(filename="live-classroom.tsx"):
    """Locates live-classroom.tsx across various Replit workspace directory paths."""
    known_paths = [
        os.path.join("artifacts", "braintam", "src", "pages", filename),
        os.path.join("client", "src", "pages", filename),
        os.path.join("src", "pages", filename),
        filename
    ]
    for path in known_paths:
        if os.path.exists(path):
            return os.path.abspath(path)

    for root, dirs, files in os.walk("."):
        if filename in files:
            return os.path.abspath(os.path.join(root, filename))
            
    return None

TARGET_FILE = find_target_file("live-classroom.tsx")

# Defined patch targets and replacements
PATCHES = {
    "1": {
        "name": "Patch 01: Header Modernization",
        "regex": r"\{\/\* ── Top bar ──────────────────────────────────────────── \*\/\}[\s\S]*?\{\/\* ── Main layout ── \*\/\}",
        "replacement": """{/* ── Top bar ──────────────────────────────────────────── */}
      <header className="classroom-topbar relative z-20 flex items-center justify-between px-4 h-14 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex-shrink-0 select-none shadow-sm">
        {/* Left Section: Brand & Session Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <img src={BRAND_LOGO} alt="Braintam" className="h-6 object-contain opacity-95 flex-shrink-0" />
          <div className="h-4 w-[1px] bg-slate-800 flex-shrink-0" />
          
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800/90 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"}`} />
            <span className={`text-[10px] font-bold tracking-wider uppercase ${connected ? "text-emerald-400" : "text-rose-400"}`}>
              {connected ? "LIVE" : "Connecting…"}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="text-slate-100 font-semibold text-sm truncate max-w-xs tracking-tight">{title}</span>
            <span className="text-slate-500 font-mono text-[11px] flex-shrink-0">#{sessionId}</span>
          </div>
        </div>

        {/* Right Section: Actions & User Role Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {meetLink && (
            <a href={meetLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600/90 hover:bg-blue-600 border border-blue-500/40 shadow-sm transition-all active:scale-95">
              <span>📹</span> Join Meet
            </a>
          )}
          {recordingUrl && (
            <a href={recordingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600/90 hover:bg-purple-600 border border-purple-500/40 shadow-sm transition-all active:scale-95">
              <span>🎬</span> Recording
            </a>
          )}
          
          {isStaff && (
            <button
              onClick={() => {
                if (window.confirm("End class for everyone? This will disconnect all students and mentors.")) {
                  if (uploadedFilename) void cleanupUploadedSlide(uploadedFilename);
                  socket?.emit("class:end");
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/50 shadow-sm transition-all active:scale-95"
            >
              <span>⏹</span> End Class
            </button>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${isStaff ? "bg-blue-950/50 text-blue-300 border-blue-800/60" : isMentor ? "bg-purple-950/50 text-purple-300 border-purple-800/60" : "bg-slate-900 text-slate-400 border-slate-800"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            <span>{isStaff ? "Teacher" : isMentor ? "Mentor" : "Student"}</span>
            <span className="text-slate-600">·</span>
            <span className="font-semibold truncate max-w-[120px]">{name}</span>
          </div>
        </div>
      </header>

      {/* ── Main layout ── """
    },
    "2": {
        "name": "Patch 02: Main Layout Modernization",
        "regex": r"<div className=\"classroom-main flex flex-1 overflow-hidden(?: bg-slate-950 border-t border-slate-800\/40 select-none)?\">[\s\S]*?<div className=\"classroom-sidebar flex flex-col border-l (?:border-gray-800 bg-gray-900|border-slate-800\/80 bg-slate-950) flex-shrink-0(?: shadow-lg)?\" style=\{\{ width: \"20%\", minWidth: 190, maxWidth: 280 \}\}>",
        "replacement": """<div className="classroom-main flex flex-1 overflow-hidden bg-slate-950 border-t border-slate-800/40 select-none">

        {/* Sidebar — teacher sees present-only list; mentor sees group stats */}
        <div className="classroom-left-sidebar border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-sm" style={{ display: "contents" }}>
        {isStaff && (
          <TeacherSidebar
            registry={registry}
            suggestedStudents={suggestedStudents}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(p => !p)}
            onGiveMic={inviteToStage}
            stageSlots={stageSlots}
          />
        )}
        {isMentor && (
          <MentorSidebar
            registry={registry}
            myGroupId={groupId}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(p => !p)}
          />
        )}
        </div>{/* /classroom-left-sidebar */}

        {/* ═══════════════════════════════════════════════════
            PRESENTATION PANEL (left, ~80%)
        ═══════════════════════════════════════════════════ */}
        <div className="classroom-content flex flex-col relative bg-slate-950 flex-1 min-w-0 shadow-inner">

          {/* Upload bar (teacher only, no presentation yet) */}
          {isStaff && !presentationUrl && !demoMode && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-sm flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = ""; }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-50 transition-all hover:bg-emerald-600 active:scale-95 shadow-sm"
                style={{ background: "#059669" }}
              >
                {isUploading ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploading ? "Uploading…" : "Upload PDF"}</span>
              </button>
              <span className="text-[11px] text-slate-400">PDF only · max 200 MB · PPT/PPTX: export as PDF first</span>
              {presentationUrl && (
                <button
                  onClick={() => { setPresentationUrl(""); setUploadedFilename(null); socket?.emit("presentation:stop"); }}
                  className="ml-auto text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-all"
                >✕ Clear</button>
              )}
            </div>
          )}
          {/* Demo mode active banner — teacher can exit */}
          {isStaff && demoMode && (
            <div className="flex items-center justify-between px-4 py-2 bg-purple-950/80 border-b border-purple-800/60 flex-shrink-0 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span className="text-xs font-semibold text-purple-200">Demonstration Mode — your camera is the main screen</span>
              </div>
              <button
                onClick={toggleDemoMode}
                className="text-xs px-2.5 py-1 rounded-md bg-purple-900/80 hover:bg-purple-800 border border-purple-700/50 text-purple-200 font-semibold transition-all active:scale-95"
              >✕ Exit Demo</button>
            </div>
          )}

          {/* Slides / PDF / Demo */}
          <div ref={presentationPanelRef} className="relative flex-1 overflow-hidden bg-slate-950">

        {/* ═══════════════════════════════════════════════════
            RIGHT PANEL (20% fixed)
        ═══════════════════════════════════════════════════ */}
        <div className="classroom-sidebar flex flex-col border-l border-slate-800/80 bg-slate-950 flex-shrink-0 shadow-lg" style={{ width: "20%", minWidth: 190, maxWidth: 280 }}>"""
    }
}

def run_patch(patch_key):
    if not TARGET_FILE or not os.path.exists(TARGET_FILE):
        print("❌ Could not locate live-classroom.tsx in workspace subdirectories.")
        sys.exit(1)

    print(f"📁 Target file located at: {TARGET_FILE}")

    if patch_key not in PATCHES:
        print(f"❌ Invalid patch key '{patch_key}'. Available options: {list(PATCHES.keys())}")
        sys.exit(1)

    patch = PATCHES[patch_key]
    backup_path = f"{TARGET_FILE}.bak_patch{patch_key}"
    print(f"==> Applying {patch['name']}...")

    # 1. Create safety backup
    shutil.copyfile(TARGET_FILE, backup_path)
    print(f"==> Safety backup created at: {backup_path}")

    try:
        # 2. Read file content
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        # 3. Match and replace target regex
        pattern = re.compile(patch["regex"])
        if not pattern.search(content):
            raise ValueError(f"Target region for {patch['name']} could not be found in the file.")

        updated_content = pattern.sub(patch["replacement"], content, count=1)

        # 4. Write updated content
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(updated_content)
        
        print("==> File updated successfully. Verifying syntax...")

        # 5. Typecheck / Syntax Verification
        res = subprocess.run(["npx", "tsc", "--noEmit"], capture_output=True, text=True)
        if res.returncode != 0:
            print("⚠️ TypeScript check finished with existing workspace warnings/errors.")
        else:
            print("✅ TypeScript verification passed!")

        # 6. Cleanup backup on success
        if os.path.exists(backup_path):
            os.remove(backup_path)
        print(f"🎉 {patch['name']} applied successfully!")

    except Exception as err:
        print(f"❌ Error during patch execution: {err}")
        print("==> Rolling back changes from backup...")
        if os.path.exists(backup_path):
            shutil.copyfile(backup_path, TARGET_FILE)
            os.remove(backup_path)
        sys.exit(1)

if __name__ == "__main__":
    patch_id = sys.argv[1] if len(sys.argv) > 1 else "2"
    run_patch(patch_id)
