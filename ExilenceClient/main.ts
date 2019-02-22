import { app, BrowserWindow, dialog, globalShortcut } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as url from 'url';

const windowStateKeeper = require('electron-window-state');

export interface ExileWindowEvent {
  event: ExileWindowEnum;
  data?: any;
}

export enum ExileWindowEnum {
  Main = 'main',
  Networth = 'networth',
  Ladder = 'ladder',
  Areas = 'areas',
  Trade = 'trade'
}

const ipcMain = require('electron').ipcMain;
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

const windows: BrowserWindow[] = [];

const args = process.argv.slice(1);
const serve = args.some(val => val === '--serve');

ipcMain.on('popout-window-update', (event, window: ExileWindowEvent) => {
  if (windows[window.event] && !windows[window.event].isDestroyed()) {
    windows[window.event].webContents.send('popout-window-update', window);
  }

  // if (window.event === ExileWindowEnum.Networth) {
  //   const stream = fs.createWriteStream('networth.txt');
  //   stream.once('open', function () {
  //     stream.write(`Networth: ${Math.round(window.data.networth * 10) / 10}\r\n`);
  //     stream.write(`Gain: ${Math.round(window.data.gain * 10) / 10}\r\n`);
  //     stream.end();
  //   });
  // }

});

ipcMain.on('popout-window', (event, data: ExileWindowEvent) => {

  const window = data.event;

  if (windows[window] !== undefined && windows[window] !== null) {
    windows[window].destroy();
  }
  windows[window] = new BrowserWindow({
    x: 200,
    y: 200,
    height: 80,
    width: 200,
    minWidth: 150,
    minHeight: 75,
    maxHeight: 90,
    maxWidth: 230,
    skipTaskbar: true,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'dist/assets/img/app-icon.png'),
  });

  windows[window].loadURL(url.format({
    pathname: path.join(__dirname, 'popout/networth.html'),
    protocol: 'file:',
    slashes: true
  }));

  windows[window].once('ready-to-show', () => {
    windows[window].show();
  });

  windows[window].on('closed', (e) => {
    windows[window] = null;
  });

});

ipcMain.on('relaunch', (event, window: ExileWindowEvent) => {
  app.quit();
  app.relaunch();
});

ipcMain.on('disconnect', function (event) {
  windows[ExileWindowEnum.Main].flashFrame(true);
});

ipcMain.on('servermsg', function (event) {
  windows[ExileWindowEnum.Main].flashFrame(true);
});

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

function sendStatusToWindow(text) {
  log.info(text);
  windows[ExileWindowEnum.Main].webContents.send('message', text);
}

function createWindow(windowType: ExileWindowEnum = ExileWindowEnum.Main) {

  // Default size
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1344,
    defaultHeight: 955
  });

  // Create the browser window.
  windows[ExileWindowEnum.Main] = new BrowserWindow({
    x: 100,
    y: 100,
    height: mainWindowState.height,
    width: mainWindowState.width,
    minHeight: 768,
    minWidth: 1344,
    webPreferences: { webSecurity: false },
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'dist/assets/img/app-icon.png'),
  });



  mainWindowState.manage(windows[ExileWindowEnum.Main]);

  const filePath: string = null;

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    windows[ExileWindowEnum.Main].loadURL('http://localhost:4200');
  } else {
    windows[ExileWindowEnum.Main].loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // Emitted when the window is closed.
  windows[ExileWindowEnum.Main].on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (windows[ExileWindowEnum.Networth] !== undefined && windows[ExileWindowEnum.Networth] !== null) {
      windows[ExileWindowEnum.Networth].destroy();
    }
    if (windows[ExileWindowEnum.Ladder] !== undefined && windows[ExileWindowEnum.Ladder] !== null) {
      windows[ExileWindowEnum.Ladder].destroy();
    }
    if (windows[ExileWindowEnum.Trade] !== undefined && windows[ExileWindowEnum.Trade] !== null) {
      windows[ExileWindowEnum.Trade].destroy();
    }
    if (windows[ExileWindowEnum.Areas] !== undefined && windows[ExileWindowEnum.Areas] !== null) {
      windows[ExileWindowEnum.Areas].destroy();
    }

  });
}



try {
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.');
  });
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
  });
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    sendStatusToWindow(log_message);
  });


  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    sendStatusToWindow('Update downloaded');

    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    };

    dialog.showMessageBox(dialogOpts, (response) => {
      if (response === 0) { autoUpdater.quitAndInstall(); }
    });

  });



  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', () => {

    createWindow();

    autoUpdater.checkForUpdates();

    globalShortcut.register('Command+Shift+I', () => {
      windows[ExileWindowEnum.Main].openDevTools();
    });

    windows[ExileWindowEnum.Main].on('focus', () => {
      windows[ExileWindowEnum.Main].flashFrame(false);
    });

    BrowserWindow.addDevToolsExtension(
      // tslint:disable-next-line:max-line-length
      path.join(os.homedir(), '\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\lmhkpmbekcpmknklioeibfkpmmfibljd\\2.17.0_0')
    );

  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windows[ExileWindowEnum.Main] === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}



