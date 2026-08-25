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

backup = target + ".bak_patch4"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update PDF upload action bar styling
old_upload_bar = 'className="flex items-center gap-3 p-3 bg-gray-900 border-b border-gray-800 flex-shrink-0"'
new_upload_bar = 'className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-sm flex-shrink-0"'

# 2. Update Demo Mode alert banner styling
old_demo_banner = 'className="flex items-center justify-between px-4 py-2 bg-purple-950 border-b border-purple-800 flex-shrink-0"'
new_demo_banner = 'className="flex items-center justify-between px-4 py-2 bg-purple-950/80 border-b border-purple-800/60 flex-shrink-0 backdrop-blur-sm"'

# 3. Update Presentation Watermark Logo styling
old_watermark = 'className="absolute top-3 right-3 z-10 pointer-events-none"'
new_watermark = 'className="absolute top-3 right-3 z-10 pointer-events-none drop-shadow-lg opacity-85 hover:opacity-100 transition-opacity"'

# 4. Update Annotation Toolbar styling
old_annot_bar = 'className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border-t border-gray-800 flex-shrink-0 flex-wrap"'
new_annot_bar = 'className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-md flex-shrink-0 flex-wrap shadow-inner"'

replacements = [
    (old_upload_bar, new_upload_bar),
    (old_demo_banner, new_demo_banner),
    (old_watermark, new_watermark),
    (old_annot_bar, new_annot_bar),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new, 1)
        applied += 1

if applied == 0:
    print("⚠️ No matching presentation elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} presentation container elements for Patch 04!")
os.remove(backup)
print("🎉 Patch 04 applied cleanly!")
