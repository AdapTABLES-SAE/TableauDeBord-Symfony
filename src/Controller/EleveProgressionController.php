<?php
namespace App\Controller;

use App\Entity\Eleve;
use App\Repository\EleveRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class EleveProgressionController extends AbstractController
{
    #[Route('/enseignant/eleve/{id}/progression', name: 'eleve_progression')]
    public function progression(Eleve $eleve, EleveRepository $eleveRepo): Response
    {
        $classe = $eleve->getClasse();
        $eleves = $classe->getEleves()->toArray();

        // Index de l’élève courant dans la classe
        $index = array_search($eleve, $eleves);
        $prev = $eleves[$index - 1] ?? null;
        $next = $eleves[$index + 1] ?? null;

        // Exemple de données factices de progression
        $objectifs = [
            [
                'titre' => 'Objectif 1',
                'tables' => [5],
                'niveau' => 1,
                'faits' => 0,
                'succes' => 0
            ]
        ];

        return $this->render('teacher/progression.html.twig', [
            'eleve' => $eleve,
            'classe' => $classe,
            'prev' => $prev,
            'next' => $next,
            'objectifs' => $eleve->getObjectifs() // dynamique
        ]);
    }


}
