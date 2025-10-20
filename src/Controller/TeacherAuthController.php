<?php

namespace App\Controller;

use App\Service\ApiClient;
use App\Service\TeacherSyncService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class TeacherAuthController extends AbstractController
{
    private ApiClient $apiClient;
    private TeacherSyncService $teacherSync;

    public function __construct(ApiClient $apiClient, TeacherSyncService $teacherSync)
    {
        $this->apiClient = $apiClient;
        $this->teacherSync = $teacherSync;
    }

    #[Route('/enseignant/login', name: 'teacher_login', methods: ['GET','POST'])]
    public function login(Request $request, SessionInterface $session): Response
    {
        $error = null;
        $identifier = '';

        if ($request->isMethod('POST')) {
            $identifier = trim((string)$request->request->get('identifier', ''));

            if ($identifier === '') {
                $error = 'Veuillez saisir votre identifiant enseignant.';
            } else {
                // Appel API pour récupérer les infos enseignant
                $enseignantData = $this->apiClient->fetchTeacherData($identifier);

                if ($enseignantData) {
                    // Synchronisation avec la base Doctrine
                    $enseignant = $this->teacherSync->syncTeacher($enseignantData);

                    // Enregistre en session
                    $session->set('teacher_id', $enseignant->getIdProf());
                    $session->set('teacher_name', $enseignant->getName());

                    return $this->redirectToRoute('teacher_dashboard');
                }

                $error = 'Identifiant enseignant introuvable dans l’API.';
            }
        }

        return $this->render('security/teacher_login.html.twig', [
            'error' => $error,
            'identifier' => $identifier,
        ]);
    }

    #[Route('/enseignant/logout', name: 'teacher_logout')]
    public function logout(SessionInterface $session): Response
    {
        $session->clear();
        return $this->redirectToRoute('teacher_login');
    }
}
