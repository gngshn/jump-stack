import * as vscode from "vscode";
import JumpStack from "./jumpStack";

let jumpStack: JumpStack;

export function activate(context: vscode.ExtensionContext) {
  jumpStack = new JumpStack();
  jumpStack.setStorage(context.workspaceState);
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.jump-stack.pushPosition", () => {
      jumpStack.pushPosition();
    }),
    vscode.commands.registerCommand("extension.jump-stack.popPosition", () => {
      jumpStack.popPosition();
    }),
    vscode.commands.registerCommand(
      "extension.jump-stack.pushPositionDoCommands",
      (args) => {
        jumpStack.pushPositionDoCommands(args);
      },
    ),
    vscode.workspace.onDidChangeTextDocument((textChangeEvent) =>
      jumpStack.fixJumpStack(textChangeEvent),
    ),
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      jumpStack.checkPeekView(editors);
    }),
  );
}

export function deactivate() {
  jumpStack.stopCheckTimer();
}
