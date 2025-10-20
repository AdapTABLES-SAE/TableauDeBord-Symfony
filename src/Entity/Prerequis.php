<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Prerequis
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $requiredLevel;

    #[ORM\Column(length: 255)]
    private string $requiredObjective;

    #[ORM\Column(type: "float")]
    private float $successPercent;

    #[ORM\Column(type: "float")]
    private float $encountersPercent;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "prerequis")]
    private ?Objectif $objectif = null;
}
