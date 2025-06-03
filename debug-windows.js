const fs = require("fs");
const path = require("path");

console.log("=== Windows Build Debug Info ===");
console.log("Platform:", process.platform);
console.log("Architecture:", process.arch);
console.log("Node version:", process.version);
console.log("Current working directory:", process.cwd());

// Check if build files exist
const distDir = path.join(process.cwd(), "dist");
const rendererDir = path.join(distDir, "renderer");
const mainDir = path.join(distDir, "main");
const indexHtml = path.join(rendererDir, "index.html");
const mainJs = path.join(mainDir, "main.js");

console.log("\n=== File System Check ===");
console.log("dist directory exists:", fs.existsSync(distDir));
console.log("renderer directory exists:", fs.existsSync(rendererDir));
console.log("main directory exists:", fs.existsSync(mainDir));
console.log("index.html exists:", fs.existsSync(indexHtml));
console.log("main.js exists:", fs.existsSync(mainJs));

if (fs.existsSync(rendererDir)) {
  console.log("\n=== Renderer Directory Contents ===");
  try {
    const files = fs.readdirSync(rendererDir);
    files.forEach((file) => {
      const filePath = path.join(rendererDir, file);
      const stats = fs.statSync(filePath);
      console.log(`${file} (${stats.isDirectory() ? "dir" : "file"}, ${stats.size} bytes)`);
    });
  } catch (error) {
    console.error("Error reading renderer directory:", error.message);
  }
}

if (fs.existsSync(indexHtml)) {
  console.log("\n=== index.html Contents ===");
  try {
    const content = fs.readFileSync(indexHtml, "utf8");
    console.log(content);
  } catch (error) {
    console.error("Error reading index.html:", error.message);
  }
}

console.log("\n=== Path Resolution Test ===");
console.log("__dirname would be:", __dirname);
console.log(
  'path.join(__dirname, "..", "renderer", "index.html"):',
  path.join(__dirname, "..", "renderer", "index.html")
);
console.log(
  'path.resolve(process.cwd(), "dist", "renderer", "index.html"):',
  path.resolve(process.cwd(), "dist", "renderer", "index.html")
);
