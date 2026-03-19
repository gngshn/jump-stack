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
  checkTimeout?: number;
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

interface PositionData {
  filename: string;
  viewColumn: vscode.ViewColumn;
  line: number;
  character: number;
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

  static fromData(data: PositionData): Position {
    const position = Object.create(Position.prototype);
    position.filename = data.filename;
    position.viewColumn = data.viewColumn;
    position.cursor = new vscode.Position(data.line, data.character);
    return position;
  }

  toData(): PositionData {
    return {
      filename: this.filename,
      viewColumn: this.viewColumn,
      line: this.cursor.line,
      character: this.cursor.character,
    };
  }

  isSamePosition(editor: vscode.TextEditor | undefined): boolean {
    if (!editor) {
      return false;
    }
    let document = editor.document;
    if (
      this.filename !== document.fileName ||
      this.viewColumn !== editor.viewColumn
    ) {
      return false;
    }
    let range1 = document.getWordRangeAtPosition(this.cursor);
    let range2 = document.getWordRangeAtPosition(editor.selection.active);
    if (!range1 || !range2) {
      return false;
    }
    return range1.isEqual(range2);
  }

  fixPosition(filename: string, range: vscode.Range, lineDiff: number) {
    if (filename !== this.filename) {
      return;
    }
    if (this.cursor.isAfter(range.start)) {
      this.cursor = this.cursor.translate(lineDiff);
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
        this.targetViewColumn(),
      );
    }
    editor.selection = new vscode.Selection(this.cursor, this.cursor);
    editor.revealRange(
      new vscode.Range(this.cursor, this.cursor),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
  }
}

const STORAGE_KEY = "jump-stack-positions";

export default class JumpStack {
  private positionStack: Stack<Position>;
  private wasPeekViewOpen: boolean = false;
  private needCheck: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;
  private checkTimeout: number;
  private defaultCheckTimeout: number = 500;
  private storage: vscode.Memento | null = null;

  constructor() {
    this.positionStack = new Stack();
    this.checkTimeout = this.defaultCheckTimeout;
  }

  setStorage(storage: vscode.Memento) {
    this.storage = storage;
    this.restoreJumpStack();
  }

  private saveJumpStack() {
    if (!this.storage) {
      return;
    }
    const positions: PositionData[] = [];
    this.positionStack.forEach((position) => {
      positions.push(position.toData());
    });
    this.storage.update(STORAGE_KEY, positions);
  }

  private restoreJumpStack() {
    if (!this.storage) {
      return;
    }
    const positions = this.storage.get<PositionData[]>(STORAGE_KEY);
    if (!positions || !Array.isArray(positions)) {
      return;
    }
    this.positionStack = new Stack();
    positions.forEach((data) => {
      const position = Position.fromData(data);
      this.positionStack.push(position);
    });
  }

  pushPosition() {
    let editor = vscode.window.activeTextEditor;
    let position = this.positionStack.peek();

    if (!editor || position?.isSamePosition(editor)) {
      this.needCheck = false;
      return;
    }
    this.stopCheckTimer();
    this.positionStack.push(new Position(editor));
    this.saveJumpStack();
    this.needCheck = true;
  }

  async popPosition() {
    this.stopCheckTimer();
    let position = this.positionStack.pop();
    this.saveJumpStack();
    await position?.jump();
  }

  checkDropPosition() {
    let position = this.positionStack.peek();
    let editor = vscode.window.activeTextEditor;

    if (position?.isSamePosition(editor)) {
      this.positionStack.pop();
      this.saveJumpStack();
      this.needCheck = false;
    }
  }

  startCheckTimer() {
    this.stopCheckTimer();
    this.checkTimer = setTimeout(() => {
      this.checkDropPosition();
    }, this.checkTimeout);
  }

  stopCheckTimer() {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
  }

  async pushPositionDoCommands(args?: PushDoCommandsArgs) {
    this.pushPosition();

    if (!args || !args.commands || !Array.isArray(args.commands)) {
      return;
    }

    if (args.checkPosition) {
      this.checkTimeout = args.checkTimeout
        ? args.checkTimeout
        : this.defaultCheckTimeout;
      this.startCheckTimer();
    } else {
      this.needCheck = false;
    }

    for (let command of args.commands) {
      if (typeof command === "string") {
        await vscode.commands.executeCommand(command as string);
      } else {
        let argcmd = command as Command;
        await vscode.commands.executeCommand(argcmd.command, argcmd.args);
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
        position.fixPosition(doc.fileName, change.range, lineDiff),
      );
    });
  }

  checkPeekView(editors: readonly vscode.TextEditor[]) {
    const lastEditor = editors[editors.length - 1];
    const hasPeekView =
      lastEditor?.document.uri.scheme === "file" &&
      lastEditor?.viewColumn === undefined;

    if (hasPeekView) {
      this.stopCheckTimer();
    }

    if (!hasPeekView && this.wasPeekViewOpen && this.needCheck) {
      this.startCheckTimer();
    }

    this.wasPeekViewOpen = hasPeekView;
  }
}
