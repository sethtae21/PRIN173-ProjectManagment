"""FitFusion AI out-of-process diagnostics.

Scripts in this package are BLACK-BOX probes: they talk to a RUNNING server
over HTTP with the standard library only (no Django imports, no `requests`),
so they can execute in a clean venv from any working directory.
Contrast with:
  * Backend/scripts/                    -> operational tooling (ps1/mjs)
  * accounts/management/commands/       -> in-process Django management tasks
"""