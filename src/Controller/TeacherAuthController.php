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

    #[Route('/enseignant/login', name: 'teacher_login', methods: ['GET', 'POST'])]
    public function login(Request $request, SessionInterface $session): Response
    {
        $error = null;
        $identifier = '';

        if ($request->isMethod('POST')) {
            $identifier = trim($request->request->get('identifier', ''));

            if ($identifier === '') {
                $error = 'Veuillez saisir votre identifiant enseignant.';
            } else {
                $enseignantData = $this->apiClient->fetchTeacherData($identifier);

                if ($enseignantData) {
                    $enseignant = $this->teacherSync->syncTeacher($enseignantData);
                    $this->classroomSync->syncClassesAndStudents($enseignant, $enseignantData);

                    // Synchronisation des parcours des élèves
                    foreach ($enseignant->getClasses() as $classe) {
                        foreach ($classe->getEleves() as $eleve) {
                            $learnerId = $eleve->getLearnerId();
                            $path = $this->apiClient->fetchLearningPathByLearner($learnerId);
                            if ($path) {
                                $this->trainingSync->syncTraining($eleve, $path);
                            }
                        }
                    }

                    // Sauvegarde les infos en session (utilisées pour le dashboard)
                    $session->set('teacher_id', $enseignant->getId());

                    // Redirection vers la page d'accueil du tableau de bord enseignant
                    return $this->redirectToRoute('class_dashboard');
                }

                $error = 'Identifiant enseignant introuvable.';
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
