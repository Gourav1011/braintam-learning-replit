import os
import sys
import shutil
import re

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

backup = target + ".bak_patch2"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update classroom-main container classes
old_main = '<div className="classroom-main flex flex-1 overflow-hidden">'
new_main = '<div className="classroom-main flex flex-1 overflow-hidden bg-slate-950 border-t border-slate-800/40 select-none">'

# 2. Update classroom-left-sidebar styling
old_sidebar_left = '<div className="classroom-left-sidebar"'
new_sidebar_left = '<div className="classroom-left-sidebar border-r border-slate-800/60 bg-slate-900/60 backdrop-blur-sm"'

# 3. Update classroom-content background
old_content = '<div className="classroom-content flex flex-col relative bg-gray-950 flex-1 min-w-0">'
new_content = '<div className="classroom-content flex flex-col relative bg-slate-950 flex-1 min-w-0 shadow-inner">'

# 4. Update presentation panel wrapper background
old_pres_panel = '<div ref={presentationPanelRef} className="relative flex-1 overflow-hidden">'
new_pres_panel = '<div ref={presentationPanelRef} className="relative flex-1 overflow-hidden bg-slate-950">'

# 5. Update right sidebar container styling
old_sidebar_right = '<div className="classroom-sidebar flex flex-col border-l border-gray-800 bg-gray-900 flex-shrink-0"'
new_sidebar_right = '<div className="classroom-sidebar flex flex-col border-l border-slate-800/80 bg-slate-950 flex-shrink-0 shadow-lg"'

replacements = [
    (old_main, new_main),
    (old_sidebar_left, new_sidebar_left),
    (old_content, new_content),
    (old_pres_panel, new_pres_panel),
    (old_sidebar_right, new_sidebar_right),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new, 1)
        applied += 1

if applied == 0:
    print("⚠️ No matching layout containers found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} layout container sections for Patch 02!")
os.remove(backup)
print("🎉 Patch 02 applied cleanly!")
