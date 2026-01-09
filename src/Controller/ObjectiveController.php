<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;
use App\Entity\Prerequis;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\ApiClient;

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
        SessionInterface $session,
        ?Objectif $objectif = null
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $isNew = false;

        if (!$objectif) {
            $isNew = true;
            $objectif = new Objectif();
            $objectif->setObjID('OBJ_' . uniqid());
            $objectif->setName('Nouvel objectif');
            $objectif->setEntrainement($entrainement);

            $this->em->persist($objectif);
            $this->em->flush();
        }

        if ($request->isMethod('POST')) {
            $name = trim((string) $request->request->get('objective_name', ''));
            $seenPercent = (float) $request->request->get('prereq_seen', 0);
            $completedPercent = (float) $request->request->get('prereq_completed', 0);

            if ($name !== '') {
                $objectif->setName($name);
            }

            // stockage temporaire en session
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
    public function addLevel(
        Objectif $objectif,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        // Récupération des données
        $data = json_decode($request->getContent(), true);
        $selectedTables = $data['tables'] ?? ['1'];

        $niveau = new Niveau();
        $objectif->addNiveau($niveau);

        $index = $objectif->getNiveaux()->count();

        // Sécurité index si count() est capricieux avec la persistence
        if ($index == 0) $index = 1;

        $niveau->setLevelID('L' . $index . '_' . $objectif->getObjID());
        $niveau->setName('Niveau ' . $index);

        $niveau->setTables($selectedTables);

        // Valeurs par défaut
        $niveau->setSuccessCompletionCriteria(80);
        $niveau->setEncounterCompletionCriteria(100);
        $niveau->setResultLocation('RIGHT');
        $niveau->setLeftOperand('OPERAND_TABLE');
        $niveau->setIntervalMin(1);
        $niveau->setIntervalMax(10);

        $this->em->persist($niveau);
        $this->em->flush();

        // SYNCHRONISATION API
        $this->syncWithApi($objectif->getEntrainement(), $apiClient);

        // Rendu HTML
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
    public function saveLevel(
        Niveau $niveau,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $niveau->setName(trim((string) ($data['name'] ?? $niveau->getName())));
        $niveau->setTables($data['tables'] ?? []);
        $niveau->setIntervalMin((int) ($data['intervalMin'] ?? 1));
        $niveau->setIntervalMax((int) ($data['intervalMax'] ?? 10));
        $niveau->setResultLocation($data['equalPosition'] ?? 'RIGHT');
        $niveau->setLeftOperand($data['factorPosition'] ?? 'OPERAND_TABLE');

        // Critères de complétion
        if (isset($data['encounterCompletionCriteria'])) {
            $niveau->setEncounterCompletionCriteria((float)$data['encounterCompletionCriteria']);
        }
        if (isset($data['successCompletionCriteria'])) {
            $niveau->setSuccessCompletionCriteria((float)$data['successCompletionCriteria']);
        }

        $this->em->flush();

        // SYNCHRONISATION API
        $entrainement = $niveau->getObjectif()->getEntrainement();
        $this->syncWithApi($entrainement, $apiClient);

        return new JsonResponse(['success' => true]);
    }


    #[Route('/objectif/{id}/save-all', name: 'save_all', methods: ['POST'])]
    public function saveAll(
        Objectif $objectif,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $payload = json_decode($request->getContent(), true);

        if (!$payload) {
            return new JsonResponse(['success' => false, 'message' => 'Missing payload'], 400);
        }

        /* --------------------------
           Sauvegarde BDD Locale (Objectif)
           -------------------------- */
        if (isset($payload['objective'])) {
            $objectif->setName($payload['objective']['name'] ?? $objectif->getName());
        }

        /* --------------------------
           Sauvegarde BDD Locale (Niveaux)
           -------------------------- */
        if (isset($payload['levels']) && is_array($payload['levels'])) {
            foreach ($payload['levels'] as $lvlData) {
                if (empty($lvlData['id'])) continue;

                $niveau = $this->em->getRepository(Niveau::class)->find($lvlData['id']);

                if (!$niveau || $niveau->getObjectif()->getId() !== $objectif->getId()) {
                    continue;
                }

                $niveau->setName($lvlData['name']);
                $niveau->setTables($lvlData['tables'] ?? []);
                $niveau->setIntervalMin((int)$lvlData['intervalMin']);
                $niveau->setIntervalMax((int)$lvlData['intervalMax']);
                $niveau->setResultLocation($lvlData['equalPosition']);
                $niveau->setLeftOperand($lvlData['factorPosition']);

                if (isset($lvlData['encounterCompletionCriteria'])) {
                    $niveau->setEncounterCompletionCriteria((int)$lvlData['encounterCompletionCriteria']);
                }
                if (isset($lvlData['successCompletionCriteria'])) {
                    $niveau->setSuccessCompletionCriteria((int)$lvlData['successCompletionCriteria']);
                }
            }
        }

        /* --------------------------
           Sauvegarde BDD Locale (Tâches)
           -------------------------- */
        if (isset($payload['tasks']) && is_array($payload['tasks'])) {
            foreach ($payload['tasks'] as $taskPayload) {
                if (empty($taskPayload['levelId'])) continue;

                $niveau = $this->em->getRepository(Niveau::class)->find($taskPayload['levelId']);
                if (!$niveau) continue;

                $task = $this->em->getRepository(Tache::class)->findOneBy([
                    'niveau' => $niveau,
                    'taskType' => $taskPayload['taskType']
                ]);

                if (!$task) {
                    $task = new Tache();
                    $task->setNiveau($niveau);
                    $task->setTaskType($taskPayload['taskType']);
                    $this->em->persist($task);
                }

                $task->setTimeMaxSecond($taskPayload['timeMaxSecond']);
                $task->setRepartitionPercent($taskPayload['repartitionPercent']);
                $task->setSuccessiveSuccessesToReach($taskPayload['successiveSuccessesToReach']);

                $task->setTargets($taskPayload['targets'] ?? null);
                $task->setAnswerModality($taskPayload['answerModality'] ?? null);
                $task->setNbIncorrectChoices($taskPayload['nbIncorrectChoices'] ?? null);
                $task->setNbCorrectChoices($taskPayload['nbCorrectChoices'] ?? null);
                $task->setNbFacts($taskPayload['nbFacts'] ?? null);
                $task->setSourceVariation($taskPayload['sourceVariation'] ?? null);
                $task->setTarget($taskPayload['target'] ?? null);
            }
        }

        // Validation finale en base de données locale
        $this->em->flush();

        // SYNCHRONISATION API
        $entrainement = $objectif->getEntrainement();

        if ($entrainement) {
            $eleves = $entrainement->getEleves();
            foreach ($eleves as $eleve) {
                $apiClient->assignTrainingToLearner($eleve, $entrainement);
            }
        }

        return new JsonResponse(['success' => true]);
    }


    /**
     * Suppression d’un niveau.
     */
    #[Route('/niveau/{id}/delete', name: 'delete_level', methods: ['DELETE'])]
    public function deleteLevel(
        Niveau $niveau,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $objectif = $niveau->getObjectif();
        $entrainement = $objectif->getEntrainement();

        $objectif->removeNiveau($niveau);

        $this->em->remove($niveau);
        $this->em->flush();

        // SYNCHRONISATION API
        $this->syncWithApi($entrainement, $apiClient);

        return new JsonResponse(['success' => true]);
    }

    /**
     * Sauvegarde / création d’une tâche.
     */
    #[Route('/niveau/{id}/task/save', name: 'save_task', methods: ['POST'])]
    public function saveTask(
        Niveau $niveau,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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

                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 3);
                $nbIncorrect = max(3, min(6, $nbIncorrect));
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

                $sourceVariation = $data['sourceVariation'] ?? 'RESULT';
                $task->setSourceVariation($sourceVariation);
                break;

            case 'MEMB':
                $target = $data['target'] ?? 'CORRECT';
                $task->setTarget($target);

                $nbIncorrect = (int) ($data['nbIncorrectChoices'] ?? 0);
                $nbCorrect   = (int) ($data['nbCorrectChoices'] ?? 0);

                $task->setNbIncorrectChoices(max(0, min(3, $nbIncorrect)));
                $task->setNbCorrectChoices(max(0, min(3, $nbCorrect)));
                break;
        }

        // LOGIQUE D'ÉQUILIBRAGE
        if ($isNew) {
            if (!$niveau->getTaches()->contains($task)) {
                $niveau->addTache($task);
            }
            $this->em->persist($task);
            $this->rebalanceTasks($niveau);
        } else {
            $this->em->persist($task);
        }

        $this->em->flush();

        // SYNCHRONISATION API
        $entrainement = $niveau->getObjectif()->getEntrainement();
        $this->syncWithApi($entrainement, $apiClient);

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
     * Suppression d’une tâche.
     */
    #[Route('/niveau/{id}/task/delete', name: 'delete_task', methods: ['DELETE'])]
    public function deleteTask(
        Niveau $niveau,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $taskType = $data['taskType'] ?? null;

        if (!$taskType) return new JsonResponse(['success' => false], 400);

        $task = $this->em->getRepository(Tache::class)->findOneBy([
            'niveau'   => $niveau,
            'taskType' => $taskType,
        ]);

        if ($task) {
            $niveau->removeTache($task);
            $this->em->remove($task);
            $this->rebalanceTasks($niveau);
            $this->em->flush();

            $entrainement = $niveau->getObjectif()->getEntrainement();
            $this->syncWithApi($entrainement, $apiClient);
        }

        return new JsonResponse(['success' => true]);
    }


    /**
     * API pour récupérer les objectifs et niveaux.
     */
    #[Route('/{entrainement}/api/data', name: 'api_data', methods: ['GET'])]
    public function getTrainingData(
        Entrainement $entrainement,
        Request $request,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $currentObjId = (int) $request->query->get('exclude_id');
        $data = [];

        foreach ($entrainement->getObjectifs() as $obj) {
            if ($obj->getId() === $currentObjId) {
                continue;
            }

            $levels = [];
            foreach ($obj->getNiveaux() as $lvl) {
                $levels[] = [
                    'id' => $lvl->getId(),
                    'name' => $lvl->getName()
                ];
            }

            $data[] = [
                'id' => $obj->getId(),
                'name' => $obj->getName(),
                'levels' => $levels
            ];
        }

        return new JsonResponse($data);
    }

    /**
     * Ajout d'un prérequis.
     */
    #[Route('/objectif/{id}/prerequis/add', name: 'add_prerequis', methods: ['POST'])]
    public function addPrerequis(
        Objectif $objectif,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $data = json_decode($request->getContent(), true);

        // Validation
        $views   = (float)($data['views'] ?? 0);
        $success = (float)($data['success'] ?? 0);

        if ($views <= 0 && $success <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Au moins 1% requis.'], 400);
        }

        // Récupération des cibles
        $targetObjId = $data['targetObjectiveId'] ?? null;
        $targetLvlId = $data['targetLevelId'] ?? null;

        $targetObj = $this->em->getRepository(Objectif::class)->find($targetObjId);
        $targetLvl = $this->em->getRepository(Niveau::class)->find($targetLvlId);

        if (!$targetObj || !$targetLvl) {
            return new JsonResponse(['success' => false, 'message' => 'Cible introuvable'], 404);
        }

        $targetObjStringID = $targetObj->getObjID();

        // Validation Unicité
        foreach ($objectif->getPrerequis() as $existingPrereq) {
            if ($existingPrereq->getRequiredObjective() === $targetObjStringID) {
                $name = $targetObj->getName() ?: 'cet objectif';
                return new JsonResponse([
                    'success' => false,
                    'message' => "Un prérequis pour l'objectif \"$name\" existe déjà."
                ], 400);
            }
        }

        // Création
        $prerequis = new Prerequis();
        $prerequis->setObjectif($objectif);
        $prerequis->setRequiredObjective($targetObjStringID);
        $prerequis->setRequiredLevel($targetLvl->getLevelID());
        $prerequis->setEncountersPercent($views);
        $prerequis->setSuccessPercent($success);

        $objectif->addPrerequis($prerequis);

        $this->em->persist($prerequis);
        $this->em->flush();

        // SYNCHRONISATION API
        $this->syncWithApi($objectif->getEntrainement(), $apiClient);


        // Rendu HTML
        $targetObjName = !empty($targetObj->getName()) ? $targetObj->getName() : $targetObj->getObjID();
        $targetLvlName = !empty($targetLvl->getName()) ? $targetLvl->getName() : $targetLvl->getLevelID();

        $html = $this->renderView('objective/_prereq_badge.html.twig', [
            'p' => $prerequis,
            'targetObjName' => $targetObjName,
            'targetLvlName' => $targetLvlName,
            'targetObjDbId' => $targetObj->getId(),
            'targetLvlDbId' => $targetLvl->getId()
        ]);

        return new JsonResponse([
            'success' => true,
            'html' => $html
        ]);
    }

    /**
     * Suppression d'un prérequis.
     */
    #[Route('/prerequis/{id}/delete', name: 'prerequis_delete', methods: ['DELETE'])]
    public function deletePrerequis(
        Prerequis $prerequis,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $objectif = $prerequis->getObjectif();
        $entrainement = $objectif->getEntrainement();

        $objectif->removePrerequis($prerequis);

        $this->em->remove($prerequis);
        $this->em->flush();

        // SYNCHRONISATION API
        $this->syncWithApi($entrainement, $apiClient);

        return new JsonResponse(['success' => true]);
    }

    /**
     * Modification d'un prérequis existant.
     */
    #[Route('/prerequis/{id}/edit', name: 'edit_prerequis', methods: ['POST'])]
    public function editPrerequis(
        Prerequis $prerequis,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $data = json_decode($request->getContent(), true);

        // Validation basique (Sliders)
        $views   = (float)($data['views'] ?? 0);
        $success = (float)($data['success'] ?? 0);

        if ($views <= 0 && $success <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Au moins 1% requis.'], 400);
        }

        // Récupération des cibles
        $targetObjId = $data['targetObjectiveId'] ?? null;
        $targetLvlId = $data['targetLevelId'] ?? null;

        $targetObj = $this->em->getRepository(Objectif::class)->find($targetObjId);
        $targetLvl = $this->em->getRepository(Niveau::class)->find($targetLvlId);

        if (!$targetObj || !$targetLvl) {
            return new JsonResponse(['success' => false, 'message' => 'Cible introuvable'], 404);
        }

        // Validation Unicité
        $targetObjStringID = $targetObj->getObjID();
        $currentObjectif = $prerequis->getObjectif();

        foreach ($currentObjectif->getPrerequis() as $existing) {
            if ($existing->getId() !== $prerequis->getId() && $existing->getRequiredObjective() === $targetObjStringID) {
                $conflictName = $targetObj->getName() ?: $targetObjStringID;
                return new JsonResponse([
                    'success' => false,
                    'message' => "Un prérequis pour l'objectif \"$conflictName\" existe déjà."
                ], 400);
            }
        }

        // Mise à jour de l'entité
        $prerequis->setRequiredObjective($targetObjStringID);
        $prerequis->setRequiredLevel($targetLvl->getLevelID());
        $prerequis->setEncountersPercent($views);
        $prerequis->setSuccessPercent($success);

        $this->em->flush();

        $targetObjName = !empty($targetObj->getName()) ? $targetObj->getName() : $targetObj->getObjID();
        $targetLvlName = !empty($targetLvl->getName()) ? $targetLvl->getName() : $targetLvl->getLevelID();

        // SYNCHRONISATION API
        $entrainement = $prerequis->getObjectif()->getEntrainement();
        $this->syncWithApi($entrainement, $apiClient);

        // Rendu du badge HTML
        $html = $this->renderView('objective/_prereq_badge.html.twig', [
            'p' => $prerequis,

            'targetObjName' => $targetObjName,
            'targetLvlName' => $targetLvlName,

            'targetObjDbId' => $targetObj->getId(),
            'targetLvlDbId' => $targetLvl->getId()
        ]);

        return new JsonResponse([
            'success' => true,
            'html' => $html,
            'id' => $prerequis->getId()
        ]);
    }

    /* =========================================================================
       METHODE PRIVÉE POUR CENTRALISER LA SYNCHRO API
       ========================================================================= */
    private function syncWithApi(?Entrainement $entrainement, ApiClient $apiClient): void
    {
        if (!$entrainement) return;

        $eleves = $entrainement->getEleves();

        foreach ($eleves as $eleve) {
            try {
                $apiClient->assignTrainingToLearner($eleve, $entrainement);
            } catch (\Throwable $e) {
                // Log l'erreur si besoin
            }
        }
    }

    /**
     * Recalcule les pourcentages pour que la somme fasse toujours 100%.
     */
    private function rebalanceTasks(Niveau $niveau): void
    {
        $tasks = $niveau->getTaches();
        $count = count($tasks);

        if ($count === 0) return;

        $base = (int) floor(100 / $count);
        $remainder = 100 % $count;

        foreach ($tasks as $t) {
            $val = $base;
            if ($remainder > 0) {
                $val++;
                $remainder--;
            }
            $t->setRepartitionPercent($val);
        }
    }
}
