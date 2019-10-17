const {app, BrowserWindow} = require('electron');
const path = require('path');

let win;
let serverProcess;

function createWindow() {
    let platform = process.platform;

    if (platform === 'win32') {
        serverProcess = require('child_process')
            .spawn('cmd.exe', ['/c', 'run_jar.exe'],
                {
                    cwd: app.getAppPath() + '/../'
                });
    } else {
        serverProcess = require('child_process')
            .spawn(app.getAppPath() + '/run_jar.sh');
    }

    if (!serverProcess) {
        console.error('Unable to start server from ' + app.getAppPath());
        app.quit();
        return;
    }

    serverProcess.stdout.on('data', function (data) {
        //console.log('Server: ' + data);
    });

    console.log("Server PID: " + serverProcess.pid);

    let appUrl = 'http://localhost:9050/';
    let testUrl = 'http://localhost:9050/api/balances/';

    const openWindow = function () {
        mainWindow = new BrowserWindow({
            title: 'Gainstrack',
            width: 1024,
            height: 678
        });

        mainWindow.loadURL(appUrl);

        mainWindow.on('closed', function () {
            mainWindow = null;
        });

        mainWindow.on('close', function (e) {
            if (serverProcess) {
                e.preventDefault();

                // kill Java executable
                const kill = require('tree-kill');
                kill(serverProcess.pid, 'SIGTERM', function () {
                    console.log('Server process killed');

                    serverProcess = null;
                    mainWindow.close();
                });
            }
        });
    };

    const startUp = function () {
        const requestPromise = require('minimal-request-promise');

        requestPromise.get(testUrl).then(function (response) {
            console.log('Server started!');
            openWindow();
        }, function (response) {
            console.log('Waiting for the server start...' + JSON.stringify(response));

            setTimeout(function () {
                startUp();
            }, 200);
        });
    };

    startUp();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
});
