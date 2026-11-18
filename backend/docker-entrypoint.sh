#!/usr/bin/env sh
set -e

if [ ! -f /var/www/html/.env ] && [ -f /var/www/html/.env.example ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

if [ ! -f /var/www/html/vendor/autoload.php ]; then
    echo "Installing Composer dependencies into /var/www/html/vendor..."
    composer install --no-interaction --prefer-dist
fi

exec docker-php-entrypoint "$@"
