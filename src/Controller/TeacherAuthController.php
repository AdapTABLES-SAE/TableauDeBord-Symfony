<?php

namespace App\Controller;

use App\Service\ApiClient;
use App\Service\TeacherSyncService;
use App\Service\ClassroomSyncService;
use App\Service\TrainingSyncService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class TeacherAuthController extends AbstractController
{
    public function __construct(
        private ApiClient $apiClient,
        private TeacherSyncService $teacherSync,
        private ClassroomSyncService $classroomSync,
        private TrainingSyncService $trainingSync
    ) {}

    #[Route('/', name: 'teacher_login', methods: ['GET', 'POST'])]
    public function login(Request $request, SessionInterface $session): Response
    {
        $error = null;
        $identifier = '';

        if ($request->isMethod('POST')) {

            $identifier = trim($request->request->get('identifier', ''));

            if ($identifier === '') {
                $error = "Veuillez saisir votre identifiant enseignant.";
            }
            else {

                // CAS ADMIN — accès direct
                if ($identifier === 'ADMIN') {
                    $session->clear();
                    $session->set('is_admin', true);

                    return $this->redirectToRoute('admin_teacher_list');
                }

                // CAS PROF NORMAL — appel API
                $enseignantData = $this->apiClient->fetchTeacherData($identifier);

                if ($enseignantData) {

                    // Sync enseignant
                    $enseignant = $this->teacherSync->syncTeacher($enseignantData);

                    // Sync classes + élèves
                    $this->classroomSync->syncClassesAndStudents($enseignant, $enseignantData);

                    // Sync parcours
                    foreach ($enseignant->getClasses() as $classe) {
                        foreach ($classe->getEleves() as $eleve) {

                            $path = $this->apiClient->fetchLearningPathByLearner($eleve->getLearnerId());

                            if ($path) {
                                $this->trainingSync->syncTraining($eleve, $path);
                            }
                        }
                    }

                    // Authentification réussie
                    $session->set('teacher_id', $enseignant->getId());

                    return $this->redirectToRoute('class_dashboard');
                }

                // Aucun résultat API → erreur
                $error = 'Identifiant enseignant introuvable.';
            }
        }

        return $this->render('security/teacher_login.html.twig', [
            'error'      => $error,
            'identifier' => $identifier,
        ]);
    }

    #[Route('/logout', name: 'teacher_logout')]
    public function logout(SessionInterface $session): Response
    {
        $session->clear();
        return $this->redirectToRoute('teacher_login');
    }
}
