<?php
namespace App\Service;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Niveau;
use App\Entity\PNiveau;
use App\Entity\PTache;

class TrainingSerializer
{
    public function toApiPayload(Entrainement $entrainement, Eleve $eleve): array
    {
        $objectif = $entrainement->getObjectif();
        return [
            'learningPathID' => $entrainement->getLearningPathID(),
            'learnerID'      => $eleve->getLearnerId(),
            'objectives'     => $objectif ? [$this->serializeObjectif($objectif)] : [],
        ];
    }

    private function serializeObjectif($objectif): array
    {
        $prerequisites = [];
        foreach ($objectif->getPrerequis() as $pre) {
            $prerequisites[] = [
                'requiredLevel'      => $pre->getRequiredLevel(),
                'requiredObjective'  => $pre->getRequiredObjective(),
                'successPercent'     => (float)$pre->getSuccessPercent(),
                'encountersPercent'  => (float)$pre->getEncountersPercent(),
            ];
        }

        $levels = [];
        foreach ($objectif->getNiveaux() as $niveau) {
            $levels[] = $this->serializeNiveau($niveau);
        }

        return [
            'objective'      => $objectif->getObjID(),
            'name'           => $objectif->getName(),
            'prerequisites'  => $prerequisites,
            'levels'         => $levels,
        ];
    }

    private function serializeNiveau(Niveau $niveau): array
    {
        $setupParameters = [];
        foreach ($niveau->getPniveaux() as $pniveau) {
            $setupParameters = $this->serializeSetupParameters($pniveau);
        }

        return [
            'level'            => $niveau->getLevelID(),
            'name'             => $niveau->getName(),
            'setupParameters'  => $setupParameters,
        ];
    }

    private function serializeSetupParameters(PNiveau $pniveau): array
    {
        $achievement = [];
        $building    = [];
        $tasks       = [];

        if ($pniveau->getCompletion()) {
            $c = $pniveau->getCompletion();
            $achievement = [
                'successCompletionCriteria'   => (float)$c->getSuccessCompletionCriteria(),
                'encounterCompletionCriteria' => (float)$c->getEncounterCompletionCriteria(),
            ];
        }

        if ($pniveau->getConstruction()) {
            $b = $pniveau->getConstruction();
            $building = [
                'tables'         => array_map('trim', explode(',', $b->getTables())),
                'resultLocation' => $b->getResultLocation(),
                'leftOperand'    => $b->getLeftOperand(),
                'intervalMin'    => (int)$b->getIntervalMin(),
                'intervalMax'    => (int)$b->getIntervalMax(),
            ];
        }

        foreach ($pniveau->getNiveau()->getPtaches() as $t) {
            $tasks[] = $this->serializeTache($t);
        }

        return [
            'achievementParameters' => $achievement,
            'buildingParameters'    => $building,
            'tasksParameters'       => $tasks,
        ];
    }

    private function serializeTache(PTache $t): array
    {
        $data = [
            'maxTime'                   => (int)$t->getTimeMaxSecond(),
            'repartitionPercent'        => (int)$t->getRepartitionPercent(),
            'successiveSuccessesToReach'=> (int)$t->getSuccessiveSuccessesToReach(),
        ];

        if ($t->getTargets()) {
            $targets = json_decode($t->getTargets(), true);
            if (!is_array($targets)) {
                $targets = array_map('trim', explode(',', $t->getTargets()));
            }
            $data['targets'] = $targets;
        }
        if ($t->getAnswerModality())   $data['answerModality']   = $t->getAnswerModality();
        if ($t->getNbIncorrectChoices()) $data['nbIncorrectChoices'] = (int)$t->getNbIncorrectChoices();
        if ($t->getNbFacts())            $data['nbFacts']            = (int)$t->getNbFacts();
        if ($t->getSourceVariation())    $data['sourceVariation']    = $t->getSourceVariation();
        if ($t->getTarget())             $data['target']             = $t->getTarget();
        if ($t->getNbCorrectChoices())   $data['nbCorrectChoices']   = (int)$t->getNbCorrectChoices();

        return $data;
    }
}
