<?php

namespace App\Service;

use App\Entity\Eleve;
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
}
