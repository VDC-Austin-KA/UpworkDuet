# Copies the DLL and manifest into the current user's Revit Addins folder. No admin needed.
# Ship this next to the DLL and Starter.addin in the delivery, or run it from the project after a Release build.
param([string]$Year = "2024")

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dll  = Get-ChildItem $here -Filter *.dll | Select-Object -First 1
if (-not $dll) {
    $name = (Get-ChildItem $here -Filter *.csproj | Select-Object -First 1).BaseName
    $dll  = Get-Item (Join-Path $here "bin\Release\$Year\$name.dll") -ErrorAction SilentlyContinue
}
if (-not $dll) { Write-Host "No add-in DLL found. Build first: dotnet build -c Release -p:RevitVersion=$Year" -ForegroundColor Red; exit 1 }

$name = $dll.BaseName
$dst  = Join-Path $env:APPDATA "Autodesk\Revit\Addins\$Year"
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item -Force $dll.FullName $dst
(Get-Content (Join-Path $here "Starter.addin") -Raw).Replace("__NAME__", $name) |
    Set-Content (Join-Path $dst "$name.addin") -Encoding UTF8
Write-Host "Installed to $dst" -ForegroundColor Green
Write-Host "Restart Revit; the command is under Add-Ins > External Tools."
