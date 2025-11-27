<?php

namespace App\Controller;

use App\Entity\Entrainement;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ObjectiveListController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    #[Route('/enseignant/entrainements/{id}/objectifs', name: 'training_objectives_list')]
    public function list(int $id): Response
    {
        $entrainement = $this->em
            ->getRepository(Entrainement::class)
            ->find($id);

        if (!$entrainement) {
            throw $this->createNotFoundException("Entraînement introuvable");
        }

        return $this->render('objective/list.html.twig', [
            'entrainement' => $entrainement,
            'objectifs'    => $entrainement->getObjectifs(),
        ]);
    }
}
