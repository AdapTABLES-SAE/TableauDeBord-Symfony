<?php

namespace App\Controller;

use App\Entity\Enseignant; // Pense à importer l'entité
use App\Service\ApiClient;
use App\Service\TeacherSyncService;
use App\Service\ClassroomSyncService;
use App\Service\TrainingSyncService;
use Doctrine\ORM\EntityManagerInterface;
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
        private TrainingSyncService $trainingSync,
        private EntityManagerInterface $em // Injection de l'Entity Manager
    ) {}

    #[Route('/', name: 'teacher_login', methods: ['GET', 'POST'])]
    public function login(Request $request, SessionInterface $session): Response
    {
        $error = null;
        $identifier = '';

        if ($request->isMethod('POST')) {
            $identifier = trim($request->request->get('identifier', ''));

            if ($identifier === '') {
                $error = 'Veuillez saisir votre identifiant enseignant.';
            } else {

                // 1. Création entrainement par défaut si nécessaire
                $created = $this->trainingSync->isDefaultTrainingCreated();
                if (!$created) {
                    $this->trainingSync->buildDefaultTrainingDoctrine();
                }

                // 2. Récupération API
                $enseignantData = $this->apiClient->fetchTeacherData($identifier);

                if ($enseignantData) {

                    // --- CAS ADMIN ---
                    if (($enseignantData['idProf'] ?? '') === 'ADMIN') {
                        $session->set('is_admin', true);
                        return $this->redirectToRoute('admin_teacher_list');
                    }

                    // --- ÉTAPE 1 : Importation de la structure (Prof, Classes, Elèves) ---
                    $enseignant = $this->teacherSync->syncTeacher($enseignantData);
                    $this->classroomSync->syncClassesAndStudents($enseignant, $enseignantData);

                    // =========================================================
                    // LA CORRECTION EST ICI : RESET TOTAL DE LA MÉMOIRE
                    // =========================================================

                    // A. On sauvegarde tout ce qu'on vient de créer en BDD
                    $this->em->flush();

                    // B. On garde l'ID de l'enseignant au chaud
                    $profId = $enseignant->getId();

                    // C. On vide la mémoire de Symfony/Doctrine.
                    // C'est comme si le script s'arrêtait et redémarrait.
                    $this->em->clear();

                    // D. On recharge l'enseignant "tout neuf" depuis la base.
                    // Doctrine va maintenant voir toutes les classes et tous les élèves
                    // car il est obligé de relire la BDD.
                    $enseignantFraichementCharge = $this->em->getRepository(Enseignant::class)->find($profId);

                    // --- ÉTAPE 2 : Importation des entraînements ---
                    // Maintenant, getClasses() n'est plus vide !
                    foreach ($enseignantFraichementCharge->getClasses() as $classe) {
                        foreach ($classe->getEleves() as $eleve) {
                            $learnerId = $eleve->getLearnerId();

                            // Appel API pour voir si l'élève a un parcours
                            $path = $this->apiClient->fetchLearningPathByLearner($learnerId);

                            if ($path) {
                                $this->trainingSync->syncTraining($eleve, $path);
                            }
                        }
                    }

                    // Sauvegarde finale des entraînements récupérés
                    $this->em->flush();

                    // Sauvegarde session (avec le bon ID)
                    $session->set('teacher_id', $enseignantFraichementCharge->getId());

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

    #[Route('/logout', name: 'teacher_logout')]
    public function logout(SessionInterface $session): Response
    {
        $session->clear();
        return $this->redirectToRoute('teacher_login');
    }
}
