import zipfile

zip_path="/mnt/data/files.zip"

with zipfile.ZipFile(zip_path,"r") as z:
    z.extractall(".")

print("Done.")
print("Extracted:")
for f in z.namelist():
    print(" -",f)
