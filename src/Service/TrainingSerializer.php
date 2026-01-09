<?php

namespace App\Service;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;

class TrainingSerializer
{
    /**
     * Transforme un Entrainement + Eleve en payload JSON pour /path/training
     */
    public function toApiPayload(Entrainement $entrainement, Eleve $eleve): array
    {
        $objectifs = [];
        foreach ($entrainement->getObjectifs() as $objectif) {
            $objectifs[] = $this->serializeObjectif($objectif);
        }

        return [
            'learningPathID' => $entrainement->getLearningPathID(),
            'learnerID'      => $eleve->getLearnerId(),
            'objectives'     => $objectifs,
        ];
    }

    private function serializeObjectif(Objectif $objectif): array
    {
        $prerequisites = [];
        foreach ($objectif->getPrerequis() as $pre) {
            $prerequisites[] = [
                'requiredLevel'     => $pre->getRequiredLevel(),
                'requiredObjective' => $pre->getRequiredObjective(),
                'successPercent'    => (float) $pre->getSuccessPercent(),
                'encountersPercent' => (float) $pre->getEncountersPercent(),
            ];
        }

        $levels = [];
        foreach ($objectif->getNiveaux() as $niveau) {
            $levels[] = $this->serializeNiveau($niveau);
        }

        return [
            'objective'     => $objectif->getObjID(),
            'name'          => $objectif->getName(),
            'prerequisites' => $prerequisites,
            'levels'        => $levels,
        ];
    }

    private function serializeNiveau(Niveau $niveau): array
    {
        // achievementParameters
        $achievement = [
            'successCompletionCriteria'   => (float) ($niveau->getSuccessCompletionCriteria() ?? 0),
            'encounterCompletionCriteria' => (float) ($niveau->getEncounterCompletionCriteria() ?? 0),
        ];

        // buildingParameters
        $tablesRaw = $niveau->getTables();
        if (is_string($tablesRaw)) {
            $tables = array_values(array_filter(array_map('trim', explode(',', $tablesRaw)), 'strlen'));
        } elseif (is_array($tablesRaw)) {
            $tables = $tablesRaw;
        } else {
            $tables = [];
        }

        $building = [
            'tables'         => $tables,
            'resultLocation' => $niveau->getResultLocation() ?? 'RIGHT',
            'leftOperand'    => $niveau->getLeftOperand() ?? 'OPERAND_TABLE',
            'intervalMin'    => (int) ($niveau->getIntervalMin() ?? 1),
            'intervalMax'    => (int) ($niveau->getIntervalMax() ?? 10),
        ];

        // tasksParameters
        $tasks = [];
        foreach ($niveau->getTaches() as $tache) {
            $tasks[] = $this->serializeTache($tache);
        }

        return [
            'level'           => $niveau->getLevelID(),
            'name'            => $niveau->getName(),
            'setupParameters' => [
                'achievementParameters' => $achievement,
                'buildingParameters'    => $building,
                'tasksParameters'       => $tasks,
            ],
        ];
    }

    private function serializeTache(Tache $t): array
    {
        // Champs numériques obligatoires pour le Java (on ne laisse jamais "null")
        $timeMax       = (int) ($t->getTimeMaxSecond() ?? 0);
        $repartition   = (int) ($t->getRepartitionPercent() ?? 0);
        $successNeeded = (int) ($t->getSuccessiveSuccessesToReach() ?? 0);
        $nbIncorrect   = (int) ($t->getNbIncorrectChoices() ?? 0);
        $nbCorrect     = (int) ($t->getNbCorrectChoices() ?? 0);
        $nbFacts       = (int) ($t->getNbFacts() ?? 0);

        // Champs supplémentaires possibles (si ton entité Tache ne les a pas, ça reste à 0)
        $nbOperations   = method_exists($t, 'getNbOperations')   && $t->getNbOperations()   !== null ? (int) $t->getNbOperations()   : 0;
        $nbElements     = method_exists($t, 'getNbElements')     && $t->getNbElements()     !== null ? (int) $t->getNbElements()     : 0;
        $nbPropositions = method_exists($t, 'getNbPropositions') && $t->getNbPropositions() !== null ? (int) $t->getNbPropositions() : 0;

        // targets => toujours un tableau
        $targetsRaw = $t->getTargets();
        if (is_string($targetsRaw) && $targetsRaw !== '') {
            $decoded = json_decode($targetsRaw, true);
            if (is_array($decoded)) {
                $targets = $decoded;
            } else {
                $targets = array_values(array_filter(array_map('trim', explode(',', $targetsRaw)), 'strlen'));
            }
        } elseif (is_array($targetsRaw)) {
            $targets = $targetsRaw;
        } else {
            $targets = [];
        }

        return [
            //  clé EXACTE attendue par le Java : timeMaxSecond (et pas maxTime)
            'timeMaxSecond'             => $timeMax,
            'taskType'                  => $t->getTaskType() ?? 'C1',
            'repartitionPercent'        => $repartition,
            'successiveSuccessesToReach'=> $successNeeded,

            'nbFacts'           => $nbFacts,
            'nbCorrectChoices'  => $nbCorrect,
            'nbIncorrectChoices'=> $nbIncorrect,
            'nbOperations'      => $nbOperations,
            'nbElements'        => $nbElements,
            'nbPropositions'    => $nbPropositions,

            'targets'        => $targets,
            'answerModality' => $t->getAnswerModality(),
            'sourceVariation'=> $t->getSourceVariation() ?? "NONE",
            'target'         => $t->getTarget() ?? "NONE",
        ];
    }
}
