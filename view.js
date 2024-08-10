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

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>icons viewer</title>
      <style>
      body {
        font-family: "ROBOTO", "PingFang SC", "Microsoft YaHei", sans-serif;
        margin: 0;
        padding: 20px;
      }
      h1 {
        text-align: center;
        margin-bottom: 30px;
        font-style: italic;
      }
      .folder {
        margin-bottom: 40px;
      }
      .folder h2 {
        background: linear-gradient(to right, #1D41E7 , #F42F3B);
        opacity: 0.8;
        color: #fff;
        padding: 10px;
        border-radius: 5px;
      }
      .container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
      }
      .icon {
        background-color: #fff;
        padding: 10px;
        border-radius: 10px;
        width: 100px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .icon:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
      }
      img {
        width: 70px;
        height: 70px;
        cursor: pointer;
        background-color: #fff;
        border-radius: 5px;
        margin-bottom: 5px;
      }
      p {
        margin: 0;
        font-size: 12px;
        word-wrap: break-word;
      }
      #notification {
        visibility: hidden;
        min-width: 250px;
        background: linear-gradient(to right, #eebd89 , #d13abd);
        color: #fff;
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        position: fixed;
        z-index: 1;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      #notification.show {
        visibility: visible;
        animation: fadein 0.5s, fadeout 0.5s 2.5s;
      }
      @keyframes fadein {
        from { bottom: 20px; opacity: 0; }
        to { bottom: 30px; opacity: 1; }
      }
      @keyframes fadeout {
        from { bottom: 30px; opacity: 1; }
        to { bottom: 40px; opacity: 0; }
      }
      .color-picker {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s;
      }
      .color-picker:hover {
        transform: scale(1.1);
      }
      .colors {
        display: none;
        margin-top: 10px;
      }
      .color-picker:hover .colors {
        display: flex;
        gap: 10px;
      }
      .color {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
      }
      </style>
    </head>
    <body>
      <h1>Seeds-pro Icons</h1>
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
        Change Background
        <div class="colors">
          <div class="color" style="background-color: white;" onclick="changeBackgroundColor('white')"></div>
          <div class="color" style="background-color: lightgray;" onclick="changeBackgroundColor('lightgray')"></div>
          <div class="color" style="background-color: lightblue;" onclick="changeBackgroundColor('lightblue')"></div>
          <div class="color" style="background-color: lightgreen;" onclick="changeBackgroundColor('lightgreen')"></div>
          <div class="color" style="background-color: lightpink;" onclick="changeBackgroundColor('lightpink')"></div>
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
        function changeBackgroundColor(color) {
          document.body.style.backgroundColor = color;
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
