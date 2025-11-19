<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251119113847 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE classe (id BIGINT AUTO_INCREMENT NOT NULL, enseignant_id INT DEFAULT NULL, id_classe VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_8F87BF96E455FCC0 (enseignant_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE eleve (id INT AUTO_INCREMENT NOT NULL, classe_id BIGINT DEFAULT NULL, entrainement_id INT DEFAULT NULL, learner_id VARCHAR(255) NOT NULL, nom_eleve VARCHAR(255) NOT NULL, prenom_eleve VARCHAR(255) NOT NULL, current_learning_path_id VARCHAR(255) DEFAULT NULL, UNIQUE INDEX UNIQ_ECA105F76209CB66 (learner_id), INDEX IDX_ECA105F78F5EA509 (classe_id), INDEX IDX_ECA105F7A15E8FD (entrainement_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE enseignant (id INT AUTO_INCREMENT NOT NULL, id_prof VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE entrainement (id INT AUTO_INCREMENT NOT NULL, enseignant_id INT DEFAULT NULL, name VARCHAR(255) DEFAULT NULL, learning_path_id VARCHAR(255) NOT NULL, INDEX IDX_A27444E5E455FCC0 (enseignant_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE niveau (id INT AUTO_INCREMENT NOT NULL, objectif_id INT DEFAULT NULL, level_id VARCHAR(255) NOT NULL, name VARCHAR(255) DEFAULT NULL, success_completion_criteria DOUBLE PRECISION DEFAULT NULL, encounter_completion_criteria DOUBLE PRECISION DEFAULT NULL, tables JSON DEFAULT NULL, result_location VARCHAR(50) DEFAULT NULL, left_operand VARCHAR(50) DEFAULT NULL, interval_min INT DEFAULT NULL, interval_max INT DEFAULT NULL, INDEX IDX_4BDFF36B157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE objectif (id INT AUTO_INCREMENT NOT NULL, entrainement_id INT DEFAULT NULL, obj_id VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_E2F86851A15E8FD (entrainement_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE prerequis (id INT AUTO_INCREMENT NOT NULL, objectif_id INT DEFAULT NULL, required_level VARCHAR(255) NOT NULL, required_objective VARCHAR(255) NOT NULL, success_percent DOUBLE PRECISION NOT NULL, encounters_percent DOUBLE PRECISION NOT NULL, INDEX IDX_CAE3EB09157D1AD4 (objectif_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE tache (id INT AUTO_INCREMENT NOT NULL, niveau_id INT DEFAULT NULL, task_type VARCHAR(10) NOT NULL, time_max_second INT DEFAULT NULL, repartition_percent INT DEFAULT NULL, successive_successes_to_reach INT DEFAULT NULL, targets JSON DEFAULT NULL, answer_modality VARCHAR(50) DEFAULT NULL, nb_incorrect_choices INT DEFAULT NULL, nb_correct_choices INT DEFAULT NULL, nb_facts INT DEFAULT NULL, source_variation VARCHAR(50) DEFAULT NULL, target VARCHAR(50) DEFAULT NULL, INDEX IDX_93872075B3E9C81 (niveau_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', available_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', delivered_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE classe ADD CONSTRAINT FK_8F87BF96E455FCC0 FOREIGN KEY (enseignant_id) REFERENCES enseignant (id)');
        $this->addSql('ALTER TABLE eleve ADD CONSTRAINT FK_ECA105F78F5EA509 FOREIGN KEY (classe_id) REFERENCES classe (id)');
        $this->addSql('ALTER TABLE eleve ADD CONSTRAINT FK_ECA105F7A15E8FD FOREIGN KEY (entrainement_id) REFERENCES entrainement (id)');
        $this->addSql('ALTER TABLE entrainement ADD CONSTRAINT FK_A27444E5E455FCC0 FOREIGN KEY (enseignant_id) REFERENCES enseignant (id)');
        $this->addSql('ALTER TABLE niveau ADD CONSTRAINT FK_4BDFF36B157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE objectif ADD CONSTRAINT FK_E2F86851A15E8FD FOREIGN KEY (entrainement_id) REFERENCES entrainement (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE prerequis ADD CONSTRAINT FK_CAE3EB09157D1AD4 FOREIGN KEY (objectif_id) REFERENCES objectif (id)');
        $this->addSql('ALTER TABLE tache ADD CONSTRAINT FK_93872075B3E9C81 FOREIGN KEY (niveau_id) REFERENCES niveau (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE classe DROP FOREIGN KEY FK_8F87BF96E455FCC0');
        $this->addSql('ALTER TABLE eleve DROP FOREIGN KEY FK_ECA105F78F5EA509');
        $this->addSql('ALTER TABLE eleve DROP FOREIGN KEY FK_ECA105F7A15E8FD');
        $this->addSql('ALTER TABLE entrainement DROP FOREIGN KEY FK_A27444E5E455FCC0');
        $this->addSql('ALTER TABLE niveau DROP FOREIGN KEY FK_4BDFF36B157D1AD4');
        $this->addSql('ALTER TABLE objectif DROP FOREIGN KEY FK_E2F86851A15E8FD');
        $this->addSql('ALTER TABLE prerequis DROP FOREIGN KEY FK_CAE3EB09157D1AD4');
        $this->addSql('ALTER TABLE tache DROP FOREIGN KEY FK_93872075B3E9C81');
        $this->addSql('DROP TABLE classe');
        $this->addSql('DROP TABLE eleve');
        $this->addSql('DROP TABLE enseignant');
        $this->addSql('DROP TABLE entrainement');
        $this->addSql('DROP TABLE niveau');
        $this->addSql('DROP TABLE objectif');
        $this->addSql('DROP TABLE prerequis');
        $this->addSql('DROP TABLE tache');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
