#!/bin/sh

echo "=== Reset complet de la base Doctrine ==="

php bin/console doctrine:database:drop --force
php bin/console doctrine:database:create

rm -f migrations/*.php

php bin/console make:migration
php bin/console doctrine:migrations:migrate -n

echo "=== Base de données recréée avec succès ==="

read -p "Appuyez sur une touche pour continuer..."
