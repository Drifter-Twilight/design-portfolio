# 逐批推送作品集到 GitHub，每批自动重试。
# 大陆直连 GitHub 不稳定，一次性推 40MB 必然超时；这里拆成小批 + 重试。
$ErrorActionPreference = 'Continue'
$env:http_proxy = ''
$env:https_proxy = ''
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
$env:all_proxy = ''
$env:NO_PROXY = '*'

$git = $null
$cmd = Get-Command git -ErrorAction SilentlyContinue
if ($cmd) { $git = $cmd.Source }
elseif (Test-Path 'D:\Tools\Git\cmd\git.exe') { $git = 'D:\Tools\Git\cmd\git.exe' }
elseif (Test-Path 'D:\WorkBuddy\resources\vendor\PortableGit\cmd\git.exe') { $git = 'D:\WorkBuddy\resources\vendor\PortableGit\cmd\git.exe' }
else {
  Write-Host '找不到 git。请安装 Git for Windows：https://git-scm.com/download/win' -ForegroundColor Red
  Read-Host '按回车退出'
  exit 1
}

Set-Location (Split-Path $PSScriptRoot -Parent)

$commits = @('1168802', '5def5e5', 'fc20d44', '8480864', 'c9bb9f7', '193c8c8', 'd349f4a', '30c7c2c', '4f78516')
$total = $commits.Count
$n = 0

foreach ($c in $commits) {
  $n++
  $ok = $false
  for ($i = 1; $i -le 10; $i++) {
    Write-Host ("[{0}/{1}] {2} 第 {3} 次尝试... " -f $n, $total, $c, $i) -NoNewline
    $out = & $git push origin "${c}:refs/heads/main" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host 'OK' -ForegroundColor Green
      $ok = $true
      break
    }
    $reason = ($out | Select-String -Pattern 'Could not connect|408|reset|denied|authentication|up-to-date' | Select-Object -First 1)
    Write-Host ('失败 - {0}' -f $reason) -ForegroundColor Yellow
    Start-Sleep -Seconds 8
  }
  if (-not $ok) {
    Write-Host ''
    Write-Host "第 $c 批连续失败。" -ForegroundColor Red
    Write-Host '  1. 确认 VPN 连着（浏览器能打开 github.com 就行）'
    Write-Host '  2. 重新双击 push-github.bat，已推成功的批次会自动跳过'
    Read-Host '按回车退出'
    exit 1
  }
}

Write-Host ''
Write-Host '全部推送完成。' -ForegroundColor Green
& $git branch -D main 2>&1 | Out-Null
& $git branch -m rebuild main 2>&1 | Out-Null
Write-Host '本地分支已改名为 main。'

Write-Host ''
Write-Host '接下来去开 Pages：' -ForegroundColor Cyan
Write-Host '  https://github.com/Drifter-Twilight/design-portfolio/settings/pages'
Write-Host '  Source 选 GitHub Actions，等 1-2 分钟'
Write-Host '  然后访问 https://drifter-twilight.github.io/design-portfolio/'
Write-Host ''
Read-Host '按回车退出'
