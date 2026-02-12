ARG BASE_IMAGE=debian:12

FROM ${BASE_IMAGE}

# Arguments (Doivent être redéfinis après FROM)
ARG WEB_SERVER_INSTALL_DIRECTORY="/var/www/html"
ARG WEB_SERVER_WORKDIR="/var/www/html/public"
ARG APP_ENV="dev"
ARG GIT_REPO_URL=https://github.com/AdapTABLES-SAE/TableauDeBord-Symfony.git

# Environnement
ENV WEB_SERVER_INSTALL_DIRECTORY=$WEB_SERVER_INSTALL_DIRECTORY
ENV WEB_SERVER_WORKDIR=$WEB_SERVER_WORKDIR
ENV APP_ENV=$APP_ENV
ENV DEBIAN_FRONTEND=noninteractive

USER root

# --- 1. Installation des dépendances ---
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y git curl wget unzip lsb-release ca-certificates apt-transport-https software-properties-common mariadb-server \
    php8.2 php8.2-cli php8.2-common php8.2-curl php8.2-mbstring \
    php8.2-mysql php8.2-xml php8.2-zip php8.2-intl php8.2-gd \
    libapache2-mod-php8.2

# --- 2. Installation de Composer ---
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && \
    php composer-setup.php --install-dir=/usr/local/bin --filename=composer && \
    php -r "unlink('composer-setup.php');"

# --- 3. Configuration Apache (VirtualHost) ---
# On crée le fichier de config directement via echo pour éviter un fichier externe
RUN echo "<VirtualHost *:80>\n\
    ServerName adaptables.local\n\
    DocumentRoot ${WEB_SERVER_WORKDIR}\n\
    <Directory ${WEB_SERVER_WORKDIR}>\n\
        AllowOverride All\n\
        Require all granted\n\
        FallbackResource /index.php\n\
    </Directory>\n\
    ErrorLog \${APACHE_LOG_DIR}/adaptables_error.log\n\
    CustomLog \${APACHE_LOG_DIR}/adaptables_access.log combined\n\
</VirtualHost>" > /etc/apache2/sites-available/adaptables.conf

# Activation du site et des modules (Section 2.3)
RUN a2dissite 000-default.conf && \
    a2ensite adaptables && \
    a2enmod rewrite

# --- 4. Clonage et Installation du Code ---
RUN mkdir -p "$WEB_SERVER_INSTALL_DIRECTORY"
WORKDIR "$WEB_SERVER_INSTALL_DIRECTORY"

# On vide le dossier d'instalation et on clone dedans
RUN rm ./*
RUN git clone "$GIT_REPO_URL" .

# On installe les vendor (Composer)
RUN if [ "$APP_ENV" = "prod" ]; then \
        composer install --optimize-autoloader --no-dev --no-scripts; \
    else \
        composer install --optimize-autoloader; \
    fi

# Copie et droits de l'entrypoint
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# On expose le port 80
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2ctl", "-D", "FOREGROUND"]