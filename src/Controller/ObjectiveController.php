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


    #[Route('/objectif/{id}/save-all', name: 'save_all', methods: ['POST'])]
    public function saveAll(Objectif $objectif, Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);

        if (!$payload) {
            return new JsonResponse(['success' => false, 'message' => 'Missing payload'], 400);
        }

        /* --------------------------
           1) Sauvegarde objectif
           -------------------------- */
        if (isset($payload['objective'])) {
            $objectif->setName($payload['objective']['name'] ?? $objectif->getName());
        }

        /* --------------------------
           2) Sauvegarde niveaux
           -------------------------- */
        if (isset($payload['levels']) && is_array($payload['levels'])) {
            foreach ($payload['levels'] as $lvlData) {
                $niveau = $this->em->getRepository(Niveau::class)->find($lvlData['id']);
                if (!$niveau) continue;

                $niveau->setName($lvlData['name']);
                $niveau->setTables($lvlData['tables']);
                $niveau->setIntervalMin($lvlData['intervalMin']);
                $niveau->setIntervalMax($lvlData['intervalMax']);
                $niveau->setResultLocation($lvlData['equalPosition']);
                $niveau->setLeftOperand($lvlData['factorPosition']);
            }
        }

        /* --------------------------
           3) Sauvegarde tâches
           -------------------------- */
        if (isset($payload['tasks']) && is_array($payload['tasks'])) {
            foreach ($payload['tasks'] as $taskPayload) {

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

                // Champs communs
                $task->setTimeMaxSecond($taskPayload['timeMaxSecond']);
                $task->setRepartitionPercent($taskPayload['repartitionPercent']);
                $task->setSuccessiveSuccessesToReach($taskPayload['successiveSuccessesToReach']);

                // Champs spécifiques
                $task->setTargets($taskPayload['targets'] ?? null);
                $task->setAnswerModality($taskPayload['answerModality'] ?? null);
                $task->setNbIncorrectChoices($taskPayload['nbIncorrectChoices'] ?? null);
                $task->setNbCorrectChoices($taskPayload['nbCorrectChoices'] ?? null);
                $task->setNbFacts($taskPayload['nbFacts'] ?? null);
                $task->setSourceVariation($taskPayload['sourceVariation'] ?? null);
                $task->setTarget($taskPayload['target'] ?? null);
            }
        }

        $this->em->flush();

        return new JsonResponse(['success' => true]);
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


    /**
     * API pour récupérer les objectifs et niveaux d'un entraînement (pour la modale prérequis).
     * On exclut l'objectif actuel pour éviter les boucles infinies.
     */
    #[Route('/{entrainement}/api/data', name: 'api_data', methods: ['GET'])]
    public function getTrainingData(Entrainement $entrainement, Request $request): JsonResponse
    {
        $currentObjId = (int) $request->query->get('exclude_id');
        $data = [];

        foreach ($entrainement->getObjectifs() as $obj) {
            // On ne propose pas l'objectif qu'on est en train d'éditer comme prérequis de lui-même
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
     * Ajout d'un prérequis en base de données.
     */
    #[Route('/objectif/{id}/prerequis/add', name: 'add_prerequis', methods: ['POST'])]
    public function addPrerequis(Objectif $objectif, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // --- 1. Validation des pourcentages (Règle : Au moins un critère > 0) ---
        $views   = (float)($data['views'] ?? 0);
        $success = (float)($data['success'] ?? 0);

        // On vérifie strictement si les deux sont à 0 (ou négatifs)
        if ($views <= 0 && $success <= 0) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Vous devez définir au moins 1% de vues ou de succès.'
            ], 400);
        }

        // --- 2. Récupération des cibles ---
        $targetObjId = $data['targetObjectiveId'] ?? null;
        $targetLvlId = $data['targetLevelId'] ?? null;

        $targetObj = $this->em->getRepository(Objectif::class)->find($targetObjId);
        $targetLvl = $this->em->getRepository(Niveau::class)->find($targetLvlId);

        if (!$targetObj || !$targetLvl) {
            return new JsonResponse(['success' => false, 'message' => 'Cible introuvable'], 404);
        }

        $targetObjStringID = $targetObj->getObjID();

        // --- 3. Validation d'unicité (Règle : Pas de doublon d'objectif) ---
        // On parcourt les prérequis existants de l'objectif en cours d'édition
        foreach ($objectif->getPrerequis() as $existingPrereq) {
            // Si on a déjà un prérequis qui pointe vers le même Objectif Cible (peu importe le niveau)
            if ($existingPrereq->getRequiredObjective() === $targetObjStringID) {
                // On récupère le nom pour un message d'erreur clair
                $name = $targetObj->getName() ?: 'cet objectif';
                return new JsonResponse([
                    'success' => false,
                    'message' => "Un prérequis pour l'objectif \"$name\" existe déjà. Supprimez l'ancien pour changer de niveau."
                ], 400);
            }
        }

        // --- 4. Création et Enregistrement ---
        $prerequis = new Prerequis();
        $prerequis->setObjectif($objectif);

        $prerequis->setRequiredObjective($targetObjStringID);
        $prerequis->setRequiredLevel($targetLvl->getLevelID());

        $prerequis->setEncountersPercent($views);
        $prerequis->setSuccessPercent($success);

        $this->em->persist($prerequis);
        $this->em->flush();

        // --- 5. Rendu ---
        $targetObjName = !empty($targetObj->getName()) ? $targetObj->getName() : $targetObj->getObjID();
        $targetLvlName = !empty($targetLvl->getName()) ? $targetLvl->getName() : $targetLvl->getLevelID();

        $html = $this->renderView('objective/_prereq_badge.html.twig', [
            'p' => $prerequis,
            'targetObjName' => $targetObjName,
            'targetLvlName' => $targetLvlName
        ]);

        return new JsonResponse([
            'success' => true,
            'html' => $html
        ]);
    }

    /**
     * Suppression d'un prérequis.
     */
    #[Route('/prerequis/{id}/delete', name: 'delete_prerequis', methods: ['DELETE'])]
    public function deletePrerequis(Prerequis $prerequis): JsonResponse
    {
        $this->em->remove($prerequis);
        $this->em->flush();

        return new JsonResponse(['success' => true]);
    }

    /**
     * Modification d'un prérequis existant.
     */
    #[Route('/prerequis/{id}/edit', name: 'edit_prerequis', methods: ['POST'])]
    public function editPrerequis(Prerequis $prerequis, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // 1. Validation basique (Sliders)
        $views   = (float)($data['views'] ?? 0);
        $success = (float)($data['success'] ?? 0);

        if ($views <= 0 && $success <= 0) {
            return new JsonResponse(['success' => false, 'message' => 'Au moins 1% requis.'], 400);
        }

        // 2. Récupération des cibles
        $targetObjId = $data['targetObjectiveId'] ?? null;
        $targetLvlId = $data['targetLevelId'] ?? null;

        $targetObj = $this->em->getRepository(Objectif::class)->find($targetObjId);
        $targetLvl = $this->em->getRepository(Niveau::class)->find($targetLvlId);

        if (!$targetObj || !$targetLvl) {
            return new JsonResponse(['success' => false, 'message' => 'Cible introuvable'], 404);
        }

        // 3. Validation Unicité (On exclut le prérequis actuel de la vérification)
        $targetObjStringID = $targetObj->getObjID();
        $currentObjectif = $prerequis->getObjectif();

        foreach ($currentObjectif->getPrerequis() as $existing) {
            // Si c'est un AUTRE prérequis (id différent) mais qui pointe vers le MÊME objectif
            if ($existing->getId() !== $prerequis->getId() && $existing->getRequiredObjective() === $targetObjStringID) {
                // Pour l'affichage de l'erreur
                $conflictName = $targetObj->getName() ?: $targetObjStringID;
                return new JsonResponse([
                    'success' => false,
                    'message' => "Un prérequis pour l'objectif \"$conflictName\" existe déjà."
                ], 400);
            }
        }

        // 4. Mise à jour de l'entité
        $prerequis->setRequiredObjective($targetObjStringID);
        $prerequis->setRequiredLevel($targetLvl->getLevelID());
        $prerequis->setEncountersPercent($views);
        $prerequis->setSuccessPercent($success);

        $this->em->flush();

        // 5. Préparation des variables pour la vue (Gestion des noms vides)
        $targetObjName = !empty($targetObj->getName()) ? $targetObj->getName() : $targetObj->getObjID();
        $targetLvlName = !empty($targetLvl->getName()) ? $targetLvl->getName() : $targetLvl->getLevelID();

        // 6. Rendu du badge HTML
        // C'EST ICI QUE L'ERREUR SE PRODUISAIT : Il manquait les DbId
        $html = $this->renderView('objective/_prereq_badge.html.twig', [
            'p' => $prerequis,

            // Pour l'affichage texte
            'targetObjName' => $targetObjName,
            'targetLvlName' => $targetLvlName,

            // INDISPENSABLES pour le JS (bouton édition)
            'targetObjDbId' => $targetObj->getId(),
            'targetLvlDbId' => $targetLvl->getId()
        ]);

        return new JsonResponse([
            'success' => true,
            'html' => $html,
            'id' => $prerequis->getId()
        ]);
    }
}
