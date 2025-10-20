<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class PNiveau
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Niveau::class, inversedBy: "pniveaux")]
    private ?Niveau $niveau = null;

    #[ORM\OneToOne(targetEntity: PCompletion::class, mappedBy: "pniveau")]
    private ?PCompletion $completion = null;

    #[ORM\OneToOne(targetEntity: PConstruction::class, mappedBy: "pniveau")]
    private ?PConstruction $construction = null;
}
