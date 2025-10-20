<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Niveau
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $levelID;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "niveaux")]
    private ?Objectif $objectif = null;

    #[ORM\OneToMany(mappedBy: "niveau", targetEntity: PNiveau::class)]
    private iterable $pniveaux;

    #[ORM\OneToMany(mappedBy: "niveau", targetEntity: PTache::class)]
    private iterable $ptaches;
}
