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

        $result = $this->apiClient->createTeacher($idProf, $name);

        if ($result['success']) {
            $this->addFlash('success', "Enseignant « $name » ajouté avec succès !");
        } else {
            $msg = $result['error'] ?? "Erreur inconnue.";
            $this->addFlash('error', $msg);
        }

        return $this->redirectToRoute('admin_teacher_list');
    }

    #[Route('/admin/teachers/delete/{idProf}', name: 'admin_teacher_delete', methods: ['POST'])]
    public function delete(string $idProf, SessionInterface $session): Response
    {
        if (!$session->get('is_admin')) {
            return $this->redirectToRoute('teacher_login');
        }

        $ok = $this->apiClient->deleteTeacher($idProf);

        if ($ok) {
            $this->addFlash('success', "Enseignant supprimé avec succès.");
        } else {
            $this->addFlash('error', "Impossible de supprimer l’enseignant (API).");
        }

        return $this->redirectToRoute('admin_teacher_list');
    }


}
