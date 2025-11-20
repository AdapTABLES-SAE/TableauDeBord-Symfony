<?php

namespace App\Controller;

use App\Service\ApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class AdminTeacherController extends AbstractController
{
    public function __construct(private ApiClient $apiClient) {}

    #[Route('/admin/teachers', name: 'admin_teacher_list', methods: ['GET'])]
    public function index(SessionInterface $session): Response
    {
        if (!$session->get('is_admin')) {
            return $this->redirectToRoute('teacher_login');
        }

        $teachers = $this->apiClient->fetchAllTeachers();

        return $this->render('admin/teachers/dashboard.html.twig', [
            'teachers' => $teachers,
        ]);
    }

    #[Route('/admin/teachers/add', name: 'admin_teacher_add', methods: ['POST'])]
    public function add(SessionInterface $session, Request $request): Response
    {
        if (!$session->get('is_admin')) {
            return $this->redirectToRoute('teacher_login');
        }

        $idProf = trim((string) $request->request->get('idProf', ''));
        $name   = trim((string) $request->request->get('name', ''));

        if ($idProf === '' || $name === '') {
            $this->addFlash('error', 'Tous les champs sont obligatoires.');
            return $this->redirectToRoute('admin_teacher_list');
        }

        $ok = $this->apiClient->createTeacher($idProf, $name);

        if ($ok) {
            $this->addFlash('success', 'Enseignant ajouté avec succès !');
        } else {
            $this->addFlash('error', 'Erreur API : impossible d’ajouter cet enseignant.');
        }

        return $this->redirectToRoute('admin_teacher_list');
    }
}
