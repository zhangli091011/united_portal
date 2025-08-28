#!/bin/bash

# SSL证书设置脚本 (使用 Let's Encrypt)
# 使用方法: ./ssl-setup.sh your-domain.com

set -e

DOMAIN=${1}
EMAIL=${2:-admin@${DOMAIN}}

if [[ -z "$DOMAIN" ]]; then
    echo "使用方法: ./ssl-setup.sh your-domain.com [email@domain.com]"
    exit 1
fi

echo "为域名 $DOMAIN 设置SSL证书..."
echo "邮箱: $EMAIL"

# 创建SSL目录
mkdir -p ./ssl

# 安装 Certbot (如果没有安装)
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# 临时启动一个简单的HTTP服务器用于验证
echo "启动临时HTTP服务器进行域名验证..."
docker run -d --name temp-nginx \
    -p 80:80 \
    -v $(pwd)/ssl:/var/www/certbot \
    nginx:alpine

# 等待服务启动
sleep 5

# 申请SSL证书
echo "申请SSL证书..."
sudo certbot certonly \
    --webroot \
    --webroot-path=$(pwd)/ssl \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# 停止临时服务器
docker stop temp-nginx
docker rm temp-nginx

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/
sudo chown $(whoami):$(whoami) ./ssl/*.pem

echo "SSL证书设置完成！"
echo "证书位置: ./ssl/"
echo "证书将在90天后过期，请设置自动续期"

# 创建续期脚本
cat > ./ssl-renew.sh << 'EOF'
#!/bin/bash
# SSL证书续期脚本

DOMAIN=$1
if [[ -z "$DOMAIN" ]]; then
    echo "使用方法: ./ssl-renew.sh your-domain.com"
    exit 1
fi

echo "续期SSL证书..."
sudo certbot renew --quiet

# 复制新证书
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/
sudo chown $(whoami):$(whoami) ./ssl/*.pem

# 重启Nginx
docker-compose restart nginx

echo "SSL证书续期完成！"
EOF

chmod +x ./ssl-renew.sh

echo "创建了续期脚本: ./ssl-renew.sh"
echo "可以添加到crontab中实现自动续期："
echo "0 12 * * * $(pwd)/ssl-renew.sh $DOMAIN"
