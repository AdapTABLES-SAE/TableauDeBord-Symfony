<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250929084101 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE eleve_equipement (eleve_id INT NOT NULL, equipement_id INT NOT NULL, INDEX IDX_BA8E29A1A6CC7B2 (eleve_id), INDEX IDX_BA8E29A1806F0F5C (equipement_id), PRIMARY KEY(eleve_id, equipement_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE niveau (id INT AUTO_INCREMENT NOT NULL, objectif_id INT NOT NULL, numero INT NOT NULL, faits_rencontres INT NOT NULL, succes INT NOT NULL, INDEX IDX_4BDFF36B157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE objectif (id INT AUTO_INCREMENT NOT NULL, eleve_id INT NOT NULL, titre VARCHAR(255) NOT NULL, tables JSON NOT NULL, INDEX IDX_E2F86851A6CC7B2 (eleve_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE eleve_equipement ADD CONSTRAINT FK_BA8E29A1A6CC7B2 FOREIGN KEY (eleve_id) REFERENCES eleve (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE eleve_equipement ADD CONSTRAINT FK_BA8E29A1806F0F5C FOREIGN KEY (equipement_id) REFERENCES equipement (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE niveau ADD CONSTRAINT FK_4BDFF36B157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id)');
        $this->addSql('ALTER TABLE objectif ADD CONSTRAINT FK_E2F86851A6CC7B2 FOREIGN KEY (eleve_id) REFERENCES eleve (id)');
        $this->addSql('ALTER TABLE entrainement DROP objectif, DROP niveau, DROP progression, DROP created_at, DROP updated_at');
        $this->addSql('ALTER TABLE equipement DROP description, DROP price, CHANGE name nom VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE progression DROP FOREIGN KEY FK_D5B25073A6CC7B2');
        $this->addSql('DROP INDEX IDX_D5B25073A6CC7B2 ON progression');
        $this->addSql('ALTER TABLE progression DROP eleve_id, DROP temps_reponse, DROP date');
        $this->addSql('ALTER TABLE tache ADD niveau_id INT NOT NULL, DROP consigne, DROP completed, CHANGE type type VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE tache ADD CONSTRAINT FK_93872075B3E9C81 FOREIGN KEY (niveau_id) REFERENCES niveau (id)');
        $this->addSql('CREATE INDEX IDX_93872075B3E9C81 ON tache (niveau_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE tache DROP FOREIGN KEY FK_93872075B3E9C81');
        $this->addSql('ALTER TABLE eleve_equipement DROP FOREIGN KEY FK_BA8E29A1A6CC7B2');
        $this->addSql('ALTER TABLE eleve_equipement DROP FOREIGN KEY FK_BA8E29A1806F0F5C');
        $this->addSql('ALTER TABLE niveau DROP FOREIGN KEY FK_4BDFF36B157D1AD4');
        $this->addSql('ALTER TABLE objectif DROP FOREIGN KEY FK_E2F86851A6CC7B2');
        $this->addSql('DROP TABLE eleve_equipement');
        $this->addSql('DROP TABLE niveau');
        $this->addSql('DROP TABLE objectif');
        $this->addSql('ALTER TABLE entrainement ADD objectif VARCHAR(255) NOT NULL, ADD niveau INT NOT NULL, ADD progression JSON DEFAULT NULL, ADD created_at DATETIME NOT NULL, ADD updated_at DATETIME NOT NULL');
        $this->addSql('ALTER TABLE progression ADD eleve_id INT NOT NULL, ADD temps_reponse INT NOT NULL, ADD date DATETIME NOT NULL');
        $this->addSql('ALTER TABLE progression ADD CONSTRAINT FK_D5B25073A6CC7B2 FOREIGN KEY (eleve_id) REFERENCES eleve (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_D5B25073A6CC7B2 ON progression (eleve_id)');
        $this->addSql('ALTER TABLE equipement ADD description LONGTEXT NOT NULL, ADD price INT NOT NULL, CHANGE nom name VARCHAR(100) NOT NULL');
        $this->addSql('DROP INDEX IDX_93872075B3E9C81 ON tache');
        $this->addSql('ALTER TABLE tache ADD consigne LONGTEXT NOT NULL, ADD completed TINYINT(1) NOT NULL, DROP niveau_id, CHANGE type type VARCHAR(50) NOT NULL');
    }
}
