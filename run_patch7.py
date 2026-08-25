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

backup = target + ".bak_patch7"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Teacher Sidebar Container styling
old_tsidebar = 'className="flex flex-col border-r border-gray-800 bg-gray-900 flex-shrink-0"'
new_tsidebar = 'className="flex flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-sm flex-shrink-0 shadow-md"'

# 2. Update Teacher Search Input styling
old_tsearch = 'className="w-full bg-gray-800 text-white text-[10px] rounded-md px-2 py-1 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600"'
new_tsearch = 'className="w-full bg-slate-800/90 text-slate-100 text-[10px] rounded-lg px-2.5 py-1 border border-slate-700/60 outline-none placeholder-slate-500 focus:border-blue-500/80 transition-all"'

# 3. Update Mentor Group Stats Grid Border styling
old_mgrid = 'className="grid grid-cols-3 border-b border-gray-800 flex-shrink-0"'
new_mgrid = 'className="grid grid-cols-3 border-b border-slate-800/80 bg-slate-950/40 flex-shrink-0"'

# 4. Update Q&A Modal Backdrop styling
old_qnamodal = 'className="fixed inset-0 z-[200] flex items-center justify-center"'
new_qnamodal = 'className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-md bg-slate-950/80 transition-all"'

replacements = [
    (old_tsidebar, new_tsidebar),
    (old_tsearch, new_tsearch),
    (old_mgrid, new_mgrid),
    (old_qnamodal, new_qnamodal),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new)
        applied += 1

if applied == 0:
    print("⚠️ No matching participant/sidebar elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} participant sidebar elements for Patch 07!")
os.remove(backup)
print("🎉 Patch 07 applied cleanly!")
