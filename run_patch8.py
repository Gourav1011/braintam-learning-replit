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

backup = target + ".bak_patch8"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Floating Raise Hand Button styling
old_raisehand_btn = 'className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm shadow-2xl transition-all active:scale-95 ${myHandRaised ? "text-white border-2 border-yellow-400" : "text-white"}`}'
new_raisehand_btn = 'className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm shadow-2xl backdrop-blur-md transition-all active:scale-95 ${myHandRaised ? "text-white border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]" : "text-white hover:brightness-110"}`}'

# 2. Update Quick Messages Popup Modal styling
old_quickchat_modal = 'className="absolute left-2 bottom-full mb-2 z-50 w-[260px] max-w-[calc(100vw-24px)] max-h-[300px] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-1.5"'
new_quickchat_modal = 'className="absolute left-2 bottom-full mb-2 z-50 w-[260px] max-w-[calc(100vw-24px)] max-h-[300px] overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-2xl p-2 backdrop-blur-md"'

# 3. Update Quick Messages Trigger Button styling
old_quickchat_btn = 'className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"'
new_quickchat_btn = 'className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-lg hover:bg-slate-700/80 active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"'

replacements = [
    (old_raisehand_btn, new_raisehand_btn),
    (old_quickchat_modal, new_quickchat_modal),
    (old_quickchat_btn, new_quickchat_btn),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new)
        applied += 1

if applied == 0:
    print("⚠️ No matching bottom control elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} bottom control elements for Patch 08!")
os.remove(backup)
print("🎉 Patch 08 applied cleanly!")
