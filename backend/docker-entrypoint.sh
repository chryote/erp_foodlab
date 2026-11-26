#!/usr/bin/env sh
set -e

if [ ! -f /var/www/html/.env ] && [ -f /var/www/html/.env.example ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

DEPS_HASH="$(cat /var/www/html/composer.json /var/www/html/composer.lock 2>/dev/null | sha256sum | awk '{print $1}')"
CURRENT_HASH=""
if [ -f /var/www/html/vendor/.composer.deps.sha256 ]; then
    CURRENT_HASH="$(cat /var/www/html/vendor/.composer.deps.sha256)"
fi

if [ ! -f /var/www/html/vendor/autoload.php ] || [ "$DEPS_HASH" != "$CURRENT_HASH" ]; then
    echo "Syncing Composer dependencies into /var/www/html/vendor..."
    composer install --no-interaction --prefer-dist
    DEPS_HASH="$(cat /var/www/html/composer.json /var/www/html/composer.lock 2>/dev/null | sha256sum | awk '{print $1}')"
    printf '%s' "$DEPS_HASH" > /var/www/html/vendor/.composer.deps.sha256
fi

mkdir -p /var/www/html/storage/logs /var/www/html/storage/framework/cache /var/www/html/storage/framework/sessions /var/www/html/storage/framework/views /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

if [ "${1:-}" = "php-fpm" ] && [ "${SCOUT_DRIVER:-}" = "meilisearch" ]; then
    echo "Bootstrapping Meilisearch index settings and empty indexes..."
    php artisan scout:bootstrap || echo "Warning: Scout bootstrap failed; continuing php-fpm startup."
fi

exec docker-php-entrypoint "$@"
