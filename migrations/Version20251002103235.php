<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251002103235 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE classe (id BIGINT AUTO_INCREMENT NOT NULL, enseignant_id INT DEFAULT NULL, id_classe VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_8F87BF96E455FCC0 (enseignant_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE eleve (id INT AUTO_INCREMENT NOT NULL, classe_id BIGINT DEFAULT NULL, learner_id VARCHAR(255) NOT NULL, nom_eleve VARCHAR(255) NOT NULL, prenom_eleve VARCHAR(255) NOT NULL, INDEX IDX_ECA105F78F5EA509 (classe_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE enseignant (id INT AUTO_INCREMENT NOT NULL, id_prof VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE entrainement (id INT AUTO_INCREMENT NOT NULL, eleve_id INT DEFAULT NULL, objectif_id INT DEFAULT NULL, learning_path_id VARCHAR(255) NOT NULL, INDEX IDX_A27444E5A6CC7B2 (eleve_id), INDEX IDX_A27444E5157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE niveau (id INT AUTO_INCREMENT NOT NULL, objectif_id INT DEFAULT NULL, level_id VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_4BDFF36B157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE objectif (id INT AUTO_INCREMENT NOT NULL, obj_id VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE pcompletion (id INT AUTO_INCREMENT NOT NULL, pniveau_id INT DEFAULT NULL, success_completion_criteria DOUBLE PRECISION NOT NULL, encounter_completion_criteria DOUBLE PRECISION NOT NULL, UNIQUE INDEX UNIQ_4EF9BC17F8F465C1 (pniveau_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE pconstruction (id INT AUTO_INCREMENT NOT NULL, pniveau_id INT DEFAULT NULL, tables VARCHAR(255) NOT NULL, result_location VARCHAR(255) NOT NULL, left_operand VARCHAR(255) NOT NULL, interval_min VARCHAR(255) NOT NULL, interval_max VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_12C41E07F8F465C1 (pniveau_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE pniveau (id INT AUTO_INCREMENT NOT NULL, niveau_id INT DEFAULT NULL, INDEX IDX_8B195D9DB3E9C81 (niveau_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE prerequis (id INT AUTO_INCREMENT NOT NULL, objectif_id INT DEFAULT NULL, required_level VARCHAR(255) NOT NULL, required_objective VARCHAR(255) NOT NULL, success_percent DOUBLE PRECISION NOT NULL, encounters_percent DOUBLE PRECISION NOT NULL, INDEX IDX_CAE3EB09157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE ptache (id INT AUTO_INCREMENT NOT NULL, niveau_id INT DEFAULT NULL, time_max_second INT NOT NULL, repartition_percent INT NOT NULL, successive_successes_to_reach INT NOT NULL, targets VARCHAR(255) DEFAULT NULL, answer_modality VARCHAR(255) DEFAULT NULL, nb_incorrect_choices VARCHAR(255) DEFAULT NULL, nb_facts VARCHAR(255) DEFAULT NULL, source_variation VARCHAR(255) DEFAULT NULL, target VARCHAR(255) DEFAULT NULL, nb_correct_choices VARCHAR(255) DEFAULT NULL, INDEX IDX_EF457B0AB3E9C81 (niveau_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', available_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', delivered_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE classe ADD CONSTRAINT FK_8F87BF96E455FCC0 FOREIGN KEY (enseignant_id) REFERENCES enseignant (id)');
        $this->addSql('ALTER TABLE eleve ADD CONSTRAINT FK_ECA105F78F5EA509 FOREIGN KEY (classe_id) REFERENCES classe (id)');
        $this->addSql('ALTER TABLE entrainement ADD CONSTRAINT FK_A27444E5A6CC7B2 FOREIGN KEY (eleve_id) REFERENCES eleve (id)');
        $this->addSql('ALTER TABLE entrainement ADD CONSTRAINT FK_A27444E5157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id)');
        $this->addSql('ALTER TABLE niveau ADD CONSTRAINT FK_4BDFF36B157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id)');
        $this->addSql('ALTER TABLE pcompletion ADD CONSTRAINT FK_4EF9BC17F8F465C1 FOREIGN KEY (pniveau_id) REFERENCES pniveau (id)');
        $this->addSql('ALTER TABLE pconstruction ADD CONSTRAINT FK_12C41E07F8F465C1 FOREIGN KEY (pniveau_id) REFERENCES pniveau (id)');
        $this->addSql('ALTER TABLE pniveau ADD CONSTRAINT FK_8B195D9DB3E9C81 FOREIGN KEY (niveau_id) REFERENCES niveau (id)');
        $this->addSql('ALTER TABLE prerequis ADD CONSTRAINT FK_CAE3EB09157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id)');
        $this->addSql('ALTER TABLE ptache ADD CONSTRAINT FK_EF457B0AB3E9C81 FOREIGN KEY (niveau_id) REFERENCES niveau (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE classe DROP FOREIGN KEY FK_8F87BF96E455FCC0');
        $this->addSql('ALTER TABLE eleve DROP FOREIGN KEY FK_ECA105F78F5EA509');
        $this->addSql('ALTER TABLE entrainement DROP FOREIGN KEY FK_A27444E5A6CC7B2');
        $this->addSql('ALTER TABLE entrainement DROP FOREIGN KEY FK_A27444E5157D1AD4');
        $this->addSql('ALTER TABLE niveau DROP FOREIGN KEY FK_4BDFF36B157D1AD4');
        $this->addSql('ALTER TABLE pcompletion DROP FOREIGN KEY FK_4EF9BC17F8F465C1');
        $this->addSql('ALTER TABLE pconstruction DROP FOREIGN KEY FK_12C41E07F8F465C1');
        $this->addSql('ALTER TABLE pniveau DROP FOREIGN KEY FK_8B195D9DB3E9C81');
        $this->addSql('ALTER TABLE prerequis DROP FOREIGN KEY FK_CAE3EB09157D1AD4');
        $this->addSql('ALTER TABLE ptache DROP FOREIGN KEY FK_EF457B0AB3E9C81');
        $this->addSql('DROP TABLE classe');
        $this->addSql('DROP TABLE eleve');
        $this->addSql('DROP TABLE enseignant');
        $this->addSql('DROP TABLE entrainement');
        $this->addSql('DROP TABLE niveau');
        $this->addSql('DROP TABLE objectif');
        $this->addSql('DROP TABLE pcompletion');
        $this->addSql('DROP TABLE pconstruction');
        $this->addSql('DROP TABLE pniveau');
        $this->addSql('DROP TABLE prerequis');
        $this->addSql('DROP TABLE ptache');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
