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

backup = target + ".bak_patch5"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Student Self-View Floating Tile background styling
old_self_view = 'className="absolute bottom-4 left-4 z-50 w-32 rounded-xl overflow-hidden shadow-2xl border-2 border-green-500/70" style={{ background: "#0f172a" }}'
new_self_view = 'className="absolute bottom-4 left-4 z-50 w-32 rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500/80 bg-slate-900/90 backdrop-blur-md transition-all"'

# 2. Update Student Stage Tile Container styling
old_slot_card = 'className="rounded-xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-2 relative flex-shrink-0"'
new_slot_card = 'className="rounded-xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-2 relative flex-shrink-0 backdrop-blur-md transition-all hover:scale-[1.02]"'

# 3. Update Stage Name Tag Banner styling
old_slot_tag = 'className="px-2 py-1 bg-black/80 flex items-center justify-between gap-1"'
new_slot_tag = 'className="px-2 py-1 bg-slate-950/90 flex items-center justify-between gap-1 border-t border-slate-800/80"'

replacements = [
    (old_self_view, new_self_view),
    (old_slot_card, new_slot_card),
    (old_slot_tag, new_slot_tag),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new, 1)
        applied += 1

if applied == 0:
    print("⚠️ No matching stage/student grid elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} student stage grid elements for Patch 05!")
os.remove(backup)
print("🎉 Patch 05 applied cleanly!")
