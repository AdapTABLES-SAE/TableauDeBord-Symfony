<?php

namespace App\Controller;

use App\Service\ApiClient;
use App\Service\TeacherSyncService;
use App\Service\ClassroomSyncService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Contrôleur d’authentification pour les enseignants.
 * Gère la connexion, la récupération des données API et la synchronisation locale.
 */
class TeacherAuthController extends AbstractController
{
    private ApiClient $apiClient;
    private TeacherSyncService $teacherSync;
    private ClassroomSyncService $classroomSync;

    /**
     * Injection des services nécessaires :
     * - ApiClient : pour interroger l’API
     * - TeacherSyncService : pour sauvegarder l’enseignant dans la base
     * - ClassroomSyncService : pour synchroniser les classes et élèves
     */
    public function __construct(
        ApiClient $apiClient,
        TeacherSyncService $teacherSync,
        ClassroomSyncService $classroomSync
    ) {
        $this->apiClient = $apiClient;
        $this->teacherSync = $teacherSync;
        $this->classroomSync = $classroomSync;
    }

    /**
     * Page de connexion enseignant (GET + POST)
     *
     * - Affiche le formulaire (GET)
     * - Vérifie l'identifiant envoyé (POST)
     * - Appelle l'API pour vérifier l'existence de l’enseignant
     * - Synchronise ensuite toutes les données liées
     */
    #[Route('/enseignant/login', name: 'teacher_login', methods: ['GET','POST'])]
    public function login(Request $request, SessionInterface $session): Response
    {
        $error = null;
        $identifier = '';

        if ($request->isMethod('POST')) {
            // Récupère et nettoie l'identifiant saisi dans le formulaire
            $identifier = trim((string)$request->request->get('identifier', ''));

            if ($identifier === '') {
                $error = 'Veuillez saisir votre identifiant enseignant.';
            } else {
                // Appel à l’API pour récupérer les infos du professeur
                $enseignantData = $this->apiClient->fetchTeacherData($identifier);

                if ($enseignantData) {
                    // Crée ou met à jour l’entité Enseignant en base
                    $enseignant = $this->teacherSync->syncTeacher($enseignantData);

                    // Synchronise les classes et les élèves liés
                    $this->classroomSync->syncClassesAndStudents($enseignant, $enseignantData);

                    // Sauvegarde les infos en session (utilisées pour le dashboard)
                    $session->set('teacher_id', $enseignant->getIdProf());
                    $session->set('teacher_name', $enseignant->getName());

                    // Redirection vers la page d'accueil du tableau de bord enseignant
                    return $this->redirectToRoute('teacher_dashboard');
                }

                // Si aucun enseignant trouvé, message d’erreur
                $error = 'Identifiant enseignant introuvable';
            }
        }

        // Affichage de la page de connexion
        return $this->render('security/teacher_login.html.twig', [
            'error' => $error,
            'identifier' => $identifier,
        ]);
    }

    /**
     * Déconnexion enseignant
     * Supprime la session actuelle et redirige vers la page de login.
     */
    #[Route('/enseignant/logout', name: 'teacher_logout')]
    public function logout(SessionInterface $session): Response
    {
        $session->clear();
        return $this->redirectToRoute('teacher_login');
    }
}
