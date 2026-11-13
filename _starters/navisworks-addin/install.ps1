#Requires -RunAsAdministrator
# Copies the built DLL into every Navisworks edition of the given year (Manage, Simulate).
# Ship this next to the DLL in the delivery, or run it from the project after a Release build.
param([string]$Year = "2025")

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dll  = Get-ChildItem $here -Filter *.dll | Select-Object -First 1
if (-not $dll) {
    $name = (Get-ChildItem $here -Filter *.csproj | Select-Object -First 1).BaseName
    $dll  = Get-Item (Join-Path $here "bin\Release\$Year\$name.dll") -ErrorAction SilentlyContinue
}
if (-not $dll) { Write-Host "No plug-in DLL found. Build first: dotnet build -c Release -p:NWYear=$Year" -ForegroundColor Red; exit 1 }

$targets = Get-ChildItem "C:\Program Files\Autodesk" -Directory -Filter "Navisworks * $Year" -ErrorAction SilentlyContinue
if (-not $targets) { Write-Host "Navisworks $Year not found." -ForegroundColor Red; exit 1 }

foreach ($nw in $targets) {
    # Navisworks only loads Plugins\<Name>\<Name>.dll, so the folder name must match the DLL name.
    $dst = Join-Path $nw.FullName "Plugins\$($dll.BaseName)"
    New-Item -ItemType Directory -Force $dst | Out-Null
    Copy-Item -Force $dll.FullName $dst
    Write-Host "Installed to $dst" -ForegroundColor Green
}
Write-Host "Restart Navisworks; the command is on the Add-Ins tab."
