<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class PConstruction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $tables;

    #[ORM\Column(length: 255)]
    private string $resultLocation;

    #[ORM\Column(length: 255)]
    private string $leftOperand;

    #[ORM\Column(length: 255)]
    private string $intervalMin;

    #[ORM\Column(length: 255)]
    private string $intervalMax;

    #[ORM\OneToOne(inversedBy: "construction", targetEntity: PNiveau::class)]
    private ?PNiveau $pniveau = null;
}
