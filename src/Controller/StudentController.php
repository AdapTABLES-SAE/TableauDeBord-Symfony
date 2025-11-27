<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Service\ApiClient;
use App\Service\TrainingAssignmentService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class StudentController extends AbstractController
{
    public function __construct(
        private ApiClient $apiClient,
        private TrainingAssignmentService $trainingAssignmentService,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/enseignant/classes/{learnerId}', name: 'teacher_student_view')]
    public function view(string $learnerId, Request $request): Response
    {
        $eleve = $this->em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);
        if (!$eleve) {
            throw $this->createNotFoundException("Élève introuvable");
        }

        $enseignant = $eleve->getClasse()?->getEnseignant();

        $entrainementsDisponibles = $enseignant
            ? $this->em->getRepository(Entrainement::class)->findBy(['enseignant' => $enseignant])
            : [];

        if ($request->isMethod('POST')) {
            $prenom = trim((string) $request->request->get('prenomEleve', ''));
            $nom    = trim((string) $request->request->get('nomEleve', ''));

            $hasChanged = false;

            if ($prenom !== '' && $prenom !== $eleve->getPrenomEleve()) {
                $eleve->setPrenomEleve($prenom);
                $hasChanged = true;
            }
            if ($nom !== '' && $nom !== $eleve->getNomEleve()) {
                $eleve->setNomEleve($nom);
                $hasChanged = true;
            }

            if ($hasChanged) {
                $this->em->flush();

                $classId = $eleve->getClasse()?->getIdClasse() ?? 'default';
                $success = $this->apiClient->updateLearnerData(
                    $classId,
                    $eleve->getLearnerId(),
                    $eleve->getPrenomEleve(),
                    $eleve->getNomEleve()
                );

                if ($success) {
                    $this->addFlash('success', 'Informations mises à jour localement et sur l’API.');
                } else {
                    $this->addFlash('warning', 'Sauvegardé localement, mais échec de mise à jour sur l’API.');
                }
            } else {
                $this->addFlash('info', 'Aucune modification détectée.');
            }

            if ($request->isXmlHttpRequest()) {
                return new JsonResponse(['success' => $hasChanged]);
            }
        }

        $entrainementActuel = $eleve->getEntrainement();

        // --------- NOUVELLE PARTIE : construction de la progression ---------
        $trainingProgress = [];

        if ($entrainementActuel) {
            foreach ($entrainementActuel->getObjectifs() as $objectif) {
                $levelsData = [];

                foreach ($objectif->getNiveaux() as $niveau) {
                    $result = $this->apiClient->fetchObjectiveLevelResults(
                        $eleve->getLearnerId(),
                        $objectif->getObjID(),
                        $niveau->getLevelID()
                    );

                    if ($result === null) {
                        // Niveau non dispo / erreur => on marque niveau "indisponible"
                        $levelsData[] = [
                            'levelId'        => $niveau->getLevelID(),
                            'name'           => $niveau->getName() ?? $niveau->getLevelID(),
                            'successPercent' => null,
                            'encounters'     => null,
                            'tasks'          => [],
                        ];
                        continue;
                    }

                    $success   = (float) ($result['globalSuccess'] ?? 0);
                    $encounter = (int) ($result['globalEncounters'] ?? 0);

                    $tasks = [];
                    foreach ($result['progresses'] ?? [] as $t) {
                        $tasks[] = [
                            'idTask'           => $t['idTask'] ?? '',
                            'typeTask'         => $t['typeTask'] ?? '',
                            'currentSuccess'   => (int) ($t['currentSuccess'] ?? 0),
                            'currentEncounters'=> (int) ($t['currentEncounters'] ?? 0),
                        ];
                    }

                    $levelsData[] = [
                        'levelId'        => $niveau->getLevelID(),
                        'name'           => $niveau->getName() ?? $niveau->getLevelID(),
                        'successPercent' => $success,
                        'encounters'     => $encounter,
                        'tasks'          => $tasks,
                    ];
                }

                $trainingProgress[] = [
                    'objectiveId' => $objectif->getObjID(),
                    'name'        => $objectif->getName(),
                    'levels'      => $levelsData,
                ];
            }
        }

        $learnerStats = $this->apiClient->getLearnerStats($eleve->getLearnerId());
        $learnerInventory = $this->apiClient->fetchLearnerInventory($eleve->getLearnerId());

        if (!$learnerInventory || !isset($learnerInventory['items'])) {
            $learnerInventory = ['items' => []];
        }

        return $this->render('student/view.html.twig', [
            'eleve'              => $eleve,
            'classe'             => $eleve->getClasse(),
            'entrainements'      => $entrainementsDisponibles,
            'entrainementActuel' => $entrainementActuel,
            'trainingProgress'   => $trainingProgress,
            'learnerStats'       => $learnerStats ?? null,
            'learnerInventory' => $learnerInventory
        ]);
    }

    #[Route('/enseignant/classes/{learnerId}/entrainement', name: 'ajax_update_training', methods: ['POST'])]
    public function updateTrainingAjax(string $learnerId, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $entrainementId = $data['entrainementId'] ?? null;

        if (!$entrainementId) {
            return new JsonResponse(['success' => false, 'message' => 'Aucun ID entraînement fourni'], 400);
        }

        $eleve = $this->em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);

        if (!$eleve) {
            return new JsonResponse(['success' => false, 'message' => 'Élève introuvable'], 404);
        }

        /*
         * CAS PARTICULIER : retrait d'entraînement
         * L'utilisateur a sélectionné "Aucun entraînement"
         */
        if ($entrainementId === 'none') {

            // On appelle la méthode spéciale qui envoie l’entraînement "fictif" à l’API
            $ok = $this->trainingAssignmentService->assignDefaultTraining($eleve);

            if (!$ok) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Erreur API : impossible de retirer l’entraînement.'
                ], 500);
            }

            // On enlève l'entraînement côté base locale
            $eleve->setEntrainement(null);
            $this->em->flush();

            return new JsonResponse([
                'success' => true,
                'message' => 'L’entraînement a été retiré.',
                'entrainementName' => 'Aucun entraînement'
            ]);
        }

        // --- CAS NORMAUX : assignment d’un entraînement classique
        $entrainement = $this->em->getRepository(Entrainement::class)->find($entrainementId);

        if (!$entrainement) {
            return new JsonResponse(['success' => false, 'message' => 'Entraînement introuvable'], 404);
        }

        $ok = $this->trainingAssignmentService->assignTraining($eleve, $entrainement);

        if (!$ok) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour sur l’API.'
            ], 500);
        }

        // Mise à jour locale
        $eleve->setEntrainement($entrainement);
        $this->em->flush();

        return new JsonResponse([
            'success'          => true,
            'message'          => 'Nouvel entraînement attribué avec succès.',
            'entrainementName' => $entrainement->getLearningPathID()
        ]);
    }

    #[Route('/enseignant/classes/{learnerId}/store', name: 'student_update_equipment', methods: ['POST'])]
    public function updateEquipment(
        string $learnerId,
        Request $request,
        ApiClient $apiClient
    ): JsonResponse {

        $data = json_decode($request->getContent(), true);

        if (!isset($data['items'])) {
            return new JsonResponse(['error' => 'Invalid payload'], 400);
        }

        $result = $apiClient->updateLearnerEquipment($learnerId, $data['items']);

        if ($result['success']) {
            return new JsonResponse(['success' => true]);
        }

        return new JsonResponse([
            'success' => false,
            'error'   => $result['error'] ?? 'API error'
        ], 500);
    }

}
