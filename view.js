#!/usr/bin/env node

const express = require("express");
const fs = require("fs");
const path = require("path");
const open = require('open');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

/**
 * 递归收集目录中的图像文件路径，并将它们组织成嵌套的对象结构。
 *
 * @param {string} dir - 开始遍历的目录。
 * @param {string} baseDir - 用于创建相对路径的基目录。
 * @param {Object} [fileList={}] - 累积文件路径的对象。
 * @returns {Object} 包含所有找到的图像文件路径的对象。
 */
function getIconPaths(dir, baseDir, fileList = {}) {
  // 读取目录中的所有文件和子目录
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    // 如果是目录，则递归调用
    if (fs.statSync(filePath).isDirectory()) {
      getIconPaths(filePath, baseDir, fileList);
    } else if (/\.(png|jpg|jpeg|svg)$/i.test(file)) {
      // 如果是图像文件，则处理路径
      const folder = path.dirname(
        filePath.replace(baseDir, "").replace(/\\/g, "/")
      );
      if (!fileList[folder]) {
        fileList[folder] = [];
      }
      fileList[folder].push(filePath.replace(baseDir, "").replace(/\\/g, "/"));
    }
  });
  return fileList;
}

const app = express();
const iconsDir = path.join(process.cwd(), 'src/assets');
let iconPaths = getIconPaths(iconsDir, iconsDir);

// LiveReload server
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(iconsDir);

// Middleware to inject the livereload script
app.use(connectLivereload());

fs.watch(iconsDir, { recursive: true }, () => {
  iconPaths = getIconPaths(iconsDir, iconsDir);
  liveReloadServer.refresh('/');
  console.log('Icons updated');
});

app.use('/images', express.static(path.join(__dirname, 'images')));
// Serve CSS file
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>icons viewer</title>
      <link rel="stylesheet" href="/styles.css">
     
    </head>
    <body>
      <div class="title">
        <img class="titleIcon" src="/images/call.svg" alt="">
        <img class="titleIcon" src="/images/call.svg" alt="">
        <img class="titleIcon" src="/images/call.svg" alt="">
      </div>
      
      <div id="notification">已拷贝到剪切板~ 🎉🎉🎉</div>
      ${Object.entries(iconPaths)
        .map(
          ([folder, paths]) => `
        <div class="folder">
          <h2>${folder || "Root"}</h2>
          <div class="container">
            ${paths
              .map(
                (iconPath) => `
              <div class="icon">
                <img src="/src/assets${iconPath}" onclick="copyToClipboard('@/assets${iconPath}')" alt=""/>
                <p>${path.basename(iconPath)}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
        )
        .join("")}
      <div class="color-picker">
        <div class="color-display" id="currentColor"></div>
        <div class="colors">
          <div class="color" style="background-color: white;" onclick="changeIconBackgroundColor('white')"></div>
          <div class="color" style="background-color: lightgray;" onclick="changeIconBackgroundColor('lightgray')"></div>
          <div class="color" style="background-color: lightblue;" onclick="changeIconBackgroundColor('lightblue')"></div>
          <div class="color" style="background-color: lightgreen;" onclick="changeIconBackgroundColor('lightgreen')"></div>
          <div class="color" style="background-color: lightpink;" onclick="changeIconBackgroundColor('lightpink')"></div>
        </div>
      </div>
      <script>
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            const notification = document.getElementById('notification');
            notification.classList.add('show');
            setTimeout(() => {
              notification.classList.remove('show');
            }, 3000);
          });
        }
        function changeIconBackgroundColor(color) {
          document.querySelectorAll('img').forEach(img => {
            img.style.backgroundColor = color;
          });
          document.getElementById('currentColor').style.backgroundColor = color;
        }
      </script>
    </body>
    </html>
  `);
});

app.use('/src/assets', express.static(iconsDir));

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`running at : http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
