<?php

namespace App\Controller;

use App\Constant\ApiEndpoints;
use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use App\Entity\Entrainement;
use App\Entity\Niveau;
use App\Entity\Objectif;
use App\Service\ApiClient;
use App\Service\TrainingAssignmentService;
use App\Service\TrainingSyncService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Asset\Packages;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class TeacherDashboardController extends AbstractController
{

    // Main
    #[Route('/dashboard', name: 'class_dashboard')]
    public function index(Request $request, SessionInterface $session, Packages $assets): Response
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $validTargets = ['classes', 'trainings'];
        $target = $request->query->get('target', 'classes');

        if (!in_array($target, $validTargets, true)) {
            $target = 'classes';
        }

        // Only what the Twig really needs
        return $this->render('/dashboard/dashboard.html.twig', [
            "dashboard_css" => [
                $assets->getUrl('css/dashboard/_class_partial.css'),
                $assets->getUrl('css/dashboard/_training_partial.css'),
//                $assets->getUrl('css/carousel.css'),
//                $assets->getUrl('css/training.css'),
            ],
            "dashboard_js" => [
                $assets->getUrl('js/partials/_class/classDetails.js'),
                $assets->getUrl('js/partials/_class/classList.js'),
                $assets->getUrl('js/partials/_training/trainingDetails.js'),
                $assets->getUrl('js/partials/_training/trainingList.js'),
                $assets->getUrl('js/partials/_training/carousel.js'),
            ],

            'target' => $target
        ]);
    }
    #[Route('/dashboard/classroom/add-classroom', name: 'add_classroom', methods: ['POST'])]
    public function addClassroom(
        Request $request,
        ApiClient $apiClient,
        SessionInterface $session,
        EntityManagerInterface $em
    ): JsonResponse
    {
        $count = 0;

        $teacherID = $session->get('teacher_id');
        $teacher = $em->getRepository(Enseignant::class)->find($teacherID);

        $name = $request->request->get('className');
        $id = $request->request->get('classID');

        if (empty($name) || empty($id)) return new JsonResponse(['success' => false]);

        $isNewId = empty($em->getRepository(Classe::class)->findOneBy(["idClasse" => $id]));
        if($isNewId){
            $ok = $apiClient->addClassroom($teacher->getIdProf(), $id, $name);
            if ($ok) {
                $classe = new Classe();
                $classe->setEnseignant($teacher);
                $classe->setIdClasse($id);
                $classe->setName($name);

                $em->persist($classe);
                $em->flush();
            }
            return new JsonResponse(['success' => $ok, 'fatal' => !$ok]);
        }else {
            return new JsonResponse(['success' => false, 'fatal' => false]);
        }
    }

    #[Route('/dashboard/classroom/delete/{id}', name: 'delete_classroom', methods: ['DELETE'])]
    public function deleteClassroom(
        string $id,
        SessionInterface $session,
        ApiClient $api,
        EntityManagerInterface $em
    ): JsonResponse {
        $teacherId = $session->get('teacher_id');
        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);
        $class = $em->getRepository(Classe::class)->find($id);

        $success = $api->deleteClassroom($teacher->getIdProf(), $class->getIdClasse());
        if($success){
            $em->remove($class);
        }

        $em->flush();
        return new JsonResponse(['success' => $success]);
    }

    // List
    #[Route('/dashboard/class/list', name: 'class_list_partial')]
    public function classList(
        SessionInterface $session,
        EntityManagerInterface $em
    ): Response {
        $teacherId = $session->get('teacher_id');
        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);
        $classes = $teacher->getClasses();

        // `_classList.html.twig` expects `elements`
        return $this->render('/dashboard/partials/_class/_classList.html.twig', [
            'classes' => $classes,
        ]);
    }

    // Details
    #[Route('/dashboard/class/{id}/details', name: 'class_details')]
    public function details(
        int $id,
        EntityManagerInterface $em,
        SessionInterface $session
    ): Response {
        $class = $em->getRepository(Classe::class)->find($id);

        // permission check
        $teacherId = $session->get('teacher_id');
        if (!$teacherId || $class->getEnseignant()->getId() !== $teacherId) {
            throw $this->createAccessDeniedException('Accès non autorisé à cette classe.');
        }

        $teacherEntityId = $class->getEnseignant()->getId();
        $trainingPaths = $em->getRepository(Entrainement::class)
            ->findBy(['enseignant' => $teacherEntityId]);

        $students = $class->getEleves();

        return $this->render('/dashboard/partials/_class/_classDetails.html.twig', [
            'class'         => $class,
            'students'      => $students,
            'trainingPaths' => $trainingPaths,
        ]);
    }

    //  UPDATE CLASS + STUDENTS
    #[Route('/dashboard/class/{id}/add-student', name: 'class_add_student', methods: ['POST'])]
    public function addStudent(
        string $id,
        Request $request,
        ApiClient $apiClient,
        EntityManagerInterface $em,
    ): JsonResponse
    {
        $nom     = $request->request->get('lname');
        $prenom  = $request->request->get('fname');
        $studentId = $request->request->get('studentId');

        $classe = $em->getRepository(Classe::class)->find($id);
        if (!$classe) return new JsonResponse(['success' => false, 'fatal' => true]);

        $canCreateStudent = $em->getRepository(Eleve::class)->findOneBy(["learnerId"=>$studentId]);
        if(!$canCreateStudent){
            $ok = $apiClient->addStudent($classe->getIdClasse(), $studentId, $nom, $prenom);

            if ($ok) {
                $eleve = new Eleve();
                $eleve->setNomEleve($nom);
                $eleve->setPrenomEleve($prenom);
                $eleve->setLearnerId($studentId);
                $eleve->setClasse($classe);

                $em->persist($eleve);
                $em->flush();
            }

            return new JsonResponse(['success' => $ok, 'fatal' => !$ok]);
        }else{
            return new JsonResponse(['success' => false, 'fatal' => false]);
        }
    }

    #[Route('/dashboard/class/{id}/update-infos', name: 'class_update', methods: ['POST'])]
    public function updateInfos(
        int $id, Request $request, EntityManagerInterface $em, ApiClient $apiClient,
        TrainingAssignmentService $trainingAssignmentService): JsonResponse
    {
        $classData    = $request->request->all('class');
        $studentsData = $request->request->all('students');

        $class = $em->getRepository(Classe::class)->find($id);
        if (isset($classData['title']) && $classData['title'] !== '') {
            $class->setName($classData['title']);
            $apiClient->updateClassroomName((string)$id, $classData['title']);
        }

        foreach ($studentsData as $studentDatabaseId => $data) {
            $student = $em->getRepository(Eleve::class)->find($studentDatabaseId);
            if (!$student) continue;

            if (isset($data['delete']) && $data['delete'] === "1") {
                $ok = $apiClient->deleteStudent(
                    (string)$student->getClasse()->getEnseignant()->getIdProf(),
                    (string)$student->getClasse()->getIdClasse(),
                    (string)$student->getLearnerId()
                );
                if($ok) $em->remove($student);
                else return new JsonResponse(['success' => false]);

                continue;
            }

            if (isset($data['trainingPathId'])) {
                if($data['trainingPathId'] === ""){
                    $trainingAssignmentService->assignDefaultTraining($student);
                    $student->setEntrainement(null);
                }
                else {
                    $entrainement = $em->getRepository(Entrainement::class)->find($data['trainingPathId']);
                    if ($entrainement) {
                        $trainingAssignmentService->assignTraining($student, $entrainement);
                    }
                }
            }
        }
        $em->flush();

        return new JsonResponse(['success' => true]);
    }


    // Training
    #[Route('/dashboard/training/list', name: 'training_list_partial')]
    public function trainingList(
        SessionInterface $session,
        EntityManagerInterface $em
    ): Response {
        $teacherId = $session->get('teacher_id');
        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);

        $trainings = $teacher->getEntrainements();

        return $this->render('/dashboard/partials/_training/_trainingList.html.twig', [
            'trainings' => $trainings,
        ]);
    }

    #[Route('/dashboard/training/{id}/details', name: 'training_details')]
    public function trainingDetails(
        int $id,
        EntityManagerInterface $em,
        SessionInterface $session
    ): Response {
        $training = $em->getRepository(Entrainement::class)->find($id);

        if (!$training) {
            throw $this->createNotFoundException();
        }

        $teacherId = $session->get('teacher_id');

        if (!$teacherId || $training->getEnseignant()?->getId() !== $teacherId) {
            throw $this->createAccessDeniedException('Accès non autorisé à cet entraînement.');
        }

        $objectifs = $training->getObjectifs();

        return $this->render('/dashboard/partials/_training/_trainingDetails.html.twig', [
            'training' => $training,
            'objectifs' => $objectifs
        ]);

//        return $this->render('/dashboard/partials/_training/_trainingDetailsM.html.twig', [
//            'training'      => $training,
//            'objectives'    => $objectives,
//            'students'      => $students,
//            'trainingPaths' => $trainingPaths,
//        ]);
    }

    #[Route('/dashboard/training/{id}/update', name: 'training_update', methods: ['POST'])]
    public function trainingUpdate(
        int $id,
        Request $request,
        EntityManagerInterface $em,
        TrainingAssignmentService $trainingAssignmentService,
        ApiClient $apiClient,
        SessionInterface $session
    ): JsonResponse {
        // 1. Vérifications de sécurité : L'entrainement existe et appartient au prof
        $training = $em->getRepository(Entrainement::class)->find($id);
        if (!$training) return new JsonResponse(['success' => false, 'message' => 'Entraînement introuvable'], 404);

        $teacherId = $session->get('teacher_id');
        if (!$teacherId || $training->getEnseignant()?->getId() !== $teacherId) {
            return new JsonResponse(['success' => false, 'message' => 'Accès refusé'], 403);
        }

        $data = json_decode($request->getContent(), true);

        try {
            // 2. Mise à jour du nom de l'entraînement
            if (!empty($data['name'])) {
                $training->setName($data['name']);
            }

            // 3. Gestion des suppressions d'objectifs
            $deletedIds = $data['deletedObjectiveIds'] ?? [];
            $hasDeleted = false;

            if (!empty($deletedIds)) {
                foreach ($deletedIds as $objId) {
                    $obj = $em->getRepository(Objectif::class)->find($objId);

                    // On vérifie que l'objectif appartient bien à cet entrainement avant de supprimer
                    if ($obj && $obj->getEntrainement()->getId() === $id) {
                        $training->removeObjectif($obj); // Retrait de la collection
                        $em->remove($obj);               // Suppression BDD
                        $hasDeleted = true;
                    }
                }
                $em->flush();
            }

            // 4. Si l'entraînement est vide après suppression, on recrée la structure par défaut
            // On rafraîchit l'entité pour être sûr de l'état réel en base
            $em->refresh($training);

            if ($training->getObjectifs()->count() === 0) {
                // ----------------------------------------------------------------
                // RECRÉATION MANUELLE DE LA STRUCTURE PAR DÉFAUT
                // ----------------------------------------------------------------

                // Création de l'Objectif
                $newObj = new Objectif();
                $newObj->setEntrainement($training);
                $newObj->setObjID(uniqid('obj_'));
                $newObj->setName("Objectif 1");

                // Création du Niveau
                $newLevel = new Niveau();
                $newLevel->setObjectif($newObj);
                $newLevel->setLevelID('L1_' . uniqid());
                $newLevel->setName("Niveau 1");

                // Paramètres spécifiques demandés (Tables 1, Intervalle 1-10...)
                $newLevel->setTables(["1"]);
                $newLevel->setResultLocation("RIGHT");
                $newLevel->setLeftOperand("TABLE_OPERAND");
                $newLevel->setIntervalMin(1);
                $newLevel->setIntervalMax(10);

                // Paramètres de réussite
                $newLevel->setSuccessCompletionCriteria(80);
                $newLevel->setEncounterCompletionCriteria(100);

                // Liaison finale
                $newObj->addNiveau($newLevel);
                $em->persist($newObj);
                $em->flush();

                $em->refresh($training);
            }

            // 5. Envoi à l'API (Synchronisation avec les élèves)
            // On le fait si on a supprimé des choses ou changé le nom
            if ($hasDeleted || !empty($data['name'])) {
                $students = $em->getRepository(Eleve::class)->findBy(['entrainement' => $training]);
                foreach ($students as $student) {
                    $trainingAssignmentService->assignTraining($student, $training);
                }
            } else {
                $em->flush();
            }

            return new JsonResponse(['success' => true]);

        } catch (\Throwable $e) {
            // En cas d'erreur, on renvoie le message précis pour le débogage
            return new JsonResponse([
                'success' => false,
                'message' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    #[Route('/dashboard/training/{id}/objective/add', name: 'training_objective_add', methods: ['POST'])]
    public function addObjective(
        int $id,
        Request $request,
        EntityManagerInterface $em,
        SessionInterface $session
    ): JsonResponse {
        $training = $em->getRepository(Entrainement::class)->find($id);
        if (!$training) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $teacherId = $session->get('teacher_id');
        if (!$teacherId || $training->getEnseignant()?->getId() !== $teacherId) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $data = json_decode($request->getContent(), true);
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return new JsonResponse(['success' => false, 'fatal' => false]);
        }

        $sourceTraining = $em->getRepository(Entrainement::class)->findOneBy([
            'learningPathID' => ApiEndpoints::DEFAULT_LEARNING_PATH_ID,
        ]);

        if (!$sourceTraining) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $sourceObjectif = $sourceTraining->getObjectifs()->first();
        if (!$sourceObjectif) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $objectifCopy = clone $sourceObjectif;
        $objectifCopy->setName($name);
        $objectifCopy->setEntrainement($training);

        foreach ($sourceObjectif->getNiveaux() as $niveau) {
            $niveauCopy = clone $niveau;
            $niveauCopy->setObjectif($objectifCopy);
            $objectifCopy->addNiveau($niveauCopy);
        }

        foreach ($sourceObjectif->getPrerequis() as $prerequis) {
            $prerequisCopy = clone $prerequis;
            $prerequisCopy->setObjectif($objectifCopy);
            $objectifCopy->addPrerequis($prerequisCopy);
        }

        $em->persist($objectifCopy);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'objective' => [
                'id' => $objectifCopy->getId(),
                'name' => $objectifCopy->getName(),
            ],
        ]);
    }

    #[Route('/dashboard/training/delete/{id}', name: 'training_delete', methods: ['DELETE'])]
    public function deleteTraining(
        int $id,
        EntityManagerInterface $em,
        SessionInterface $session,
        TrainingAssignmentService $trainingAssignmentService
    ): JsonResponse {
        $training = $em->getRepository(Entrainement::class)->find($id);
        if (!$training) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $teacherId = $session->get('teacher_id');
        if (!$teacherId || $training->getEnseignant()?->getId() !== $teacherId) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        //Reassign students to DEFAULT training
        $students = $em->getRepository(Eleve::class)->findBy([
            'entrainement' => $training
        ]);

        foreach ($students as $student) {
            $trainingAssignmentService->assignDefaultTraining($student);
        }
        $em->remove($training);
        $em->flush();

        return new JsonResponse(['success' => true]);
    }

    #[Route('/dashboard/training/add', name: 'training_add', methods: ['POST'])]
    public function addTraining(
        Request $request,
        EntityManagerInterface $em,
        SessionInterface $session
    ): JsonResponse {
        $teacherId = $session->get('teacher_id');
        if (!$teacherId) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);
        if (!$teacher) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $data = json_decode($request->getContent(), true);
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return new JsonResponse(['success' => false, 'fatal' => false]);
        }


        $sourceTraining = $em->getRepository(Entrainement::class)->findOneBy([
            'learningPathID' => ApiEndpoints::DEFAULT_LEARNING_PATH_ID,
        ]);

        if (!$sourceTraining) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $trainingCopy = clone $sourceTraining;
        $trainingCopy->setLearningPathID(uniqid('TRAIN_'));
        $trainingCopy->setName($name);
        $trainingCopy->setEnseignant($teacher);

        foreach ($sourceTraining->getObjectifs() as $sourceObjectif) {

            $objectifCopy = clone $sourceObjectif;
            $objectifCopy->setEntrainement($trainingCopy);
            $trainingCopy->addObjectif($objectifCopy);

            foreach ($sourceObjectif->getNiveaux() as $niveau) {
                $niveauCopy = clone $niveau;
                $niveauCopy->setObjectif($objectifCopy);
                $objectifCopy->addNiveau($niveauCopy);
            }
        }

        $em->persist($trainingCopy);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'training' => [
                'id'   => $trainingCopy->getId(),
                'name' => $trainingCopy->getName(),
            ],
        ]);
    }
}
