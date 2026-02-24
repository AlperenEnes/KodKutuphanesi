// Electron preload scripti - renderer ile main process arasında güvenli köprü sağlar
const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

let userDataPath = __dirname;
for (const arg of process.argv) {
  if (arg.startsWith('--user-data-path=')) {
    userDataPath = arg.split('=')[1];
    break;
  }
}

// JSON dosyasını okuyup parse eder
const readJson = (filename) => {
  try {
    const filePath = path.join(userDataPath, filename);
    if (!fs.existsSync(filePath)) return null;
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    console.warn('readJson error', filename, e);
    return null;
  }
};

// JSON verisini dosyaya yazar
const writeJson = (filename, data) => {
  try {
    const filePath = path.join(userDataPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('writeJson error', filename, e);
    return false;
  }
};

// Renderer process'e güvenli API sağlar (contextBridge ile izole edilmiş)
contextBridge.exposeInMainWorld('electronAPI', {
  // Belirtilen JSON dosyasını yükler
  loadData: (filename) => {
    const res = readJson(filename);
    return res;
  },
  // Geçmiş listesine yeni ID ekler (tekrar yoksa)
  appendToHistory: (id) => {
    try {
      const filename = 'history.json';
      let arr = readJson(filename);
      if (!Array.isArray(arr)) arr = [];
      const sid = String(id);
      if (!arr.includes(sid)) {
        arr.push(sid);
        writeJson(filename, arr);
      }
      return true;
    } catch (e) {
      console.warn('appendToHistory error', e);
      return false;
    }
  }
  ,
  // Favori listesini dosyaya kaydeder
  saveFavorites: (arr) => {
    try {
      writeJson('favorites.json', arr || []);
      return true;
    } catch (e) {
      console.warn('saveFavorites error', e);
      return false;
    }
  },
  // Veri dosyasını yükler
  loadAllData: () => {
    return readJson('data.json') || [];
  }
});