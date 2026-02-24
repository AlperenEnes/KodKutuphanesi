//#region Dosya Kontrolü
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Menu } = require('electron');

const userDataPath = app.getPath('userData');

function initUserFiles() {
    const files = ['favorites.json', 'history.json'];
    
    files.forEach(file => {
        const filePath = path.join(userDataPath, file);
        if (!fs.existsSync(filePath)) {
            // Dosya eksikse oluştur
            fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
        }
    });
    
    // Copy data.json to userData if it doesn't exist there
    const dataInUserData = path.join(userDataPath, 'data.json');
    if (!fs.existsSync(dataInUserData)) {
        const dataInApp = path.join(__dirname, 'data.json');
        if (fs.existsSync(dataInApp)) {
            fs.copyFileSync(dataInApp, dataInUserData);
        } else {
            // If no data.json exists anywhere, create an empty array
            fs.writeFileSync(dataInUserData, JSON.stringify([]), 'utf8');
        }
    }
}

app.whenReady().then(initUserFiles);
Menu.setApplicationMenu(null);
//#endregion

//#region Pencereyi Oluşturma
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 400,
    icon: path.join(__dirname, 'kl.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      additionalArguments: [`--user-data-path=${userDataPath}`]
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
//#endregion