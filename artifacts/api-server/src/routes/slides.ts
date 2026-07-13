import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const SLIDES_DIR = "/tmp/braintam-slides";
if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: SLIDES_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [".pdf", ".ppt", ".pptx"].includes(ext));
  },
});

const router = Router();

router.post("/slides/upload", upload.single("file"), (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "Unsupported file type — only PDF, PPT, or PPTX allowed." });
    return;
  }
  const ext = path.extname(req.file.filename).toLowerCase();
  res.json({
    filename: req.file.filename,
    fileUrl: `/api/slides/${req.file.filename}`,
    isPptx: ext === ".pptx" || ext === ".ppt",
  });
  void next;
});

// multer error handler — catches LIMIT_FILE_SIZE and other upload errors
router.use("/slides/upload", (err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  const msg = err instanceof Error ? err.message : "Upload error";
  const isLimit = msg.includes("LIMIT_FILE_SIZE") || msg.includes("File too large");
  res.status(400).json({ error: isLimit ? "File is too large (max 60 MB)." : `Upload failed: ${msg}` });
});

router.get("/slides/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w-]+\.(pdf|ppt|pptx)$/i.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const filePath = path.join(SLIDES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

router.delete("/slides/:filename", (req, res) => {
  const { filename } = req.params;
  if (!/^[\w-]+\.(pdf|ppt|pptx)$/i.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  try {
    const filePath = path.join(SLIDES_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
