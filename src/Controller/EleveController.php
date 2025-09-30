<?php
namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Classe;
use App\Repository\ClasseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
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

    #[Route('/enseignant/eleve/{id}/edit', name: 'eleve_edit', methods: ['POST'])]
    public function editEleve(Eleve $eleve, Request $request, EntityManagerInterface $em): Response
    {
        $newNom = trim((string) $request->request->get('nom'));
        $newPrenom = trim((string) $request->request->get('prenom'));

        if ($newNom !== '' && $newPrenom !== '') {
            $eleve->setNom($newNom);
            $eleve->setPrenom($newPrenom);
            $em->flush();
        }

        return $this->redirectToRoute('classe_eleves', ['id' => $eleve->getClasse()->getId()]);
    }

    #[Route('/enseignant/eleve/{id}/delete', name: 'eleve_delete', methods: ['POST'])]
    public function deleteEleve(Eleve $eleve, EntityManagerInterface $em): Response
    {
        $classeId = $eleve->getClasse()->getId();
        $em->remove($eleve);
        $em->flush();

        return $this->redirectToRoute('classe_eleves', ['id' => $classeId]);
    }

    #[Route('/enseignant/classe/{id}/eleve/add', name: 'eleve_add', methods: ['POST'])]
    public function addEleve(
        Classe $classe,
        Request $request,
        EntityManagerInterface $em
    ): Response {
        $nom = trim((string)$request->request->get('nom'));
        $prenom = trim((string)$request->request->get('prenom'));
        $identifiant = trim((string)$request->request->get('identifiant'));

        if ($nom !== '' && $prenom !== '' && $identifiant !== '') {
            $eleve = new Eleve();
            $eleve->setNom($nom);
            $eleve->setPrenom($prenom);
            $eleve->setIdentifiant($identifiant);
            $eleve->setClasse($classe);

            $em->persist($eleve);
            $em->flush();
        }

        return $this->redirectToRoute('classe_eleves', ['id' => $classe->getId()]);
    }

}
