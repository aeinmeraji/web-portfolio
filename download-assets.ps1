$ErrorActionPreference = 'Stop'
Push-Location -LiteralPath $PSScriptRoot
try {
    New-Item -ItemType Directory -Force -Path 'dist/assets' | Out-Null
    $designAssets = Get-Content -LiteralPath 'asset-manifest.json' -Raw | ConvertFrom-Json
    foreach ($designAsset in $designAssets) {
        $assetTarget = Join-Path 'dist/assets' $designAsset.file
        curl.exe -f -L --connect-timeout 10 --max-time 45 --silent --show-error $designAsset.url -o $assetTarget
        if ($LASTEXITCODE -ne 0) { throw "Failed to download $($designAsset.file)." }
    }
    curl.exe -f -L --connect-timeout 10 --max-time 45 --silent --show-error 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2' -o 'dist/assets/InterVariable.woff2'
    if ($LASTEXITCODE -ne 0) { throw 'Failed to download the Inter font.' }
    node build.mjs
    node check.mjs
} finally {
    Pop-Location
}
