<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Classe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "bigint")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $idClasse;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\OneToMany(mappedBy: "classe", targetEntity: Eleve::class)]
    private iterable $eleves;

    #[ORM\ManyToOne(targetEntity: Enseignant::class, inversedBy: "classes")]
    private ?Enseignant $enseignant = null;
}
