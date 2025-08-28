#!/bin/bash

# 健康检查脚本
# 使用方法: ./healthcheck.sh [url]

URL=${1:-"http://localhost:3001"}
HEALTH_ENDPOINT="$URL/api/health"
MAX_RETRIES=3
TIMEOUT=10

echo "=== 系统健康检查 ==="
echo "检查时间: $(date)"
echo "检查地址: $HEALTH_ENDPOINT"
echo

# 检查服务是否响应
check_service() {
    local url=$1
    local name=$2
    
    echo -n "检查 $name... "
    
    if curl -f -s --max-time $TIMEOUT "$url" > /dev/null 2>&1; then
        echo "✅ 正常"
        return 0
    else
        echo "❌ 异常"
        return 1
    fi
}

# 检查详细健康状态
check_health_details() {
    echo "获取详细健康信息..."
    
    response=$(curl -s --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo "无法获取健康信息"
        return 1
    fi
}

# 检查Docker容器状态
check_docker_status() {
    echo
    echo "Docker 容器状态:"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    elif command -v docker &> /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "Docker 未安装或不可用"
    fi
}

# 检查系统资源
check_system_resources() {
    echo
    echo "系统资源使用情况:"
    
    # 内存使用
    echo -n "内存使用: "
    free -h | awk 'NR==2{printf "%.1f%% (%s/%s)\n", $3*100/$2, $3, $2}'
    
    # 磁盘使用
    echo -n "磁盘使用: "
    df -h / | awk 'NR==2{printf "%s (%s)\n", $5, $4}'
    
    # CPU负载
    if [ -f /proc/loadavg ]; then
        echo -n "CPU负载: "
        cat /proc/loadavg | awk '{print $1, $2, $3}'
    fi
}

# 主检查流程
main() {
    local failed=0
    
    # 基本服务检查
    check_service "$HEALTH_ENDPOINT" "API健康检查" || failed=$((failed + 1))
    check_service "$URL" "前端服务" || failed=$((failed + 1))
    
    echo
    
    # 详细健康信息
    check_health_details
    
    # Docker状态
    check_docker_status
    
    # 系统资源
    check_system_resources
    
    echo
    echo "=== 检查结果 ==="
    
    if [ $failed -eq 0 ]; then
        echo "✅ 所有检查通过，系统运行正常"
        exit 0
    else
        echo "❌ 检查失败 ($failed 项)，请查看上述详情"
        exit 1
    fi
}

# 执行检查
main
