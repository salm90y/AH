const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importTarget = `import { createServer } from "http";`;
const importReplacement = `import { createServer } from "http";
import multer from "multer";
import fs2 from "fs";`;

code = code.replace(importTarget, importReplacement);

const uploadTarget = `async function startServer() {
  const app = express();`;

const uploadReplacement = `async function startServer() {
  const app = express();
  
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs2.existsSync(uploadDir)) {
    fs2.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit
  
  app.use('/uploads', express.static(uploadDir));
  
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: \`/uploads/\${req.file.filename}\` });
  });`;

code = code.replace(uploadTarget, uploadReplacement);

fs.writeFileSync('server.ts', code);
