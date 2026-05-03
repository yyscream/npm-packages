# Bang autocomplete did not suggest full command lines

## What happened
`!git add .` was not suggested after using bang commands; only base command suggestions appeared.

## What was tried
Checked runtime learning behavior and found it only persisted command names and per-command flags, not full command lines.

## Solution
Updated bang-command-autocomplete to persist full bang command lines and suggest them directly, including inputs with spaces (e.g. `!git add .`).
