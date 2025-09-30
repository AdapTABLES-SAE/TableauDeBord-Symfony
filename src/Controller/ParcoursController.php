<?php

namespace App\Controller;

use App\Entity\Eleve;
use App\Entity\Objectif;
use App\Entity\Niveau;
use App\Entity\Tache;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ParcoursController extends AbstractController
{
    private const TACHE_TYPES = [
        '1 élément manquant',
        '2 éléments manquants',
        'Reconstituer le fait',
        'Identifier si fait valide ou non',
        'Connaitre les résultats des tables',
    ];

    #[Route('/enseignant/eleve/{id}/parcours', name: 'eleve_parcours', methods: ['GET'])]
    public function index(Eleve $eleve, Request $request): Response
    {
        $openTasksForNiveauId = $request->query->getInt('openTasks', 0);

        return $this->render('teacher/parcours.html.twig', [
            'eleve'      => $eleve,
            'objectifs'  => $eleve->getObjectifs(),
            'taskTypes'  => self::TACHE_TYPES,
            'openTasksForNiveauId' => $openTasksForNiveauId,
        ]);
    }

    // ---------------- OBJECTIFS ----------------

    #[Route('/enseignant/eleve/{id}/objectif/add', name: 'objectif_add', methods: ['POST'])]
    public function objectifAdd(Eleve $eleve, EntityManagerInterface $em): Response
    {
        $count = count($eleve->getObjectifs()) + 1;

        $o = new Objectif();
        $o->setEleve($eleve);
        $o->setTitre('O' . $count);
        $o->setTables([1]);

        $em->persist($o);
        $em->flush();

        return $this->redirectToRoute('eleve_parcours', ['id' => $eleve->getId()]);
    }

    #[Route('/objectif/{id}/edit-title', name: 'objectif_edit_title', methods: ['POST'])]
    public function objectifEditTitle(Objectif $objectif, Request $request, EntityManagerInterface $em): Response
    {
        $title = trim((string)$request->request->get('title', ''));
        if ($title !== '') {
            $objectif->setTitre($title);
            $em->flush();
        }
        return $this->redirectToRoute('eleve_parcours', ['id' => $objectif->getEleve()->getId()]);
    }

    #[Route('/objectif/{id}/edit-tables', name: 'objectif_edit_tables', methods: ['POST'])]
    public function objectifEditTables(Objectif $objectif, Request $request, EntityManagerInterface $em): Response
    {
        // Peut être soit un array (cases à cocher), soit une string "1,2,3"
        $raw = $request->request->all('tables'); // si name="tables[]" -> array
        if ($raw === []) {
            // Pas un array ? alors récupère la valeur unique "tables"
            $raw = $request->request->get('tables', '');
        }

        // Normalisation
        if (is_array($raw)) {
            $tables = array_map('intval', $raw);
        } else {
            // ex: "1,2,3" -> [1,2,3]
            $parts  = preg_split('/[,\s;]+/', (string) $raw) ?: [];
            $tables = array_map('intval', $parts);
        }

        // Filtrage + tri
        $tables = array_values(array_unique(array_filter($tables, fn ($v) => $v >= 1 && $v <= 12)));
        sort($tables);

        $objectif->setTables($tables);
        $em->flush();

        return $this->redirectToRoute('eleve_parcours', ['id' => $objectif->getEleve()->getId()]);
    }


    #[Route('/objectif/{id}/delete', name: 'objectif_delete', methods: ['POST'])]
    public function objectifDelete(Objectif $objectif, EntityManagerInterface $em): Response
    {
        $eleveId = $objectif->getEleve()->getId();
        $em->remove($objectif);
        $em->flush();
        return $this->redirectToRoute('eleve_parcours', ['id' => $eleveId]);
    }

    // ---------------- NIVEAUX ----------------

    #[Route('/objectif/{id}/niveau/auto-add', name: 'niveau_auto_add', methods: ['POST'])]
    public function niveauAutoAdd(Objectif $objectif, EntityManagerInterface $em): Response
    {
        $max = 0;
        foreach ($objectif->getNiveaux() as $n) {
            $max = max($max, (int)$n->getNumero());
        }

        $niveau = new Niveau();
        $niveau->setObjectif($objectif);
        $niveau->setNumero($max + 1);

        $em->persist($niveau);
        $em->flush();

        return $this->redirectToRoute('eleve_parcours', ['id' => $objectif->getEleve()->getId()]);
    }

    #[Route('/niveau/{id}/move', name: 'niveau_move', methods: ['POST'])]
    public function niveauMove(Niveau $niveau, Request $request, EntityManagerInterface $em): Response
    {
        $direction = $request->request->get('direction');
        $objectif = $niveau->getObjectif();

        $target = $direction === 'up' ? $niveau->getNumero() - 1 : $niveau->getNumero() + 1;
        $swap = null;
        foreach ($objectif->getNiveaux() as $n) {
            if ((int)$n->getNumero() === $target) { $swap = $n; break; }
        }
        if ($swap) {
            $a = $niveau->getNumero();
            $b = $swap->getNumero();
            $niveau->setNumero($b);
            $swap->setNumero($a);
            $em->flush();
        }
        return $this->redirectToRoute('eleve_parcours', ['id' => $objectif->getEleve()->getId()]);
    }

    #[Route('/niveau/{id}/delete', name: 'niveau_delete', methods: ['POST'])]
    public function niveauDelete(Niveau $niveau, EntityManagerInterface $em): Response
    {
        $eleveId = $niveau->getObjectif()->getEleve()->getId();
        $em->remove($niveau);
        $em->flush();
        return $this->redirectToRoute('eleve_parcours', ['id' => $eleveId]);
    }

    // ---------------- TÂCHES ----------------

    #[Route('/niveau/{id}/tache/add', name: 'tache_add', methods: ['POST'])]
    public function tacheAdd(Niveau $niveau, Request $request, EntityManagerInterface $em): Response
    {
        $type = (string)$request->request->get('type', '');
        if ($type !== '') {
            $t = new Tache();
            $t->setType($type);
            $t->setNiveau($niveau);
            $em->persist($t);
            $em->flush();
        }
        return $this->redirectToRoute('eleve_parcours', [
            'id' => $niveau->getObjectif()->getEleve()->getId(),
            'openTasks' => $niveau->getId(),
        ]);
    }

    #[Route('/tache/{id}/edit', name: 'tache_edit', methods: ['POST'])]
    public function tacheEdit(Tache $tache, Request $request, EntityManagerInterface $em): Response
    {
        $type = (string)$request->request->get('type', '');
        if ($type !== '') {
            $tache->setType($type);
            $em->flush();
        }
        return $this->redirectToRoute('eleve_parcours', [
            'id' => $tache->getNiveau()->getObjectif()->getEleve()->getId(),
            'openTasks' => $tache->getNiveau()->getId(),
        ]);
    }

    #[Route('/tache/{id}/delete', name: 'tache_delete', methods: ['POST'])]
    public function tacheDelete(Tache $tache, EntityManagerInterface $em): Response
    {
        $eleveId = $tache->getNiveau()->getObjectif()->getEleve()->getId();
        $niveauId = $tache->getNiveau()->getId();

        $em->remove($tache);
        $em->flush();

        return $this->redirectToRoute('eleve_parcours', [
            'id' => $eleveId,
            'openTasks' => $niveauId,
        ]);
    }

    private function parseTablesString(string $str): array
    {
        $parts = preg_split('/[,\s;]+/', trim($str)) ?: [];
        $out = [];
        foreach ($parts as $p) {
            if ($p === '') continue;
            $v = (int)$p;
            if ($v >= 1 && $v <= 12) $out[] = $v;
        }
        $out = array_values(array_unique($out));
        sort($out);
        return $out;
    }
}
