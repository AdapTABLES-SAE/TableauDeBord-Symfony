<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Service\ApiClient;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class StudentController extends AbstractController
{
    private EntityManagerInterface $em;
    private ApiClient $apiClient;

    public function __construct(EntityManagerInterface $em, ApiClient $apiClient)
    {
        $this->em = $em;
        $this->apiClient = $apiClient;
    }

    #[Route('/enseignant/eleve/{learnerId}', name: 'teacher_student_view')]
    public function view(string $learnerId): Response
    {
        // Récupération des données locales
        $eleve = $this->em->getRepository(Eleve::class)->findOneBy(['learnerId' => $learnerId]);

        if (!$eleve) {
            throw $this->createNotFoundException("Élève introuvable");
        }

        // On récupère les données API dynamiques (progression, équipements, pièces)
        $stats = $this->apiClient->fetchLearnerStatistics($learnerId);
        $store = $this->apiClient->fetchLearnerStore($learnerId);
        $coins = $this->apiClient->fetchLearnerCoins($learnerId);

        // Entraînement attribué (depuis entités locales)
        $entrainement = null;
        $entrainements = $eleve->getEntrainements();

        if (!$entrainements->isEmpty()) {
            $entrainement = $entrainements->first();
        }

        return $this->render('student/view.html.twig', [
            'eleve' => $eleve,
            'classe' => $eleve->getClasse(),
            'entrainement' => $entrainement,
            'stats' => $stats,
            'store' => $store,
            'coins' => $coins
        ]);
    }
}
