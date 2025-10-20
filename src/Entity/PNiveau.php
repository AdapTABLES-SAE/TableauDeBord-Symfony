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

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNiveau(): ?Niveau
    {
        return $this->niveau;
    }

    public function setNiveau(?Niveau $niveau): self
    {
        $this->niveau = $niveau;
        return $this;
    }

    public function getCompletion(): ?PCompletion
    {
        return $this->completion;
    }

    public function setCompletion(?PCompletion $completion): self
    {
        $this->completion = $completion;
        return $this;
    }

    public function getConstruction(): ?PConstruction
    {
        return $this->construction;
    }

    public function setConstruction(?PConstruction $construction): self
    {
        $this->construction = $construction;
        return $this;
    }
}
