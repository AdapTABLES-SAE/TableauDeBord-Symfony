<?php

namespace App\Service;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;
use Doctrine\ORM\EntityManagerInterface;

class TrainingSyncService
{
    public function __construct(private EntityManagerInterface $em) {}

    /**
     * Synchronise le parcours d'apprentissage d'un élève depuis l'API.
     * Si un entraînement identique (même structure JSON) existe déjà, il est réutilisé.
     */
    public function syncTraining(Eleve $eleve, array $data): void
    {
        if (!isset($data['learningPathID']) || empty($data['objectives'])) {
            return;
        }

        // Hash de la structure JSON (sans l’ID unique)
        $structure = $data;
        unset($structure['learningPathID']);
        $hash = hash('sha256', json_encode($structure));

        $repo = $this->em->getRepository(Entrainement::class);
        $entrainement = $repo->findOneBy(['structureHash' => $hash]);

        if (!$entrainement) {
            $entrainement = new Entrainement();
            $entrainement->setLearningPathID($data['learningPathID']);
            $entrainement->setStructureHash($hash);

            // Crée tous les Objectifs / Niveaux / Tâches
            foreach ($data['objectives'] as $objData) {
                $objectif = new Objectif();
                $objectif->setObjID($objData['objective'] ?? uniqid('O_'));
                $objectif->setName($objData['name'] ?? '');
                $objectif->setEntrainement($entrainement);
                $entrainement->addObjectif($objectif);

                foreach (($objData['levels'] ?? []) as $lvlData) {
                    $niveau = new Niveau();
                    $niveau->setLevelID($lvlData['level'] ?? uniqid('L_'));
                    $niveau->setName($lvlData['name'] ?? '');
                    $niveau->setObjectif($objectif);
                    $objectif->addNiveau($niveau);

                    foreach (($lvlData['setupParameters']['tasksParameters'] ?? []) as $t) {
                        $tache = new Tache();
                        $tache->setNiveau($niveau);
                        $tache->setTaskType($t['taskType'] ?? null);
                        $tache->setTimeMaxSecond((int)($t['maxTime'] ?? 0));
                        $tache->setRepartitionPercent((int)($t['repartitionPercent'] ?? 0));
                        $tache->setSuccessiveSuccessesToReach((int)($t['successiveSuccessesToReach'] ?? 0));
                        $tache->setTargets($t['targets'] ?? []);
                        $tache->setAnswerModality($t['answerModality'] ?? null);
                        $tache->setNbIncorrectChoices($t['nbIncorrectChoices'] ?? null);
                        $tache->setNbCorrectChoices($t['nbCorrectChoices'] ?? null);
                        $tache->setNbFacts($t['nbFacts'] ?? null);
                        $tache->setSourceVariation($t['sourceVariation'] ?? null);
                        $tache->setTarget($t['target'] ?? null);

                        $niveau->addTache($tache);
                    }
                }
            }
            $this->em->persist($entrainement);
        }

        // Associe l'élève à l'entraînement mutualisé
        $eleve->setEntrainement($entrainement);
        $eleve->setCurrentLearningPathID($data['learningPathID']);
        $this->em->persist($eleve);

        // Un seul flush à la fin
        $this->em->flush();
    }
}
