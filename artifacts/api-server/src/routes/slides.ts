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
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [".pdf", ".ppt", ".pptx"].includes(ext));
  },
});

const router = Router();

router.post("/api/slides/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded or unsupported type (PDF, PPT, PPTX only)" });
    return;
  }
  const ext = path.extname(req.file.filename).toLowerCase();
  res.json({
    filename: req.file.filename,
    fileUrl: `/api/slides/${req.file.filename}`,
    isPptx: ext === ".pptx" || ext === ".ppt",
  });
});

router.get("/api/slides/:filename", (req, res) => {
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

router.delete("/api/slides/:filename", (req, res) => {
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
