# Bang autocomplete flag suggestion after command

## What happened
After running `!./publish-packages.sh --all`, autocomplete still suggested only `!./publish-packages.sh`.

## What was tried
Checked runtime store content and verified `--all` was persisted under `./publish-packages.sh`.

## Solution
Updated autocomplete logic to:
- suggest flags when typing `!<command> ` (not only `!<command> -...`), and
- include learned `!<command> <flag>` combo suggestions directly in command completion.
