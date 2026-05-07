# @firstpick/pi-extension-release-npm

Adds `/release-npm` command to run release checks and release workflow.

Flow:
1. `./check-publish-readiness.sh`
2. `./release-workflow.sh` (without publish)
3. Prompt: Publish (Yes/No)
4. If Yes: `./publish-packages.sh`
