[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$kbRoot = Join-Path $repoRoot 'docs\kb'
$errors = New-Object System.Collections.Generic.List[string]
$linkCount = 0
$anchorCount = 0
$indexSourceExemptionCount = 0
$allMarkdown = @(Get-ChildItem -LiteralPath $kbRoot -Filter '*.md' -File -Recurse |
    Where-Object { $_.FullName -notmatch '[\\/]_templates[\\/]' })
$frontMatterByPath = @{}
$edges = @{}
$itemCategories = @('api', 'feature', 'formula', 'service', 'test', 'manual-test', 'script', 'tooling')

function Add-Error {
    param([string]$Message)
    $script:errors.Add($Message)
}

function Get-FrontMatter {
    param([string]$Content)
    $match = [regex]::Match($Content, '\A---\r?\n(?<body>.*?)\r?\n---(?:\r?\n|\z)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $match.Success) {
        return $null
    }
    return $match.Groups['body'].Value
}

function Get-HeadingAnchors {
    param([string]$Content)
    $anchors = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $counts = @{}
    foreach ($match in [regex]::Matches($Content, '(?m)^#{1,6}\s+(.+?)\s*#*\s*$')) {
        $heading = $match.Groups[1].Value
        $heading = [regex]::Replace($heading, '`([^`]*)`', '$1')
        $heading = [regex]::Replace($heading, '<[^>]+>', '')
        $slug = $heading.ToLowerInvariant()
        $slug = [regex]::Replace($slug, '[^\p{L}\p{Nd}\s-]', '')
        $slug = [regex]::Replace($slug.Trim(), '\s+', '-')
        $slug = [regex]::Replace($slug, '-+', '-').Trim('-')
        if ($counts.ContainsKey($slug)) {
            $counts[$slug] += 1
            $slug = '{0}-{1}' -f $slug, $counts[$slug]
        } else {
            $counts[$slug] = 0
        }
        [void]$anchors.Add($slug)
    }
    return ,$anchors
}

function Test-ExactPathCase {
    param([string]$FullPath)
    $volume = [System.IO.Path]::GetPathRoot($FullPath)
    if ([string]::IsNullOrEmpty($volume)) {
        return $false
    }
    $remaining = $FullPath.Substring($volume.Length)
    $segments = @($remaining -split '[\\/]' | Where-Object { $_ -ne '' })
    $current = $volume
    foreach ($segment in $segments) {
        if (-not (Test-Path -LiteralPath $current -PathType Container)) {
            return $false
        }
        $names = @(Get-ChildItem -LiteralPath $current -Force | ForEach-Object { $_.Name })
        if ($names -cnotcontains $segment) {
            return $false
        }
        $current = Join-Path $current $segment
    }
    return $true
}

foreach ($file in $allMarkdown) {
    $fullPath = [System.IO.Path]::GetFullPath($file.FullName)
    $content = Get-Content -LiteralPath $fullPath -Raw
    $fm = Get-FrontMatter -Content $content
    if ($null -eq $fm) {
        Add-Error ("Missing YAML front matter: {0}" -f $file.FullName)
    } else {
        $categoryMatch = [regex]::Match($fm, '(?m)^category:\s*(?<value>[a-z][a-z-]*)\s*$')
        foreach ($key in @('id', 'title', 'category', 'status', 'related', 'updated', 'source_sha', 'source_branch')) {
            if (-not [regex]::IsMatch($fm, '(?m)^' + [regex]::Escape($key) + ':\s*\S.*$')) {
                Add-Error ("Front matter missing or empty '{0}': {1}" -f $key, $file.FullName)
            }
        }
        if (-not [regex]::IsMatch($fm, '(?m)^source_of_truth:')) {
            Add-Error ("Front matter missing 'source_of_truth': {0}" -f $file.FullName)
        } elseif ($categoryMatch.Success -and $categoryMatch.Groups['value'].Value -eq 'index' -and
                  [regex]::IsMatch($fm, '(?m)^source_of_truth:\s*\[\s*\]\s*$')) {
            # Index pages may aggregate links without a single implementing source file.
            $indexSourceExemptionCount += 1
        } elseif ([regex]::IsMatch($fm, '(?m)^source_of_truth:\s*(\[\s*\]|\s*)$')) {
            Add-Error ("Front matter has empty 'source_of_truth' outside category:index: {0}" -f $file.FullName)
        }
        if (-not [regex]::IsMatch($fm, '(?m)^status:\s*(draft|verified)\s*$')) {
            Add-Error ("Invalid front-matter status: {0}" -f $file.FullName)
        }
        if (-not [regex]::IsMatch($fm, '(?m)^updated:\s*\d{4}-\d{2}-\d{2}\s*$')) {
            Add-Error ("Invalid front-matter updated date: {0}" -f $file.FullName)
        }
        if (-not [regex]::IsMatch($fm, '(?m)^source_sha:\s*[0-9a-fA-F]{40}\s*$')) {
            Add-Error ("Invalid or missing source_sha: {0}" -f $file.FullName)
        }
        if (-not [regex]::IsMatch($fm, '(?m)^source_branch:\s*\S.*$')) {
            Add-Error ("Invalid or missing source_branch: {0}" -f $file.FullName)
        }
        $frontMatterByPath[$fullPath] = @{
            Content = $content
            Category = if ($categoryMatch.Success) { $categoryMatch.Groups['value'].Value } else { '' }
        }
    }
    $edges[$fullPath] = New-Object System.Collections.Generic.List[string]
}

foreach ($file in $allMarkdown) {
    $sourcePath = [System.IO.Path]::GetFullPath($file.FullName)
    $sourceDir = Split-Path -Parent $sourcePath
    $content = Get-Content -LiteralPath $sourcePath -Raw
    foreach ($match in [regex]::Matches($content, '\[[^\]]+\]\((?<target>[^)]+)\)')) {
        $linkCount += 1
        $rawTarget = $match.Groups['target'].Value.Trim()
        if ($rawTarget -match '\s') {
            Add-Error ("Unencoded whitespace in link target '{0}' from {1}" -f $rawTarget, $sourcePath)
        }
        if ($rawTarget.Contains('&')) {
            Add-Error ("Unencoded ampersand in link target '{0}' from {1}" -f $rawTarget, $sourcePath)
        }
        if ($rawTarget -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $rawTarget.StartsWith('/') -or $rawTarget.StartsWith('\')) {
            Add-Error ("Non-relative link target '{0}' from {1}" -f $rawTarget, $sourcePath)
            continue
        }

        $decoded = [System.Uri]::UnescapeDataString($rawTarget)
        $fragment = ''
        if ($decoded.Contains('#')) {
            $parts = $decoded -split '#', 2
            $decoded = $parts[0]
            $fragment = $parts[1]
        }
        if ($decoded.Contains('?')) {
            $decoded = ($decoded -split '\?', 2)[0]
        }
        if ([string]::IsNullOrEmpty($decoded)) {
            $targetPath = $sourcePath
        } else {
            $targetPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($sourceDir, $decoded))
        }

        if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            Add-Error ("Broken link '{0}' from {1}" -f $rawTarget, $sourcePath)
            continue
        }
        if (-not (Test-ExactPathCase -FullPath $targetPath)) {
            Add-Error ("Link target casing differs from disk for '{0}' from {1}" -f $rawTarget, $sourcePath)
        }

        if ($fragment -and [System.IO.Path]::GetExtension($targetPath) -ieq '.md' -and $fragment -notmatch '^L\d+(?:-L?\d+)?$') {
            if (-not $frontMatterByPath.ContainsKey($targetPath)) {
                $targetContent = Get-Content -LiteralPath $targetPath -Raw
            } else {
                $targetContent = $frontMatterByPath[$targetPath].Content
            }
            $anchors = Get-HeadingAnchors -Content $targetContent
            if (-not $anchors.Contains($fragment)) {
                Add-Error ("Unresolved heading anchor '#{0}' in link from {1}" -f $fragment, $sourcePath)
            } else {
                $anchorCount += 1
            }
        }

        if ([System.IO.Path]::GetExtension($targetPath) -ieq '.md' -and $targetPath.StartsWith($kbRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $edges[$sourcePath].Add($targetPath)
        }
    }
}

foreach ($sourcePath in $edges.Keys) {
    foreach ($targetPath in $edges[$sourcePath]) {
        $sourceCategory = $frontMatterByPath[$sourcePath].Category
        $targetCategory = if ($frontMatterByPath.ContainsKey($targetPath)) {
            $frontMatterByPath[$targetPath].Category
        } else {
            ''
        }
        # Items link to the hub and broad catalogs for navigation; only their
        # owning index is required to link back to each item.
        if (($itemCategories -contains $sourceCategory) -and $targetCategory -eq 'index') {
            continue
        }
        if (-not $edges.ContainsKey($targetPath) -or -not $edges[$targetPath].Contains($sourcePath)) {
            Add-Error ("Missing reciprocal knowledge-base link: {0} -> {1}" -f $sourcePath, $targetPath)
        }
    }
}

$homePath = [System.IO.Path]::GetFullPath((Join-Path $kbRoot 'README.md'))
$reachable = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
$queue = New-Object System.Collections.Queue
if (Test-Path -LiteralPath $homePath -PathType Leaf) {
    [void]$reachable.Add($homePath)
    $queue.Enqueue($homePath)
    while ($queue.Count -gt 0) {
        $current = [string]$queue.Dequeue()
        if ($edges.ContainsKey($current)) {
            foreach ($targetPath in $edges[$current]) {
                if ($reachable.Add($targetPath)) {
                    $queue.Enqueue($targetPath)
                }
            }
        }
    }
} else {
    Add-Error ("Knowledge-base home is missing: {0}" -f $homePath)
}

$itemCount = 0
foreach ($path in $frontMatterByPath.Keys) {
    if ($itemCategories -contains $frontMatterByPath[$path].Category) {
        $itemCount += 1
        if (-not $reachable.Contains($path)) {
            Add-Error ("Orphan item is not reachable from docs/kb/README.md: {0}" -f $path)
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Output ("Documentation link check failed with {0} issue(s):" -f $errors.Count)
    foreach ($errorMessage in $errors) {
        Write-Output (" - {0}" -f $errorMessage)
    }
    exit 1
}

Write-Output ("Documentation link check passed: {0} Markdown files, {1} relative links resolved, {2} heading anchors resolved, front matter valid ({3} index source_of_truth exemptions), internal links reciprocal, {4} item files reachable from docs/kb/README.md." -f $allMarkdown.Count, $linkCount, $anchorCount, $indexSourceExemptionCount, $itemCount)
exit 0
