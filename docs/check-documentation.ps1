# ==============================================================================
# SecureSnap / Molandi Printmaking 文档系统门禁校验脚本
# 规范依据: docs/standards/DOCUMENT_RULES.md (RULE-DOC §11)
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$WarnOnly
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  文档系统规范门禁校验 (RULE-DOC Check)" -ForegroundColor Cyan
Write-Host "  根目录: $projectRoot" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$docIds = [System.Collections.Generic.Dictionary[string, string]]::new()

$allowedStatuses = @('Active', 'Draft', 'Superseded', 'Report')
$allowedOwnerModules = @('root', 'core', 'orchestration', 'services', 'ui', 'observability', 'app-v2', 'ui-v2', 'workflow-v2', 'securesnap-core')

# 1. 检查二级子模块是否违规包含 docs/ 目录 (§3.3)
$submoduleDocDirs = Get-ChildItem -Path $projectRoot -Directory -Recurse -Filter 'docs' | Where-Object {
    $rel = $_.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    if ($rel -eq 'docs') { return $false }
    if ($rel -match '^src/(core|orchestration|services|ui)/docs$') { return $false }
    if ($rel -match '^(archive|dist)/') { return $false }
    return $true
}

foreach ($badDir in $submoduleDocDirs) {
    $rel = $badDir.FullName.Substring($projectRoot.Length + 1)
    $errors.Add("禁止项违规 [§3.3]: 二级子模块不得建立 docs/ 目录: $rel")
}

# 2. 检查一级模块 docs/ 下是否违规出现 requirements/ 或 standards/ 目录 (§3.3)
$forbiddenModuleDirs = @(
    'src/core/docs/requirements', 'src/core/docs/standards',
    'src/orchestration/docs/requirements', 'src/orchestration/docs/standards',
    'src/services/docs/requirements', 'src/services/docs/standards',
    'src/ui/docs/requirements', 'src/ui/docs/standards'
)
foreach ($fPath in $forbiddenModuleDirs) {
    if (Test-Path (Join-Path $projectRoot $fPath)) {
        $errors.Add("禁止项违规 [§3.3]: 模块 docs/ 下不得出现 requirements/ 或 standards/ 目录: $fPath")
    }
}

# 3. 收集所有需校验的 markdown 文档
$targetDirs = @('docs', 'src/core/docs', 'src/orchestration/docs', 'src/services/docs', 'src/ui/docs')
$mdFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()

foreach ($dir in $targetDirs) {
    $absDir = Join-Path $projectRoot $dir
    if (Test-Path $absDir) {
        $found = Get-ChildItem -Path $absDir -Recurse -Filter '*.md'
        foreach ($f in $found) {
            $r = $f.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
            if ($r -notmatch '/images/legacy/') {
                $mdFiles.Add($f)
            }
        }
    }
}

Write-Host "待检查规范文档总数: $($mdFiles.Count)" -ForegroundColor Gray

# 4. 逐个文件校验 YAML front matter 及元数据字段 (§3.4)
foreach ($file in $mdFiles) {
    $relPath = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

    # 检查是否以 --- 开头
    if (-not ($content -match '(?s)^\s*---\r?\n(.*?)\r?\n---\r?\n(.*)$')) {
        $errors.Add("缺失 YAML Front Matter [§3.4]: $relPath 必须以标准 front matter 开头")
        continue
    }

    $frontMatterText = $Matches[1]
    $bodyText = $Matches[2]

    # 解析 YAML 键值对
    $meta = @{}
    $lines = $frontMatterText -split '\r?\n'
    foreach ($line in $lines) {
        if ($line -match '^\s*([a-zA-Z0-9_\-]+)\s*:\s*(.*?)\s*$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim()
            if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                $val = $val.Substring(1, $val.Length - 2)
            }
            $meta[$key] = $val
        }
    }

    # 4.1 必填字段检查
    $requiredFields = @('title', 'status', 'doc-id', 'owner-module', 'created', 'modified')
    foreach ($rf in $requiredFields) {
        if (-not $meta.ContainsKey($rf) -or [string]::IsNullOrWhiteSpace($meta[$rf])) {
            $errors.Add("缺失必填元数据字段 [$rf] [§3.4.1]: $relPath")
        }
    }

    # 4.2 status 枚举值检查
    if ($meta.ContainsKey('status')) {
        $statusVal = $meta['status']
        if ($allowedStatuses -notcontains $statusVal) {
            $errors.Add("非法 status 枚举值 [$statusVal] [§3.4.1]: $relPath (允许值: $($allowedStatuses -join ', '))")
        }
        if ($statusVal -eq 'Superseded') {
            if (-not $meta.ContainsKey('superseded-by') -or [string]::IsNullOrWhiteSpace($meta['superseded-by'])) {
                $errors.Add("Superseded 状态缺失 superseded-by 字段 [§3.4.1]: $relPath")
            } else {
                $targetRel = $meta['superseded-by']
                $targetAbs = Join-Path (Split-Path $file.FullName) $targetRel
                if (-not (Test-Path $targetAbs)) {
                    $errors.Add("superseded-by 指向不存在的文件 [$targetRel] [§3.4.3]: $relPath")
                }
            }
        }
    }

    # 4.3 owner-module 校验
    if ($meta.ContainsKey('owner-module')) {
        $ownerVal = $meta['owner-module']
        if ($allowedOwnerModules -notcontains $ownerVal) {
            $warnings.Add("未知的 owner-module 模块标识 [$ownerVal]: $relPath")
        }
    }

    # 4.4 doc-id 唯一性检查
    if ($meta.ContainsKey('doc-id')) {
        $did = $meta['doc-id']
        if ($docIds.ContainsKey($did)) {
            $errors.Add("doc-id 重复冲突 [$did] [§3.4.3]: $relPath 与 $($docIds[$did]) 重复")
        } else {
            $docIds[$did] = $relPath
        }
    }

    # 4.5 时间戳格式与先后顺序检查 (§3.4.2)
    if ($meta.ContainsKey('created') -and $meta.ContainsKey('modified')) {
        [DateTimeOffset]$dtCreated = [DateTimeOffset]::MinValue
        [DateTimeOffset]$dtModified = [DateTimeOffset]::MinValue
        $parsedCreated = [DateTimeOffset]::TryParse($meta['created'], [ref]$dtCreated)
        $parsedModified = [DateTimeOffset]::TryParse($meta['modified'], [ref]$dtModified)

        if (-not $parsedCreated) {
            $errors.Add("created 时间戳不是合法的 ISO 8601 格式 [$($meta['created'])]: $relPath")
        }
        if (-not $parsedModified) {
            $errors.Add("modified 时间戳不是合法的 ISO 8601 格式 [$($meta['modified'])]: $relPath")
        }
        if ($parsedCreated -and $parsedModified) {
            if ($dtModified -lt $dtCreated) {
                $createdStr = $meta['created']
                $modifiedStr = $meta['modified']
                $warnings.Add("时间戳悖论 (modified 早于 created) [§3.4.3]: $relPath (created=$createdStr, modified=$modifiedStr)")
            }
        }
    }

    # 4.6 校验 markdown 相对链接引用有效性
    $linkMatches = [regex]::Matches($bodyText, '\[.*?\]\((?!https?://|#|mailto:)(.*?)\)')
    foreach ($lm in $linkMatches) {
        $linkTarget = $lm.Groups[1].Value.Trim()
        if ($linkTarget -match '^([^#]+)(#.*)?$') {
            $filePathTarget = $Matches[1]
            if (-not [string]::IsNullOrWhiteSpace($filePathTarget)) {
                $absLink = Join-Path (Split-Path $file.FullName) $filePathTarget
                if (-not (Test-Path $absLink)) {
                    $warnings.Add("相对文件链接失效 [$filePathTarget]: 在 $relPath 中引用")
                }
            }
        }
    }
}

# 5. 输出汇总报告
Write-Host ''
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  门禁校验汇总报告" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($warnings.Count -gt 0) {
    Write-Host ">>> 发现 $($warnings.Count) 处警告 (Warnings):" -ForegroundColor Yellow
    foreach ($w in $warnings) {
        Write-Host " [WARN] $w" -ForegroundColor Yellow
    }
} else {
    Write-Host ">>> 零警告 (0 Warnings)" -ForegroundColor Green
}

if ($errors.Count -gt 0) {
    Write-Host ">>> 发现 $($errors.Count) 处错误 (Errors - 阻塞合并):" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host " [ERROR] $e" -ForegroundColor Red
    }
    Write-Host "========================================================" -ForegroundColor Red
    if ($WarnOnly) {
        Write-Host "以 -WarnOnly 模式运行，不阻断退出码。" -ForegroundColor Yellow
        exit 0
    } else {
        exit 1
    }
} else {
    Write-Host ">>> 门禁校验通过！所有规范文档符合 RULE-DOC 权威要求。" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    exit 0
}
