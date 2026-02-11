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
use Doctrine\ORM\EntityManagerInterface;
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

        $select = $request->query->get('select');


        if (!in_array($target, $validTargets, true)) {
            $target = 'classes';
        }

        // Only what the Twig really needs
        return $this->render('/dashboard/dashboard.html.twig', [
            "dashboard_css" => [
                $assets->getUrl('css/dashboard/_class_partial.css'),
                $assets->getUrl('css/dashboard/_training_partial.css'),
            ],
            "dashboard_js" => [
                $assets->getUrl('js/partials/_class/classDetails.js'),
                $assets->getUrl('js/partials/_class/classList.js'),
                $assets->getUrl('js/partials/_training/trainingDetails.js'),
                $assets->getUrl('js/partials/_training/trainingList.js'),
                $assets->getUrl('js/partials/_training/carousel.js'),
            ],

            'target' => $target,
            'selected' => $select
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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        SessionInterface $session
    ): JsonResponse
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        int $id,
        Request $request,
        EntityManagerInterface $em,
        ApiClient $apiClient,
        TrainingAssignmentService $trainingAssignmentService,
        SessionInterface $session
    ): JsonResponse
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
    }

    #[Route('/dashboard/training/{id}/update', name: 'training_update', methods: ['POST'])]
    public function trainingUpdate(
        int $id,
        Request $request,
        EntityManagerInterface $em,
        TrainingAssignmentService $trainingAssignmentService,
        SessionInterface $session
    ): JsonResponse {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        // 1. Sécurité et Récupération
        $training = $em->getRepository(Entrainement::class)->find($id);
        if (!$training) return new JsonResponse(['success' => false, 'message' => 'Entraînement introuvable'], 404);

        $teacherId = $session->get('teacher_id');
        if (!$teacherId || $training->getEnseignant()?->getId() !== $teacherId) {
            return new JsonResponse(['success' => false, 'message' => 'Accès refusé'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $needsSync = false; // Témoin de modification

        try {
            // =========================================================
            // 2. MISE À JOUR DU NOM DE L'ENTRAÎNEMENT
            // =========================================================
            // On vérifie si 'name' est présent et différent de l'actuel
            if (isset($data['name']) && trim($data['name']) !== '') {
                $newName = trim($data['name']);
                if ($training->getName() !== $newName) {
                    $training->setName($newName);
                    $needsSync = true;
                }
            }

            // =========================================================
            // 3. MISE À JOUR DES NOMS DES OBJECTIFS
            // =========================================================
            // Le JS doit envoyer un tableau : objectives: [{id: 12, name: "Nouveau titre"}, ...]
            if (!empty($data['objectives']) && is_array($data['objectives'])) {
                foreach ($data['objectives'] as $objItem) {
                    // On vérifie qu'on a bien un ID et un Name
                    if (!empty($objItem['id']) && isset($objItem['name'])) {
                        $obj = $em->getRepository(Objectif::class)->find($objItem['id']);

                        // On vérifie que cet objectif appartient bien à l'entraînement en cours
                        if ($obj && $obj->getEntrainement()->getId() === $id) {
                            $newObjName = trim($objItem['name']);

                            // Si le nom a changé, on update
                            if ($obj->getName() !== $newObjName) {
                                $obj->setName($newObjName);
                                $needsSync = true;
                            }
                        }
                    }
                }
            }

            // =========================================================
            // 4. SUPPRESSION DES OBJECTIFS
            // =========================================================
            $deletedIds = $data['deletedObjectiveIds'] ?? [];
            if (!empty($deletedIds)) {
                foreach ($deletedIds as $delId) {
                    $objToDelete = $em->getRepository(Objectif::class)->find($delId);
                    if ($objToDelete && $objToDelete->getEntrainement()->getId() === $id) {
                        $training->removeObjectif($objToDelete);
                        $em->remove($objToDelete);
                        $needsSync = true;
                    }
                }
            }

            // Sauvegarde intermédiaire pour valider les suppressions/modifs avant recréation
            $em->flush();

            // =========================================================
            // 5. GESTION DU CAS "ENTRAÎNEMENT VIDE"
            // =========================================================
            $em->refresh($training); // On recharge pour avoir le compte exact

            if ($training->getObjectifs()->count() === 0) {
                // Création Objectif par défaut
                $defObj = new Objectif();
                $defObj->setName("Objectif 1");
                $defObj->setObjID(uniqid('obj_'));
                $defObj->setEntrainement($training);

                // Création Niveau par défaut
                $defLvl = new Niveau();
                $defLvl->setName("Niveau 1");
                $defLvl->setLevelID('L1_' . uniqid());
                $defLvl->setTables(["1"]);
                $defLvl->setResultLocation("RIGHT");
                $defLvl->setLeftOperand("TABLE_OPERAND");
                $defLvl->setIntervalMin(1);
                $defLvl->setIntervalMax(10);
                $defLvl->setSuccessCompletionCriteria(80);
                $defLvl->setEncounterCompletionCriteria(100);

                $defLvl->setObjectif($defObj);
                $defObj->addNiveau($defLvl);

                $em->persist($defObj);
                $em->flush(); // Sauvegarde de la structure par défaut

                $needsSync = true;
                $em->refresh($training); // Rechargement final
            }

            // =========================================================
            // 6. SYNCHRONISATION API (Seulement si nécessaire)
            // =========================================================
            if ($needsSync) {
                // On récupère les élèves impactés
                $students = $em->getRepository(Eleve::class)->findBy(['entrainement' => $training]);

                foreach ($students as $student) {
                    // Ton service gère déjà le flush + refresh + envoi API
                    $trainingAssignmentService->assignTraining($student, $training);
                }
            } else {
                // Si rien n'a changé de significatif pour l'API, on s'assure juste que la BDD est à jour
                $em->flush();
            }

            return new JsonResponse(['success' => true]);

        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Erreur serveur : ' . $e->getMessage()
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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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

        $objectifCopy = $this->deepCloneObjective($sourceObjectif, $training, $name);

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

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
            $objectifCopy = $this->deepCloneObjective($sourceObjectif, $trainingCopy, $name);
            $trainingCopy->addObjectif($objectifCopy);
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

    #[Route('/dashboard/training/duplicate/{id}', name: 'training_duplicate', methods: ['POST'])]
    public function duplicateTraining(
        int $id,
        EntityManagerInterface $em,
        SessionInterface $session
    ): JsonResponse {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $teacherId = $session->get('teacher_id');
        if (!$teacherId) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);
        if (!$teacher) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $sourceTraining = $em->getRepository(Entrainement::class)->find($id);

        if (!$sourceTraining) {
            return new JsonResponse(['success' => false, 'fatal' => true]);
        }

        $trainingCopy = clone $sourceTraining;
        $trainingCopy->setLearningPathID(uniqid('TRAIN_'));
        $trainingCopy->setName($sourceTraining->getName() . "(copie)");
        $trainingCopy->setEnseignant($teacher);

        foreach ($sourceTraining->getObjectifs() as $sourceObjectif) {
            $objectifCopy = $this->deepCloneObjective($sourceObjectif, $trainingCopy);
            $trainingCopy->addObjectif($objectifCopy);
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

    /**
     * Méthode partagée pour cloner un objectif et ses sous-éléments (Niveaux, Tâches, Prérequis)
     */
    private function deepCloneObjective(Objectif $sourceObjectif, Entrainement $targetTraining, string $newName = null): Objectif
    {
        $objectifCopy = clone $sourceObjectif;
        if(!is_null($newName)) $objectifCopy->setName($newName);
        $objectifCopy->setEntrainement($targetTraining);
        $objectifCopy->setObjID(uniqid('obj_'));

        foreach ($sourceObjectif->getNiveaux() as $niveau) {
            $niveauCopy = clone $niveau;
            $niveauCopy->setObjectif($objectifCopy);
            $niveauCopy->setLevelID(uniqid('lvl_'));

            foreach ($niveau->getTaches() as $tache) {
                $tacheCopy = clone $tache;
                $tacheCopy->setNiveau($niveauCopy);
                $niveauCopy->addTache($tacheCopy);
            }

            $objectifCopy->addNiveau($niveauCopy);
        }

        foreach ($sourceObjectif->getPrerequis() as $prerequis) {
            $prerequisCopy = clone $prerequis;
            $prerequisCopy->setObjectif($objectifCopy);
            $objectifCopy->addPrerequis($prerequisCopy);
        }

        return $objectifCopy;
    }
}
