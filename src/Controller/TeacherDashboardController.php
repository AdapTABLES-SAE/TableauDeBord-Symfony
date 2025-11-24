<?php

namespace App\Controller;

use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use App\Entity\Entrainement;
use App\Service\ApiClient;
use App\Service\TrainingAssignmentService;
use App\Service\TrainingSyncService;
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
    public function index(SessionInterface $session, Packages $assets): Response
    {
        if (!$session->get('teacher_id')) {
            return $this->redirectToRoute('teacher_login');
        }

        $breadcrumbItems = [
            [
                'label' => 'Mes Classes',
                'url'   => $this->generateUrl('class_dashboard'),
            ],
        ];

        // Only what the Twig really needs
        return $this->render('/dashboard/dashboard.html.twig', [
            "dashboard_css" => [
                $assets->getUrl('css/dashboard/_class_partial.css'),
            ],
            "dashboard_js" => [
                $assets->getUrl('js/partials/classeDetails.js'),
            ],

            'breadcrumbItems' => $breadcrumbItems,
        ]);
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
        return $this->render('/partials/_class/_classList.html.twig', [
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

        return $this->render('/partials/_class/_classDetails.html.twig', [
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
        EntityManagerInterface $em
    ): JsonResponse
    {
        $nom     = $request->request->get('lname');
        $prenom  = $request->request->get('fname');
        $studentId = $request->request->get('studentId');

        $classe = $em->getRepository(Classe::class)->find($id);
        if (!$classe) return new JsonResponse(['success' => false]);

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
        return new JsonResponse(['success' => $ok]);
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
                $apiClient->deleteStudent(
                    (string)$student->getClasse()->getEnseignant()->getId(),
                    (string)$student->getClasse()->getId(),
                    (string)$student->getLearnerId()
                );
                $em->remove($student);
                continue;
            }

            if (isset($data['trainingPathId'])) {
                if($data['trainingPathId'] !== "") {
                    $entrainement = $em->getRepository(Entrainement::class)->find($data['trainingPathId']);
                    if ($entrainement) {
                        $trainingAssignmentService->assignTraining($student, $entrainement);
                    }
                }else{
                    $trainingAssignmentService->assignDefaultTraining($student);
                    $student->setEntrainement(null);
                }
            }
        }
        $em->flush();

        return new JsonResponse(['success' => true]);
    }
}
