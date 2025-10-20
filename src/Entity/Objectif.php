<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Objectif
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $objID;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Entrainement::class)]
    private iterable $entrainements;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Prerequis::class)]
    private iterable $prerequis;

    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Niveau::class)]
    private iterable $niveaux;
}
