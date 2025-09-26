<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250926080226 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE classe DROP FOREIGN KEY FK_8F87BF9641807E1D');
        $this->addSql('ALTER TABLE eleve DROP FOREIGN KEY FK_ECA105F7A76ED395');
        $this->addSql('CREATE TABLE enseignant (id INT AUTO_INCREMENT NOT NULL, identifiant VARCHAR(50) NOT NULL, nom VARCHAR(100) DEFAULT NULL, UNIQUE INDEX UNIQ_81A72FA1C90409EC (identifiant), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE eleve_equipement DROP FOREIGN KEY FK_BA8E29A1806F0F5C');
        $this->addSql('ALTER TABLE eleve_equipement DROP FOREIGN KEY FK_BA8E29A1A6CC7B2');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE eleve_equipement');
        $this->addSql('DROP INDEX IDX_8F87BF9641807E1D ON classe');
        $this->addSql('ALTER TABLE classe ADD identifiant VARCHAR(50) NOT NULL, CHANGE teacher_id enseignant_id INT NOT NULL, CHANGE name nom VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE classe ADD CONSTRAINT FK_8F87BF96E455FCC0 FOREIGN KEY (enseignant_id) REFERENCES enseignant (id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8F87BF96C90409EC ON classe (identifiant)');
        $this->addSql('CREATE INDEX IDX_8F87BF96E455FCC0 ON classe (enseignant_id)');
        $this->addSql('DROP INDEX UNIQ_ECA105F7A76ED395 ON eleve');
        $this->addSql('ALTER TABLE eleve ADD identifiant VARCHAR(50) NOT NULL, ADD nom VARCHAR(100) NOT NULL, ADD prenom VARCHAR(100) NOT NULL, DROP user_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE classe DROP FOREIGN KEY FK_8F87BF96E455FCC0');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, roles JSON NOT NULL, password VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, name VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, created_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE eleve_equipement (eleve_id INT NOT NULL, equipement_id INT NOT NULL, INDEX IDX_BA8E29A1A6CC7B2 (eleve_id), INDEX IDX_BA8E29A1806F0F5C (equipement_id), PRIMARY KEY(eleve_id, equipement_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE eleve_equipement ADD CONSTRAINT FK_BA8E29A1806F0F5C FOREIGN KEY (equipement_id) REFERENCES equipement (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE eleve_equipement ADD CONSTRAINT FK_BA8E29A1A6CC7B2 FOREIGN KEY (eleve_id) REFERENCES eleve (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('DROP TABLE enseignant');
        $this->addSql('DROP INDEX UNIQ_8F87BF96C90409EC ON classe');
        $this->addSql('DROP INDEX IDX_8F87BF96E455FCC0 ON classe');
        $this->addSql('ALTER TABLE classe DROP identifiant, CHANGE enseignant_id teacher_id INT NOT NULL, CHANGE nom name VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE classe ADD CONSTRAINT FK_8F87BF9641807E1D FOREIGN KEY (teacher_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_8F87BF9641807E1D ON classe (teacher_id)');
        $this->addSql('ALTER TABLE eleve ADD user_id INT NOT NULL, DROP identifiant, DROP nom, DROP prenom');
        $this->addSql('ALTER TABLE eleve ADD CONSTRAINT FK_ECA105F7A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ECA105F7A76ED395 ON eleve (user_id)');
    }
}
