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

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRequiredLevel(): string
    {
        return $this->requiredLevel;
    }

    public function setRequiredLevel(string $requiredLevel): self
    {
        $this->requiredLevel = $requiredLevel;
        return $this;
    }

    public function getRequiredObjective(): string
    {
        return $this->requiredObjective;
    }

    public function setRequiredObjective(string $requiredObjective): self
    {
        $this->requiredObjective = $requiredObjective;
        return $this;
    }

    public function getSuccessPercent(): float
    {
        return $this->successPercent;
    }

    public function setSuccessPercent(float $successPercent): self
    {
        $this->successPercent = $successPercent;
        return $this;
    }

    public function getEncountersPercent(): float
    {
        return $this->encountersPercent;
    }

    public function setEncountersPercent(float $encountersPercent): self
    {
        $this->encountersPercent = $encountersPercent;
        return $this;
    }

    public function getObjectif(): ?Objectif
    {
        return $this->objectif;
    }

    public function setObjectif(?Objectif $objectif): self
    {
        $this->objectif = $objectif;
        return $this;
    }
}
