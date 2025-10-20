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

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSuccessCompletionCriteria(): float
    {
        return $this->successCompletionCriteria;
    }

    public function setSuccessCompletionCriteria(float $successCompletionCriteria): self
    {
        $this->successCompletionCriteria = $successCompletionCriteria;
        return $this;
    }

    public function getEncounterCompletionCriteria(): float
    {
        return $this->encounterCompletionCriteria;
    }

    public function setEncounterCompletionCriteria(float $encounterCompletionCriteria): self
    {
        $this->encounterCompletionCriteria = $encounterCompletionCriteria;
        return $this;
    }

    public function getPniveau(): ?PNiveau
    {
        return $this->pniveau;
    }

    public function setPniveau(?PNiveau $pniveau): self
    {
        $this->pniveau = $pniveau;
        return $this;
    }
}
