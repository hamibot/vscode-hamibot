import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');
import fetch from 'node-fetch';
import * as FormData from 'form-data';

export function activate(context: vscode.ExtensionContext) {
  const version = vscode.extensions.getExtension('hamibot.vscode-hamibot')
    ?.packageJSON.version;
  const userAgent = `vscode-hamibot ${version}`;

  const getConf = () => {
    const config = vscode.workspace.getConfiguration();
    const token = config.get('hamibot.token');
    const scriptId = config.get('hamibot.scriptId');
    const robotId = config.get('hamibot.robotId');
    if (!token) {
      vscode.window.showErrorMessage('需要填写 Token');
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'hamibot.token'
      );
      return;
    }
    if (!scriptId) {
      vscode.window.showErrorMessage('需要填写 Script ID');
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'hamibot.scriptId'
      );
      return;
    }
    if (!robotId) {
      vscode.window.showErrorMessage('需要填写 Robot ID');
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'hamibot.robotId'
      );
      return;
    }
    return { token, scriptId, robotId };
  };

  const run = vscode.commands.registerCommand('hamibot.run', async () => {
    try {
      const config = getConf();
      if (!config) return;
      const response = await fetch(
        `https://api.hamibot.com/v1/devscripts/${config.scriptId}/run`,
        {
          method: 'POST',
          headers: {
            'User-Agent': userAgent,
            'Content-Type': 'application/json',
            Authorization: `token ${config.token}`,
          },
          body: JSON.stringify({
            robots: [
              {
                _id: config.robotId,
                name: 'Hamibot VSCode',
              },
            ],
          }),
        }
      );
      if (response.ok) {
        vscode.window.showInformationMessage('运行成功');
      } else {
        const data = await response.json();
        vscode.window.showErrorMessage('运行失败：' + JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
      vscode.window.showErrorMessage('运行异常');
    }
  });

  const saveAndRun = vscode.commands.registerCommand(
    'hamibot.saveAndRun',
    async () => {
      try {
        const config = getConf();
        if (!config) return;
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const { fileName } = editor.document;
        const ext = path.extname(fileName);
        if (ext !== '.js') {
          vscode.window.showErrorMessage('不是 .js 文件，无法保存');
          return;
        }
        await editor.document.save();
        const body = new FormData();
        body.append('file', fs.readFileSync(fileName), {
          contentType: 'application/javascript',
          filename: path.basename(fileName),
        });
        const response = await fetch(
          `https://api.hamibot.com/v1/devscripts/${config.scriptId}/files`,
          {
            method: 'PUT',
            headers: {
              'User-Agent': userAgent,
              Authorization: `token ${config.token}`,
            },
            body,
          }
        );
        if (response.ok) {
          //vscode.window.showInformationMessage('保存成功');
          vscode.commands.executeCommand('hamibot.run');
        } else {
          const data = await response.json();
          vscode.window.showErrorMessage('保存失败：' + JSON.stringify(data));
        }
      } catch (e) {
        console.error(e);
        vscode.window.showErrorMessage('保存异常');
      }
    }
  );

  const stop = vscode.commands.registerCommand('hamibot.stop', async () => {
    try {
      const config = getConf();
      if (!config) return;
      const response = await fetch(
        `https://api.hamibot.com/v1/devscripts/${config.scriptId}/run`,
        {
          method: 'DELETE',
          headers: {
            'User-Agent': userAgent,
            'Content-Type': 'application/json',
            Authorization: `token ${config.token}`,
          },
          body: JSON.stringify({
            robots: [
              {
                _id: config.robotId,
                name: 'Hamibot VSCode',
              },
            ],
          }),
        }
      );
      if (response.ok) {
        vscode.window.showInformationMessage('停止成功');
      } else {
        const data = await response.json();
        vscode.window.showErrorMessage('停止失败：' + JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
      vscode.window.showErrorMessage('停止异常');
    }
  });

  const openSetting = vscode.commands.registerCommand(
    'hamibot.openSetting',
    async () => {
      vscode.window.showInformationMessage('打开设置');
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'hamibot'
      );
    }
  );

  context.subscriptions.push(...[run, saveAndRun, stop, openSetting]);
}
