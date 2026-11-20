#!/usr/bin/env sh
set -e

if [ ! -f /var/www/html/.env ] && [ -f /var/www/html/.env.example ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

LOCK_HASH=""
if [ -f /var/www/html/composer.lock ]; then
    LOCK_HASH="$(sha256sum /var/www/html/composer.lock | awk '{print $1}')"
fi
CURRENT_HASH=""
if [ -f /var/www/html/vendor/.composer.lock.sha256 ]; then
    CURRENT_HASH="$(cat /var/www/html/vendor/.composer.lock.sha256)"
fi

if [ ! -f /var/www/html/vendor/autoload.php ] || [ "$LOCK_HASH" != "$CURRENT_HASH" ]; then
    echo "Syncing Composer dependencies into /var/www/html/vendor..."
    composer install --no-interaction --prefer-dist
    if [ -n "$LOCK_HASH" ]; then
        printf '%s' "$LOCK_HASH" > /var/www/html/vendor/.composer.lock.sha256
    fi
fi

mkdir -p /var/www/html/storage/logs /var/www/html/storage/framework/cache /var/www/html/storage/framework/sessions /var/www/html/storage/framework/views /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

php artisan migrate --force || true

exec docker-php-entrypoint "$@"
