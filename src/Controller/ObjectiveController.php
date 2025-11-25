<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/enseignant/entrainements', name: 'objective_')]
class ObjectiveController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    /**
     * Création OU édition d’un objectif.
     */
    #[Route('/{entrainement}/objectif/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[Route('/{entrainement}/objectif/{id}', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(
        Entrainement $entrainement,
        Request $request,
        ?Objectif $objectif = null
    ): Response {
        $isNew = false;

        if (!$objectif) {
            $isNew = true;
            $objectif = new Objectif();
            $objectif->setObjID('OBJ_' . uniqid());
            $objectif->setName('Nouvel objectif');
            $objectif->setEntrainement($entrainement);

            $this->em->persist($objectif);
            $this->em->flush(); // besoin de l’ID pour les appels AJAX
        }

        if ($request->isMethod('POST')) {
            $name = trim((string) $request->request->get('objective_name', ''));
            $seenPercent = (float) $request->request->get('prereq_seen', 0);
            $completedPercent = (float) $request->request->get('prereq_completed', 0);

            if ($name !== '') {
                $objectif->setName($name);
            }

            // stockage temporaire en session (à mapper plus tard sur Prerequis si tu veux)
            $request->getSession()->set('objective_prereq_' . $objectif->getId(), [
                'seen'      => $seenPercent,
                'completed' => $completedPercent,
            ]);

            $this->em->flush();

            $this->addFlash('success', 'Objectif enregistré.');
            return $this->redirectToRoute('objective_edit', [
                'entrainement' => $entrainement->getId(),
                'id'           => $objectif->getId(),
            ]);
        }

        $prereq = $request->getSession()->get('objective_prereq_' . $objectif->getId(), [
            'seen'      => 60,
            'completed' => 80,
        ]);

        return $this->render('objective/edit.html.twig', [
            'entrainement' => $entrainement,
            'objectif'     => $objectif,
            'prereq_seen'  => $prereq['seen'],
            'prereq_done'  => $prereq['completed'],
        ]);
    }

    /**
     * Ajout d’un niveau vide (créé immédiatement en base).
     */
    #[Route('/objectif/{id}/niveau/add', name: 'add_level', methods: ['POST'])]
    public function addLevel(Objectif $objectif): JsonResponse
    {
        $niveau = new Niveau();
        $index  = $objectif->getNiveaux()->count() + 1;

        $niveau->setLevelID('L' . $index . '_' . $objectif->getObjID());
        $niveau->setName('Niveau ' . $index);
        $niveau->setObjectif($objectif);

        // valeurs par défaut
        $niveau->setSuccessCompletionCriteria(80);
        $niveau->setEncounterCompletionCriteria(100);
        $niveau->setTables(['1']);
        $niveau->setResultLocation('RIGHT');        // RIGHT = égal à droite
        $niveau->setLeftOperand('OPERAND_TABLE');   // facteur à gauche
        $niveau->setIntervalMin(1);
        $niveau->setIntervalMax(10);

        $this->em->persist($niveau);
        $this->em->flush();

        $html = $this->renderView('objective/_level_block.html.twig', [
            'niveau' => $niveau,
            'index'  => $index,
            'active' => true,
        ]);

        return new JsonResponse([
            'success'    => true,
            'html'       => $html,
            'levelId'    => $niveau->getId(),
            'levelLabel' => $niveau->getName(),
        ]);
    }

    /**
     * Sauvegarde des paramètres d’un niveau.
     */
    #[Route('/niveau/{id}/save', name: 'save_level', methods: ['POST'])]
    public function saveLevel(Niveau $niveau, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $name         = trim((string) ($data['name'] ?? $niveau->getName()));
        $tables       = $data['tables'] ?? [];
        $intervalMin  = (int) ($data['intervalMin'] ?? 1);
        $intervalMax  = (int) ($data['intervalMax'] ?? 10);
        $equalPos     = $data['equalPosition'] ?? 'RIGHT';        // LEFT | RIGHT | MIX
        $factorPos    = $data['factorPosition'] ?? 'OPERAND_TABLE'; // OPERAND_TABLE | TABLE_OPERAND | MIX;

        $niveau->setName($name);
        $niveau->setTables($tables);
        $niveau->setIntervalMin($intervalMin);
        $niveau->setIntervalMax($intervalMax);
        $niveau->setResultLocation($equalPos);
        $niveau->setLeftOperand($factorPos);

        $this->em->flush();

        return new JsonResponse([
            'success' => true,
        ]);
    }

    /**
     * Suppression d’un niveau.
     */
    #[Route('/niveau/{id}/delete', name: 'delete_level', methods: ['DELETE'])]
    public function deleteLevel(Niveau $niveau): JsonResponse
    {
        $this->em->remove($niveau);
        $this->em->flush();

        return new JsonResponse(['success' => true]);
    }

    /**
     * Sauvegarde / création d’une tâche (C1, C2, REC, ID, MEMB).
     * Une seule tâche par type et par niveau.
     */
    #[Route('/niveau/{id}/task/save', name: 'save_task', methods: ['POST'])]
    public function saveTask(Niveau $niveau, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $taskType = $data['taskType'] ?? null;

        if (!$taskType) {
            return new JsonResponse(['success' => false, 'message' => 'taskType manquant'], 400);
        }

        $repo = $this->em->getRepository(Tache::class);

        /** @var Tache|null $task */
        $task = $repo->findOneBy([
            'niveau'   => $niveau,
            'taskType' => $taskType,
        ]);

        $isNew = false;
        if (!$task) {
            $isNew = true;
            $task = new Tache();
            $task->setNiveau($niveau);
            $task->setTaskType($taskType);
        }

        // champs communs
        $timeMax   = (int) ($data['timeMaxSecond'] ?? 20);
        $successes = (int) ($data['successiveSuccessesToReach'] ?? 1);
        $repart    = (int) ($data['repartitionPercent'] ?? 100);

        $task->setTimeMaxSecond(max(1, $timeMax));
        $task->setSuccessiveSuccessesToReach(max(1, $successes));
        $task->setRepartitionPercent(max(0, min(100, $repart)));

        switch ($taskType) {
            case 'C1':
                // éléments recherchés
                $targets = $data['targets'] ?? [];
                $task->setTargets($targets);
                $task->setAnswerModality($data['answerModality'] ?? 'INPUT');

                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 2);
                $nbIncorrect = max(2, min(5, $nbIncorrect));
                $task->setNbIncorrectChoices($nbIncorrect);
                break;

            case 'C2':
                $targets = $data['targets'] ?? [];
                $task->setTargets($targets);

                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 2);
                $nbIncorrect = max(2, min(5, $nbIncorrect));
                $task->setNbIncorrectChoices($nbIncorrect);
                break;

            case 'REC':
                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 2);
                $nbIncorrect = max(2, min(5, $nbIncorrect));
                $task->setNbIncorrectChoices($nbIncorrect);
                break;

            case 'ID':
                $nbFacts = (int) ($data['nbFacts'] ?? 1);
                $nbFacts = max(1, min(4, $nbFacts));
                $task->setNbFacts($nbFacts);

                $sourceVariation = $data['sourceVariation'] ?? 'RESULT'; // RESULT | OPERAND
                $task->setSourceVariation($sourceVariation);
                break;

            case 'MEMB':
                $target = $data['target'] ?? 'CORRECT'; // CORRECT | INCORRECT
                $task->setTarget($target);

                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 0);
                $nbCorrect   = (int) ($data['nbCorrectChoices'] ?? 0);

                $task->setNbIncorrectChoices(max(0, min(3, $nbIncorrect)));
                $task->setNbCorrectChoices(max(0, min(3, $nbCorrect)));
                break;
        }

        if ($isNew) {
            $this->em->persist($task);
        }
        $this->em->flush();

        return new JsonResponse([
            'success' => true,
            'task' => [
                'id'                     => $task->getId(),
                'taskType'               => $task->getTaskType(),
                'targets'                => $task->getTargets(),
                'answerModality'         => $task->getAnswerModality(),
                'nbIncorrectChoices'     => $task->getNbIncorrectChoices(),
                'nbCorrectChoices'       => $task->getNbCorrectChoices(),
                'nbFacts'                => $task->getNbFacts(),
                'sourceVariation'        => $task->getSourceVariation(),
                'target'                 => $task->getTarget(),
                'timeMaxSecond'          => $task->getTimeMaxSecond(),
                'successiveSuccessesToReach' => $task->getSuccessiveSuccessesToReach(),
                'repartitionPercent'     => $task->getRepartitionPercent(),
            ],
        ]);
    }

    /**
     * Suppression d’une tâche d’un niveau.
     */
    #[Route('/niveau/{id}/task/delete', name: 'delete_task', methods: ['DELETE'])]
    public function deleteTask(Niveau $niveau, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $taskType = $data['taskType'] ?? null;

        if (!$taskType) {
            return new JsonResponse(['success' => false, 'message' => 'taskType manquant'], 400);
        }

        $repo = $this->em->getRepository(Tache::class);
        $task = $repo->findOneBy([
            'niveau'   => $niveau,
            'taskType' => $taskType,
        ]);

        if ($task) {
            $this->em->remove($task);
            $this->em->flush();
        }

        return new JsonResponse(['success' => true]);
    }
}
