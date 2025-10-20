<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class PCompletion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(type: "float")]
    private float $successCompletionCriteria;

    #[ORM\Column(type: "float")]
    private float $encounterCompletionCriteria;

    #[ORM\OneToOne(inversedBy: "completion", targetEntity: PNiveau::class)]
    private ?PNiveau $pniveau = null;
}
