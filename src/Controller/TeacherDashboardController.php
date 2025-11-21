<?php

namespace App\Controller;

use App\Constant\ApiEndpoints;
use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Enseignant;
use App\Entity\Entrainement;
use App\Repository\ClasseRepository;
use App\Repository\EnseignantRepository;
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
use Symfony\Component\Routing\RouterInterface;

class TeacherDashboardController extends AbstractController
{
    #[Route('/enseignant/classes', name: 'class_dashboard')]
    public function index(EntityManagerInterface $em, RouterInterface $router, SessionInterface $session, Packages $assets): Response
    {
        if (!$session->get('teacher_id')) {
            // Redirige vers la page de login
            return $this->redirectToRoute('teacher_login');
        }

        //Get login ID
        $teacherId = $session->get('teacher_id');
        $teacher = $em->getRepository(Enseignant::class)->find($teacherId);
        $classes = $teacher->getClasses();

        $js = $assets->getUrl('js/partials/classePartial.js');
        $css = $assets->getUrl('css/dashboard/_class_partial.css');
        $twigFile = "/partials/_class/_classDetails.html.twig";

        // Route Path must have {id} that will be interpolated
        $route = $router->getRouteCollection()->get('class_details')->getPath();


        $defaultTraining = $em
            ->getRepository(Entrainement::class)
            ->findOneBy([
                'learningPathID' => ApiEndpoints::DEFAULT_LEARNING_PATH_ID
            ]);
//        dd($defaultTraining);


        $breadcrumbItems = [
            [
                'label' => 'Mes Classes',
                'url' => $this->generateUrl('class_dashboard')
            ]
        ];

        return $this->render('/dashboard/dashboard.html.twig',
        [
            "partial_script" => "$js",
            "partial_css" => "$css",

            "partial_twig" => "$twigFile",
            "elements" => $classes,

            "fetchUrlTemplate" => "$route",

            "breadcrumbItems" => $breadcrumbItems,

            "label_element_list_title" => "Liste des classes",
            "label_element_list_add" => "Ajouter une classe",
            "label_element_details_not_found_title" => "Ma classe"
        ]
        );
    }

    //partial loader
    #[Route('/class/{id}/details', name: 'class_details')]
    public function details(int $id, EntityManagerInterface $em): Response
    {
        $class = $em->getRepository(Classe::class)->find($id);

        if (!$class) {
            throw $this->createNotFoundException('Classe introuvable.');
        }
        $teacherId = $class->getEnseignant()->getId();
        $trainingPaths = $em->getRepository(Entrainement::class)->findBy(['enseignant' => $teacherId]);
        $students = $class->getEleves();

        // todo: check permissions?
        return $this->render('/partials/_class/_classDetails.html.twig', [
            'class' => $class,
            'students' => $students,
            'trainingPaths' => $trainingPaths
        ]);
    }

    #[Route('/class/{id}/update-infos', name: 'class_update', methods: ['POST'])]
    public function updateInfos(
        int $id, Request $request, EntityManagerInterface $em, ApiClient $apiClient,
        TrainingSyncService $trainingSyncService,TrainingAssignmentService $trainingAssignmentService): JsonResponse
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


    #[Route('/class/{id}/add-student', name: 'class_add_student', methods: ['POST'])]
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




// todo: LearningPaths

//    #[Route('/class/{id}/details', name: 'class_details')]
//    public function details(int $id, ClasseRepository $repo): Response
//    {
//        $element = $repo->find($id);
//
//        if (!$element) {
//            throw $this->createNotFoundException('Élément introuvable.');
//        }
//
//        return $this->render('partials/_classDetails.html.twig', [
//            'element' => $element,
//        ]);
//    }

}
