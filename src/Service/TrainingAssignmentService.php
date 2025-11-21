<?php

namespace App\Service;

use App\Constant\ApiEndpoints;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use App\Entity\Entrainement;
use Doctrine\ORM\EntityManagerInterface;

class TrainingAssignmentService
{
    public function __construct(
        private ApiClient $apiClient,
        private EntityManagerInterface $em
    ) {}

    /**
     * Attribue un entraînement à un élève :
     * 1) Met à jour en base locale
     * 2) Envoie le parcours complet à l’API (/path/training)
     */
    public function assignTraining(Eleve $eleve, Entrainement $entrainement): bool
    {
        // Mise à jour locale
        $eleve->setEntrainement($entrainement);
        $eleve->setCurrentLearningPathID($entrainement->getLearningPathID());
        $this->em->flush();

        // Envoi à l’API
        return $this->apiClient->assignTrainingToLearner($eleve, $entrainement);
    }

    public function assignDefaultTraining(Eleve $eleve): bool
    {
        $defaultTraining = $this->em
            ->getRepository(Entrainement::class)
            ->findOneBy([
                'learningPathID' => ApiEndpoints::DEFAULT_LEARNING_PATH_ID
            ]);

        $defaultTraining->setLearningPathID(ApiEndpoints::GET_DEFAULT_API_LEARNING_PATH_ID($eleve->getLearnerId()));
        $defaultTraining->setName("");

        return $this->apiClient->assignTrainingToLearner($eleve, $defaultTraining);
    }
}
