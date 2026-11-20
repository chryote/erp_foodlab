FROM php:8.4-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpng-dev \
    libxml2-dev \
    libzip-dev \
    mariadb-client \
    mariadb-connector-c \
    oniguruma-dev \
    unzip \
    zip \
    $PHPIZE_DEPS \
    && printf '[client]\nssl=0\n' > /etc/my.cnf

# Install PHP extensions including Redis & MySQL
RUN docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    opcache \
    pcntl \
    pdo_mysql \
    zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-autoloader \
    && cat composer.json composer.lock 2>/dev/null | sha256sum | awk '{print $1}' > /var/www/html/vendor/.composer.deps.sha256

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && composer dump-autoload --optimize \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm"]
