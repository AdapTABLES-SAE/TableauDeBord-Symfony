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

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTimeMaxSecond(): int
    {
        return $this->timeMaxSecond;
    }

    public function setTimeMaxSecond(int $timeMaxSecond): self
    {
        $this->timeMaxSecond = $timeMaxSecond;
        return $this;
    }

    public function getRepartitionPercent(): int
    {
        return $this->repartitionPercent;
    }

    public function setRepartitionPercent(int $repartitionPercent): self
    {
        $this->repartitionPercent = $repartitionPercent;
        return $this;
    }

    public function getSuccessiveSuccessesToReach(): int
    {
        return $this->successiveSuccessesToReach;
    }

    public function setSuccessiveSuccessesToReach(int $successiveSuccessesToReach): self
    {
        $this->successiveSuccessesToReach = $successiveSuccessesToReach;
        return $this;
    }

    public function getTargets(): ?string
    {
        return $this->targets;
    }

    public function setTargets(?string $targets): self
    {
        $this->targets = $targets;
        return $this;
    }

    public function getAnswerModality(): ?string
    {
        return $this->answerModality;
    }

    public function setAnswerModality(?string $answerModality): self
    {
        $this->answerModality = $answerModality;
        return $this;
    }

    public function getNbIncorrectChoices(): ?string
    {
        return $this->nbIncorrectChoices;
    }

    public function setNbIncorrectChoices(?string $nbIncorrectChoices): self
    {
        $this->nbIncorrectChoices = $nbIncorrectChoices;
        return $this;
    }

    public function getNbFacts(): ?string
    {
        return $this->nbFacts;
    }

    public function setNbFacts(?string $nbFacts): self
    {
        $this->nbFacts = $nbFacts;
        return $this;
    }

    public function getSourceVariation(): ?string
    {
        return $this->sourceVariation;
    }

    public function setSourceVariation(?string $sourceVariation): self
    {
        $this->sourceVariation = $sourceVariation;
        return $this;
    }

    public function getTarget(): ?string
    {
        return $this->target;
    }

    public function setTarget(?string $target): self
    {
        $this->target = $target;
        return $this;
    }

    public function getNbCorrectChoices(): ?string
    {
        return $this->nbCorrectChoices;
    }

    public function setNbCorrectChoices(?string $nbCorrectChoices): self
    {
        $this->nbCorrectChoices = $nbCorrectChoices;
        return $this;
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
}
