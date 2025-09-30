<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250929110900 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE tache DROP FOREIGN KEY FK_93872075A15E8FD');
        $this->addSql('DROP INDEX IDX_93872075A15E8FD ON tache');
        $this->addSql('ALTER TABLE tache DROP entrainement_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE tache ADD entrainement_id INT NOT NULL');
        $this->addSql('ALTER TABLE tache ADD CONSTRAINT FK_93872075A15E8FD FOREIGN KEY (entrainement_id) REFERENCES entrainement (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_93872075A15E8FD ON tache (entrainement_id)');
    }
}
