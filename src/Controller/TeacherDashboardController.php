<?php

namespace App\Controller;

use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Repository\ClasseRepository;
use App\Repository\EnseignantRepository;
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
    public function index(EnseignantRepository $repo, RouterInterface $router, SessionInterface $session, Packages $assets): Response
    {
        if (!$session->get('teacher_id')) {
            // Redirige vers la page de login
            return $this->redirectToRoute('teacher_login');
        }

        //Get login ID
        $teacherId = $session->get('teacher_id');
        $teacher = $repo->find($teacherId);
        $classes = $teacher->getClasses();

        $publicUrl = $assets->getUrl('js/partials/classePartial.js');
        $twigFile = "partials/_class_detail.html.twig";

        // Route Path must have {id} that will be interpolated
        $route = $router->getRouteCollection()->get('class_details')->getPath();

        $breadcrumbItems = [
            [
                'label' => 'Mes Classes',
                'url' => $this->generateUrl('class_dashboard')
            ]
        ];

        return $this->render('components/element_dashboard.html.twig',
        [
            "partial_script" => "$publicUrl",
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
        return $this->render('partials/_class_detail.html.twig', [
            'class' => $class,
            'students' => $students,
            'trainingPaths' => $trainingPaths
        ]);
    }


    #[Route('/class/update-students', name: 'class_update', methods: ['POST'])]
    public function updateStudents(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $classData = $request->request->all('class');
        $studentsData = $request->request->all('students');

        // --- Handle class title updates ---
        foreach ($classData as $classId => $data) {
            $class = $em->getRepository(Classe::class)->find($classId);
            if (!$class) continue;

            if (isset($data['title'])) {
                $class->setName($data['title']);
            }
        }

        // --- Handle student updates ---
        foreach ($studentsData as $studentDatabaseId => $data) {
            $student = $em->getRepository(Eleve::class)->find($studentDatabaseId);
            if (!$student) continue;

            if (isset($data['studentId'])) {
                $student->setLearnerId($data['studentId']);
            }

            if (isset($data['trainingPathId'])) {
                $training = $em->getRepository(Entrainement::class)->find($data['trainingPathId']);
                if ($training) {
                    // Replace or add training relationship
                    $student->addEntrainement($training);
                }
            }
        }


        //todo: edit in API from db changes



        // Persist all changes
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'message' => 'Classe et élèves mis à jour avec succès !',
            'updated' => [
                'classes' => array_keys($classData),
                'students' => array_keys($studentsData)
            ]
        ]);
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
//        return $this->render('partials/_class_detail.html.twig', [
//            'element' => $element,
//        ]);
//    }

}
