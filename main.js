const { app, BrowserWindow } = require("electron/main");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
  });

  win.loadFile("Index.html");
};

app.whenReady().then(() => {
  createWindow();

  console.log("Window Created");
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  console.log("Window Closed.");
  app.quit();
});
console.log("|—————————————————————————————–|");
console.log("|©Soxiety Technology Solutions |");
console.log("|Local Browser v1.0-May25-up0  |");
console.log("|______________________________|");
console.log();
