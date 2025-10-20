<?php

namespace App\Service;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\PNiveau;
use App\Entity\PCompletion;
use App\Entity\PConstruction;
use App\Entity\PTache;
use App\Entity\Prerequis;
use Doctrine\ORM\EntityManagerInterface;

class TrainingSyncService
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * Synchronise le parcours d’un élève complet (learning path)
     */
    public function syncTraining(Eleve $eleve, array $data): void
    {
        if (!isset($data['learningPathID'])) {
            return;
        }

        // 🔹 Créer ou mettre à jour l’Entrainement
        $repoEntrainement = $this->em->getRepository(Entrainement::class);
        $entrainement = $repoEntrainement->findOneBy(['learningPathID' => $data['learningPathID']]) ?? new Entrainement();
        $entrainement->setLearningPathID($data['learningPathID']);
        $entrainement->setEleve($eleve);
        $this->em->persist($entrainement);

        // 🔹 Parcourt les objectifs
        foreach ($data['objectives'] as $objData) {
            $objectif = new Objectif();
            $objectif->setObjID($objData['objective'] ?? uniqid('obj_'));
            $objectif->setName($objData['name'] ?? '');
            $this->em->persist($objectif);

            $entrainement->setObjectif($objectif);

            // 🔹 Prérequis
            if (!empty($objData['prerequisites'])) {
                foreach ($objData['prerequisites'] as $prData) {
                    $pre = new Prerequis();
                    $pre->setRequiredLevel($prData['requiredLevel']);
                    $pre->setRequiredObjective($prData['requiredObjective']);
                    $pre->setSuccessPercent($prData['successPercent']);
                    $pre->setEncountersPercent($prData['encountersPercent']);
                    $pre->setObjectif($objectif);
                    $this->em->persist($pre);
                }
            }

            // 🔹 Niveaux
            foreach ($objData['levels'] as $nivData) {
                $niveau = new Niveau();
                $niveau->setLevelID($nivData['level']);
                $niveau->setName($nivData['name'] ?? '');
                $niveau->setObjectif($objectif);
                $this->em->persist($niveau);

                // 🔸 setupParameters
                $params = $nivData['setupParameters'];

                // --- PNiveau
                $pniveau = new PNiveau();
                $pniveau->setNiveau($niveau);
                $this->em->persist($pniveau);

                // --- PCompletion
                if (isset($params['achievementParameters'])) {
                    $completion = new PCompletion();
                    $completion->setSuccessCompletionCriteria($params['achievementParameters']['successCompletionCriteria']);
                    $completion->setEncounterCompletionCriteria($params['achievementParameters']['encounterCompletionCriteria']);
                    $completion->setPniveau($pniveau);
                    $this->em->persist($completion);
                }

                // --- PConstruction
                if (isset($params['buildingParameters'])) {
                    $build = $params['buildingParameters'];
                    $construction = new PConstruction();
                    $construction->setTables(implode(',', $build['tables']));
                    $construction->setResultLocation($build['resultLocation']);
                    $construction->setLeftOperand($build['leftOperand']);
                    $construction->setIntervalMin($build['intervalMin']);
                    $construction->setIntervalMax($build['intervalMax']);
                    $construction->setPniveau($pniveau);
                    $this->em->persist($construction);
                }

                // --- PTache
                if (isset($params['tasksParameters'])) {
                    foreach ($params['tasksParameters'] as $tacheData) {
                        $ptache = new PTache();
                        $ptache->setNiveau($niveau);
                        $ptache->setTimeMaxSecond($tacheData['maxTime']);
                        $ptache->setRepartitionPercent($tacheData['repartitionPercent']);
                        $ptache->setSuccessiveSuccessesToReach($tacheData['successiveSuccessesToReach']);
                        $ptache->setTargets(json_encode($tacheData['targets'] ?? []));
                        $ptache->setAnswerModality($tacheData['answerModality'] ?? null);
                        $this->em->persist($ptache);
                    }
                }
            }
        }

        $this->em->flush();
    }
}
