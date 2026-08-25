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

backup = target + ".bak_patch6"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Staff/Mentor Tab Bar Container styling
old_tabs = 'className="flex border-b border-gray-800 flex-shrink-0"'
new_tabs = 'className="flex border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm flex-shrink-0"'

# 2. Update Chat Composer Bar styling
old_composer = 'className="classroom-composer border-t border-gray-800 flex gap-2 flex-shrink-0 p-2"'
new_composer = 'className="classroom-composer border-t border-slate-800/80 bg-slate-900/90 flex gap-2 flex-shrink-0 p-2 backdrop-blur-sm"'

# 3. Update Input Element Styling (standard student/staff inputs)
old_input = 'className="flex-1 min-w-0 bg-gray-800 text-white rounded-lg px-2.5 py-1.5 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"'
new_input = 'className="flex-1 min-w-0 bg-slate-800/90 text-slate-100 rounded-xl px-3 py-1.5 border border-slate-700/60 outline-none placeholder-slate-500 focus:border-blue-500/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"'

# 4. Update Send Button styling
old_send_btn = 'className="w-11 h-11 rounded-xl text-white flex items-center justify-center flex-shrink-0 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"'
new_send_btn = 'className="w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 hover:opacity-95 active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"'

replacements = [
    (old_tabs, new_tabs),
    (old_composer, new_composer),
    (old_input, new_input),
    (old_send_btn, new_send_btn),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new)
        applied += 1

if applied == 0:
    print("⚠️ No matching chat panel elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} chat panel elements for Patch 06!")
os.remove(backup)
print("🎉 Patch 06 applied cleanly!")
