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

    public function syncTraining(Eleve $eleve, array $data): void
    {
        if (!isset($data['learningPathID']) || empty($data['objectives'])) {
            return;
        }

        $enseignant = $eleve->getClasse()?->getEnseignant();
        if (!$enseignant) return;

        $learningPathID = $data['learningPathID'];

        // Recherche par LearningPathID + enseignant
        $entrainement = $this->em->getRepository(Entrainement::class)->findOneBy([
            'learningPathID' => $learningPathID,
            'enseignant' => $enseignant
        ]);

        if (!$entrainement) {
            $entrainement = new Entrainement();
            $entrainement->setLearningPathID($learningPathID);
            $entrainement->setEnseignant($enseignant);

            foreach ($data['objectives'] as $objData) {

                $objectif = new Objectif();
                $objectif->setObjID($objData['objective'] ?? uniqid("OBJ_"));
                $objectif->setName($objData['name'] ?? '');
                $entrainement->addObjectif($objectif);

                foreach ($objData['levels'] ?? [] as $lvlData) {

                    $niveau = new Niveau();
                    $niveau->setLevelID($lvlData['level'] ?? uniqid("LVL_"));
                    $niveau->setName($lvlData['name'] ?? null);
                    $objectif->addNiveau($niveau);

                    // -------------------------------
                    // 🔥 Enregistrement des paramètres Achievement
                    // -------------------------------
                    $ach = $lvlData['setupParameters']['achievementParameters'] ?? null;
                    if ($ach) {
                        $niveau->setSuccessCompletionCriteria($ach['successCompletionCriteria'] ?? null);
                        $niveau->setEncounterCompletionCriteria($ach['encounterCompletionCriteria'] ?? null);
                    }

                    // -------------------------------
                    // 🔥 Enregistrement des paramètres Building
                    // -------------------------------
                    $build = $lvlData['setupParameters']['buildingParameters'] ?? null;
                    if ($build) {
                        $niveau->setTables($build['tables'] ?? null);
                        $niveau->setResultLocation($build['resultLocation'] ?? null);
                        $niveau->setLeftOperand($build['leftOperand'] ?? null);
                        $niveau->setIntervalMin($build['intervalMin'] ?? null);
                        $niveau->setIntervalMax($build['intervalMax'] ?? null);
                    }

                    // -------------------------------
                    // 🔥 Enregistrement des tâches
                    // -------------------------------
                    foreach ($lvlData['setupParameters']['tasksParameters'] ?? [] as $t) {
                        $tache = new Tache();
                        $tache->setNiveau($niveau);
                        $tache->setTaskType($t['taskType'] ?? null);
                        $tache->setTimeMaxSecond($t['maxTime'] ?? null);
                        $tache->setRepartitionPercent($t['repartitionPercent'] ?? null);
                        $tache->setSuccessiveSuccessesToReach($t['successiveSuccessesToReach'] ?? null);
                        $tache->setTargets($t['targets'] ?? null);
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

        // Attribution à l'élève
        $eleve->setEntrainement($entrainement);
        $eleve->setCurrentLearningPathID($learningPathID);

        $this->em->persist($eleve);
        $this->em->flush();
    }
}
