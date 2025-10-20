<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Eleve
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $learnerId;

    #[ORM\Column(length: 255)]
    private string $nomEleve;

    #[ORM\Column(length: 255)]
    private string $prenomEleve;

    #[ORM\ManyToOne(targetEntity: Classe::class, inversedBy: "eleves")]
    private ?Classe $classe = null;

    #[ORM\OneToMany(mappedBy: "eleve", targetEntity: Entrainement::class)]
    private iterable $entrainements;
}
