# Publish summary did not distinguish first-time publishes vs updates

- What happened: `publish-packages.sh` summary only reported total published count, making first releases and version updates indistinguishable.
- What was tried: Reviewed publish action flow (`publish-first` vs `publish-update`) and publish summary counters.
- Solution: Added dedicated counters for successful first-time publishes and updates, incremented on both primary and fallback publish success paths, and printed both in the final summary.
