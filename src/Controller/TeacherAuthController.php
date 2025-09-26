<?php
namespace App\Controller;

use App\Repository\EnseignantRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;

class TeacherAuthController extends AbstractController
{
    private EnseignantRepository $enseignantRepository;

    public function __construct(EnseignantRepository $enseignantRepository)
    {
        $this->enseignantRepository = $enseignantRepository;
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
                $enseignant = $this->enseignantRepository->findOneBy(['identifiant' => $identifier]);

                if ($enseignant) {
                    $session->set('teacher_id', $enseignant->getId());
                    return $this->redirectToRoute('teacher_dashboard');
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
        $session->remove('teacher_id');
        return $this->redirectToRoute('teacher_login');
    }
}
