<?php
namespace App\Controller;

use App\Entity\Classe;
use App\Repository\ClasseRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class EleveController extends AbstractController
{
    #[Route('/enseignant/classe/{id}/eleves', name: 'classe_eleves')]
    public function listeEleves(Classe $classe): Response
    {
        return $this->render('eleve/liste.html.twig', [
            'classe' => $classe,
            'eleves' => $classe->getEleves(),
        ]);
    }
}
