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
     * Synchronise un apprentissage complet pour un élève.
     */
    public function syncTraining(Eleve $eleve, array|string|null $data): void
    {
        if (!$data) {
            dump("⚠️ Aucune donnée de parcours reçue pour {$eleve->getLearnerId()}");
            return;
        }

        // Si l’API renvoie une chaîne JSON, on la décode
        if (is_string($data)) {
            $data = json_decode($data, true);
        }

        if (!isset($data['learningPathID'])) {
            dump("⚠️ Le parcours ne contient pas de learningPathID pour {$eleve->getLearnerId()}");
            return;
        }

        // ✅ Hash unique pour mutualiser les entraînements identiques
        $structure = $data;
        unset($structure['learningPathID']);
        $hash = hash('sha256', json_encode($structure));

        // Recherche d’un entraînement déjà existant avec cette structure
        $entrainementRepo = $this->em->getRepository(Entrainement::class);
        $entrainement = $entrainementRepo->findOneBy(['structureHash' => $hash]);

        if (!$entrainement) {
            $entrainement = new Entrainement();
            $entrainement->setLearningPathID($data['learningPathID']);
            $entrainement->setStructureHash($hash);

            // --- Objectifs ---
            foreach ($data['objectives'] ?? [] as $objData) {
                $objectif = new Objectif();
                $objectif->setObjID($objData['objective'] ?? uniqid('obj_'));
                $objectif->setName($objData['name'] ?? '');
                $objectif->setEntrainement($entrainement);
                $entrainement->addObjectif($objectif);

                // --- Niveaux ---
                foreach ($objData['levels'] ?? [] as $lvl) {
                    $niveau = new Niveau();
                    $niveau->setLevelID($lvl['level'] ?? uniqid('lvl_'));
                    $niveau->setName($lvl['name'] ?? '');
                    $niveau->setObjectif($objectif);
                    $objectif->addNiveau($niveau);

                    $params = $lvl['setupParameters'] ?? [];

                    // Critères de réussite
                    if (isset($params['achievementParameters'])) {
                        $ap = $params['achievementParameters'];
                        $niveau->setSuccessCompletionCriteria((float)($ap['successCompletionCriteria'] ?? 0));
                        $niveau->setEncounterCompletionCriteria((float)($ap['encounterCompletionCriteria'] ?? 0));
                    }

                    // Paramètres de construction
                    if (isset($params['buildingParameters'])) {
                        $bp = $params['buildingParameters'];
                        $niveau->setTables($bp['tables'] ?? []);
                        $niveau->setResultLocation($bp['resultLocation'] ?? null);
                        $niveau->setLeftOperand($bp['leftOperand'] ?? null);
                        $niveau->setIntervalMin(isset($bp['intervalMin']) ? (int)$bp['intervalMin'] : null);
                        $niveau->setIntervalMax(isset($bp['intervalMax']) ? (int)$bp['intervalMax'] : null);
                    }

                    // --- Tâches ---
                    foreach ($params['tasksParameters'] ?? [] as $t) {
                        $tache = new Tache();
                        $tache->setNiveau($niveau);
                        $tache->setTaskType($t['taskType'] ?? '');
                        $tache->setTimeMaxSecond(isset($t['maxTime']) ? (int)$t['maxTime'] : null);
                        $tache->setRepartitionPercent(isset($t['repartitionPercent']) ? (int)$t['repartitionPercent'] : null);
                        $tache->setSuccessiveSuccessesToReach(isset($t['successiveSuccessesToReach']) ? (int)$t['successiveSuccessesToReach'] : null);
                        $tache->setTargets($t['targets'] ?? []);
                        $tache->setAnswerModality($t['answerModality'] ?? null);
                        $tache->setNbIncorrectChoices(isset($t['nbIncorrectChoices']) ? (int)$t['nbIncorrectChoices'] : null);
                        $tache->setNbCorrectChoices(isset($t['nbCorrectChoices']) ? (int)$t['nbCorrectChoices'] : null);
                        $tache->setNbFacts(isset($t['nbFacts']) ? (int)$t['nbFacts'] : null);
                        $tache->setSourceVariation($t['sourceVariation'] ?? null);
                        $tache->setTarget($t['target'] ?? null);
                        $niveau->addTache($tache);
                    }
                }
            }

            $this->em->persist($entrainement);
        } else {
            dump("♻️ Entrainement déjà existant réutilisé : " . $entrainement->getLearningPathID());
        }

        // --- Liaison élève → entraînement mutualisé ---
        $eleve->setEntrainement($entrainement);
        $eleve->setCurrentLearningPathID($data['learningPathID']);
        $this->em->persist($eleve);

        $this->em->flush();

        dump("✅ Entrainement synchronisé pour {$eleve->getLearnerId()}");
    }
}
