<?php

namespace App\Controller;

use App\Entity\Classe;
use App\Entity\Eleve;
use App\Entity\Entrainement;
use App\Repository\ClasseRepository;
use App\Repository\EnseignantRepository;
use App\Repository\EntrainementRepository;
use App\Repository\ObjectifRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Asset\Packages;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\RouterInterface;

class ObjectiveController extends AbstractController
{

    #[Route('/training/{id}', name: 'training')]
    public function training(int $id, EntrainementRepository $train): Response
    {
        $training = $train->find($id);

        if (!$training) {
            throw $this->createNotFoundException('Entrainement introuvable.');
        }

        $objectifs = $training->getObjectifs();

        return $this->render('components/_entrainement_detail.html.twig', [
            'training' => $training,
            'objectifs' => $objectifs
        ]);
    }


}
