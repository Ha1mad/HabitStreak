[void][Reflection.Assembly]::LoadWithPartialName('System.Drawing')

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function Draw-BrandMark {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Size,
    [bool]$ShowBackground = $true,
    [bool]$Monochrome = $false
  )

  $navy = [System.Drawing.ColorTranslator]::FromHtml('#14213D')
  $cream = [System.Drawing.ColorTranslator]::FromHtml('#F6EFE4')
  $blue = [System.Drawing.ColorTranslator]::FromHtml('#4C7EF3')
  $gold = [System.Drawing.ColorTranslator]::FromHtml('#F7B955')
  $coral = [System.Drawing.ColorTranslator]::FromHtml('#FF7A59')
  $mono = [System.Drawing.ColorTranslator]::FromHtml('#111827')

  if ($ShowBackground) {
    $backgroundPath = New-RoundedRectanglePath -X $X -Y $Y -Width $Size -Height $Size -Radius ($Size * 0.24)
    $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      (New-Object System.Drawing.RectangleF($X, $Y, $Size, $Size)),
      [System.Drawing.ColorTranslator]::FromHtml('#16233F'),
      [System.Drawing.ColorTranslator]::FromHtml('#1F2E4F'),
      45
    )
    $Graphics.FillPath($backgroundBrush, $backgroundPath)

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 255, 255, 255))
    $Graphics.FillEllipse($glowBrush, $X + ($Size * 0.14), $Y + ($Size * 0.14), $Size * 0.72, $Size * 0.72)

    $glowBrush.Dispose()
    $backgroundBrush.Dispose()
    $backgroundPath.Dispose()
  }

  $markLeft = $X + ($Size * 0.19)
  $markTop = $Y + ($Size * 0.18)
  $markWidth = $Size * 0.62
  $barWidth = $Size * 0.14
  $barGap = $Size * 0.06
  $barBottom = $Y + ($Size * 0.73)
  $barHeights = @(
    [float]($Size * 0.24),
    [float]($Size * 0.34),
    [float]($Size * 0.47)
  )
  $barColors = if ($Monochrome) { @($mono, $mono, $mono) } else { @($blue, $gold, $coral) }

  for ($index = 0; $index -lt 3; $index++) {
    $barX = $markLeft + ($index * ($barWidth + $barGap))
    $barY = $barBottom - $barHeights[$index]
    $barPath = New-RoundedRectanglePath -X $barX -Y $barY -Width $barWidth -Height $barHeights[$index] -Radius ($barWidth / 2)
    $barBrush = New-Object System.Drawing.SolidBrush($barColors[$index])
    $Graphics.FillPath($barBrush, $barPath)
    $barBrush.Dispose()
    $barPath.Dispose()
  }

  $arcColor = if ($Monochrome) { $mono } else { $cream }
  $arcPen = New-Object System.Drawing.Pen($arcColor, [Math]::Max(10, $Size * 0.045))
  $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Graphics.DrawArc($arcPen, $markLeft - ($Size * 0.03), $markTop - ($Size * 0.03), $markWidth + ($Size * 0.18), $Size * 0.40, 205, 130)

  $dotBrush = New-Object System.Drawing.SolidBrush($arcColor)
  $dotSize = $Size * 0.07
  $Graphics.FillEllipse($dotBrush, $X + ($Size * 0.69), $Y + ($Size * 0.24), $dotSize, $dotSize)

  $arcPen.Dispose()
  $dotBrush.Dispose()
}

function New-Canvas {
  param(
    [int]$Width,
    [int]$Height,
    [System.Drawing.Color]$BackgroundColor
  )

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear($BackgroundColor)

  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Bitmap {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if (!(Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$assetsPath = Join-Path $PSScriptRoot '..\assets\images'
$cream = [System.Drawing.ColorTranslator]::FromHtml('#F6EFE4')
$transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
$navy = [System.Drawing.ColorTranslator]::FromHtml('#14213D')

# App icon
$iconCanvas = New-Canvas -Width 1024 -Height 1024 -BackgroundColor $transparent
Draw-BrandMark -Graphics $iconCanvas.Graphics -X 0 -Y 0 -Size 1024
Save-Bitmap -Bitmap $iconCanvas.Bitmap -Path (Join-Path $assetsPath 'icon.png')
$iconCanvas.Graphics.Dispose()
$iconCanvas.Bitmap.Dispose()

# Splash image
$splashCanvas = New-Canvas -Width 1242 -Height 1242 -BackgroundColor $transparent
Draw-BrandMark -Graphics $splashCanvas.Graphics -X 381 -Y 160 -Size 480

$brandBrush = New-Object System.Drawing.SolidBrush($navy)
$subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#5B6475'))
$titleFont = New-Object System.Drawing.Font('Segoe UI', 108, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$splashCanvas.Graphics.DrawString('HabitStreak', $titleFont, $brandBrush, 621, 730, $format)
$splashCanvas.Graphics.DrawString('Build your rhythm', $subtitleFont, $subtitleBrush, 621, 845, $format)

Save-Bitmap -Bitmap $splashCanvas.Bitmap -Path (Join-Path $assetsPath 'splash-icon.png')

$brandBrush.Dispose()
$subtitleBrush.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$format.Dispose()
$splashCanvas.Graphics.Dispose()
$splashCanvas.Bitmap.Dispose()

# Android adaptive background
$backgroundCanvas = New-Canvas -Width 432 -Height 432 -BackgroundColor $cream
Save-Bitmap -Bitmap $backgroundCanvas.Bitmap -Path (Join-Path $assetsPath 'android-icon-background.png')
$backgroundCanvas.Graphics.Dispose()
$backgroundCanvas.Bitmap.Dispose()

# Android foreground
$foregroundCanvas = New-Canvas -Width 432 -Height 432 -BackgroundColor $transparent
Draw-BrandMark -Graphics $foregroundCanvas.Graphics -X 56 -Y 56 -Size 320
Save-Bitmap -Bitmap $foregroundCanvas.Bitmap -Path (Join-Path $assetsPath 'android-icon-foreground.png')
$foregroundCanvas.Graphics.Dispose()
$foregroundCanvas.Bitmap.Dispose()

# Android monochrome
$monoCanvas = New-Canvas -Width 432 -Height 432 -BackgroundColor $transparent
Draw-BrandMark -Graphics $monoCanvas.Graphics -X 76 -Y 76 -Size 280 -ShowBackground:$false -Monochrome:$true
Save-Bitmap -Bitmap $monoCanvas.Bitmap -Path (Join-Path $assetsPath 'android-icon-monochrome.png')
$monoCanvas.Graphics.Dispose()
$monoCanvas.Bitmap.Dispose()

# Favicon
$faviconCanvas = New-Canvas -Width 64 -Height 64 -BackgroundColor $transparent
Draw-BrandMark -Graphics $faviconCanvas.Graphics -X 0 -Y 0 -Size 64
Save-Bitmap -Bitmap $faviconCanvas.Bitmap -Path (Join-Path $assetsPath 'favicon.png')
$faviconCanvas.Graphics.Dispose()
$faviconCanvas.Bitmap.Dispose()
