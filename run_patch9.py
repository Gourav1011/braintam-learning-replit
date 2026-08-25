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

backup = target + ".bak_patch9"
shutil.copyfile(target, backup)
print(f"💾 Backup created: {backup}")

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Mobile Info Strip Container styling
old_mobile_info = 'className="classroom-mobile-info flex items-center justify-between px-2 flex-shrink-0 gap-1" style={{ height: 28, background: "transparent", borderBottom: "1px solid rgba(255,107,26,0.35)" }}'
new_mobile_info = 'className="classroom-mobile-info flex items-center justify-between px-3 flex-shrink-0 gap-1 bg-slate-950/90 border-b border-orange-500/40 backdrop-blur-sm" style={{ height: 32 }}'

# 2. Update Rotate / Fullscreen Mobile Control Buttons styling
old_mobile_btn = 'className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center active:scale-90 transition-all"'
new_mobile_btn = 'className="w-7 h-7 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/60 flex items-center justify-center active:scale-90 transition-all shadow-sm"'

# 3. Update Portrait Rotate Prompt styling
old_rotate_prompt = 'className={`live-classroom-rotate-prompt classroom-role-${role}`}'
new_rotate_prompt = 'className={`live-classroom-rotate-prompt classroom-role-${role} bg-slate-950/95 backdrop-blur-md`}'

replacements = [
    (old_mobile_info, new_mobile_info),
    (old_mobile_btn, new_mobile_btn),
    (old_rotate_prompt, new_rotate_prompt),
]

modified = content
applied = 0

for old, new in replacements:
    if old in modified:
        modified = modified.replace(old, new)
        applied += 1

if applied == 0:
    print("⚠️ No matching mobile view elements found (already patched or modified).")
    os.remove(backup)
    sys.exit(0)

with open(target, "w", encoding="utf-8") as f:
    f.write(modified)

print(f"✅ Successfully updated {applied} mobile view elements for Patch 09!")
os.remove(backup)
print("🎉 Patch 09 applied cleanly!")
