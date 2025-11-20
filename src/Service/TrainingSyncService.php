<?php

namespace App\Service;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;
use App\Entity\Prerequis;
use Doctrine\ORM\EntityManagerInterface;

class TrainingSyncService
{
    public function __construct(private EntityManagerInterface $em) {}

    /**
     * Synchronise le parcours d'un élève depuis l'API dans la base locale.
     * Mutualisation : 1 Entrainement par (learningPathID, enseignant).
     */
    public function syncTraining(Eleve $eleve, array $data): void
    {
        if (!isset($data['learningPathID']) || empty($data['objectives'])) {
            return;
        }

        $enseignant = $eleve->getClasse()?->getEnseignant();
        if (!$enseignant) {
            return;
        }

        $learningPathID = $data['learningPathID'];

        // Cherche si cet entraînement existe déjà pour cet enseignant
        $entrainement = $this->em->getRepository(Entrainement::class)->findOneBy([
            'learningPathID' => $learningPathID,
            'enseignant'     => $enseignant,
        ]);


        if($entrainement && empty($entrainement->getName())){
            $entrainement->setName($entrainement->getLearningPathID());
        }

        // Si non, on le construit entièrement
        if (!$entrainement) {
            $entrainement = new Entrainement();
            $entrainement->setLearningPathID($learningPathID);
            $entrainement->setEnseignant($enseignant);
            $entrainement->setName($entrainement->getLearningPathID());

            foreach ($data['objectives'] as $objData) {
                $objectif = new Objectif();
                $objectif->setObjID($objData['objective'] ?? uniqid('OBJ_'));
                $objectif->setName($objData['name'] ?? '');
                $entrainement->addObjectif($objectif);

                // PREREQUIS
                foreach ($objData['prerequisites'] ?? [] as $preData) {
                    $pre = new Prerequis();
                    $pre->setRequiredLevel($preData['requiredLevel'] ?? '');
                    $pre->setRequiredObjective($preData['requiredObjective'] ?? '');
                    $pre->setSuccessPercent((float) ($preData['successPercent'] ?? 0));
                    $pre->setEncountersPercent((float) ($preData['encountersPercent'] ?? 0));
                    $objectif->addPrerequis($pre);
                    $this->em->persist($pre);
                }

                // NIVEAUX
                foreach ($objData['levels'] ?? [] as $lvlData) {
                    $niveau = new Niveau();
                    $niveau->setLevelID($lvlData['level'] ?? uniqid('LVL_'));
                    $niveau->setName($lvlData['name'] ?? null);
                    $objectif->addNiveau($niveau);

                    // achievementParameters
                    $ach = $lvlData['setupParameters']['achievementParameters'] ?? null;
                    if ($ach) {
                        $niveau->setSuccessCompletionCriteria($ach['successCompletionCriteria'] ?? null);
                        $niveau->setEncounterCompletionCriteria($ach['encounterCompletionCriteria'] ?? null);
                    }

                    // buildingParameters
                    $build = $lvlData['setupParameters']['buildingParameters'] ?? null;
                    if ($build) {
                        $niveau->setTables($build['tables'] ?? null);
                        $niveau->setResultLocation($build['resultLocation'] ?? null);
                        $niveau->setLeftOperand($build['leftOperand'] ?? null);
                        $niveau->setIntervalMin($build['intervalMin'] ?? null);
                        $niveau->setIntervalMax($build['intervalMax'] ?? null);
                    }

                    // tasksParameters
                    foreach ($lvlData['setupParameters']['tasksParameters'] ?? [] as $tData) {
                        $tache = new Tache();
                        $tache->setNiveau($niveau);
                        $tache->setTaskType($tData['taskType'] ?? null);

                        // L'API de lecture renvoie souvent "maxTime", on le mappe vers timeMaxSecond
                        $tache->setTimeMaxSecond($tData['timeMaxSecond'] ?? $tData['maxTime'] ?? null);

                        $tache->setRepartitionPercent($tData['repartitionPercent'] ?? null);
                        $tache->setSuccessiveSuccessesToReach($tData['successiveSuccessesToReach'] ?? null);
                        $tache->setTargets($tData['targets'] ?? null);
                        $tache->setAnswerModality($tData['answerModality'] ?? null);
                        $tache->setNbIncorrectChoices($tData['nbIncorrectChoices'] ?? null);
                        $tache->setNbCorrectChoices($tData['nbCorrectChoices'] ?? null);
                        $tache->setNbFacts($tData['nbFacts'] ?? null);
                        $tache->setSourceVariation($tData['sourceVariation'] ?? null);
                        $tache->setTarget($tData['target'] ?? null);

                        if (isset($tData['nbOperations']) && method_exists($tache, 'setNbOperations')) {
                            $tache->setNbOperations($tData['nbOperations']);
                        }
                        if (isset($tData['nbElements']) && method_exists($tache, 'setNbElements')) {
                            $tache->setNbElements($tData['nbElements']);
                        }
                        if (isset($tData['nbPropositions']) && method_exists($tache, 'setNbPropositions')) {
                            $tache->setNbPropositions($tData['nbPropositions']);
                        }

                        $niveau->addTache($tache);
                    }
                }
            }
            $this->em->persist($entrainement);
        }

        // Lien élève → entraînement mutualisé
        $eleve->setEntrainement($entrainement);
        $eleve->setCurrentLearningPathID($learningPathID);
        $this->em->persist($eleve);

        $this->em->flush();
    }
}
