<?php
namespace App\Controller;

use App\Service\ApiClient;
use App\Entity\Classe;
use App\Repository\EnseignantRepository;
use App\Repository\ClasseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class TeacherDashboardController extends AbstractController
{
    #[Route('/enseignant/dashboard', name: 'teacher_dashboard')]
    public function index(SessionInterface $session, ApiClient $apiClient): Response
    {
        $teacherId = $session->get('teacher_id');
        if (!$teacherId) {
            return $this->redirectToRoute('teacher_login');
        }

        // Appel API pour récupérer l'enseignant
        $enseignant = $apiClient->getTeacher($teacherId);
        if (!$enseignant) {
            return $this->redirectToRoute('teacher_login');
        }

        // Ici il faudra aussi ajouter une méthode getClassesByTeacher($teacherId) dans ApiClient
        $classes = $apiClient->getClassesByTeacher($teacherId);

        return $this->render('teacher/dashboard.html.twig', [
            'enseignant' => $enseignant,
            'classes' => $classes,
        ]);
    }

    #[Route('/enseignant/classe/{id}/edit', name: 'classe_edit', methods: ['POST'])]
    public function editClasse(
        Classe $classe,
        Request $request,
        EntityManagerInterface $em
    ): Response {
        $newName = trim((string) $request->request->get('nom'));
        if ($newName !== '') {
            $classe->setNom($newName);
            $em->flush();
        }
        return $this->redirectToRoute('teacher_dashboard');
    }

    #[Route('/enseignant/classe/{id}/delete', name: 'classe_delete', methods: ['POST'])]
    public function deleteClasse(
        Classe $classe,
        EntityManagerInterface $em
    ): Response {
        $em->remove($classe);
        $em->flush();
        return $this->redirectToRoute('teacher_dashboard');
    }

    #[Route('/enseignant/classe/add', name: 'classe_add', methods: ['POST'])]
    public function addClasse(
        Request $request,
        SessionInterface $session,
        EnseignantRepository $enseignantRepository,
        EntityManagerInterface $em
    ): Response {
        $teacherId = $session->get('teacher_id');
        if (!$teacherId) {
            return $this->redirectToRoute('teacher_login');
        }

        $enseignant = $enseignantRepository->find($teacherId);
        if (!$enseignant) {
            return $this->redirectToRoute('teacher_login');
        }

        $nom = trim((string)$request->request->get('nom'));
        $identifiant = trim((string)$request->request->get('identifiant'));

        if ($nom !== '' && $identifiant !== '') {
            $classe = new \App\Entity\Classe();
            $classe->setNom($nom);
            $classe->setIdentifiant($identifiant);
            $classe->setEnseignant($enseignant);

            $em->persist($classe);
            $em->flush();
        }

        return $this->redirectToRoute('teacher_dashboard');
    }

}
