#!/bin/bash

# 中春晚报名系统部署脚本
# 使用方法: ./deploy.sh [production|staging|development]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境参数
ENVIRONMENT=${1:-production}
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    log_error "无效的环境参数: $ENVIRONMENT"
    log_info "使用方法: ./deploy.sh [production|staging|development]"
    exit 1
fi

log_info "开始部署到 $ENVIRONMENT 环境..."

# 检查必要的工具
check_requirements() {
    log_info "检查部署环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 检查配置文件
check_config() {
    log_info "检查配置文件..."
    
    ENV_FILE="./server/.env.${ENVIRONMENT}"
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "配置文件不存在: $ENV_FILE"
        log_info "请复制 deploy/env.${ENVIRONMENT}.example 到 $ENV_FILE 并修改配置"
        exit 1
    fi
    
    log_success "配置文件检查通过"
}

# 备份数据
backup_data() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "备份生产数据..."
        
        BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # 备份上传文件
        if [[ -d "./uploads" ]]; then
            cp -r ./uploads "$BACKUP_DIR/"
            log_success "上传文件备份完成"
        fi
        
        # 备份日志
        if [[ -d "./logs" ]]; then
            cp -r ./logs "$BACKUP_DIR/"
            log_success "日志文件备份完成"
        fi
        
        log_success "数据备份完成: $BACKUP_DIR"
    fi
}

# 构建应用
build_app() {
    log_info "构建应用镜像..."
    
    # 清理旧的构建缓存
    docker system prune -f
    
    # 构建新镜像
    docker-compose build --no-cache
    
    log_success "应用镜像构建完成"
}

# 部署应用
deploy_app() {
    log_info "部署应用..."
    
    # 停止旧容器
    docker-compose down
    
    # 启动新容器
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        docker-compose logs
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    MAX_RETRIES=10
    RETRY_COUNT=0
    
    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
        if curl -f https://united.quantumlight.cc/api/health > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warning "健康检查失败，重试 $RETRY_COUNT/$MAX_RETRIES..."
        sleep 10
    done
    
    log_error "健康检查失败，部署可能有问题"
    return 1
}

# 清理旧镜像
cleanup() {
    log_info "清理旧镜像..."
    
    # 删除悬挂的镜像
    if docker images -f "dangling=true" -q | grep -q .; then
        docker rmi $(docker images -f "dangling=true" -q)
    fi
    
    log_success "清理完成"
}

# 显示部署信息
show_info() {
    log_success "部署完成！"
    echo
    log_info "服务信息:"
    docker-compose ps
    echo
    log_info "服务日志 (最近10行):"
    docker-compose logs --tail=10
    echo
    log_info "访问地址:"
    echo "  - 前端: http://localhost (如果配置了Nginx)"
    echo "  - API:  https://united.quantumlight.cc/api"
    echo "  - 健康检查: https://united.quantumlight.cc/api/health"
    echo
    log_info "常用命令:"
    echo "  - 查看日志: docker-compose logs -f"
    echo "  - 停止服务: docker-compose down"
    echo "  - 重启服务: docker-compose restart"
}

# 主执行流程
main() {
    log_info "=== 中春晚报名系统部署脚本 ==="
    log_info "环境: $ENVIRONMENT"
    log_info "时间: $(date)"
    echo
    
    check_requirements
    check_config
    backup_data
    build_app
    deploy_app
    
    if health_check; then
        cleanup
        show_info
    else
        log_error "部署失败，请检查日志"
        docker-compose logs
        exit 1
    fi
}

# 执行主流程
main
