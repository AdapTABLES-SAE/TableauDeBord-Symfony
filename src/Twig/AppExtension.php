<?php

namespace App\Twig;

use App\Repository\EnseignantRepository;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\Extension\AbstractExtension;
use Twig\Extension\GlobalsInterface;
use App\Entity\Entrainement;
use App\Entity\Objectif;
use App\Entity\Niveau;
use Twig\TwigFunction;

class AppExtension extends AbstractExtension implements GlobalsInterface
{
    private RequestStack $requestStack;
    private EnseignantRepository $enseignantRepository;

    public function __construct(RequestStack $requestStack, EnseignantRepository $enseignantRepository)
    {
        $this->requestStack = $requestStack;
        $this->enseignantRepository = $enseignantRepository;
    }

    public function getGlobals(): array
    {
        $session = $this->requestStack->getSession();
        $teacherName = null;

        if ($session && $session->has('teacher_id')) {
            $teacherId = $session->get('teacher_id');
            $enseignant = $this->enseignantRepository->find($teacherId);

            if ($enseignant) {
                $teacherName = $enseignant->getName();
            }
        }

        return [
            'current_teacher_name' => $teacherName,
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('find_objective_name', [$this, 'findObjectiveName']),
            new TwigFunction('find_level_name', [$this, 'findLevelName']),
            new TwigFunction('find_objective_entity', [$this, 'findObjectiveEntity']),
            new TwigFunction('find_level_entity', [$this, 'findLevelEntity']),
        ];
    }

    public function findObjectiveName(string $objStringId, Entrainement $entrainement): string
    {
        foreach ($entrainement->getObjectifs() as $obj) {
            if ($obj->getObjID() === $objStringId) {
                return $obj->getName() ?: $objStringId;
            }
        }
        return $objStringId;
    }

    public function findLevelName(string $lvlStringId, Entrainement $entrainement): string
    {
        foreach ($entrainement->getObjectifs() as $obj) {
            foreach ($obj->getNiveaux() as $lvl) {
                if ($lvl->getLevelID() === $lvlStringId) {
                    return $lvl->getName() ?: $lvlStringId;
                }
            }
        }
        return $lvlStringId;
    }

    // Ici, grâce au 'use' en haut, ?Objectif fait bien référence à App\Entity\Objectif
    public function findObjectiveEntity(string $objStringId, Entrainement $entrainement): ?Objectif
    {
        foreach ($entrainement->getObjectifs() as $obj) {
            if ($obj->getObjID() === $objStringId) return $obj;
        }
        return null;
    }

    public function findLevelEntity(string $lvlStringId, Entrainement $entrainement): ?Niveau
    {
        foreach ($entrainement->getObjectifs() as $obj) {
            foreach ($obj->getNiveaux() as $lvl) {
                if ($lvl->getLevelID() === $lvlStringId) return $lvl;
            }
        }
        return null;
    }
}
