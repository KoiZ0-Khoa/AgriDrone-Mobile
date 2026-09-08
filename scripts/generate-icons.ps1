# Export UI and launcher sizes from the approved emblem; keep its aspect ratio.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets'))
$source = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'brand/emblem-source.png'))
# The approved 1536 x 1024 source includes outer whitespace; export its 3:2 mark area.
$sourceArea = [System.Drawing.Rectangle]::new(260, 170, 1020, 680)
try {
    $exports = @(
        @{ Name = 'brand/emblem.png'; Width = 432; Height = 288; ArtworkWidth = 432 },
        @{ Name = 'agridrone-icon.png'; Width = 1024; Height = 1024; ArtworkWidth = 960 },
        @{ Name = 'agridrone-foreground.png'; Width = 1024; Height = 1024; ArtworkWidth = 540 },
        @{ Name = 'brand/favicon.png'; Width = 64; Height = 64; ArtworkWidth = 64 }
    )
    foreach ($export in $exports) {
        $bitmap = [System.Drawing.Bitmap]::new($export.Width, $export.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $artworkHeight = $export.ArtworkWidth * $sourceArea.Height / $sourceArea.Width
            $bounds = [System.Drawing.RectangleF]::new(
                ($export.Width - $export.ArtworkWidth) / 2,
                ($export.Height - $artworkHeight) / 2,
                $export.ArtworkWidth,
                $artworkHeight
            )
            $graphics.DrawImage($source, $bounds, $sourceArea, [System.Drawing.GraphicsUnit]::Pixel)
            $bitmap.Save((Join-Path $assetRoot $export.Name), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
} finally { $source.Dispose() }
