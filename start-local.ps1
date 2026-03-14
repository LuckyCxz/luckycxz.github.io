param(
    [int]$Port = 5500
)

Write-Host "Starting local server on http://localhost:$Port/"
python -m http.server $Port
