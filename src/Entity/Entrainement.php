<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Entrainement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $learningPathID;

    #[ORM\ManyToOne(targetEntity: Eleve::class, inversedBy: "entrainements")]
    private ?Eleve $eleve = null;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "entrainements")]
    private ?Objectif $objectif = null;
}
