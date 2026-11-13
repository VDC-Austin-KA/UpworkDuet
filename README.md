# Upwork Projects

One folder per order, named `YYYY-MM-DD_ClientName_tier` (date = day requirements were submitted).

New order (PowerShell, from this folder):

    Copy-Item _template "2026-11-15_ClientName_script" -Recurse

Then copy the matching starter into its `02-src` and rename `Starter.csproj` to the plug-in's name:

    Copy-Item _starters\navisworks-addin\* "2026-11-15_ClientName_script\02-src" -Recurse
    Copy-Item _starters\revit-addin\*      "2026-11-15_ClientName_script\02-src" -Recurse

Build with `dotnet build -c Release`, adding `-p:NWYear=2026` or `-p:RevitVersion=2025` for the client's version.
Navisworks 2020 to 2027 and Revit 2024 to 2027 build here; versions not installed on this machine compile against
NuGet copies of the API (`Speckle.Navisworks.API`, `Nice3point.Revit.Api.*`), so they build but cannot be run here.
Each starter has an `install.ps1` that also works when shipped beside the DLL in a delivery.

Inside each order:

- `ORDER.md` — client, tier, deadline, software version, scope, revision count
- `01-requirements/` — the client's brief, sample models, screenshots, as received
- `02-src/` — the script or plug-in source
- `03-delivery/` — exactly what was uploaded to Upwork, one subfolder per delivery (`v1`, `rev1`, ...)
