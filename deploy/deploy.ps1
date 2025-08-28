# 中春晚报名系统部署脚本 (Windows PowerShell 版本)
# 使用方法: .\deploy.ps1 [production|staging|development]

param(
    [string]$Environment = "production"
)

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 验证环境参数
if ($Environment -notin @("production", "staging", "development")) {
    Write-Error "无效的环境参数: $Environment"
    Write-Info "使用方法: .\deploy.ps1 [production|staging|development]"
    exit 1
}

Write-Info "开始部署到 $Environment 环境..."

# 检查必要的工具
function Test-Requirements {
    Write-Info "检查部署环境..."
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker 未安装，请先安装 Docker Desktop"
        exit 1
    }
    
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    }
    
    Write-Success "环境检查通过"
}

# 检查配置文件
function Test-Config {
    Write-Info "检查配置文件..."
    
    $envFile = ".\server\.env.$Environment"
    if (!(Test-Path $envFile)) {
        Write-Error "配置文件不存在: $envFile"
        Write-Info "请复制 deploy\env.$Environment.example 到 $envFile 并修改配置"
        exit 1
    }
    
    Write-Success "配置文件检查通过"
}

# 备份数据
function Backup-Data {
    if ($Environment -eq "production") {
        Write-Info "备份生产数据..."
        
        $backupDir = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        
        # 备份上传文件
        if (Test-Path ".\uploads") {
            Copy-Item -Path ".\uploads" -Destination $backupDir -Recurse
            Write-Success "上传文件备份完成"
        }
        
        # 备份日志
        if (Test-Path ".\logs") {
            Copy-Item -Path ".\logs" -Destination $backupDir -Recurse
            Write-Success "日志文件备份完成"
        }
        
        Write-Success "数据备份完成: $backupDir"
    }
}

# 构建应用
function Build-App {
    Write-Info "构建应用镜像..."
    
    # 清理旧的构建缓存
    docker system prune -f
    
    # 构建新镜像
    docker-compose build --no-cache
    
    Write-Success "应用镜像构建完成"
}

# 部署应用
function Deploy-App {
    Write-Info "部署应用..."
    
    # 停止旧容器
    docker-compose down
    
    # 启动新容器
    docker-compose up -d
    
    # 等待服务启动
    Write-Info "等待服务启动..."
    Start-Sleep -Seconds 30
    
    # 检查服务状态
    $status = docker-compose ps
    if ($status -match "Up") {
        Write-Success "服务启动成功"
    } else {
        Write-Error "服务启动失败"
        docker-compose logs
        exit 1
    }
}

# 健康检查
function Test-Health {
    Write-Info "执行健康检查..."
    
    $maxRetries = 10
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-RestMethod -Uri "https://united.quantumlight.cc/api/health" -TimeoutSec 5
            Write-Success "健康检查通过"
            return $true
        } catch {
            $retryCount++
            Write-Warning "健康检查失败，重试 $retryCount/$maxRetries..."
            Start-Sleep -Seconds 10
        }
    }
    
    Write-Error "健康检查失败，部署可能有问题"
    return $false
}

# 清理旧镜像
function Clear-OldImages {
    Write-Info "清理旧镜像..."
    
    # 删除悬挂的镜像
    $danglingImages = docker images -f "dangling=true" -q
    if ($danglingImages) {
        docker rmi $danglingImages
    }
    
    Write-Success "清理完成"
}

# 显示部署信息
function Show-Info {
    Write-Success "部署完成！"
    Write-Host ""
    Write-Info "服务信息:"
    docker-compose ps
    Write-Host ""
    Write-Info "服务日志 (最近10行):"
    docker-compose logs --tail=10
    Write-Host ""
    Write-Info "访问地址:"
    Write-Host "  - 前端: http://localhost (如果配置了Nginx)"
    Write-Host "  - API:  https://united.quantumlight.cc/api"
    Write-Host "  - 健康检查: https://united.quantumlight.cc/api/health"
    Write-Host ""
    Write-Info "常用命令:"
    Write-Host "  - 查看日志: docker-compose logs -f"
    Write-Host "  - 停止服务: docker-compose down"
    Write-Host "  - 重启服务: docker-compose restart"
}

# 主执行流程
function Main {
    Write-Info "=== 中春晚报名系统部署脚本 ==="
    Write-Info "环境: $Environment"
    Write-Info "时间: $(Get-Date)"
    Write-Host ""
    
    Test-Requirements
    Test-Config
    Backup-Data
    Build-App
    Deploy-App
    
    if (Test-Health) {
        Clear-OldImages
        Show-Info
    } else {
        Write-Error "部署失败，请检查日志"
        docker-compose logs
        exit 1
    }
}

# 执行主流程
Main
