#!/bin/bash
set -e

echo "--- Démarrage du conteneur ---"

service mariadb start

echo "--- Attente du démarrage de MariaDB ---"
sleep 5

if [ -z "$MARIADB_ROOT_PASSWORD" ]; then 
    MARIADB_ROOT_PASSWORD="root"
fi 
if [ -z "$DATABASE_URL" ]; then 
    DATABASE_URL="mysql://root:${MARIADB_ROOT_PASSWORD}@127.0.0.1:3306/tableau_de_bord"
fi 
if [ -z "$API_BASE_URL" ]; then 
    API_BASE_URL="https://dungeon-generator.univ-lemans.fr/FrameworkAPI/"
fi 

# On tente de se connecter sans mot de passe
if mysql -u root -e "status" >/dev/null 2>&1; then
    echo "--- Configuration initiale de MariaDB (sans mot de passe) ---"
    mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MARIADB_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
# Si ça échoue, on tente avec le mot de passe défini
elif mysql -u root -p"${MARIADB_ROOT_PASSWORD}" -e "status" >/dev/null 2>&1; then
    echo "--- MariaDB est déjà configuré avec le bon mot de passe ---"
else
    echo "--- ERREUR : Impossible de se connecter à MariaDB ---"
    exit 1
fi

# Configuration du .env.local Symfony
if [ -f "$WEB_SERVER_INSTALL_DIRECTORY/.env" ]; then
    echo "--- Configuration du .env.local ---"
    cp "$WEB_SERVER_INSTALL_DIRECTORY/.env" "$WEB_SERVER_INSTALL_DIRECTORY/.env.local"
    
    # Remplacement des variables
    sed -i "s|^APP_ENV=.*|APP_ENV=${APP_ENV}|" "${WEB_SERVER_INSTALL_DIRECTORY}/.env.local" 
    sed -i "s|^API_BASE_URL=.*|API_BASE_URL=${API_BASE_URL}|" "${WEB_SERVER_INSTALL_DIRECTORY}/.env.local" 
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "${WEB_SERVER_INSTALL_DIRECTORY}/.env.local"
fi

# Commandes Symfony & Doctrine 
cd "$WEB_SERVER_INSTALL_DIRECTORY"
INITIALIZED_FLAG="$WEB_SERVER_INSTALL_DIRECTORY/var/.database_initialized"

if [ ! -f "$INITIALIZED_FLAG" ]; then
    echo "--- Première exécution : Initialisation de la base de données ---"
    
    # Création de la BDD
    php bin/console doctrine:database:create --if-not-exists
    
    # Création des tables
    php bin/console doctrine:schema:update --force
    
    # (Optionnel) Chargement des fixtures si tu en as
    # php bin/console doctrine:fixtures:load --no-interaction

    # Création du fichier témoin pour la prochaine fois
    touch "$INITIALIZED_FLAG"
    echo "--- Base de données initialisée avec succès ---"
else
    echo "--- Base de données déjà initialisée, passage à la suite ---"
fi

echo "--- Nettoyage du cache ---"
php bin/console cache:clear

# Permissions des dossiers 
echo "--- Application des permissions (www-data) ---"
chown -R www-data:www-data "$WEB_SERVER_INSTALL_DIRECTORY"

chmod -R 775 "$WEB_SERVER_INSTALL_DIRECTORY/var"

echo "--- Démarrage d'Apache ---"
exec $@