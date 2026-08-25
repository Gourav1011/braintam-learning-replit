import os
import sys
import shutil

def locate_file():
    paths = [
        "artifacts/braintam/src/pages/live-classroom.tsx",
        "client/src/pages/live-classroom.tsx",
        "src/pages/live-classroom.tsx",
    ]
    for p in paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    for root, _, files in os.walk("."):
        if "live-classroom.tsx" in files:
            return os.path.abspath(os.path.join(root, "live-classroom.tsx"))
    return None

target = locate_file()
if not target:
    print("❌ Could not find live-classroom.tsx")
    sys.exit(1)

print(f"📁 Target file: {target}")

backup = target + ".bak_patch10"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Class Paused Overlay backdrop styling
old_paused_overlay = 'className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"'
new_paused_overlay = 'className="absolute inset-0 z-50 bg-slate-950/85 flex flex-col items-center justify-center gap-3 backdrop-blur-md transition-all"'

# 2. Update Leaderboard Modal Backdrop styling
old_lb_backdrop = 'className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"'
new_lb_backdrop = 'className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-50 transition-all"'

# 3. Update Mic Invite Dialog styling
old_mic_dialog = 'className="pointer-events-auto animate-bounce-once rounded-2xl shadow-2xl border border-green-700/50 px-5 py-4 flex flex-col items-center gap-3 max-w-xs w-full mx-4"'
new_mic_dialog = 'className="pointer-events-auto animate-bounce-once rounded-2xl shadow-2xl border border-emerald-500/50 px-5 py-4 flex flex-col items-center gap-3 max-w-xs w-full mx-4 backdrop-blur-md bg-slate-900/95"'

# 4. Update Payment Brochure Backdrop styling
old_brochure_bg = 'className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"'
new_brochure_bg = 'className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all"'

replacements = [
    (old_paused_overlay, new_paused_overlay),
    (old_lb_backdrop, new_lb_backdrop),
    (old_mic_dialog, new_mic_dialog),
    (old_brochure_bg, new_brochure_bg),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new)
        applied += 1

if applied == 0:
    print("⚠️ No matching modal/overlay elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} modal/overlay elements for Patch 10!")
os.remove(backup)
print("🎉 Patch 10 applied cleanly!")
