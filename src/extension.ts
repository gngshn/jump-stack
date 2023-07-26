import * as vscode from "vscode";
import JumpStack from "./jumpStack";

export function activate(context: vscode.ExtensionContext) {
  let jumpStack = new JumpStack();
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
      }
    ),
    vscode.workspace.onDidChangeTextDocument((textChangeEvent) =>
      jumpStack.fixJumpStack(textChangeEvent)
    )
  );
}

export function deactivate() {}
