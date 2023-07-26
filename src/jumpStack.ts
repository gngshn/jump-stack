import * as vscode from "vscode";

interface CommandArg {
  key: string;
  val: string;
}

interface Command {
  command: string;
  args: CommandArg[];
}

interface PushDoCommandsArgs {
  commands?: (string | Command)[];
  checkPosition?: boolean;
}

class Stack<T> {
  private storage: T[] = [];

  constructor(private capacity: number = Infinity) {}

  push(item: T): void {
    if (this.size() === this.capacity) {
      throw Error("Stack has reached max capacity, you cannot add more items");
    }
    this.storage.push(item);
  }

  pop(): T | undefined {
    return this.storage.pop();
  }

  peek(): T | undefined {
    return this.storage[this.size() - 1];
  }

  size(): number {
    return this.storage.length;
  }

  forEach(callbackfn: (value: T, index: number) => void) {
    this.storage.forEach(callbackfn);
  }
}

class Position {
  private filename: string;
  private viewColumn: vscode.ViewColumn;
  private cursor: vscode.Position;

  constructor(editor: vscode.TextEditor) {
    this.filename = editor.document.fileName;
    this.viewColumn = editor.viewColumn
      ? editor.viewColumn
      : vscode.ViewColumn.Active;
    this.cursor = editor.selection.active;
  }

  isSamePosition(editor: vscode.TextEditor): boolean {
    return (
      this.filename === editor.document.fileName &&
      this.viewColumn === editor.viewColumn &&
      this.cursor.isEqual(editor.selection.active)
    );
  }

  fixPosition(filename: string, range: vscode.Range, lineDiff: number) {
    if (filename !== this.filename) {
      return;
    }
    if (this.cursor.isAfter(range.start)) {
      this.cursor.with(this.cursor.line + lineDiff);
    }
  }

  targetViewColumn(): vscode.ViewColumn {
    let first;
    let second;

    vscode.window.visibleTextEditors.forEach((editor) => {
      if (editor.document.fileName == this.filename) {
        second = this.viewColumn;
        if (editor.viewColumn == this.viewColumn) {
          first = this.viewColumn;
        }
      }
    });
    return first ? first : second ? second : vscode.ViewColumn.Active;
  }

  async jump() {
    let editor = vscode.window.activeTextEditor;
    if (
      this.filename !== editor?.document.fileName ||
      this.viewColumn !== editor?.viewColumn
    ) {
      let doc = await vscode.workspace.openTextDocument(this.filename);
      editor = await vscode.window.showTextDocument(
        doc,
        this.targetViewColumn()
      );
    }
    editor.selection = new vscode.Selection(this.cursor, this.cursor);
    editor.revealRange(
      new vscode.Range(this.cursor, this.cursor),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport
    );
  }
}

export default class JumpStack {
  positionStack: Stack<Position>;
  hasPushed: boolean;

  constructor() {
    this.positionStack = new Stack();
    this.hasPushed = false;
  }

  pushPosition() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.hasPushed = false;
      return;
    }

    let position = this.positionStack.peek();
    if (!position) {
      this.positionStack.push(new Position(editor));
      this.hasPushed = true;
      return;
    }

    if (!position.isSamePosition(editor)) {
      this.positionStack.push(new Position(editor));
    }
  }

  async popPosition() {
    let position = this.positionStack.pop();
    await position?.jump();
  }

  async pushPositionDoCommands(args?: PushDoCommandsArgs) {
    if (!args || !args.commands || !Array.isArray(args.commands)) {
      this.pushPosition();
      return;
    }

    this.pushPosition();
    for (let command of args.commands) {
      if (typeof command === "string") {
        await vscode.commands.executeCommand(command as string);
      } else {
        let argcmd = command as Command;
        await vscode.commands.executeCommand(argcmd.command, argcmd.args);
      }
    }
    if (args.checkPosition && this.hasPushed) {
      let position = this.positionStack.peek();
      let editor = vscode.window.activeTextEditor;
      if (!position || !editor) {
        return;
      }
      if (position.isSamePosition(editor)) {
        this.popPosition();
      }
    }
  }

  fixJumpStack(textChangeEvent: vscode.TextDocumentChangeEvent) {
    const doc = textChangeEvent.document;
    textChangeEvent.contentChanges.forEach((change) => {
      let newLineNum = change.text.split("\n").length;
      let oldLineNum = change.range.end.line - change.range.start.line + 1;
      let lineDiff = newLineNum - oldLineNum;
      this.positionStack.forEach((position) =>
        position.fixPosition(doc.fileName, change.range, lineDiff)
      );
    });
  }
}
