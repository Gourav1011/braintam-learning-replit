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

backup = target + ".bak_patch3"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# Target and update the Teacher Camera Panel wrapper styling
old_video_container = 'className="classroom-teacher-video relative bg-black flex-shrink-0 overflow-hidden"'
new_video_container = 'className="classroom-teacher-video relative bg-slate-950 flex-shrink-0 overflow-hidden border-b border-slate-800/80 shadow-md group"'

# Target and update the label badge styling
old_label = '<span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Teacher</span>'
new_label = '<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Teacher</span></div>'

# Target and update round logo styling
old_logo = 'className="absolute top-2 right-2 z-10 rounded-full pointer-events-none"'
new_logo = 'className="absolute top-2 right-2 z-10 rounded-full pointer-events-none drop-shadow-md border border-slate-700/50"'

replacements = [
    (old_video_container, new_video_container),
    (old_label, new_label),
    (old_logo, new_logo),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new, 1)
        applied += 1

if applied == 0:
    print("⚠️ No matching teacher camera elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} teacher video container elements for Patch 03!")
os.remove(backup)
print("🎉 Patch 03 applied cleanly!")
