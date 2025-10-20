<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class PTache
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(type: "integer")]
    private int $timeMaxSecond;

    #[ORM\Column(type: "integer")]
    private int $repartitionPercent;

    #[ORM\Column(type: "integer")]
    private int $successiveSuccessesToReach;

    #[ORM\Column(nullable: true)]
    private ?string $targets = null;

    #[ORM\Column(nullable: true)]
    private ?string $answerModality = null;

    #[ORM\Column(nullable: true)]
    private ?string $nbIncorrectChoices = null;

    #[ORM\Column(nullable: true)]
    private ?string $nbFacts = null;

    #[ORM\Column(nullable: true)]
    private ?string $sourceVariation = null;

    #[ORM\Column(nullable: true)]
    private ?string $target = null;

    #[ORM\Column(nullable: true)]
    private ?string $nbCorrectChoices = null;

    #[ORM\ManyToOne(targetEntity: Niveau::class, inversedBy: "ptaches")]
    private ?Niveau $niveau = null;
}
