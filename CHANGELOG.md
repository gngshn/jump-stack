# Change Log

All notable changes to the "jump-stack" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v3.0.3] - 2025-03-27

## Fix

- When cursor is not on a token, check position function will not work correctly.

## [v3.0.2] - 2025-03-20

## Fix

- Fix README.md

## [v3.0.1] - 2025-03-20

## Fix

- In some cases, when peek view is closed, it may incorrectly trigger the check timer to start

## [v3.0.0] - 2025-03-20

## Add

- Add checkPosition parameter to pushPositionDoCommands; starting timer to do position check will only be performed when checkPosition parameter exists, restoring the behavior from v1.x

## [v2.1.0] - 2025-03-20

### Add

- Save the workspace's jump stack to workspace storage, so that when VSCode is closed and reopened, the jump stack content can be preserved

## [v2.0.0] - 2025-03-19

### Add

- When using pushPositionDoCommands to jump, if the destination position is still under the same token as before, the pushed position will be popped via a timer
- The checkTimeout parameter can be used to configure the timer's timeout duration for different shortcuts

### Remove

- Removed the checkPosition parameter; now pushPositionDoCommands command will automatically check position by default.
