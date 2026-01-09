<?php

namespace App\Controller;

use App\Entity\Enseignant;
use App\Service\ApiClient;
use App\Service\TeacherDeletionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class AdminTeacherController extends AbstractController
{
    public function __construct(
        private ApiClient $apiClient,
        private EntityManagerInterface $em
    ) {}

    #[Route('/admin/teachers', name: 'admin_teacher_list', methods: ['GET'])]
    public function index(SessionInterface $session): Response
    {
        // Protection Admin
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
        // Protection Admin
        if (!$session->get('is_admin')) {
            return $this->redirectToRoute('teacher_login');
        }

        $idProf = trim((string) $request->request->get('idProf', ''));
        $name   = trim((string) $request->request->get('name', ''));

        if ($idProf === '' || $name === '') {
            $this->addFlash('error', 'Tous les champs sont obligatoires.');
            return $this->redirectToRoute('admin_teacher_list');
        }

        // Vérifier si déjà dans la base locale
        $existing = $this->em->getRepository(Enseignant::class)
            ->findOneBy(['idProf' => $idProf]);

        if ($existing) {
            $this->addFlash('error', "L’enseignant « $idProf » existe déjà dans la base locale.");
            return $this->redirectToRoute('admin_teacher_list');
        }

        // Envoi à l’API
        $result = $this->apiClient->createTeacher($idProf, $name);

        if (!$result['success']) {
            $msg = $result['error'] ?? "Erreur inconnue lors de la création sur l’API.";
            $this->addFlash('error', $msg);
            return $this->redirectToRoute('admin_teacher_list');
        }

        // Si l’API a réussi → on crée le prof en base locale
        $enseignant = new Enseignant();
        $enseignant->setIdProf($idProf);
        $enseignant->setName($name);

        $this->em->persist($enseignant);
        $this->em->flush();

        $this->addFlash('success', "Enseignant « $name » ajouté avec succès !");
        return $this->redirectToRoute('admin_teacher_list');
    }


    #[Route('/admin/teachers/delete/{idProf}', name: 'admin_teacher_delete', methods: ['POST'])]
    public function delete(
        string $idProf,
        SessionInterface $session,
        TeacherDeletionService $deleter
    ): Response
    {
        // Protection Admin
        if (!$session->get('is_admin')) {
            return $this->redirectToRoute('teacher_login');
        }

        /** @var Enseignant|null $enseignant */
        $enseignant = $this->em->getRepository(Enseignant::class)
            ->findOneBy(['idProf' => $idProf]);

        if (!$enseignant) {
            $this->addFlash('error', "Enseignant introuvable en base locale.");
            return $this->redirectToRoute('admin_teacher_list');
        }

        // Suppression API + suppression locale + cascade via le service
        $ok = $deleter->deleteTeacher($enseignant);

        if ($ok) {
            $this->addFlash('success', "Enseignant supprimé avec succès !");
        } else {
            $this->addFlash('error', "Impossible de supprimer l’enseignant (API).");
        }

        return $this->redirectToRoute('admin_teacher_list');
    }
}
