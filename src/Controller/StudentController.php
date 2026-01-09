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
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class StudentController extends AbstractController
{
    public function __construct(
        private ApiClient $apiClient,
        private TrainingAssignmentService $trainingAssignmentService,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/enseignant/classes/student/{learnerId}', name: 'teacher_student_view')]
    public function view(string $learnerId, Request $request, SessionInterface $session): Response
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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

    #[Route('/enseignant/classes/student/{learnerId}/entrainement', name: 'ajax_update_training', methods: ['POST'])]
    public function updateTrainingAjax(string $learnerId, Request $request, SessionInterface $session): Response
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
            'entrainementName' => $entrainement->getName()
        ]);
    }

    #[Route('/enseignant/classes/student/{learnerId}/store', name: 'student_update_equipment', methods: ['POST'])]
    public function updateEquipment(
        string $learnerId,
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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

    #[Route('/enseignant/classes/student/{id}/delete', name: 'delete_student', methods: ['DELETE'])]
    public function deleteStudent(
        int $id,
        EntityManagerInterface $em,
        ApiClient $apiClient,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $student = $em->getRepository(Eleve::class)->find($id);

        $ok = $apiClient->deleteStudent(
            (string)$student->getClasse()->getEnseignant()->getIdProf(),
            (string)$student->getClasse()->getIdClasse(),
            (string)$student->getLearnerId()
        );

        if ($ok){
            $em->remove($student);
            $em->flush();
        }

        return new JsonResponse([
            'success' => $ok], ($ok ? 200:500)
        );
    }


    #[Route('/enseignant/classes/student/{learnerId}/training/{trainingId}/clone', name: 'clone_training_for_student', methods: ['POST'])]
    public function cloneTrainingForStudent(
        string $learnerId,
        int $trainingId,
        EntityManagerInterface $em,
        TrainingAssignmentService $trainingAssignmentService,
        SessionInterface $session
    ): Response {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        // =========================================================
        // 1. RÉCUPÉRATION
        // =========================================================
        $eleve = $em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);
        $originalTraining = $em->getRepository(Entrainement::class)->find($trainingId);

        if (!$eleve || !$originalTraining) {
            return new JsonResponse(['success' => false, 'message' => 'Ressource introuvable'], 404);
        }

        // =========================================================
        // 2. CRÉATION ENTRAINEMENT (SANITIZATION NOM)
        // =========================================================
        $newTraining = new Entrainement();

        // On construit une chaîne "Prenom_Nom"
        $rawName = $eleve->getPrenomEleve() . '_' . $eleve->getNomEleve();

        // 1. On remplace les espaces par des underscores
        $nameNoSpace = str_replace(' ', '_', $rawName);

        // 2. On supprime les accents (ex: é -> e) - nécessite que le serveur gère iconv, sinon le regex fera le reste
        if (function_exists('iconv')) {
            $nameNoSpace = iconv('UTF-8', 'ASCII//TRANSLIT', $nameNoSpace);
        }

        // 3. On ne garde que les Lettres, Chiffres et Underscores (Sécurité API Java)
        $cleanName = preg_replace('/[^A-Za-z0-9_]/', '', $nameNoSpace);

        // ID Technique : TRAINING_PRENOM_NOM_uid
        $newTraining->setLearningPathID("TRAINING_" . strtoupper($cleanName) . "_" . uniqid());

        // Nom : Entrainement_specifique_PRENOM_NOM
        $newTraining->setName("Entrainement_specifique_" . $cleanName);

        $newTraining->setEnseignant($eleve->getClasse()->getEnseignant());

        // =========================================================
        // 3. CLONAGE PROFOND
        // =========================================================
        foreach ($originalTraining->getObjectifs() as $originalObj) {
            $newObj = new \App\Entity\Objectif();
            $newObj->setName($originalObj->getName());
            $newObj->setObjID(uniqid('obj_'));
            $newObj->setEntrainement($newTraining); // Lien BDD

            foreach ($originalObj->getNiveaux() as $originalLevel) {
                $newLevel = new \App\Entity\Niveau();
                $newLevel->setName($originalLevel->getName());
                $newLevel->setLevelID('L' . uniqid());

                // Copie Paramètres
                $newLevel->setTables($originalLevel->getTables());
                $newLevel->setResultLocation($originalLevel->getResultLocation());
                $newLevel->setLeftOperand($originalLevel->getLeftOperand());
                $newLevel->setIntervalMin($originalLevel->getIntervalMin());
                $newLevel->setIntervalMax($originalLevel->getIntervalMax());
                $newLevel->setSuccessCompletionCriteria($originalLevel->getSuccessCompletionCriteria());
                $newLevel->setEncounterCompletionCriteria($originalLevel->getEncounterCompletionCriteria());

                $newLevel->setObjectif($newObj); // Lien BDD

                foreach ($originalLevel->getTaches() as $originalTask) {
                    $newTask = new \App\Entity\Tache();
                    $newTask->setTaskType($originalTask->getTaskType());
                    $newTask->setRepartitionPercent($originalTask->getRepartitionPercent());

                    $newTask->setTimeMaxSecond($originalTask->getTimeMaxSecond());
                    $newTask->setNbFacts($originalTask->getNbFacts());
                    $newTask->setSuccessiveSuccessesToReach($originalTask->getSuccessiveSuccessesToReach());
                    $newTask->setAnswerModality($originalTask->getAnswerModality());
                    $newTask->setNbIncorrectChoices($originalTask->getNbIncorrectChoices());
                    $newTask->setNbCorrectChoices($originalTask->getNbCorrectChoices());

                    // --- CORRECTIFS VITAUX ---
                    $newTask->setSourceVariation($originalTask->getSourceVariation());
                    $newTask->setTarget($originalTask->getTarget());
                    // COPIE DU TABLEAU DES CIBLES (C'était l'oubli majeur)
                    $newTask->setTargets($originalTask->getTargets());
                    // -------------------------

                    $newTask->setNiveau($newLevel); // Lien BDD
                    $em->persist($newTask);
                }
                $em->persist($newLevel);
            }
            $em->persist($newObj);
        }

        $em->persist($newTraining);

        // 4. SAUVEGARDE PHYSIQUE
        $em->flush();

        // ID pour rechargement
        $newId = $newTraining->getId();
        $studentLearnerId = $eleve->getLearnerId();

        // =========================================================
        // 5. RESET MÉMOIRE (La clé du succès)
        // =========================================================
        // On force Symfony à oublier l'objet "sale" en mémoire
        $em->clear();

        // =========================================================
        // 6. RECHARGEMENT PROPRE
        // =========================================================
        $freshEleve = $em->getRepository(Eleve::class)->findOneBy(['learnerId' => $studentLearnerId]);
        $freshTraining = $em->getRepository(Entrainement::class)->find($newId);

        // =========================================================
        // 7. APPEL SERVICE (Synchro API)
        // =========================================================
        $ok = $trainingAssignmentService->assignTraining($freshEleve, $freshTraining);

        if (!$ok) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Clonage BDD réussi, mais l\'API a refusé le JSON.'
            ], 500);
        }

        // Attribution locale sur les objets rechargés
        $freshEleve->setEntrainement($freshTraining);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'message' => 'Entraînement cloné et attribué.',
            'newTrainingId' => $freshTraining->getId(),
            'redirectUrl' => '/dashboard?target=trainings&open=' . $freshTraining->getId()
        ]);
    }
}
