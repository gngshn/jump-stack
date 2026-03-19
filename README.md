# Jump Stack Extension

A simple Jump stack for vscode, inspired by [vscode-goto-symbol-stack](https://github.com/miconda/vscode-goto-symbol-stack), but can execute any command with jump stack.
This extension supports push the current code position to stack, or pop code position from stack, and optionally executing commands after push. Its push and pop functions are similar to vim's tag stack. If you're looking for an extension similar to vim's jump stack, you might want to try it.

The code for this extension is hosted at:
[jump-stack](https://github.com/gngshn/jump-stack)

## Features

This extension provides three commands:

- **pushStack** push the current posision to jump stack

- **popStack** pop and jump to a position from jump stack

- **pushStackDoCommands** push the current posision to jump stack, then do some commands, and optionally check discard this push

## Shortcut config example

The checkTimeout option is used to set the check delay time, default is 500(ms). VSCode has a delay when calling the language server to pop up a peek view and when switching from peek view to the final editor. You can use this option to configure the timeout of actual check of whether the new file position is the same as before. If it's the same position, the previously pushed position will be popped out. For example, after executing a command, if it jumps to the same position or the peek view is directly closed.

```json
{
  "key": "ctrl+shift+f",
  "command": "extension.jump-stack.pushPositionDoCommands",
  "args": {
    "commands": ["workbench.action.findInFiles"]
  }
},
{
  "key": "ctrl+f",
  "command": "extension.jump-stack.pushPositionDoCommands",
  "when": "editorFocus || editorIsOpen",
  "args": {
    "commands": ["actions.find"]
  }
},
{
  "command": "extension.jump-stack.pushPositionDoCommands",
  "key": "alt+d",
  "args": {
    "commands": ["editor.action.revealDefinition"]
    "checkPosition": true
  }
},
{
  "command": "extension.jump-stack.popPosition",
  "key": "alt+s"
}
```

A more advanced config can be:

```json
{
  "command": "extension.jump-stack.pushPositionDoCommands",
  "key": "hotkey",
  "args": {
    "commands": [
      {
        "command": "vscodecommand0",
        "args": {
          "args00": "args00-value",
          "args01": "args01-value"
        }
      },
      {
        "command": "vscodecommand1",
        "args": {
          "args10": "args10-value",
          "args11": "args11-value"
        }
      }
    ],
    "checkPosition": true
    "checkTimeout": 300
  }
}
```

## Extension Settings

There is none settings now

**Enjoy!**
